import { describe, it, expect } from "vitest";
import {
  getLotFrequencyDays,
  getLotCycle,
  getLotCycleReference,
  getLotDueDate,
  getLotNextDueDate,
  getDaysLeftInCycle,
  getLotPreservationStatus,
  isLotPreserved,
  isLotUpcoming,
  isWeekend,
  nextBusinessDay,
  addCalendarDays,
  calendarDaysBetween,
  avisoDoCiclo,
  PRAZO_PRIMEIRA_PRESERVACAO_DIAS,
  FREQUENCIA_PADRAO_DIAS,
  FREQUENCIA_LONGA_DIAS,
  REGRA_PRIMEIRA_PRESERVACAO_DESDE,
} from "./lot";
import type { Lot, Preservation } from "./lot";

const dia = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};

function pres(date: string): Preservation {
  return { id: date, date, nextDate: "", observation: "", responsible: "" };
}

/** `chegada` é a data de cadastro do lote — a referência da 1ª preservação. */
function lote(over: Partial<Lot> = {}, datas: string[] = [], chegada = "2026-08-24"): Lot {
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
    preservations: datas.map(pres),
    createdAt: `${chegada}T10:00:00.000Z`,
    ...over,
  };
}

// Segunda-feira, e posterior à data em que a regra passou a valer.
const CHEGADA = "2026-09-07";

describe("frequência do lote", () => {
  it("o padrão passou de semanal para 15 dias", () => {
    expect(FREQUENCIA_PADRAO_DIAS).toBe(15);
    expect(getLotFrequencyDays(lote())).toBe(15);
    expect(getLotCycle(lote()).label).toBe("15 dias");
  });

  it("os itens de 30 dias permanecem em 30", () => {
    expect(FREQUENCIA_LONGA_DIAS).toBe(30);
    for (const nome of ["Painel PN-32", "Painel PN-34", "Painel PN-36"]) {
      expect(getLotFrequencyDays(lote({ name: nome })), nome).toBe(30);
    }
  });

  it("a frequência configurada na ficha vence a lista de identificadores", () => {
    expect(getLotFrequencyDays(lote({ name: "Painel PN-34", frequenciaDias: 60 }))).toBe(60);
  });

  it("'null' é escolha de administrador e vale o padrão, sem consultar a lista", () => {
    expect(getLotFrequencyDays(lote({ name: "Painel PN-34", frequenciaDias: null }))).toBe(15);
  });

  it("não confunde identificadores com números maiores", () => {
    for (const nome of ["PN-320", "PN-345", "PN-360"]) {
      expect(getLotFrequencyDays(lote({ name: `Painel ${nome}` })), nome).toBe(15);
    }
  });
});

describe("primeira preservação — 7 dias da chegada", () => {
  it("o prazo é contado da data de cadastro do lote", () => {
    const lot = lote({}, [], CHEGADA);
    const ref = getLotCycleReference(lot)!;
    expect(ref.primeira).toBe(true);
    expect(ref.prazoDias).toBe(PRAZO_PRIMEIRA_PRESERVACAO_DIAS);
    expect(ref.data).toEqual(dia(CHEGADA));
  });

  it("vence 7 dias após a chegada", () => {
    // 07/09 + 7 = 14/09/2026, uma segunda-feira.
    expect(getLotNextDueDate(lote({}, [], CHEGADA))).toBe("2026-09-14");
  });

  it("recém-chegado fica em 'sem preservação', sem alarme", () => {
    expect(getLotPreservationStatus(lote({}, [], CHEGADA), dia("2026-09-08"))).toBe("none");
  });

  it("passa a cobrar quando o prazo se aproxima", () => {
    // Aviso de 3 dias para um prazo de 7 (um terço, arredondado para cima).
    expect(avisoDoCiclo(7)).toBe(3);
    expect(getLotPreservationStatus(lote({}, [], CHEGADA), dia("2026-09-11"))).toBe("upcoming");
  });

  it("vira vencida só quando a semana do vencimento fecha", () => {
    // Vencimento em 14/09, uma segunda: a semana vai até domingo 20/09.
    // Passar do dia não basta — a preservação ainda pode ser feita na semana.
    expect(getLotPreservationStatus(lote({}, [], CHEGADA), dia("2026-09-14"))).toBe("upcoming");
    expect(getLotPreservationStatus(lote({}, [], CHEGADA), dia("2026-09-18"))).toBe("upcoming");
    expect(getLotPreservationStatus(lote({}, [], CHEGADA), dia("2026-09-20"))).toBe("upcoming");
    expect(getLotPreservationStatus(lote({}, [], CHEGADA), dia("2026-09-21"))).toBe("overdue");
  });

  it("nunca fica em 'preservado' antes de existir preservação", () => {
    for (const hoje of ["2026-09-07", "2026-09-10", "2026-09-14", "2026-09-25"]) {
      expect(getLotPreservationStatus(lote({}, [], CHEGADA), dia(hoje))).not.toBe("preserved");
    }
  });

  it("sem data de chegada, não há prazo a calcular", () => {
    const lot = lote({ createdAt: "" }, []);
    expect(getLotCycleReference(lot)).toBeNull();
    expect(getLotPreservationStatus(lot, dia("2026-09-01"))).toBe("none");
  });
});

