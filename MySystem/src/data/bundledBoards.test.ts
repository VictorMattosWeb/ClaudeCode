import { describe, expect, it } from "vitest";
import type { Board } from "@/types/activities";
import ld504 from "./ld-504-rev-e.json";

// Os quadros da LD-504 não entram mais pelo navegador: viram SQL (supabase/seed) que o admin roda uma vez.
const BOARDS = ld504 as Board[];

describe("quadros da LD-504 rev. E (fonte do seed SQL)", () => {
  const tasks = BOARDS.flatMap((b) => b.tasks);

  it("um quadro por área + Documentação geral, primeiro na lista", () => {
    expect(BOARDS).toHaveLength(20);
    expect(BOARDS[0].name).toBe("Documentação geral");
    expect(new Set(BOARDS.map((b) => b.id)).size).toBe(20);
  });

  it("542 documentos ativos, sem duplicados, com as etapas padrão", () => {
    expect(tasks).toHaveLength(542);
    expect(new Set(tasks.map((t) => t.docCode.replace(/ rev\. .+$/, ""))).size).toBe(542);
    for (const b of BOARDS) {
      expect(b.columns.map((c) => c.name)).toEqual(["A emitir", "Em andamento", "SIGEM", "Com comentários", "Recusado", "Concluído"]);
    }
  });

  it("toda atividade aponta para etapa e etiquetas do próprio quadro", () => {
    for (const b of BOARDS) {
      const cols = new Set(b.columns.map((c) => c.id));
      const tags = new Set(b.tags.map((t) => t.id));
      for (const t of b.tasks) {
        expect(cols.has(t.columnId)).toBe(true);
        expect(t.tagIds.every((id) => tags.has(id))).toBe(true);
      }
    }
  });
});
