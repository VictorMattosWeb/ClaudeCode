import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { CATEGORIES, FLAT } from "@/docs/registry";
import { Search, ChevronRight, Menu, X, BookOpen, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function DocsLayout() {
  const { pathname } = useLocation();
  const [q, setQ] = useState("");
  const [openMobile, setOpenMobile] = useState(false);

  useEffect(() => { setOpenMobile(false); window.scrollTo(0, 0); }, [pathname]);

  // Cmd+K focus
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        document.getElementById("docs-search")?.focus();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return null;
    return FLAT.filter(f =>
      f.page.title.toLowerCase().includes(term) ||
      f.page.description.toLowerCase().includes(term) ||
      f.categoryTitle.toLowerCase().includes(term)
    ).slice(0, 12);
  }, [q]);

  const Sidebar = (
    <nav className="px-4 py-6 space-y-6 text-sm">
      {CATEGORIES.map(cat => {
        const Icon = cat.icon;
        return (
          <div key={cat.id}>
            <div className="flex items-center gap-2 mb-2 text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
              <Icon className="h-3.5 w-3.5" />{cat.title}
            </div>
            <ul className="space-y-0.5 border-l border-border ml-1.5">
              {cat.pages.map(p => {
                const href = p.slug ? `/docs/${cat.id}/${p.slug}` : `/docs/${cat.id}`;
                return (
                  <li key={href}>
                    <NavLink to={href} end
                      onMouseEnter={() => { p.load().catch(() => {}); }}
                      onFocus={() => { p.load().catch(() => {}); }}
                      className={({ isActive }) => cn(
                        "block pl-4 -ml-px py-1.5 border-l-2 border-transparent text-[13px] transition-colors hover:text-foreground",
                        isActive ? "border-primary text-primary font-medium" : "text-muted-foreground"
                      )}>
                      {p.title}
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md">
        <div className="max-w-[1400px] mx-auto px-4 lg:px-8 h-14 flex items-center gap-4">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setOpenMobile(v => !v)}>
            {openMobile ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          <Link to="/docs" className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="grid place-items-center h-7 w-7 rounded-md bg-primary text-primary-foreground"><BookOpen className="h-4 w-4" /></span>
            <span>onPreserv <span className="text-muted-foreground font-normal">Docs</span></span>
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <div className="relative hidden md:block">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input id="docs-search" placeholder="Buscar... (⌘K)" value={q} onChange={e => setQ(e.target.value)}
                className="pl-8 pr-12 w-72 h-9 text-sm" />
              <kbd className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono text-muted-foreground border border-border rounded px-1">⌘K</kbd>
              {results && (
                <div className="absolute top-full mt-2 left-0 right-0 bg-popover border border-border rounded-lg shadow-lg max-h-96 overflow-auto z-50">
                  {results.length === 0
                    ? <div className="p-4 text-sm text-muted-foreground">Nada encontrado.</div>
                    : results.map((r, i) => (
                      <Link key={i} to={r.href} onClick={() => setQ("")}
                        className="block px-3 py-2 text-sm hover:bg-accent">
                        <div className="font-medium">{r.page.title}</div>
                        <div className="text-xs text-muted-foreground">{r.categoryTitle} · {r.page.description}</div>
                      </Link>
                    ))}
                </div>
              )}
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/auth">Entrar no app <ExternalLink className="h-3.5 w-3.5" /></Link>
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-[1400px] mx-auto lg:grid lg:grid-cols-[260px_1fr]">
        {/* Sidebar desktop */}
        <aside className="hidden lg:block sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto border-r border-border">
          {Sidebar}
        </aside>

        {/* Sidebar mobile */}
        {openMobile && (
          <aside className="lg:hidden fixed inset-x-0 top-14 bottom-0 z-30 bg-background border-t border-border overflow-y-auto">
            {Sidebar}
          </aside>
        )}

        {/* Main */}
        <main className="min-w-0 px-4 lg:px-10 py-8">
          <Outlet />
        </main>
      </div>

      <footer className="border-t border-border mt-12 py-8 text-center text-xs text-muted-foreground">
        onPreserv Docs · feito para a equipe operacional
      </footer>
    </div>
  );
}