describe("a regra da 1ª preservação vale só para o material novo", () => {
  const ANTES = "2026-06-01"; // muito antes do corte
  const DEPOIS = "2026-09-07";

  it("lote antigo nunca preservado continua em 'sem preservação', sem cobrança", () => {
    // Sem o corte, este lote apareceria como vencido há mais de cem dias de um
    // dia para o outro — cobrança que não existia quando ele foi cadastrado.
    const lot = lote({}, [], ANTES);
    expect(getLotCycleReference(lot)).toBeNull();
    expect(getLotPreservationStatus(lot, dia("2026-09-20"))).toBe("none");
    expect(getLotNextDueDate(lot)).toBeNull();
  });

  it("lote novo nunca preservado tem o prazo de 7 dias", () => {
    const lot = lote({}, [], DEPOIS);
    expect(getLotCycleReference(lot)?.primeira).toBe(true);
    // 07/09 + 7 = 14/09; a semana fecha em 20/09, então 21/09 já é atraso.
    expect(getLotPreservationStatus(lot, dia("2026-09-21"))).toBe("overdue");
  });

  it("lote antigo COM preservação segue a frequência normalmente", () => {
    // Para os que já existiam, o que mudou foi só a frequência: 15 dias.
    const lot = lote({}, ["2026-09-10"], ANTES);
    expect(getLotFrequencyDays(lot)).toBe(15);
    // 10/09 + 15 = sexta 25/09; a referência é a segunda daquela semana.
    expect(getLotNextDueDate(lot)).toBe("2026-09-21");
    expect(getLotPreservationStatus(lot, dia("2026-09-11"))).toBe("preserved");
  });

  it("o corte compara pela data, ignorando a hora do cadastro", () => {
    const noDia = lote({ createdAt: `${REGRA_PRIMEIRA_PRESERVACAO_DESDE}T23:59:00Z` }, []);
    expect(getLotCycleReference(noDia)?.primeira).toBe(true);
  });
});

describe("preservações seguintes — a última vira a referência", () => {
  it("o prazo passa a ser contado do último registro, não da chegada", () => {
    const lot = lote({}, ["2026-09-10"], CHEGADA);
    const ref = getLotCycleReference(lot)!;
    expect(ref.primeira).toBe(false);
    expect(ref.data).toEqual(dia("2026-09-10"));
    expect(ref.prazoDias).toBe(15);
  });

  it("15 dias depois do registro, na segunda daquela semana", () => {
    // 10/09 + 15 = sexta 25/09; a semana dela abre em 21/09.
    expect(getLotNextDueDate(lote({}, ["2026-09-10"]))).toBe("2026-09-21");
  });

  it("30 dias depois para os itens de ciclo longo", () => {
    // 24/08 + 30 = quarta 23/09; a semana dela abre em 21/09.
    expect(getLotNextDueDate(lote({ name: "Painel PN-34" }, ["2026-08-24"]))).toBe("2026-09-21");
  });

  it("usa a preservação mais recente, mesmo com o histórico fora de ordem", () => {
    const lot = lote({}, ["2026-01-05", "2026-09-10", "2026-03-02"]);
    expect(getLotDueDate(lot)).toEqual(dia("2026-09-21"));
  });

  it("logo após preservar, está em dia", () => {
    const lot = lote({}, ["2026-09-10"]);
    expect(getLotPreservationStatus(lot, dia("2026-09-11"))).toBe("preserved");
    // Conta até o FIM da semana do vencimento (domingo 27/09), não até o dia.
    expect(getDaysLeftInCycle(lot, dia("2026-09-11"))).toBe(16);
  });

  it("avisa quando a semana do vencimento se aproxima e vence quando ela fecha", () => {
    // Vencimento em 25/09 (sexta); a semana vai de 21/09 a domingo 27/09.
    const lot = lote({}, ["2026-09-10"]);
    expect(avisoDoCiclo(15)).toBe(5);
    expect(getLotPreservationStatus(lot, dia("2026-09-18"))).toBe("upcoming");
    expect(getLotPreservationStatus(lot, dia("2026-09-25"))).toBe("upcoming");
    expect(getLotPreservationStatus(lot, dia("2026-09-27"))).toBe("upcoming");
    expect(getLotPreservationStatus(lot, dia("2026-09-28"))).toBe("overdue");
  });

  it("o item de 30 dias não alarma no meio do ciclo", () => {
    // O ponto de manter os 30: passar duas semanas não pode virar cobrança.
    const lot = lote({ name: "Painel PN-34" }, ["2026-08-24"]);
    expect(getLotPreservationStatus(lot, dia("2026-09-07"))).toBe("preserved");
  });
});

