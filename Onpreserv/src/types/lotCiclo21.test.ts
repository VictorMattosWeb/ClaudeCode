import { describe, it, expect } from "vitest";
import {
  FREQUENCIA_PADRAO_DIAS,
  FREQUENCIA_LONGA_DIAS,
  getLotFrequencyDays,
  getLotNextDueDate,
  getLotDeadline,
  getLotPreservationStatus,
  proximaDataPrevista,
  startOfWeek,
} from "./lot";
import type { Lot, Preservation } from "./lot";

const dia = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function pres(date: string, nextDate = ""): Preservation {
  return { id: date, date, nextDate, observation: "", responsible: "" };
}

function lote(nome: string, preservacoes: Preservation[] = []): Lot {
  return {
    id: "1",
    identificadorInterno: "NOV-0001",
    tipoLote: "novo",
    code: "27568",
    name: nome,
    location: "",
    rua: "",
    prateleira: "",
    responsible: "",
    status: "ativo",
    observations: "",
    preservations: preservacoes,
    createdAt: "2026-06-01T10:00:00.000Z",
  };
}

describe("ciclo padrão de 21 dias", () => {
  it("o padrão é 21 e os painéis retirados de campo seguem em 30", () => {
    expect(FREQUENCIA_PADRAO_DIAS).toBe(21);
    expect(FREQUENCIA_LONGA_DIAS).toBe(30);
    expect(getLotFrequencyDays(lote("Painel comum"))).toBe(21);
    for (const nome of ["Painel PN-32", "Painel PN-34", "Painel PN-36"]) {
      expect(getLotFrequencyDays(lote(nome)), nome).toBe(30);
    }
  });

  it("21 dias são exatamente três semanas", () => {
    expect(FREQUENCIA_PADRAO_DIAS % 7).toBe(0);
    expect(FREQUENCIA_PADRAO_DIAS / 7).toBe(3);
  });

  it("o dia da semana em que se preserva não muda nada", () => {
    // A garantia central: dentro de uma mesma semana, todos os dias produzem a
    // mesma cobrança. É o que permite a equipe passar em qualquer dia sem que
    // dois lotes atendidos na mesma visita vençam em semanas diferentes.
    for (let semana = 0; semana < 20; semana++) {
      const segunda = new Date(2026, 0, 5 + semana * 7); // 05/01/2026 é segunda
      const esperado = proximaDataPrevista(iso(segunda), 21);
      for (let d = 1; d < 7; d++) {
        const outroDia = new Date(segunda);
        outroDia.setDate(outroDia.getDate() + d);
        expect(proximaDataPrevista(iso(outroDia), 21), iso(outroDia)).toBe(esperado);
      }
    }
  });

  it("a cobrança é duas semanas depois da semana da preservação", () => {
    // 21 dias = três semanas, contando a da própria preservação. Logo, a
    // terceira semana começa 14 dias após o início da primeira.
    for (let i = 0; i < 120; i++) {
      const partida = new Date(2026, 0, 1 + i);
      const inicio = startOfWeek(partida);
      const esperado = new Date(inicio);
      esperado.setDate(esperado.getDate() + 14);
      expect(proximaDataPrevista(iso(partida), 21), iso(partida)).toBe(iso(esperado));
    }
  });

  it("a sequência avança de duas em duas semanas", () => {
    // Consequência direta de a contagem partir da semana: preservando dentro da
    // semana cobrada, a próxima cai duas semanas adiante. Os 21 dias são o
    // limite do ciclo — quem preserva no fim da janela chega perto deles.
    let data = "2026-09-14"; // uma segunda-feira
    const previstas: string[] = [];
    for (let i = 0; i < 6; i++) {
      const proxima = getLotNextDueDate(lote("Painel comum", [pres(data)]), dia(data))!;
      previstas.push(proxima);
      data = proxima;
    }
    expect(previstas).toEqual([
      "2026-09-28",
      "2026-10-12",
      "2026-10-26",
      "2026-11-09",
      "2026-11-23",
      "2026-12-07",
    ]);
    for (const p of previstas) expect(dia(p).getDay(), p).toBe(1);
  });

  it("a janela de cumprimento é a semana inteira do vencimento", () => {
    // Preservado na segunda 24/08, o ciclo vai até 13/09 e é cobrado na semana
    // que abre em 07/09.
    const lot = lote("Painel comum", [pres("2026-08-24")]);
    expect(getLotNextDueDate(lot, dia("2026-09-07"))).toBe("2026-09-07");
    expect(getLotDeadline(lot, dia("2026-09-07"))).toEqual(dia("2026-09-13"));
    for (const d of ["2026-09-07", "2026-09-10", "2026-09-13"]) {
      expect(getLotPreservationStatus(lot, dia(d)), d).toBe("upcoming");
    }
    expect(getLotPreservationStatus(lot, dia("2026-09-14"))).toBe("overdue");
  });

  it("o aviso começa cinco dias antes de a semana abrir", () => {
    const lot = lote("Painel comum", [pres("2026-08-24")]);
    expect(getLotPreservationStatus(lot, dia("2026-09-01"))).toBe("preserved");
    expect(getLotPreservationStatus(lot, dia("2026-09-02"))).toBe("upcoming");
  });
});
