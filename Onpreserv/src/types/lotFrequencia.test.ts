import { describe, it, expect } from "vitest";
import {
  getLotCycle,
  isWeekend,
  nextBusinessDay,
  addCalendarDays,
  calendarDaysBetween,
  getNextCycleDueDate,
  getDaysLeftInCycle,
  getLotPreservationStatus,
  getLotOverdueWeeks,
  getLotNextDueDate,
  CICLO_AVISO_DIAS,
} from "./lot";
import type { Lot, Preservation } from "./lot";

const dia = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};

function pres(date: string): Preservation {
  return { id: date, date, nextDate: "", observation: "", responsible: "" };
}

function lote(over: Partial<Lot> = {}, datas: string[] = []): Lot {
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
    ...over,
  };
}

describe("rolagem para dia útil", () => {
  it("reconhece sábado e domingo", () => {
    expect(isWeekend(dia("2026-08-29"))).toBe(true); // sábado
    expect(isWeekend(dia("2026-08-30"))).toBe(true); // domingo
    expect(isWeekend(dia("2026-08-28"))).toBe(false); // sexta
  });

  it("sábado rola para a segunda-feira", () => {
    expect(nextBusinessDay(dia("2026-08-29"))).toEqual(dia("2026-08-31"));
  });

  it("domingo rola para a segunda-feira", () => {
    expect(nextBusinessDay(dia("2026-08-30"))).toEqual(dia("2026-08-31"));
  });

  it("dia útil não é alterado", () => {
    for (const d of ["2026-08-24", "2026-08-26", "2026-08-28"]) {
      expect(nextBusinessDay(dia(d))).toEqual(dia(d));
    }
  });
});

describe("aritmética de dias corridos", () => {
  it("soma incluindo fim de semana", () => {
    // Sexta 28/08 + 3 dias corridos = segunda 31/08, contando sábado e domingo.
    expect(addCalendarDays(dia("2026-08-28"), 3)).toEqual(dia("2026-08-31"));
  });

  it("a diferença conta todos os dias, não só os úteis", () => {
    expect(calendarDaysBetween(dia("2026-08-24"), dia("2026-08-31"))).toBe(7);
  });

  it("a diferença é negativa quando a data alvo já passou", () => {
    expect(calendarDaysBetween(dia("2026-08-31"), dia("2026-08-24"))).toBe(-7);
  });
});

describe("vencimento do ciclo por dias corridos", () => {
  const PN = (datas: string[], dias = 30) => lote({ frequenciaDias: dias }, datas);

  it("é a última preservação mais N dias corridos", () => {
    // 24/08 + 30 = 23/09/2026, quarta-feira.
    expect(getNextCycleDueDate(PN(["2026-08-24"]))).toEqual(dia("2026-09-23"));
  });

  it("rola para segunda quando o cálculo cai em sábado", () => {
    // 26/08 + 30 = 25/09/2026, uma sexta... escolhemos um caso que cai sábado:
    // 27/08 + 30 = 26/09/2026 (sábado) → 28/09 (segunda).
    expect(getNextCycleDueDate(PN(["2026-08-27"]))).toEqual(dia("2026-09-28"));
  });

  it("rola para segunda quando o cálculo cai em domingo", () => {
    // 28/08 + 30 = 27/09/2026 (domingo) → 28/09 (segunda).
    expect(getNextCycleDueDate(PN(["2026-08-28"]))).toEqual(dia("2026-09-28"));
  });

  it("nenhum vencimento cai em fim de semana, para qualquer data de partida", () => {
    for (let i = 0; i < 60; i++) {
      const inicio = addCalendarDays(dia("2026-08-01"), i);
      const iso = inicio.toISOString();
      const venc = getNextCycleDueDate(PN([iso.slice(0, 10)]))!;
      expect(isWeekend(venc)).toBe(false);
    }
  });

  it("respeita a quantidade de dias configurada no lote", () => {
    expect(getNextCycleDueDate(PN(["2026-08-24"], 15))).toEqual(dia("2026-09-08"));
    expect(getNextCycleDueDate(PN(["2026-08-24"], 60))).toEqual(dia("2026-10-23"));
  });
});

