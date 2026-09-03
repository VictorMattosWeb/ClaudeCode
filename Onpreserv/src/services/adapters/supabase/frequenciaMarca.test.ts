import { describe, it, expect } from "vitest";
import { lerFrequenciaDaObservacao, semMarca, comMarca } from "./lots";

/**
 * A frequência guardada dentro de `observacoes`, enquanto a coluna
 * `lots.frequencia_dias` não existir no banco.
 */
describe("marca de frequência na observação", () => {
  it("grava e lê de volta o valor escolhido", () => {
    const gravado = comMarca("Painel avariado", 30);
    expect(lerFrequenciaDaObservacao(gravado)).toBe(30);
  });

  it("o texto do usuário volta limpo, sem a marca", () => {
    const gravado = comMarca("Painel avariado", 30);
    expect(semMarca(gravado)).toBe("Painel avariado");
  });

  it("preserva quebras de linha do texto original", () => {
    const texto = "Linha 1\nLinha 2";
    expect(semMarca(comMarca(texto, 15))).toBe(texto);
  });

  it("sem observação, guarda só a marca", () => {
    expect(comMarca("", 30)).toBe("[freq:30]");
    expect(semMarca("[freq:30]")).toBe("");
  });

  it("regravar não empilha marcas", () => {
    const uma = comMarca("Obs", 30);
    const outra = comMarca(uma, 15);
    expect(lerFrequenciaDaObservacao(outra)).toBe(15);
    expect(semMarca(outra)).toBe("Obs");
    expect(outra.match(/\[freq:/g)).toHaveLength(1);
  });

  it("voltar ao padrão remove a marca", () => {
    expect(comMarca(comMarca("Obs", 30), null)).toBe("Obs");
    expect(lerFrequenciaDaObservacao(comMarca(comMarca("Obs", 30), null))).toBeNull();
  });

  it("observação sem marca não inventa frequência", () => {
    for (const obs of ["", "Painel avariado", "freq: 30", "[freq:]", null, undefined]) {
      expect(lerFrequenciaDaObservacao(obs), String(obs)).toBeNull();
      expect(semMarca(obs)).toBe(obs ?? "");
    }
  });
});
