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
describe("o ciclo conta da SEMANA da preservação, não do dia", () => {
  it("qualquer dia da semana de 14/09 é cobrado na semana de 28/09", () => {
    // É o ponto da regra: a equipe que passa numa quinta e a que passa na
    // segunda seguinte geram o mesmo vencimento, porque preservaram na mesma
    // semana. Sem isso, o dia escolhido deslocava a cobrança.
    for (const d of [14, 15, 16, 17, 18, 19, 20]) {
      const partida = `2026-09-${String(d).padStart(2, "0")}`;
      expect(proximaDataPrevista(partida, 21), partida).toBe("2026-09-28");
    }
  });

  it("a semana seguinte já cobra uma semana depois", () => {
    // 21/09 abre a semana seguinte, então a cobrança anda sete dias.
    expect(proximaDataPrevista("2026-09-21", 21)).toBe("2026-10-05");
    expect(proximaDataPrevista("2026-09-27", 21)).toBe("2026-10-05");
  });

  it("21 dias são três semanas contando a da própria preservação", () => {
    // semana 1: 14/09 | semana 2: 21/09 | semana 3: 28/09 <- cobrança
    const previsto = dia(proximaDataPrevista("2026-09-17", 21));
    const semanaDaPreservacao = dia("2026-09-14");
    const semanas = Math.round(
      (previsto.getTime() - semanaDaPreservacao.getTime()) / (7 * 86400000),
    );
    expect(semanas).toBe(2);
  });

  it("vale para qualquer frequência, não só a padrão", () => {
    for (const freq of [7, 15, 21, 30, 60, 90]) {
      const previsto = proximaDataPrevista("2026-09-02", freq);
      expect(dia(previsto).getDay(), `freq ${freq} -> ${previsto}`).toBe(1);
    }
  });

  it("em 200 partidas seguidas, a previsão é sempre uma segunda-feira", () => {
    for (let i = 0; i < 200; i++) {
      const partida = iso(addCalendarDays(dia("2026-01-01"), i));
      const previsto = proximaDataPrevista(partida, 21);
      expect(dia(previsto).getDay(), `${partida} -> ${previsto}`).toBe(1);
    }
  });

  it("dois lotes preservados na mesma semana vencem juntos", () => {
    // Percorre 120 dias: o resultado só muda quando a semana muda.
    for (let i = 0; i < 120; i++) {
      const d = addCalendarDays(dia("2026-01-01"), i);
      const segunda = dia(iso(d));
      segunda.setDate(segunda.getDate() - ((segunda.getDay() + 6) % 7));
      expect(proximaDataPrevista(iso(d), 21), iso(d)).toBe(proximaDataPrevista(iso(segunda), 21));
    }
  });
});

describe("a janela semanal é o que define o cumprimento", () => {
  // Ciclo de 24/08 a 13/09 -> cobrado na semana de 07/09 a 13/09.
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
    // Registrada na quinta 10/09 — semana de 07/09 —, a cobrança vai para a
    // semana de 21/09, duas semanas adiante.
    const feita = lote([pres("2026-08-24"), pres("2026-09-10")]);
    expect(getLotNextDueDate(feita, dia("2026-09-11"))).toBe("2026-09-21");
    expect(getLotPreservationStatus(feita, dia("2026-09-11"))).toBe("preserved");
  });
});