describe("status pelo ciclo por dias corridos", () => {
  const PN = (datas: string[]) => lote({ frequenciaDias: 30 }, datas);

  it("sem registro é 'sem preservação'", () => {
    expect(getLotPreservationStatus(PN([]), dia("2026-09-01"))).toBe("none");
    expect(getDaysLeftInCycle(PN([]), dia("2026-09-01"))).toBeNull();
  });

  it("no meio do ciclo continua em dia — não alarma a cada semana", () => {
    const lot = PN(["2026-08-24"]);
    expect(getLotPreservationStatus(lot, dia("2026-09-07"))).toBe("preserved");
    expect(getDaysLeftInCycle(lot, dia("2026-09-07"))).toBe(16);
  });

  it("pede ação quando faltam 5 dias ou menos", () => {
    const lot = PN(["2026-08-24"]);
    const venc = getNextCycleDueDate(lot)!;
    const aviso = addCalendarDays(venc, -CICLO_AVISO_DIAS);
    expect(getLotPreservationStatus(lot, aviso)).toBe("upcoming");
    expect(getLotPreservationStatus(lot, venc)).toBe("upcoming");
    expect(getDaysLeftInCycle(lot, venc)).toBe(0);
  });

  it("um dia depois do vencimento, está atrasado", () => {
    const lot = PN(["2026-08-24"]);
    const depois = addCalendarDays(getNextCycleDueDate(lot)!, 1);
    expect(getLotPreservationStatus(lot, depois)).toBe("overdue");
    expect(getDaysLeftInCycle(lot, depois)).toBe(-1);
  });

  it("semanas em atraso não se aplicam a ciclo por dias", () => {
    const lot = PN(["2026-01-01"]);
    expect(getLotPreservationStatus(lot, dia("2026-09-01"))).toBe("overdue");
    expect(getLotOverdueWeeks(lot, dia("2026-09-01"))).toBe(0);
  });
});

describe("frequência configurada no lote", () => {
  it("frequenciaDias define o ciclo, com rótulo próprio", () => {
    expect(getLotCycle(lote({ frequenciaDias: 30 })).tipo).toBe("dias_corridos");
    expect(getLotCycle(lote({ frequenciaDias: 15 })).label).toBe("15 dias");
    expect(getLotCycle(lote({ frequenciaDias: 1 })).label).toBe("Diário");
  });

  it("null explícito significa semanal e NÃO cai no fallback por nome", () => {
    // Este é o ponto: um administrador que escolheu "Semanal" para o PN-34 tem
    // a escolha respeitada, mesmo com o nome casando na lista legada.
    const lot = lote({ name: "Painel PN-34", frequenciaDias: null });
    expect(getLotCycle(lot).tipo).toBe("semanal");
  });

  it("lote nunca configurado ainda usa a lista legada de identificadores", () => {
    // `undefined` = cadastrado antes do campo existir e não migrado.
    const lot = lote({ name: "Painel PN-34" });
    expect(lot.frequenciaDias).toBeUndefined();
    expect(getLotCycle(lot).tipo).toBe("dias_corridos");
    expect(getLotCycle(lot).dias).toBe(30);
  });

  it("o campo vence a lista legada quando os dois se aplicam", () => {
    const lot = lote({ name: "Painel PN-34", frequenciaDias: 60 });
    expect(getLotCycle(lot).dias).toBe(60);
  });

  it("lote comum sem configuração continua semanal", () => {
    expect(getLotCycle(lote({ name: "Transformador" })).tipo).toBe("semanal");
  });

  it("a próxima data acompanha a frequência escolhida", () => {
    expect(getLotNextDueDate(lote({ frequenciaDias: 15 }, ["2026-08-24"]))).toBe("2026-09-08");
    expect(getLotNextDueDate(lote({ frequenciaDias: null }, ["2026-08-24"]))).toBe("2026-08-31");
  });
});
