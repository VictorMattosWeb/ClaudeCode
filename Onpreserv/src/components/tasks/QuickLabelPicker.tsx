import { useMemo, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Check, Tag, Settings2 } from "lucide-react";
import { useTasks } from "@/context/TaskContext";
import { useAuth } from "@/context/AuthContext";
import { Task } from "@/types/task";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { LabelManagerDialog } from "./LabelManagerDialog";

interface Props {
  task: Task;
  variant?: "icon" | "chip";
  className?: string;
}

/**
 * Popover para aplicar/remover etiquetas em uma tarefa sem precisar
 * abrir o diálogo de edição completo.
 */
export function QuickLabelPicker({ task, variant = "icon", className }: Props) {
  const { labels, updateTask } = useTasks();
  const { isViewer } = useAuth();
  const [open, setOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const selectedIds = useMemo(
    () => new Set((task.labels ?? []).map((l) => l.id)),
    [task.labels],
  );

  if (isViewer) return null;

  const toggle = async (labelId: string) => {
    if (busy) return;
    setBusy(true);
    const next = new Set(selectedIds);
    if (next.has(labelId)) next.delete(labelId);
    else next.add(labelId);
    try {
      await updateTask(task.id, {}, Array.from(next));
    } catch {
      toast.error("Não foi possível atualizar as etiquetas.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label="Aplicar etiquetas"
            title="Aplicar etiquetas"
            onClick={(e) => e.stopPropagation()}
            className={cn(
              variant === "icon"
                ? "inline-flex h-7 w-7 items-center justify-center rounded-md border border-border/70 bg-background/70 text-muted-foreground transition hover:text-foreground hover:border-primary/40"
                : "inline-flex items-center gap-1 rounded-md border border-dashed border-border px-2 py-0.5 text-[11px] text-muted-foreground hover:text-foreground hover:border-primary/40",
              className,
            )}
          >
            <Tag className="h-3.5 w-3.5" />
            {variant === "chip" && <span>Etiqueta</span>}
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-64 p-0"
          align="start"
          onClick={(e) => e.stopPropagation()}
        >
          <Command>
            <CommandInput placeholder="Buscar etiqueta..." />
            <CommandList>
              <CommandEmpty>Nenhuma etiqueta encontrada.</CommandEmpty>
              <CommandGroup>
                {labels.map((l) => {
                  const checked = selectedIds.has(l.id);
                  return (
                    <CommandItem
                      key={l.id}
                      value={l.nome}
                      onSelect={() => toggle(l.id)}
                      className="flex items-center gap-2"
                    >
                      <span
                        className="h-3 w-3 rounded-full shrink-0"
                        style={{ backgroundColor: l.cor }}
                      />
                      <span className="flex-1 truncate">{l.nome}</span>
                      {checked && <Check className="h-4 w-4 text-primary" />}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
            <div className="border-t p-1">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-xs"
                onClick={() => {
                  setOpen(false);
                  setManageOpen(true);
                }}
              >
                <Settings2 className="mr-2 h-3.5 w-3.5" />
                Gerenciar etiquetas
              </Button>
            </div>
          </Command>
        </PopoverContent>
      </Popover>
      <LabelManagerDialog open={manageOpen} onOpenChange={setManageOpen} />
    </>
  );
}