describe("rolagem para dia útil", () => {
  it("reconhece sábado e domingo", () => {
    expect(isWeekend(dia("2026-08-29"))).toBe(true);
    expect(isWeekend(dia("2026-08-30"))).toBe(true);
    expect(isWeekend(dia("2026-08-28"))).toBe(false);
  });

  it("sábado e domingo rolam para a segunda", () => {
    expect(nextBusinessDay(dia("2026-08-29"))).toEqual(dia("2026-08-31"));
    expect(nextBusinessDay(dia("2026-08-30"))).toEqual(dia("2026-08-31"));
  });

  it("dia útil não é alterado", () => {
    expect(nextBusinessDay(dia("2026-08-26"))).toEqual(dia("2026-08-26"));
  });

  it("todo vencimento cai numa segunda-feira, para qualquer data de partida", () => {
    for (let i = 0; i < 60; i++) {
      const chegada = addCalendarDays(dia(REGRA_PRIMEIRA_PRESERVACAO_DESDE), i);
      const iso = `${chegada.getFullYear()}-${String(chegada.getMonth() + 1).padStart(2, "0")}-${String(chegada.getDate()).padStart(2, "0")}`;
      // Vale para a 1ª preservação (referência = chegada) e para as seguintes.
      expect(getLotDueDate(lote({}, [], iso))!.getDay(), iso).toBe(1);
      expect(getLotDueDate(lote({}, [iso]))!.getDay(), iso).toBe(1);
      expect(isWeekend(getLotDueDate(lote({}, [iso]))!), iso).toBe(false);
    }
  });
});

describe("aritmética de dias corridos", () => {
  it("soma incluindo o fim de semana", () => {
    expect(addCalendarDays(dia("2026-08-28"), 3)).toEqual(dia("2026-08-31"));
  });

  it("a diferença conta todos os dias", () => {
    expect(calendarDaysBetween(dia("2026-08-24"), dia("2026-08-31"))).toBe(7);
    expect(calendarDaysBetween(dia("2026-08-31"), dia("2026-08-24"))).toBe(-7);
  });

  it("o aviso é um terço do ciclo, limitado a cinco dias", () => {
    expect(avisoDoCiclo(7)).toBe(3);
    expect(avisoDoCiclo(15)).toBe(5);
    expect(avisoDoCiclo(30)).toBe(5);
    expect(avisoDoCiclo(90)).toBe(5);
  });
});

describe("os quatro status continuam os mesmos e são exclusivos", () => {
  it("cada lote está em exatamente um estado", () => {
    const casos: Lot[] = [
      lote({ createdAt: "" }, []),                  // sem chegada
      lote({}, [], CHEGADA),                        // recém-chegado
      lote({}, ["2026-09-10"]),                     // preservado
      lote({}, ["2026-08-01"]),                     // vencido
    ];
    const hoje = dia("2026-09-11");
    for (const lot of casos) {
      const s = getLotPreservationStatus(lot, hoje);
      const marcas = [
        s === "preserved",
        s === "upcoming",
        s === "overdue",
        s === "none",
      ].filter(Boolean);
      expect(marcas).toHaveLength(1);
    }
  });

  it("os atalhos acompanham o status", () => {
    expect(isLotPreserved(lote({}, ["2026-09-10"]), dia("2026-09-11"))).toBe(true);
    expect(isLotUpcoming(lote({}, ["2026-09-10"]), dia("2026-09-22"))).toBe(true);
    expect(isLotPreserved(lote({}, ["2026-08-01"]), dia("2026-09-11"))).toBe(false);
  });
});
