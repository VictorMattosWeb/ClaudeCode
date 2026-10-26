import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { Board, Hue } from "@/types/activities";
import { Modal, Popover } from "@/components/ui/overlays";
import { HuePicker, TextInput } from "@/components/ui/fields";
import { GhostIconButton, Pill, PrimaryButton } from "@/components/ui/primitives";
import { cx } from "@/lib/cx";
import { HUES } from "@/lib/hues";
import { useDispatch } from "@/store/StoreProvider";

/** Gerenciar as etiquetas do quadro: renomear, recolorir, excluir e criar. */
export function TagsDialog({ board, open, onClose }: { board: Board; open: boolean; onClose: () => void }) {
  const dispatch = useDispatch();
  const [name, setName] = useState("");
  const [hue, setHue] = useState<Hue>("blue");

  const add = () => {
    const n = name.trim();
    if (!n) return;
    dispatch({ type: "tag/add", boardId: board.id, name: n, hue });
    setName("");
  };

  const usage = (tagId: string) => board.tasks.filter((t) => t.tagIds.includes(tagId)).length;

  return (
    <Modal open={open} onClose={onClose} title="Etiquetas" subtitle={`${board.tags.length} no quadro ${board.name}`} width="max-w-lg">
      <div className="space-y-3">
        {board.tags.map((tag) => (
          <div key={tag.id} className="flex items-center gap-3 rounded-2xl p-3 ring-1 bg-stone-50 ring-stone-200">
            <Popover
              trigger={({ toggle }) => (
                <button
                  type="button"
                  onClick={toggle}
                  aria-label="Mudar cor"
                  className={cx("h-9 w-9 shrink-0 rounded-lg", HUES[tag.hue].tile, "flex items-center justify-center")}
                >
                  <span className={cx("h-3 w-3 rounded-full", HUES[tag.hue].dot)} />
                </button>
              )}
            >
              {(close) => (
                <div className="p-2">
                  <HuePicker
                    value={tag.hue}
                    onChange={(h) => {
                      dispatch({ type: "tag/update", boardId: board.id, tagId: tag.id, patch: { hue: h } });
                      close();
                    }}
                  />
                </div>
              )}
            </Popover>
            <input
              defaultValue={tag.name}
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (v && v !== tag.name) dispatch({ type: "tag/update", boardId: board.id, tagId: tag.id, patch: { name: v } });
                else e.target.value = tag.name;
              }}
              onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
              className="min-w-0 flex-1 rounded-lg bg-transparent px-2 py-1 text-sm font-medium outline-none focus:bg-white focus:ring-2 focus:ring-stone-900"
            />
            <span className="text-xs text-stone-400 tabular-nums">{usage(tag.id)} uso{usage(tag.id) === 1 ? "" : "s"}</span>
            <GhostIconButton
              icon={Trash2}
              label="Excluir etiqueta"
              small
              onClick={() => dispatch({ type: "tag/delete", boardId: board.id, tagId: tag.id })}
            />
          </div>
        ))}
        {board.tags.length === 0 && <p className="text-sm text-stone-500">Nenhuma etiqueta ainda. Crie a primeira abaixo.</p>}
      </div>

      <div className="mt-6 rounded-2xl p-4 ring-1 bg-white ring-stone-200">
        <p className="mb-3 text-sm font-medium text-stone-500">Nova etiqueta</p>
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); add(); }}>
          <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Instrumentação" />
          <PrimaryButton type="submit" icon={Plus} disabled={!name.trim()} className="shrink-0">
            Criar
          </PrimaryButton>
        </form>
        <div className="mt-3 flex items-center justify-between gap-3">
          <HuePicker value={hue} onChange={setHue} />
          {name.trim() && <Pill hue={hue}>{name.trim()}</Pill>}
        </div>
      </div>
    </Modal>
  );
}
