import { useEffect, useState } from "react";
import type { Board } from "@/types/activities";
import { Modal } from "@/components/ui/overlays";
import { Field, TextArea, TextInput } from "@/components/ui/fields";
import { Dot, PrimaryButton, SecondaryButton } from "@/components/ui/primitives";
import { DEFAULT_COLUMNS } from "@/store/reducer";
import { useDispatch } from "@/store/StoreProvider";
import { uid } from "@/lib/id";

/** Criar um quadro para um novo contexto, ou renomear/descrever um existente. */
export function BoardDialog({
  open,
  board,
  onClose,
  onCreated,
}: {
  open: boolean;
  board?: Board;
  onClose: () => void;
  /** Chamado com o id do quadro recém-criado (para navegar até ele). */
  onCreated?: (id: string) => void;
}) {
  const dispatch = useDispatch();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (!open) return;
    setName(board?.name ?? "");
    setDescription(board?.description ?? "");
  }, [open, board]);

  const save = () => {
    const n = name.trim();
    if (!n) return;
    if (board) dispatch({ type: "board/update", boardId: board.id, name: n, description: description.trim() });
    else {
      const id = uid();
      dispatch({ type: "board/create", name: n, description: description.trim(), id });
      onCreated?.(id);
    }
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={board ? "Editar quadro" : "Novo quadro"}
      subtitle={board ? board.name : "Um quadro por contexto: obra, cliente, sistema, rotina…"}
      width="max-w-md"
      footer={
        <>
          <SecondaryButton onClick={onClose}>Cancelar</SecondaryButton>
          <PrimaryButton onClick={save} disabled={!name.trim()}>
            {board ? "Salvar" : "Criar quadro"}
          </PrimaryButton>
        </>
      }
    >
      <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); save(); }}>
        <Field label="Nome">
          <TextInput autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Comissionamento UTE-02" />
        </Field>
        <Field label="Descrição" hint="Opcional">
          <TextArea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Escopo, local, cliente…" />
        </Field>
        {!board && (
          <div className="rounded-2xl p-4 ring-1 bg-stone-50 ring-stone-200">
            <p className="text-sm font-medium">Etapas iniciais</p>
            <p className="text-xs text-stone-500">Você pode renomear, recolorir, reordenar e criar novas depois.</p>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
              {DEFAULT_COLUMNS.map((c) => (
                <span key={c.name} className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-600">
                  <Dot hue={c.hue} />
                  {c.name}
                </span>
              ))}
            </div>
          </div>
        )}
        <button type="submit" className="hidden" />
      </form>
    </Modal>
  );
}
