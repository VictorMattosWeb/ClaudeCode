import { Lead, P, H2, H3, UL, Callout, Code, Compare } from "../components";
import type { ReactNode } from "react";
import {
  FREQUENCIA_PADRAO_DIAS,
  FREQUENCIA_LONGA_DIAS,
  PRAZO_PRIMEIRA_PRESERVACAO_DIAS,
  CICLO_AVISO_MAXIMO_DIAS,
} from "@/types/lot";

/**
 * Regra de preservação, escrita para quem opera e para quem audita.
 *
 * Os números vêm importados de `types/lot.ts` de propósito: se a frequência
 * mudar no código, esta página muda junto. Documentação que repete constantes à
 * mão envelhece calada, e uma regra de negócio descrita errado é pior que não
 * documentada.
 */

function Tag({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-primary-soft text-primary">
      {children}
    </span>
  );
}

function Pill({ tom, children }: { tom: "ok" | "aviso" | "erro" | "neutro"; children: ReactNode }) {
  const cls = {
    ok: "border-success/40 bg-success/10 text-success",
    aviso: "border-warning/40 bg-warning/10 text-warning",
    erro: "border-destructive/40 bg-destructive/10 text-destructive",
    neutro: "border-border bg-muted text-muted-foreground",
  }[tom];
  return (
    <span className={`inline-flex items-center border px-2 py-0.5 text-[11px] font-medium ${cls}`}>
      {children}
    </span>
  );
}

