import { describe, it, expect } from "vitest";
import {
  getLotNextDueDate,
  getLotDueDate,
  getLotDeadline,
  getLotPreservationStatus,
  getLotFrequencyDays,
} from "./lot";
import type { Lot, Preservation } from "./lot";

const dia = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};

function pres(date: string, nextDate = ""): Preservation {
  return { id: date, date, nextDate, observation: "", responsible: "" };
}

function lote(nome: string, preservacoes: Preservation[]): Lot {
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

/**
 * A previsão é uma SEMANA, e a segunda-feira é o nome dela.
 *
 * A frequência é respeitada normalmente; depois de encontrar a data teórica, o
 * sistema identifica a semana em que ela cai e usa a segunda dessa semana como
 * referência. Preservar em qualquer dia daquela semana cumpre o ciclo.
 */
describe("o exemplo da regra: teórica na quarta 02/09 vira segunda 31/08", () => {
  const HOJE = dia("2026-09-02"); // quarta-feira

  it("PN preservado em 03/08: teórica 02/09, referência 31/08", () => {
    // 03/08 + 30 dias corridos = quarta 02/09.
    // Semana: segunda 31/08 a domingo 06/09. Referência exibida: 31/08.
    const pn = lote("Painel PN-34", [pres("2026-08-03")]);
    expect(getLotFrequencyDays(pn)).toBe(30);
    expect(getLotNextDueDate(pn, HOJE)).toBe("2026-08-31");
  });

  it("a janela vai de 31/08 a 06/09", () => {
    const pn = lote("Painel PN-34", [pres("2026-08-03")]);
    expect(getLotDueDate(pn, HOJE)).toEqual(dia("2026-08-31"));
    expect(getLotDeadline(pn, HOJE)).toEqual(dia("2026-09-06"));
  });

  it("preservar em qualquer dia da janela cumpre o ciclo", () => {
    for (const quando of ["2026-08-31", "2026-09-02", "2026-09-04", "2026-09-06"]) {
      const feita = lote("Painel PN-34", [pres("2026-08-03"), pres(quando)]);
      // Registrada dentro da semana prevista, o lote sai da cobrança.
      expect(getLotPreservationStatus(feita, dia(quando)), quando).not.toBe("overdue");
    }
  });

  it("dentro da janela cobra, mas não acusa atraso", () => {
    const pn = lote("Painel PN-34", [pres("2026-08-03")]);
    expect(getLotPreservationStatus(pn, HOJE)).toBe("upcoming");
  });

  it("a agenda antiga do registro não interfere no ciclo longo", () => {
    for (const agendada of ["", "2026-08-10", "2026-09-23", "2026-12-25"]) {
      const pn = lote("Painel PN-34", [pres("2026-08-03", agendada)]);
      expect(getLotNextDueDate(pn, HOJE), agendada || "(vazia)").toBe("2026-08-31");
    }
  });

  it("vale para os três: PN-32, PN-34 e PN-36", () => {
    for (const nome of ["Painel PN-32", "Painel PN-34", "Painel PN-36"]) {
      expect(getLotNextDueDate(lote(nome, [pres("2026-08-03")]), HOJE), nome).toBe("2026-08-31");
    }
  });
});

describe("o lote de 15 dias segue como estava", () => {
  const HOJE = dia("2026-09-02");

  it("a data agendada de 31/08 continua sendo respeitada", () => {
    const comum = lote("Painel PN-12", [pres("2026-08-24", "2026-08-31")]);
    expect(getLotFrequencyDays(comum)).toBe(15);
    expect(getLotNextDueDate(comum, HOJE)).toBe("2026-08-31");
    expect(getLotPreservationStatus(comum, HOJE)).toBe("upcoming");
  });

  it("passada a semana da agendada, a frequência assume", () => {
    const comum = lote("Painel PN-12", [pres("2026-08-24", "2026-08-31")]);
    // 24/08 + 15 = terça 08/09; a semana dela abre em 07/09.
    expect(getLotNextDueDate(comum, dia("2026-09-08"))).toBe("2026-09-07");
  });

  it("sem data agendada, é sempre a frequência", () => {
    expect(getLotNextDueDate(lote("Painel PN-12", [pres("2026-08-24")]), HOJE)).toBe("2026-09-07");
  });
});

describe("sequência do PN a cada 30 dias", () => {
  it("cada etapa soma 30 dias e recua para a segunda da semana", () => {
    const passos = [
      ["2026-08-03", "2026-08-31"], // teórica quarta 02/09
      ["2026-08-31", "2026-09-28"], // teórica quarta 30/09
      ["2026-09-28", "2026-10-26"], // teórica quarta 28/10
      ["2026-10-26", "2026-11-23"], // teórica quarta 25/11
    ];
    for (const [registro, esperado] of passos) {
      const pn = lote("Painel PN-34", [pres(registro)]);
      expect(getLotNextDueDate(pn, dia(registro)), registro).toBe(esperado);
    }
  });

  it("toda referência da sequência cai numa segunda-feira", () => {
    let data = "2026-08-03";
    for (let i = 0; i < 12; i++) {
      const proxima = getLotNextDueDate(lote("Painel PN-34", [pres(data)]), dia(data))!;
      expect(dia(proxima).getDay(), proxima).toBe(1);
      data = proxima;
    }
  });
});
