import { useState } from "react";
import { NavLink, useMatch, useNavigate } from "react-router-dom";
import { KanbanSquare, LayoutDashboard, LayoutGrid, LogOut, Plus, UserCog, Users, X, Zap } from "lucide-react";
import { cx } from "@/lib/cx";
import { useAuth } from "@/auth/AuthProvider";
import { ProfileDialog } from "@/auth/ProfileDialog";
import { useAppState, useSyncStatus } from "@/store/StoreProvider";
import { BoardDialog } from "@/features/activities/dialogs/BoardDialog";
import { Avatar } from "@/features/activities/TaskBits";

const MODULES = [
  { to: "/painel", label: "Painel", icon: LayoutDashboard, adminOnly: false },
  { to: "/atividades", label: "Atividades", icon: KanbanSquare, adminOnly: false },
  { to: "/usuarios", label: "Usuários", icon: Users, adminOnly: true },
];

const SYNC_LABEL = {
  saved: { text: "Sincronizado", dot: "bg-emerald-500" },
  saving: { text: "Salvando…", dot: "bg-amber-400 animate-pulse" },
  error: { text: "Erro ao salvar", dot: "bg-rose-500" },
} as const;

/**
 * Sidebar no vidro escuro do catálogo do design system:
 * rgba(28,25,23,.94) + blur 16px, raio 24px, margem 16px; rótulos de seção em caixa alta 12px
 * stone-400 com tracking .12em; item atual bg #292524 com o número em amber-400.
 */
export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { boards } = useAppState();
  const { profile, isAdmin, signOut } = useAuth();
  const sync = useSyncStatus();
  const navigate = useNavigate();
  const currentBoardId = useMatch("/atividades/:boardId")?.params.boardId;
  const [creating, setCreating] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);

  const itemBase = "group flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-colors";
  const modules = MODULES.filter((m) => !m.adminOnly || isAdmin);
  const syncLabel = SYNC_LABEL[sync.state];

  return (
    <>
      {/* Fundo do drawer no mobile */}
      <div
        className={cx("fixed inset-0 z-30 bg-stone-900/30 md:hidden", open ? "block" : "hidden")}
        onClick={onClose}
      />
      <aside
        className={cx(
          "fixed inset-y-0 left-0 z-40 m-4 flex w-[248px] flex-col rounded-3xl text-stone-300 shadow-side backdrop-blur-[16px] backdrop-saturate-[1.1] transition-transform md:static md:z-auto md:m-0 md:ml-4 md:my-4 md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-[calc(100%+2rem)]",
        )}
        style={{ background: "rgba(28,25,23,.94)" }}
      >
        <div className="ds-scroll-dark min-h-0 flex-1 overflow-y-auto px-3 pt-5 pb-4">
          <div className="mb-6 flex items-center justify-between px-2">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-stone-900 shadow-md">
                <Zap className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold tracking-tight text-white">MySystem</p>
                <p className="truncate text-xs text-stone-400">Comissionamento</p>
              </div>
            </div>
            <button
              type="button"
              aria-label="Fechar menu"
              onClick={onClose}
              className="rounded-xl p-2 text-stone-300 hover:bg-stone-700/40 md:hidden"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <p className="mx-3 mb-3 text-xs font-medium uppercase tracking-[.12em] text-stone-400">Módulos</p>
          <nav className="space-y-1">
            {modules.map(({ to, label, icon: Icon }, i) => (
              <NavLink
                key={to}
                to={to}
                end
                onClick={onClose}
                className={({ isActive }) =>
                  cx(itemBase, isActive ? "bg-[#292524] text-white" : "text-stone-300 hover:text-white")
                }
              >
                {({ isActive }) => (
                  <>
                    <b className={cx("text-[11px] font-medium tabular-nums", isActive ? "text-amber-400" : "text-stone-400")}>
                      {String(i + 1).padStart(2, "0")}
                    </b>
                    <Icon className="h-4 w-4" />
                    {label}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="mt-8 mb-3 flex items-center justify-between px-3">
            <p className="text-xs font-medium uppercase tracking-[.12em] text-stone-400">Quadros</p>
            <button
              type="button"
              aria-label="Novo quadro"
              title="Novo quadro"
              onClick={() => setCreating(true)}
              className="rounded-lg p-1 text-stone-400 hover:bg-stone-700/40 hover:text-white"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-1">
            {boards.map((b) => {
              const current = b.id === currentBoardId;
              const openCount = b.tasks.filter((t) => !b.columns.find((c) => c.id === t.columnId)?.isDone).length;
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => {
                    navigate(`/atividades/${b.id}`);
                    onClose();
                  }}
                  className={cx(itemBase, "w-full text-left", current ? "bg-[#292524] text-white" : "text-stone-300 hover:text-white")}
                >
                  <LayoutGrid className="h-4 w-4 shrink-0" />
                  <span className="min-w-0 flex-1 truncate">{b.name}</span>
                  <b className={cx("text-[11px] font-medium tabular-nums", current ? "text-amber-400" : "text-stone-400")}>
                    {openCount}
                  </b>
                </button>
              );
            })}
            {boards.length === 0 && <p className="px-3 text-xs text-stone-400">Nenhum quadro ainda.</p>}
          </div>

          <button
            type="button"
            onClick={() => setCreating(true)}
            className="mt-4 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-stone-400 border border-dashed border-stone-700 hover:text-white hover:border-stone-500"
          >
            <Plus className="h-4 w-4" />
            Novo quadro
          </button>
        </div>

        {/* Rodapé: status de sincronização + usuário */}
        <div className="border-t border-stone-800 px-3 pt-3 pb-4">
          <p className="mb-2 flex items-center gap-2 px-3 text-xs text-stone-400" title={sync.error ?? undefined}>
            <span className={cx("h-2 w-2 shrink-0 rounded-full", syncLabel.dot)} />
            <span className="truncate">{syncLabel.text}</span>
          </p>
          {sync.state === "error" && sync.error && <p className="mb-2 px-3 text-[11px] leading-snug text-rose-300">{sync.error}</p>}
          {profile && (
            <div className="flex items-center gap-2 rounded-xl px-2 py-2">
              <button
                type="button"
                onClick={() => setEditingProfile(true)}
                className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl px-1 py-1 text-left hover:bg-stone-700/40"
                title="Meu perfil"
              >
                <Avatar name={profile.full_name || profile.email} size={8} light />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-white">{profile.full_name || profile.email}</span>
                  <span className="flex items-center gap-1 text-xs text-stone-400">
                    {profile.role === "admin" ? <UserCog className="h-3 w-3 text-amber-400" /> : null}
                    {profile.role === "admin" ? "Administrador" : "Membro"}
                  </span>
                </span>
              </button>
              <button
                type="button"
                aria-label="Sair"
                title="Sair"
                onClick={() => void signOut()}
                className="rounded-xl p-2 text-stone-400 hover:bg-stone-700/40 hover:text-white"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </aside>

      <BoardDialog open={creating} onClose={() => setCreating(false)} onCreated={(id) => navigate(`/atividades/${id}`)} />
      <ProfileDialog open={editingProfile} onClose={() => setEditingProfile(false)} />
    </>
  );
}