/** Régua visual de uma semana, para mostrar a janela de cumprimento. */
function Semana({ titulo, marca }: { titulo: string; marca?: number }) {
  const dias = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"];
  return (
    <div className="my-4">
      <div className="mb-1.5 text-xs font-semibold text-muted-foreground">{titulo}</div>
      <div className="grid grid-cols-7 gap-1">
        {dias.map((d, i) => (
          <div
            key={d}
            className={`border px-1 py-2 text-center text-[11px] ${
              marca === i
                ? "border-primary bg-primary/10 font-semibold text-primary"
                : "border-border bg-card text-muted-foreground"
            }`}
          >
            {d}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <>
      <Lead>
        Esta página descreve, em detalhe, como o sistema decide a{" "}
        <strong>situação de preservação</strong> de cada lote: quando cobra, quando avisa, quando
        acusa atraso e por quê. É a regra que alimenta a coluna Situação, os indicadores da tela de
        Lotes e a emissão de etiquetas.
      </Lead>

      <Callout type="rule" title="Em uma frase">
        A preservação é cobrada por <strong>semana</strong>, não por dia: o sistema vê em que semana
        o ciclo do lote <strong>encerra</strong> e cobra nela. Preservar em qualquer dia daquela
        semana cumpre o ciclo.
      </Callout>

      {/* ---------------- 1. Frequência ---------------- */}
      <H2 id="frequencia">
        <Tag>1</Tag> Frequência de cada lote
      </H2>
      <P>
        A frequência é o intervalo, em <strong>dias corridos</strong>, coberto por uma preservação —
        contando o próprio dia dela como o primeiro. Fim de semana entra na contagem; o que não
        acontece é a cobrança cair num sábado, porque a data exibida é sempre uma segunda-feira
        (seção 3).
      </P>

      <div className="my-5 overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="py-2 pr-4 font-semibold">Tipo de lote</th>
              <th className="py-2 pr-4 font-semibold">Frequência</th>
              <th className="py-2 font-semibold">Como o sistema identifica</th>
            </tr>
          </thead>
          <tbody className="text-muted-foreground">
            <tr className="border-b border-border/50">
              <td className="py-2 pr-4 text-foreground">Geral (padrão)</td>
              <td className="py-2 pr-4 font-semibold text-foreground">
                {FREQUENCIA_PADRAO_DIAS} dias
              </td>
              <td className="py-2">Todo lote que não se enquadre nas linhas abaixo.</td>
            </tr>
            <tr className="border-b border-border/50">
              <td className="py-2 pr-4 text-foreground">Painéis retirados de campo</td>
              <td className="py-2 pr-4 font-semibold text-foreground">
                {FREQUENCIA_LONGA_DIAS} dias
              </td>
              <td className="py-2">
                Nome, código ou identificador contendo <strong>PN-32</strong>, <strong>PN-34</strong>{" "}
                ou <strong>PN-36</strong>.
              </td>
            </tr>
            <tr>
              <td className="py-2 pr-4 text-foreground">Configurado na ficha</td>
              <td className="py-2 pr-4 font-semibold text-foreground">o que for escolhido</td>
              <td className="py-2">
                Campo <em>Frequência</em> no cadastro do lote. Só administrador altera, e ele vence
                qualquer outra regra.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <Callout type="tip" title="Por que 21 dias">
        <p>
          Vinte e um dias são exatamente <strong>três semanas</strong>. Como a cobrança é semanal, um
          múltiplo de sete faz o ciclo se encaixar em semanas inteiras — quem preserva numa segunda
          é cobrado na terceira semana seguinte, sem que a data "ande" pelo calendário a cada rodada.
        </p>
      </Callout>

      <Callout type="warning" title="Os 21 dias são o limite, não o alvo">
        A janela é a semana inteira, então o intervalo real entre duas preservações varia conforme o
        dia escolhido. Quem preserva no <strong>primeiro</strong> dia da semana cobrada volta a ser
        cobrado cerca de <strong>14 dias</strong> depois; quem preserva no <strong>último</strong>{" "}
        chega perto dos {FREQUENCIA_PADRAO_DIAS}. Nunca ultrapassa a frequência — que é o que a
        fiscalização exige —, mas pode ficar abaixo dela.
      </Callout>

      <Callout type="warning" title="Renomear um lote pode mudar a frequência dele">
        A identificação dos painéis de {FREQUENCIA_LONGA_DIAS} dias é feita pelo texto do nome, do
        código e do identificador. Tirar "PN-34" do nome joga o lote de volta para{" "}
        {FREQUENCIA_PADRAO_DIAS} dias sem aviso. Para fixar a frequência de forma independente do
        nome, use o campo <em>Frequência</em> na ficha.
      </Callout>

      {/* ---------------- 2. A primeira preservação ---------------- */}
      <H2 id="primeira">
        <Tag>2</Tag> A primeira preservação
      </H2>
      <P>
        Um lote recém-chegado não tem histórico, então não há de onde contar a frequência. Nesse caso
        a referência é a <strong>data de cadastro</strong>, e o prazo é mais curto:{" "}
        <strong>{PRAZO_PRIMEIRA_PRESERVACAO_DIAS} dias</strong> para a primeira preservação.
      </P>
      <P>
        Feita a primeira, ela passa a ser a referência, e daí em diante vale a frequência normal do
        lote. Cada preservação registrada define o prazo da seguinte.
      </P>

      <Callout type="info" title="Lotes cadastrados antes da regra entrar em vigor">
        A cobrança da primeira preservação só se aplica a material cadastrado a partir da data em que
        a regra passou a valer. Um lote antigo que nunca foi preservado permanece em{" "}
        <Pill tom="neutro">Sem preservação</Pill> em vez de amanhecer vencido há centenas de dias por
        uma cobrança que não existia quando ele entrou.
      </Callout>

      {/* ---------------- 3. Da data teórica para a semana ---------------- */}
      <H2 id="semana">
        <Tag>3</Tag> Da data teórica para a semana
      </H2>
      <P>Este é o passo central da regra, e acontece em três etapas:</P>

      <Code lang="text">{`1. último dia do ciclo = última preservação + frequência - 1
                         (o dia da preservação conta como o primeiro)
2. semana              = a semana em que esse último dia cai (segunda a domingo)
3. PRÓXIMA PRESERVAÇÃO = a segunda-feira dessa semana`}</Code>

      <Callout type="warning" title="O ciclo encerra dentro da semana cobrada">
        O <strong>menos um</strong> não é arredondamento: é o que faz a cobrança cair na semana em
        que o ciclo <strong>termina</strong>, e não na seguinte. Somar {FREQUENCIA_PADRAO_DIAS} dias
        cheios daria o primeiro dia <em>depois</em> do ciclo e empurraria a cobrança para uma semana
        que o intervalo nem alcança.
      </Callout>

      <H3 id="exemplo-semana">Exemplo</H3>
      <P>
        Lote geral ({FREQUENCIA_PADRAO_DIAS} dias) preservado na segunda-feira{" "}
        <strong>14/09</strong>:
      </P>
      <UL>
        <li>
          O ciclo cobre de 14/09 a <strong>04/10</strong> — {FREQUENCIA_PADRAO_DIAS} dias contando o
          próprio dia da preservação.
        </li>
        <li>Semana em que ele encerra: de segunda 28/09 a domingo 04/10.</li>
        <li>
          O sistema exibe <strong>Próxima preservação: 28/09</strong>.
        </li>
      </UL>
      <P>
        Em semanas fica evidente: <strong>14/09</strong> é a primeira, <strong>21/09</strong> a
        segunda e <strong>28/09</strong> a terceira — e é nela que os{" "}
        {FREQUENCIA_PADRAO_DIAS} dias se esgotam.
      </P>

      <Semana titulo="Semana do vencimento — preservar em qualquer um destes dias cumpre o ciclo" />

      <Callout type="rule" title="A janela é a semana inteira">
        Se o vencimento cai numa terça e a equipe só consegue ir na quinta, o ciclo foi{" "}
        <strong>cumprido</strong>. O atraso só existe quando a semana <strong>fecha no domingo</strong>{" "}
        sem nenhum registro. Isso evita que remanejar equipe vire inadimplência no papel.
      </Callout>

      {/* ---------------- 4. Os quatro status ---------------- */}
      <H2 id="status">
        <Tag>4</Tag> Os quatro status, e quando cada um aparece
      </H2>

      <div className="my-5 space-y-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="mb-2 flex items-center gap-2">
            <Pill tom="ok">Em dia</Pill>
            <span className="text-xs text-muted-foreground">preserved</span>
          </div>
          <P>
            O lote tem preservação registrada e a semana do vencimento ainda está{" "}
            <strong>longe</strong> — faltam mais de {CICLO_AVISO_MAXIMO_DIAS} dias para ela abrir.
            Nada a fazer.
          </P>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <div className="mb-2 flex items-center gap-2">
            <Pill tom="aviso">Vence em breve</Pill>
            <span className="text-xs text-muted-foreground">upcoming</span>
          </div>
          <P>Aparece em duas situações, e as duas significam "programe este lote":</P>
          <UL>
            <li>
              <strong>Antecedência:</strong> faltam {CICLO_AVISO_MAXIMO_DIAS} dias ou menos para a
              semana do vencimento abrir.
            </li>
            <li>
              <strong>Dentro da semana:</strong> a semana do vencimento está correndo e ainda não há
              registro. É para fazer agora — mas <em>não</em> é atraso.
            </li>
          </UL>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <div className="mb-2 flex items-center gap-2">
            <Pill tom="erro">Vencida</Pill>
            <span className="text-xs text-muted-foreground">overdue</span>
          </div>
          <P>
            A semana do vencimento <strong>fechou no domingo</strong> sem nenhuma preservação
            registrada. A partir da segunda-feira seguinte o lote passa a vencido e permanece assim
            até alguém registrar.
          </P>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <div className="mb-2 flex items-center gap-2">
            <Pill tom="neutro">Sem preservação</Pill>
            <span className="text-xs text-muted-foreground">none</span>
          </div>
          <P>
            Nunca houve preservação registrada e o prazo de{" "}
            {PRAZO_PRIMEIRA_PRESERVACAO_DIAS} dias da primeira ainda não se aproximou — ou o lote é
            anterior à regra da primeira preservação.
          </P>
        </div>
      </div>

      <Callout type="info" title="Os quatro são mutuamente exclusivos">
        Um lote está em exatamente um estado a cada momento. A ordem de avaliação é: vencido →
        dentro da semana → antecedência do aviso → em dia. O primeiro que se aplica vence.
      </Callout>

      {/* ---------------- 5. A antecedência do aviso ---------------- */}
      <H2 id="aviso">
        <Tag>5</Tag> Quanto tempo antes o sistema avisa
      </H2>
      <P>
        A antecedência é proporcional ao ciclo, limitada a {CICLO_AVISO_MAXIMO_DIAS} dias: um terço da
        frequência, arredondado para cima.
      </P>
      <div className="my-4 overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="py-2 pr-4 font-semibold">Ciclo</th>
              <th className="py-2 font-semibold">Avisa com</th>
            </tr>
          </thead>
          <tbody className="text-muted-foreground">
            <tr className="border-b border-border/50">
              <td className="py-2 pr-4">{PRAZO_PRIMEIRA_PRESERVACAO_DIAS} dias (primeira)</td>
              <td className="py-2">3 dias</td>
            </tr>
            <tr className="border-b border-border/50">
              <td className="py-2 pr-4">{FREQUENCIA_PADRAO_DIAS} dias (geral)</td>
              <td className="py-2">{CICLO_AVISO_MAXIMO_DIAS} dias</td>
            </tr>
            <tr>
              <td className="py-2 pr-4">{FREQUENCIA_LONGA_DIAS} dias (PN)</td>
              <td className="py-2">{CICLO_AVISO_MAXIMO_DIAS} dias</td>
            </tr>
          </tbody>
        </table>
      </div>
      <P>
        Uma antecedência fixa de {CICLO_AVISO_MAXIMO_DIAS} dias seria cedo demais num prazo de{" "}
        {PRAZO_PRIMEIRA_PRESERVACAO_DIAS} dias — o lote nasceria quase em alerta, e o alerta perderia
        o sentido.
      </P>

      {/* ---------------- 6. Lotes inativos ---------------- */}
      <H2 id="inativos">
        <Tag>6</Tag> Lotes inativos não são cobrados
      </H2>
      <Callout type="rule" title="Inativo sai inteiramente do ciclo">
        Um lote com status <strong>Inativo</strong> — material que foi para o estoque ou teve a
        custódia transferida — não tem vencimento, não aparece como atrasado e{" "}
        <strong>não entra em nenhum indicador</strong> de preservação, incluindo o denominador da
        taxa. Ele é contado à parte, no indicador <em>Inativos</em>.
      </Callout>
      <P>
        Reativar o lote devolve a cobrança imediatamente, a partir da última preservação registrada.
      </P>

      {/* ---------------- 7. Indicadores ---------------- */}
      <H2 id="indicadores">
        <Tag>7</Tag> Como os indicadores são calculados
      </H2>
      <UL>
        <li>
          <strong>Total de lotes</strong> — tudo que está na listagem, inclusive inativos.
        </li>
        <li>
          <strong>Semana cumprida</strong> — lotes <Pill tom="ok">Em dia</Pill>, entre os ativos.
        </li>
        <li>
          <strong>Pendentes na semana</strong> — lotes <Pill tom="aviso">Vence em breve</Pill>.
        </li>
        <li>
          <strong>Semana(s) vencida(s)</strong> — lotes <Pill tom="erro">Vencida</Pill>.
        </li>
        <li>
          <strong>Inativos</strong> — fora do controle de preservação.
        </li>
        <li>
          <strong>Taxa de preservação</strong> — cumpridos dividido pelo total de{" "}
          <strong>ativos</strong>. Incluir inativos afundaria o indicador com material que ninguém
          precisa atender.
        </li>
      </UL>

      {/* ---------------- 8. Na prática ---------------- */}
      <H2 id="pratica">
        <Tag>8</Tag> Na prática
      </H2>
      <Compare
        doTitle="O que a regra permite"
        dontTitle="O que ela não permite"
        doItems={[
          "Preservar em qualquer dia da semana do vencimento e cumprir o ciclo",
          "Remanejar a equipe dentro da semana sem gerar atraso",
          "Agrupar a rota de campo por semana, já que os vencimentos caem sempre na segunda",
          "Registrar a preservação com data retroativa dentro da semana corrente",
        ]}
        dontItems={[
          "Deixar a semana fechar no domingo sem registro — vira atraso na segunda",
          "Contar com a data exata: o que vale é a semana, não o dia exibido",
          "Alterar a frequência sem ser administrador",
          "Esperar que um lote inativo apareça nas cobranças",
        ]}
      />

      <Callout type="tip" title="Onde conferir">
        A coluna <strong>Situação</strong> na tela de Lotes mostra o status, e a contagem ao lado
        indica quantos dias restam até o fim da semana do vencimento — ou há quantos dias ele venceu.
        O detalhe do lote traz a data prevista e todo o histórico de preservações.
      </Callout>
    </>
  );
}
