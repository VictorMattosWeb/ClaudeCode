import { describe, it, expect } from "vitest";
import {
  startOfWeek,
  endOfWeek,
  currentWeekRange,
  weeksSinceLastPreservation,
  getLotPreservationStatus,
  getLotOverdueWeeks,
  getDaysLeftInWeek,
  isLotPreserved,
  isLotUpcoming,
} from "./lot";
import type { Lot, Preservation } from "./lot";

/** Data local a partir de "YYYY-MM-DD" — o mesmo tratamento que a regra usa. */
const dia = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};

function pres(date: string): Preservation {
  return { id: date, date, nextDate: "", observation: "", responsible: "" };
}

function lote(datas: string[]): Lot {
  return {
    id: "1",
    identificadorInterno: "NOV-0001",
    tipoLote: "novo",
    code: "NF-1",
    name: "Painel",
    location: "",
    rua: "",
    prateleira: "",
    responsible: "",
    status: "ativo",
    observations: "",
    preservations: datas.map(pres),
    createdAt: "2026-01-01T00:00:00Z",
  };
}

// A semana do exemplo do enunciado: segunda 24/08 a domingo 30/08 de 2026.
const SEG = "2026-08-24";
const QUA = "2026-08-26";
const DOM = "2026-08-30";
const SEG_SEGUINTE = "2026-08-31";

describe("limites da semana", () => {
  it("segunda é o início da própria semana", () => {
    expect(startOfWeek(dia(SEG))).toEqual(dia(SEG));
  });

  it("domingo pertence à semana que termina nele, não à seguinte", () => {
    // É o erro clássico de `getDay() === 0`: sem tratamento, domingo viraria
    // início da semana seguinte e o ciclo fecharia um dia cedo.
    expect(startOfWeek(dia(DOM))).toEqual(dia(SEG));
    expect(endOfWeek(dia(DOM))).toEqual(dia(DOM));
  });

  it("qualquer dia da semana devolve a mesma segunda e o mesmo domingo", () => {
    for (const d of [SEG, "2026-08-25", QUA, "2026-08-27", "2026-08-28", "2026-08-29", DOM]) {
      expect(startOfWeek(dia(d))).toEqual(dia(SEG));
      expect(endOfWeek(dia(d))).toEqual(dia(DOM));
    }
  });

  it("segunda-feira seguinte já é outra semana", () => {
    expect(startOfWeek(dia(SEG_SEGUINTE))).toEqual(dia(SEG_SEGUINTE));
  });

  it("currentWeekRange devolve o período em ISO", () => {
    expect(currentWeekRange(dia(QUA))).toEqual({ inicio: SEG, fim: DOM });
  });
});

describe("dias restantes no ciclo", () => {
  it("segunda tem a semana inteira pela frente", () => {
    expect(getDaysLeftInWeek(dia(SEG))).toBe(7);
  });
  it("quarta tem cinco dias", () => {
    expect(getDaysLeftInWeek(dia(QUA))).toBe(5);
  });
  it("domingo é o último dia", () => {
    expect(getDaysLeftInWeek(dia(DOM))).toBe(1);
  });
});

