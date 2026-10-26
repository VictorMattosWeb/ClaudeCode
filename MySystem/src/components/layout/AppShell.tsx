import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Menu, Zap } from "lucide-react";
import { Sidebar } from "./Sidebar";

/** Canvas stone-200 do design system; sidebar à esquerda e conteúdo rolando à direita. */
export function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex h-full bg-stone-200">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Barra superior só no mobile: ink tile + nome, como a top bar do catálogo */}
        <header className="flex h-16 shrink-0 items-center justify-between px-4 md:hidden">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-stone-900 text-stone-100 shadow-md">
              <Zap className="h-5 w-5" />
            </span>
            <span className="text-sm font-semibold tracking-tight">MySystem</span>
          </div>
          <button
            type="button"
            aria-label="Abrir menu"
            onClick={() => setMenuOpen(true)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl ring-1 bg-stone-50 ring-stone-200 text-stone-600"
          >
            <Menu className="h-5 w-5" />
          </button>
        </header>

        <main className="min-h-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
