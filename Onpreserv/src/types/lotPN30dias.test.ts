import { describe, it, expect } from "vitest";
import {
  getLotFrequencyDays,
  getLotNextDueDate,
  getLotDueDate,
  getLotDeadline,
  getLotPreservationStatus,
  proximaDataPrevista,
  isWeekend,
  addCalendarDays,
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

function pn(nome: string, preservacoes: Preservation[] = [], over: Partial<Lot> = {}): Lot {
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
    ...over,
  };
}

describe("PN-32, PN-34 e PN-36 — 30 dias corridos", () => {
  it("os três têm frequência de 30 dias", () => {
    for (const nome of ["Painel PN-32", "Painel PN-34", "Painel PN-36"]) {
      expect(getLotFrequencyDays(pn(nome)), nome).toBe(30);
    }
  });

  it("reconhece as variações de escrita do identificador", () => {
    for (const nome of ["PN-32", "PN 34", "PN36", "pn_32", "QUADRO PN-34 REV2"]) {
      expect(getLotFrequencyDays(pn(nome)), nome).toBe(30);
    }
  });

  it("os 30 dias são CORRIDOS: fim de semana conta no intervalo", () => {
    // 24/08 + 30 dias corridos = quarta 23/09, cuja semana abre em 21/09.
    // Fossem 30 dias ÚTEIS, a teórica seria 05/10 e a semana, a de 05/10.
    expect(proximaDataPrevista("2026-08-24", 30)).toBe("2026-09-21");
  });

  it("a próxima preservação é a semana dos 30 dias após o registro", () => {
    const lot = pn("Painel PN-34", [pres("2026-08-24", "2026-09-21")]);
    expect(getLotNextDueDate(lot)).toBe("2026-09-21");
  });
});

describe("a data prevista é sempre a segunda-feira da semana", () => {
  it("teórica no meio da semana recua para a segunda", () => {
    // 23/09 é quarta; a semana dela abre em 21/09.
    expect(proximaDataPrevista("2026-08-24", 30)).toBe("2026-09-21");
  });

  it("teórica no sábado usa a segunda da própria semana", () => {
    // 27/08 + 30 = sábado 26/09, que pertence à semana de 21/09 a 27/09.
    expect(dia("2026-09-26").getDay()).toBe(6);
    expect(proximaDataPrevista("2026-08-27", 30)).toBe("2026-09-21");
  });

  it("teórica no domingo fecha a própria semana, não abre a seguinte", () => {
    // 28/08 + 30 = domingo 27/09 — último dia da semana de 21/09.
    expect(dia("2026-09-27").getDay()).toBe(0);
    expect(proximaDataPrevista("2026-08-28", 30)).toBe("2026-09-21");
  });

  it("teórica na própria segunda não se move", () => {
    // 22/08 + 30 = segunda 21/09.
    expect(proximaDataPrevista("2026-08-22", 30)).toBe("2026-09-21");
  });

  it("toda data prevista cai numa segunda-feira, em 90 partidas seguidas", () => {
    for (let i = 0; i < 90; i++) {
      const partida = iso(addCalendarDays(dia("2026-01-01"), i));
      const prevista = proximaDataPrevista(partida, 30);
      const [y, m, d] = prevista.split("-").map(Number);
      const semana = new Date(y, m - 1, d);
      expect(semana.getDay(), `${partida} -> ${prevista}`).toBe(1);
      expect(isWeekend(semana), `${partida} -> ${prevista}`).toBe(false);
    }
  });

  it("vale também para o lote inteiro, não só para o cálculo isolado", () => {
    const lot = pn("Painel PN-34", [pres("2026-08-28")]);
    expect(getLotNextDueDate(lot)).toBe("2026-09-21");
    expect(getLotDueDate(lot)!.getDay()).toBe(1);
  });
});

describe("a semana do vencimento também vale para os PN", () => {
  // Vencimento na semana de 21/09, que vai até domingo 27/09.
  const lot = pn("Painel PN-34", [pres("2026-08-24", "2026-09-21")]);

  it("o prazo real é o domingo que fecha a semana do vencimento", () => {
    expect(getLotDueDate(lot)).toEqual(dia("2026-09-21"));
    expect(getLotDeadline(lot)).toEqual(dia("2026-09-27"));
  });

  it("no meio do ciclo, segue em dia — não alarma a cada semana", () => {
    expect(getLotPreservationStatus(lot, dia("2026-09-07"))).toBe("preserved");
  });

  it("preservar na sexta cumpre a semana prevista", () => {
    expect(getLotPreservationStatus(lot, dia("2026-09-25"))).toBe("upcoming");
    const feita = pn("Painel PN-34", [pres("2026-09-25", "2026-10-19")]);
    expect(getLotPreservationStatus(feita, dia("2026-09-26"))).toBe("preserved");
  });

  it("só vence quando a semana fecha", () => {
    expect(getLotPreservationStatus(lot, dia("2026-09-27"))).toBe("upcoming");
    expect(getLotPreservationStatus(lot, dia("2026-09-28"))).toBe("overdue");
  });
});

describe("os PN não são afetados pela mudança para 15 dias", () => {
  it("um lote comum vai a 15 dias, o PN continua em 30", () => {
    const comum = pn("Painel PN-12", [pres("2026-09-10")]);
    const longo = pn("Painel PN-34", [pres("2026-09-10")]);
    expect(getLotFrequencyDays(comum)).toBe(15);
    expect(getLotFrequencyDays(longo)).toBe(30);
    // 10/09 + 15 = sexta 25/09 -> semana de 21/09.
    expect(getLotNextDueDate(comum)).toBe("2026-09-21");
    // 10/09 + 30 = sábado 10/10 -> semana de 05/10.
    expect(getLotNextDueDate(longo)).toBe("2026-10-05");
  });
});