describe("status por semana de referência", () => {
  it("sem nenhuma preservação, o status é 'sem preservação'", () => {
    expect(getLotPreservationStatus(lote([]), dia(QUA))).toBe("none");
    expect(weeksSinceLastPreservation(lote([]), dia(QUA))).toBeNull();
  });

  it("preservado na segunda conta como em dia na quarta", () => {
    expect(getLotPreservationStatus(lote([SEG]), dia(QUA))).toBe("preserved");
  });

  it("preservado no domingo conta como em dia no próprio domingo", () => {
    expect(getLotPreservationStatus(lote([DOM]), dia(DOM))).toBe("preserved");
  });

  it("o exemplo do enunciado: qualquer dia entre 24 e 30/08 cumpre a semana", () => {
    for (const d of [SEG, "2026-08-25", QUA, "2026-08-27", "2026-08-28", "2026-08-29", DOM]) {
      expect(getLotPreservationStatus(lote([d]), dia(DOM))).toBe("preserved");
    }
  });

  it("na quarta, sem registro nesta semana mas com registro na semana passada, NÃO está atrasado", () => {
    // O ponto central da mudança: ainda há tempo até domingo.
    const lot = lote(["2026-08-19"]); // quarta da semana anterior
    expect(getLotPreservationStatus(lot, dia(QUA))).toBe("upcoming");
    expect(getLotOverdueWeeks(lot, dia(QUA))).toBe(0);
  });

  it("no domingo, ainda sem registro na semana, continua não atrasado — o ciclo só fecha no fim do dia", () => {
    const lot = lote(["2026-08-19"]);
    expect(getLotPreservationStatus(lot, dia(DOM))).toBe("upcoming");
  });

  it("na segunda seguinte, a semana fechou vazia e vira vencida", () => {
    const lot = lote(["2026-08-19"]);
    expect(getLotPreservationStatus(lot, dia(SEG_SEGUINTE))).toBe("overdue");
    expect(getLotOverdueWeeks(lot, dia(SEG_SEGUINTE))).toBe(1);
  });

  it("conta uma semana vencida para cada semana fechada sem registro", () => {
    const lot = lote(["2026-08-05"]); // três semanas antes de 24/08
    expect(getLotPreservationStatus(lot, dia(QUA))).toBe("overdue");
    expect(getLotOverdueWeeks(lot, dia(QUA))).toBe(2);
  });

  it("a virada da segunda abre ciclo novo: quem estava em dia passa a pendente", () => {
    const lot = lote([QUA]);
    expect(getLotPreservationStatus(lot, dia(DOM))).toBe("preserved");
    expect(getLotPreservationStatus(lot, dia(SEG_SEGUINTE))).toBe("upcoming");
  });

  it("usa a preservação MAIS RECENTE, mesmo se o histórico estiver fora de ordem", () => {
    const lot = lote(["2026-08-05", QUA, "2026-07-01"]);
    expect(getLotPreservationStatus(lot, dia(DOM))).toBe("preserved");
  });

  it("registro com data futura cumpre a semana dele, não a atual", () => {
    const lot = lote([SEG_SEGUINTE]); // semana seguinte
    // Na quarta da semana atual, a semana atual segue sem registro.
    expect(weeksSinceLastPreservation(lot, dia(QUA))).toBe(-1);
    expect(getLotPreservationStatus(lot, dia(QUA))).toBe("preserved");
  });

  it("ignora registros sem data", () => {
    const lot = lote([]);
    lot.preservations = [{ id: "x", date: "", nextDate: "", observation: "", responsible: "" }];
    expect(getLotPreservationStatus(lot, dia(QUA))).toBe("none");
  });
});

describe("atalhos de status", () => {
  it("isLotPreserved é verdadeiro só quando a semana atual foi cumprida", () => {
    expect(isLotPreserved(lote([QUA]), dia(DOM))).toBe(true);
    expect(isLotPreserved(lote(["2026-08-19"]), dia(QUA))).toBe(false);
    expect(isLotPreserved(lote([]), dia(QUA))).toBe(false);
  });

  it("isLotUpcoming marca a semana aberta e ainda não cumprida", () => {
    expect(isLotUpcoming(lote(["2026-08-19"]), dia(QUA))).toBe(true);
    expect(isLotUpcoming(lote([QUA]), dia(QUA))).toBe(false);
    // Já vencido não é "próximo": é atrasado.
    expect(isLotUpcoming(lote(["2026-08-05"]), dia(QUA))).toBe(false);
  });

  it("preserved, upcoming e overdue são mutuamente exclusivos", () => {
    const casos: Lot[] = [lote([]), lote([QUA]), lote(["2026-08-19"]), lote(["2026-08-05"])];
    for (const lot of casos) {
      const marcas = [
        isLotPreserved(lot, dia(QUA)),
        isLotUpcoming(lot, dia(QUA)),
        getLotPreservationStatus(lot, dia(QUA)) === "overdue",
        getLotPreservationStatus(lot, dia(QUA)) === "none",
      ].filter(Boolean);
      expect(marcas).toHaveLength(1);
    }
  });
});
