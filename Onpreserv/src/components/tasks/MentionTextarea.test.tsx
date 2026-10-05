// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { useState } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  MentionTextarea,
  extractMentionIds,
  extractMentionIdsFromText,
  renderMentions,
} from "./MentionTextarea";

const U1 = { id: "11111111-1111-1111-1111-111111111111", nome: "Alice Souza" };
const U2 = { id: "22222222-2222-2222-2222-222222222222", nome: "Bruno Lima" };
const U3 = { id: "33333333-3333-3333-3333-333333333333", nome: "Carla Alves" };

describe("extractMentionIds — formato persistido em task_mentions", () => {
  it("retorna lista vazia quando não há menções", () => {
    expect(extractMentionIds("oi pessoal")).toEqual([]);
  });

  it("extrai um único id", () => {
    expect(extractMentionIds(`olá @[Alice](${U1.id}) tudo bem?`)).toEqual([U1.id]);
  });

  it("extrai múltiplos ids preservando ordem e deduplicando", () => {
    const t = `@[Alice](${U1.id}) e @[Bruno](${U2.id}) e de novo @[Alice](${U1.id})`;
    expect(extractMentionIds(t)).toEqual([U1.id, U2.id]);
  });

  it("ignora @nome sem id (não vira menção persistida)", () => {
    expect(extractMentionIds("oi @ninguem só texto")).toEqual([]);
  });

  it("ignora ids mal formatados", () => {
    expect(extractMentionIds("oi @[Alice](nao-uuid)")).toEqual([]);
  });
});

describe("renderMentions — exibição @Nome nos comentários", () => {
  it("substitui o token completo por @Nome", () => {
    const txt = `oi @[Alice Souza](${U1.id}), revise por favor`;
    expect(renderMentions(txt)).toBe("oi @Alice Souza, revise por favor");
  });

  it("renderiza várias menções", () => {
    const txt = `@[Alice](${U1.id}) cc @[Bruno](${U2.id})`;
    expect(renderMentions(txt)).toBe("@Alice cc @Bruno");
  });

  it("não altera texto sem menções", () => {
    expect(renderMentions("texto puro @sem id")).toBe("texto puro @sem id");
  });
});

/**
 * Simula digitação no textarea controlando selectionStart — o componente lê
 * e.target.selectionStart para detectar o gatilho "@..." de autocomplete.
 */
function typeAt(el: HTMLTextAreaElement, value: string, caret = value.length) {
  el.focus();
  el.setSelectionRange(caret, caret);
  fireEvent.change(el, { target: { value } });
  if (caret !== value.length) el.setSelectionRange(caret, caret);
}

/**
 * Os testes de autocomplete são SÍNCRONOS de propósito — sem `waitFor`, sem
 * `findBy*`, sem `await`.
 *
 * Não é estilo: abrir o `Popover` do Radix em JSDOM bloqueia o event loop por
 * cerca de 70 segundos nesta máquina (Windows, projeto no OneDrive). Medindo por
 * dentro, o `fireEvent.change` que abre o autocomplete leva 164ms e o item já
 * está no DOM quando ele retorna — mas o primeiro `setTimeout` depois disso só
 * volta 70s mais tarde. Qualquer espera assíncrona fica presa aí: era o que
 * fazia estes três testes falharem por tempo esgotado, sempre, enquanto os
 * síncronos passavam.
 *
 * Como o React 18 aplica a atualização antes de `fireEvent` retornar, não há o
 * que esperar: `getByText` logo após o evento verifica exatamente o mesmo
 * comportamento, e em milissegundos.
 */
describe("MentionTextarea — autocomplete e seleção", () => {
  function Harness({
    onChangeSpy,
    onMentionsSpy,
    initial = "",
  }: {
    onChangeSpy: (v: string) => void;
    onMentionsSpy: (ids: string[]) => void;
    initial?: string;
  }) {
    const [v, setV] = useState(initial);
    return (
      <MentionTextarea
        value={v}
        onChange={(nv) => {
          setV(nv);
          onChangeSpy(nv);
        }}
        onMentionsChange={onMentionsSpy}
        users={[U1, U2, U3]}
        placeholder="Comente..."
      />
    );
  }

  function setup(initial = "") {
    const onChange = vi.fn();
    const onMentionsChange = vi.fn();
    const utils = render(
      <Harness
        onChangeSpy={onChange}
        onMentionsSpy={onMentionsChange}
        initial={initial}
      />,
    );
    const textarea = utils.container.querySelector("textarea") as HTMLTextAreaElement;
    return { textarea, onChange, onMentionsChange, ...utils };
  }

  it("não abre o autocomplete sem gatilho @", () => {
    const { textarea } = setup();
    typeAt(textarea, "olá");
    expect(screen.queryByText("Alice Souza")).toBeNull();
  });

  it("abre o autocomplete e filtra usuários ao digitar @query", () => {
    const { textarea } = setup();
    typeAt(textarea, "oi @al");
    expect(screen.getByText("Alice Souza")).toBeInTheDocument();
    expect(screen.getByText("Carla Alves")).toBeInTheDocument();
    expect(screen.queryByText("Bruno Lima")).toBeNull();
  });

  it("ao clicar em um usuário insere o token e emite o id em onMentionsChange", () => {
    const { textarea, onChange, onMentionsChange } = setup();
    typeAt(textarea, "oi @al", 6);

    fireEvent.mouseDown(screen.getByText("Alice Souza"));

    const lastValue = onChange.mock.calls.at(-1)?.[0] as string;
    expect(lastValue).toContain("@Alice Souza ");
    const lastMentions = onMentionsChange.mock.calls.at(-1)?.[0];
    expect(lastMentions).toEqual([U1.id]);
  });

  it("emite onMentionsChange com ids únicos quando duas menções iguais aparecem", () => {
    const { textarea, onMentionsChange } = setup();
    typeAt(
      textarea,
      `oi @[Alice](${U1.id}) e @[Alice](${U1.id})`,
    );
    const last = onMentionsChange.mock.calls.at(-1)?.[0];
    expect(last).toEqual([U1.id]);
  });

  it("fecha o autocomplete ao apagar o gatilho @", () => {
    const { textarea } = setup();
    typeAt(textarea, "oi @al");
    expect(screen.getByText("Alice Souza")).toBeInTheDocument();
    typeAt(textarea, "oi ");
    expect(screen.queryByText("Alice Souza")).toBeNull();
  });
});

describe("extractMentionIdsFromText - nomes com metacaracteres de regex", () => {
  const PCM = { id: "44444444-4444-4444-4444-444444444444", nome: "J. Silva (PCM)" };

  it("reconhece a mencao de um nome com ponto e parenteses", () => {
    expect(extractMentionIdsFromText("@J. Silva (PCM) favor verificar", [PCM])).toEqual([PCM.id]);
  });

  it("nao casa um nome parecido so porque o padrao foi escapado", () => {
    expect(extractMentionIdsFromText("@JXSilva XPCMY", [PCM])).toEqual([]);
  });

  it("continua reconhecendo nomes simples", () => {
    expect(extractMentionIdsFromText("oi @Alice Souza", [U1])).toEqual([U1.id]);
  });
});
