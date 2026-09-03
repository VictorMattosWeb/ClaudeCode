import { describe, it, expect } from "vitest";
import {
  startOfWeek,
  endOfWeek,
  getLotDueDate,
  getLotDeadline,
  getLotNextDueDate,
  getDaysLeftInCycle,
  getLotPreservationStatus,
  proximaDataPrevista,
  addDays,
} from "./lot";
import type { Lot, Preservation } from "./lot";

const dia = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};

/** Preservação com a data agendada explícita, como fica gravada no registro. */
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

describe("limites da semana", () => {
  it("segunda abre e domingo fecha a mesma semana", () => {
    // 31/08/2026 é segunda; 06/09 é o domingo que a fecha.
    expect(startOfWeek(dia("2026-08-31"))).toEqual(dia("2026-08-31"));
    expect(endOfWeek(dia("2026-08-31"))).toEqual(dia("2026-09-06"));
  });

  it("domingo pertence à semana que termina nele, não à seguinte", () => {
    // Sem esse tratamento, `getDay() === 0` jogaria domingo para a semana
    // seguinte e a cobrança fecharia um dia cedo.
    expect(startOfWeek(dia("2026-09-06"))).toEqual(dia("2026-08-31"));
  });
});

describe("a data agendada no registro é respeitada", () => {
  // O caso relatado: preservado em 24/08 com 31/08 agendado pela regra semanal.
  const lot = lote([pres("2026-08-24", "2026-08-31")]);

  it("vale o que estava agendado, não o recálculo pela frequência nova", () => {
    // Recalcular daria 24/08 + 15 = 08/09, empurrando um compromisso já firmado.
    expect(getLotNextDueDate(lot)).toBe("2026-08-31");
  });

  it("sem data agendada, cai no cálculo pela frequência", () => {
    // 24/08 + 15 = terça 08/09; a semana dela abre em 07/09.
    expect(getLotNextDueDate(lote([pres("2026-08-24")]))).toBe("2026-09-07");
  });

  it("a partir dali, o passo é de 15 dias", () => {
    // Feita a preservação de 31/08, a teórica é 15/09 (terça): semana de 14/09.
    expect(proximaDataPrevista("2026-08-31", 15)).toBe("2026-09-14");
    const seguinte = lote([pres("2026-08-31", "2026-09-14")]);
    expect(getLotNextDueDate(seguinte)).toBe("2026-09-14");
  });
});

describe("a semana do vencimento é o que define o cumprimento", () => {
  // Vencimento em 31/08 (segunda). A semana vai até domingo 06/09.
  const lot = lote([pres("2026-08-24", "2026-08-31")]);

  it("o prazo real é o fim da semana do vencimento", () => {
    expect(getLotDueDate(lot)).toEqual(dia("2026-08-31"));
    expect(getLotDeadline(lot)).toEqual(dia("2026-09-06"));
  });

  it("dentro da semana do vencimento, cobra mas não acusa atraso", () => {
    for (const hoje of ["2026-08-31", "2026-09-02", "2026-09-04", "2026-09-06"]) {
      expect(getLotPreservationStatus(lot, dia(hoje)), hoje).toBe("upcoming");
    }
  });

  it("preservar na quinta cumpre um vencimento de terça da mesma semana", () => {
    // É o ponto da regra: remanejar a equipe dentro da semana não vira atraso.
    const terca = lote([pres("2026-08-17", "2026-09-01")]);
    expect(getLotPreservationStatus(terca, dia("2026-09-03"))).toBe("upcoming");
    // Registrada a preservação na quinta, o ciclo avança e sai da cobrança.
    const feita = lote([pres("2026-09-03", "2026-09-18")]);
    expect(getLotPreservationStatus(feita, dia("2026-09-04"))).toBe("preserved");
  });

  it("cobra até o domingo que fecha a semana do vencimento", () => {
    expect(getLotPreservationStatus(lot, dia("2026-09-06"))).toBe("upcoming");
  });

  it("os dias restantes contam até o fim da semana, não até o dia", () => {
    // Na quarta 02/09 restam 4 dias até domingo 06/09.
    expect(getDaysLeftInCycle(lot, dia("2026-09-02"))).toBe(4);
  });

  it("fechada a semana da agendada, a frequência assume o cálculo", () => {
    // Este lote foi preservado em 24/08 e tinha 31/08 agendado pela regra
    // semanal antiga. Em 07/09 aquela semana fechou, e a data deixa de valer:
    // pela frequência de 15 dias, a teórica é 24/08 + 15 = 08/09, cuja semana
    // abre justamente em 07/09.
    //
    // É o mesmo mecanismo que faz o PN de 03/08 vencer em 02/09 em vez de
    // aparecer atrasado desde agosto por causa de uma agenda da regra velha.
    expect(getLotNextDueDate(lot, dia("2026-09-07"))).toBe("2026-09-07");
    expect(getLotPreservationStatus(lot, dia("2026-09-07"))).toBe("upcoming");
  });

  it("no regime novo o atraso NÃO é escondido", () => {
    // A partir daqui, todo registro grava `nextDate` = data + frequência, então
    // a agendada e o cálculo coincidem — e a volta pela frequência devolve a
    // mesma data. Um lote que passou da semana continua vencido.
    const novo = lote([pres("2026-08-10", "2026-08-24")]); // 10/08 + 15 = 25/08 -> semana de 24/08
    expect(getLotNextDueDate(novo, dia("2026-09-07"))).toBe("2026-08-24");
    expect(getLotPreservationStatus(novo, dia("2026-09-07"))).toBe("overdue");
  });

  it("antes da semana do vencimento, o lote está em dia", () => {
    expect(getLotPreservationStatus(lot, dia("2026-08-24"))).toBe("preserved");
  });

  it("avisa quando a semana do vencimento se aproxima", () => {
    // Aviso de 5 dias para o ciclo de 15: 26/08 está a 5 dias da semana que
    // abre em 31/08.
    expect(getLotPreservationStatus(lot, dia("2026-08-26"))).toBe("upcoming");
  });
});

describe("addDays deixou de mentir", () => {
  it("respeita a frequência pedida, e devolve a semana dela", () => {
    // Antes esta função ignorava o parâmetro e devolvia sempre a segunda
    // SEGUINTE — por isso a frequência nunca chegava ao registro. Hoje o
    // intervalo é respeitado e o resultado é a segunda da semana em que ele cai.
    expect(addDays("2026-08-31", 15)).toBe("2026-09-14"); // teórica 15/09, terça
    expect(addDays("2026-08-24", 30)).toBe("2026-09-21"); // teórica 23/09, quarta
  });

  it("o intervalo muda de semana quando deve, e só então", () => {
    // 20/08 + 15 = sexta 04/09 e 21/08 + 15 = sábado 05/09: mesma semana, a
    // de 31/08. Já 23/08 + 15 = segunda 07/09, que abre a semana seguinte.
    expect(addDays("2026-08-20", 15)).toBe("2026-08-31");
    expect(addDays("2026-08-21", 15)).toBe("2026-08-31");
    expect(addDays("2026-08-23", 15)).toBe("2026-09-07");
  });
});
