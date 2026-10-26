import { useEffect, useState } from "react";
import type { Board, Column, Hue } from "@/types/activities";
import { Modal } from "@/components/ui/overlays";
import { Field, HuePicker, Select, TextInput } from "@/components/ui/fields";
import { Dot, PrimaryButton, SecondaryButton } from "@/components/ui/primitives";
import { useDispatch } from "@/store/StoreProvider";

/** Criar/editar etapa: nome, cor da etiqueta da etapa e se ela conta como conclusão. */
export function ColumnDialog({ board, column, onClose }: { board: Board; column: Column | "new" | null; onClose: () => void }) {
  const dispatch = useDispatch();
  const isNew = column === "new";
  const [name, setName] = useState("");
  const [hue, setHue] = useState<Hue>("stone");
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    if (!column) return;
    setName(isNew ? "" : column.name);
    setHue(isNew ? "blue" : column.hue);
    setIsDone(isNew ? false : column.isDone);
  }, [column, isNew]);

  const save = () => {
    const n = name.trim();
    if (!n || !column) return;
    if (isNew) dispatch({ type: "column/add", boardId: board.id, name: n, hue });
    else dispatch({ type: "column/update", boardId: board.id, columnId: column.id, patch: { name: n, hue, isDone } });
    onClose();
  };

  return (
    <Modal
      open={!!column}
      onClose={onClose}
      title={isNew ? "Nova etapa" : "Editar etapa"}
      subtitle={board.name}
      width="max-w-md"
      footer={
        <>
          <SecondaryButton onClick={onClose}>Cancelar</SecondaryButton>
          <PrimaryButton onClick={save} disabled={!name.trim()}>Salvar</PrimaryButton>
        </>
      }
    >
      <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); save(); }}>
        <Field label="Nome da etapa">
          <TextInput autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Em execução" />
        </Field>
        <Field label="Cor">
          <HuePicker value={hue} onChange={setHue} />
        </Field>
        {!isNew && (
          <label className="flex cursor-pointer items-start gap-3 rounded-2xl p-4 ring-1 bg-stone-50 ring-stone-200">
            <input type="checkbox" checked={isDone} onChange={(e) => setIsDone(e.target.checked)} className="mt-0.5 h-4 w-4 accent-stone-900" />
            <span>
              <span className="block text-sm font-medium">Etapa de conclusão</span>
              <span className="block text-xs text-stone-500">Atividades aqui contam como concluídas nas estatísticas.</span>
            </span>
          </label>
        )}
        <button type="submit" className="hidden" />
      </form>
    </Modal>
  );
}

export function DeleteColumnDialog({ board, column, onClose }: { board: Board; column: Column | null; onClose: () => void }) {
  const dispatch = useDispatch();
  const others = board.columns.filter((c) => c.id !== column?.id);
  const count = column ? board.tasks.filter((t) => t.columnId === column.id).length : 0;
  const [moveTo, setMoveTo] = useState<string>("");

  useEffect(() => {
    if (column) setMoveTo(others[0]?.id ?? "");
  }, [column]);

  const confirm = () => {
    if (!column) return;
    dispatch({ type: "column/delete", boardId: board.id, columnId: column.id, moveTo: count && moveTo ? moveTo : null });
    onClose();
  };

  return (
    <Modal
      open={!!column}
      onClose={onClose}
      title="Excluir etapa"
      subtitle={column?.name}
      width="max-w-md"
      footer={
        <>
          <SecondaryButton onClick={onClose}>Cancelar</SecondaryButton>
          <PrimaryButton onClick={confirm}>Excluir etapa</PrimaryButton>
        </>
      }
    >
      {count === 0 ? (
        <p className="text-sm text-stone-500">A etapa está vazia e será removida do quadro.</p>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-stone-500">
            Esta etapa tem <span className="font-medium text-stone-900">{count} atividade{count > 1 ? "s" : ""}</span>. Para onde elas vão?
          </p>
          <Field label="Mover atividades para">
            <Select value={moveTo} onChange={(e) => setMoveTo(e.target.value)}>
              {others.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
              <option value="">Excluir as atividades junto</option>
            </Select>
          </Field>
          {moveTo && (
            <p className="flex items-center gap-2 text-xs text-stone-500">
              <Dot hue={others.find((c) => c.id === moveTo)?.hue ?? "stone"} />
              As atividades mantêm etiquetas, prazos e checklist.
            </p>
          )}
          {!moveTo && <p className="text-xs font-medium text-rose-600">As {count} atividades serão excluídas permanentemente.</p>}
        </div>
      )}
    </Modal>
  );
}
