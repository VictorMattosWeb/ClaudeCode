import { describe, it, expect } from "vitest";
import {
  proximaDataPrevista,
  getLotDueDate,
  getLotDeadline,
  getLotNextDueDate,
  getLotPreservationStatus,
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

function lote(preservacoes: Preservation[], over: Partial<Lot> = {}): Lot {
  return {
    id: "1",
    identificadorInterno: "NOV-0001",
    tipoLote: "novo",
    code: "27568",
    name: "Painel",
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

/**
 * A regra: frequência → data teórica → semana dela → segunda-feira.
 */
describe("a data prevista é a segunda-feira da semana da data teórica", () => {
  it("cada dia da semana recua para a segunda daquela mesma semana", () => {
    // Partidas escolhidas para a teórica cair em cada dia da semana de 07/09.
    const casos: [string, string, string][] = [
      ["2026-08-23", "2026-09-07", "segunda"],
      ["2026-08-24", "2026-09-08", "terça"],
      ["2026-08-25", "2026-09-09", "quarta"],
      ["2026-08-26", "2026-09-10", "quinta"],
      ["2026-08-27", "2026-09-11", "sexta"],
      ["2026-08-28", "2026-09-12", "sábado"],
      ["2026-08-29", "2026-09-13", "domingo"],
    ];
    for (const [partida, teorica, nome] of casos) {
      // Confere que a teórica é mesmo o dia da semana que o caso afirma.
      expect(iso(addCalendarDays(dia(partida), 15)), `${partida} teórica`).toBe(teorica);
      // Todas as sete caem na MESMA semana, então todas dão a mesma segunda.
      expect(proximaDataPrevista(partida, 15), `teórica em ${nome}`).toBe("2026-09-07");
    }
  });

  it("a semana só vira quando a teórica passa para a segunda seguinte", () => {
    // 30/08 + 15 = segunda 14/09: aí sim a referência avança uma semana.
    expect(proximaDataPrevista("2026-08-30", 15)).toBe("2026-09-14");
  });

  it("vale para qualquer frequência, não só 15", () => {
    for (const freq of [7, 15, 30, 60, 90]) {
      const previsto = proximaDataPrevista("2026-09-02", freq);
      expect(dia(previsto).getDay(), `freq ${freq} -> ${previsto}`).toBe(1);
    }
  });

  it("em 200 partidas seguidas, a previsão é sempre uma segunda-feira", () => {
    for (let i = 0; i < 200; i++) {
      const partida = iso(addCalendarDays(dia("2026-01-01"), i));
      const previsto = proximaDataPrevista(partida, 15);
      expect(dia(previsto).getDay(), `${partida} -> ${previsto}`).toBe(1);
    }
  });

  it("a previsão nunca fica além da data teórica", () => {
    // Recuar para a segunda antecipa a cobrança; jamais a adia.
    for (let i = 0; i < 60; i++) {
      const partida = iso(addCalendarDays(dia("2026-01-01"), i));
      const teorica = addCalendarDays(dia(partida), 15);
      const previsto = dia(proximaDataPrevista(partida, 15));
      expect(previsto.getTime(), partida).toBeLessThanOrEqual(teorica.getTime());
      // E nunca recua mais que os 6 dias que separam domingo da segunda.
      expect(Math.round((teorica.getTime() - previsto.getTime()) / 86400000)).toBeLessThanOrEqual(6);
    }
  });
});

describe("a janela semanal é o que define o cumprimento", () => {
  // 24/08 + 15 = terça 08/09 -> semana de 07/09 a 13/09.
  const lot = lote([pres("2026-08-24")]);

  it("a referência é a segunda e o prazo é o domingo", () => {
    expect(getLotNextDueDate(lot, dia("2026-09-07"))).toBe("2026-09-07");
    expect(getLotDueDate(lot, dia("2026-09-07"))).toEqual(dia("2026-09-07"));
    expect(getLotDeadline(lot, dia("2026-09-07"))).toEqual(dia("2026-09-13"));
  });

  it("qualquer dia de 07/09 a 13/09 está dentro da janela", () => {
    for (const d of ["2026-09-07", "2026-09-09", "2026-09-11", "2026-09-13"]) {
      expect(getLotPreservationStatus(lot, dia(d)), d).toBe("upcoming");
    }
  });

  it("só na segunda seguinte, com a semana fechada, vira vencida", () => {
    expect(getLotPreservationStatus(lot, dia("2026-09-14"))).toBe("overdue");
  });

  it("preservar dentro da janela avança o ciclo", () => {
    // Registrada na quinta 10/09, a próxima teórica é 25/09 (sexta),
    // cuja semana abre em 21/09.
    const feita = lote([pres("2026-08-24"), pres("2026-09-10")]);
    expect(getLotNextDueDate(feita, dia("2026-09-11"))).toBe("2026-09-21");
    expect(getLotPreservationStatus(feita, dia("2026-09-11"))).toBe("preserved");
  });
});
