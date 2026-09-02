import { TaskLabel } from "@/types/task";

export function LabelChip({ label }: { label: TaskLabel }) {
  return (
    <span
      className="inline-flex items-center gap-1 border px-1.5 py-0.5 text-[10px] font-medium"
      style={{
        backgroundColor: `${label.cor}22`,
        color: label.cor,
        borderColor: `${label.cor}66`,
      }}
    >
      {label.nome}
    </span>
  );
}
