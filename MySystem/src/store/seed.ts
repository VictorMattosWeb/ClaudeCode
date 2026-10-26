import type { AppState, Board, Priority, Task } from "@/types/activities";
import { uid } from "@/lib/id";
import { addDaysISO } from "@/lib/dates";

const DAY = 86_400_000;

/** Quadro de exemplo no contexto de comissionamento, para o primeiro acesso. */
export function seedState(now = new Date()): AppState {
  const col = {
    backlog: uid(),
    planejado: uid(),
    execucao: uid(),
    cliente: uid(),
    concluido: uid(),
  };
  const tag = {
    eletrico: uid(),
    protecao: uid(),
    sat: uid(),
    doc: uid(),
    punch: uid(),
    cliente: uid(),
  };

  const daysAgo = (n: number) => new Date(now.getTime() - n * DAY).toISOString();

  type Seed = [
    title: string,
    column: keyof typeof col,
    tags: Array<keyof typeof tag>,
    priority: Priority,
    assignee: string,
    dueInDays: number | null,
    createdDaysAgo: number,
    completedDaysAgo: number | null,
    checklist?: Array<[string, boolean]>,
  ];

  const seeds: Seed[] = [
    ["Revisar diagramas unifilares rev. C", "backlog", ["doc"], "media", "Victor", 6, 3, null],
    ["Levantar lista de pendências do painel QGBT-02", "backlog", ["punch", "eletrico"], "baixa", "", 10, 2, null],
    ["Teste de resistência de isolamento — cabos MT", "planejado", ["eletrico", "sat"], "alta", "Victor", 2, 8, null, [
      ["Separar megômetro 5 kV calibrado", true],
      ["Liberar PT com a operação", false],
      ["Registrar leituras no formulário FT-07", false],
    ]],
    ["Parametrizar relés de proteção 50/51", "planejado", ["protecao"], "alta", "Ana", 4, 6, null],
    ["Ensaio de relação de transformação TR-01", "execucao", ["eletrico", "sat"], "alta", "Victor", 0, 12, null, [
      ["Conferir dados de placa", true],
      ["Medir TTR em todos os taps", true],
      ["Comparar com relatório FAT", false],
    ]],
    ["Injeção secundária nos relés do cubículo 3", "execucao", ["protecao", "sat"], "media", "Ana", 1, 10, null],
    ["Atualizar as-built do SPDA", "execucao", ["doc"], "baixa", "Carlos", -2, 15, null],
    ["Aprovação do cliente no procedimento de energização", "cliente", ["cliente", "doc"], "alta", "Victor", -1, 9, null],
    ["Retorno sobre não conformidade NC-014", "cliente", ["cliente", "punch"], "media", "", 5, 7, null],
    ["Inspeção visual dos painéis de baixa tensão", "concluido", ["eletrico"], "media", "Carlos", null, 30, 26],
    ["Teste funcional de intertravamentos", "concluido", ["protecao", "sat"], "alta", "Ana", null, 25, 18],
    ["Checklist de pré-comissionamento SE-01", "concluido", ["doc"], "media", "Victor", null, 28, 21],
    ["Medição de malha de aterramento", "concluido", ["eletrico", "sat"], "alta", "Victor", null, 20, 12],
    ["Fechar punch list categoria A", "concluido", ["punch"], "alta", "Carlos", null, 14, 5],
    ["Enviar relatório de testes semanais", "concluido", ["doc", "cliente"], "baixa", "Victor", null, 6, 2],
  ];

  const docs: Record<string, string> = {
    "Revisar diagramas unifilares rev. C": "DE-ELE-0101 rev. C",
    "Teste de resistência de isolamento — cabos MT": "PRC-ELE-0012",
    "Parametrizar relés de proteção 50/51": "EST-PRT-0034",
    "Ensaio de relação de transformação TR-01": "PRC-ELE-0015",
    "Aprovação do cliente no procedimento de energização": "PRC-COM-0002 rev. B",
    "Medição de malha de aterramento": "RT-ELE-0008",
  };
  const comments: Record<string, Array<[author: string, text: string, hoursAgo: number]>> = {
    "Ensaio de relação de transformação TR-01": [
      ["Victor", "Taps 1 a 3 medidos, todos dentro de ±0,5%. Falta comparar com o FAT.", 26],
      ["Ana", "Relatório FAT está na pasta do projeto, revisão B.", 3],
    ],
    "Aprovação do cliente no procedimento de energização": [
      ["Victor", "Enviado ao cliente por e-mail; aguardando retorno da engenharia deles.", 50],
    ],
  };

  const tasks: Task[] = seeds.map(([title, c, tags, priority, assignee, due, created, completed, checklist]) => ({
    id: uid(),
    title,
    docCode: docs[title] ?? "",
    comments: (comments[title] ?? []).map(([author, text, h]) => ({
      id: uid(),
      author,
      text,
      createdAt: new Date(now.getTime() - h * 3_600_000).toISOString(),
    })),
    description: "",
    columnId: col[c],
    tagIds: tags.map((t) => tag[t]),
    priority,
    assignee,
    dueDate: due === null ? "" : addDaysISO(due, now),
    checklist: (checklist ?? []).map(([text, done]) => ({ id: uid(), text, done })),
    createdAt: daysAgo(created),
    completedAt: completed === null ? null : daysAgo(completed),
  }));

  const board: Board = {
    id: uid(),
    name: "Comissionamento SE-01",
    description: "Subestação 13,8 kV — testes SAT e energização",
    columns: [
      { id: col.backlog, name: "Backlog", hue: "stone", isDone: false },
      { id: col.planejado, name: "Planejado", hue: "blue", isDone: false },
      { id: col.execucao, name: "Em execução", hue: "orange", isDone: false },
      { id: col.cliente, name: "Aguardando cliente", hue: "indigo", isDone: false },
      { id: col.concluido, name: "Concluído", hue: "emerald", isDone: true },
    ],
    tags: [
      { id: tag.eletrico, name: "Elétrico", hue: "amber" },
      { id: tag.protecao, name: "Proteção", hue: "rose" },
      { id: tag.sat, name: "Testes SAT", hue: "blue" },
      { id: tag.doc, name: "Documentação", hue: "purple" },
      { id: tag.punch, name: "Punch list", hue: "orange" },
      { id: tag.cliente, name: "Cliente", hue: "emerald" },
    ],
    tasks,
    createdAt: daysAgo(30),
  };

  return { boards: [board], activeBoardId: board.id };
}
