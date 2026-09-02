import { Link } from "react-router-dom";
import { CATEGORIES } from "@/docs/registry";
import { ArrowRight, Search } from "lucide-react";

export default function DocsHome() {
  return (
    <div className="max-w-5xl mx-auto">
      <section className="text-center py-10 border-b border-border mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-soft text-primary text-xs font-semibold mb-4">
          📚 Documentação oficial
        </div>
        <h1 className="text-5xl font-bold tracking-tight">onPreserv <span className="text-primary">Docs</span></h1>
        <p className="text-lg text-muted-foreground mt-3 max-w-2xl mx-auto">
          Aprenda a usar todas as funcionalidades do sistema com tutoriais visuais, regras de negócio e treinamentos operacionais.
        </p>
        <div className="mt-6 flex items-center justify-center gap-2">
          <button onClick={() => document.getElementById("docs-search")?.focus()}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:border-primary/40 text-sm">
            <Search className="h-4 w-4" /> Buscar... <kbd className="text-[10px] border border-border rounded px-1">⌘K</kbd>
          </button>
        </div>
      </section>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {CATEGORIES.map(cat => {
          const Icon = cat.icon;
          const first = cat.pages[0];
          const href = first.slug ? `/docs/${cat.id}/${first.slug}` : `/docs/${cat.id}`;
          return (
            <Link key={cat.id} to={href}
              className="group rounded-xl border border-border bg-card p-5 hover:border-primary/40 hover:shadow-md transition-all">
              <div className="grid place-items-center h-10 w-10 rounded-lg bg-primary-soft text-primary mb-3">
                <Icon className="h-5 w-5" />
              </div>
              <div className="flex items-center gap-1 font-semibold">
                {cat.title}
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </div>
              <p className="text-sm text-muted-foreground mt-1">{cat.pages.length} {cat.pages.length === 1 ? "página" : "páginas"}</p>
              <ul className="mt-3 space-y-0.5 text-xs text-muted-foreground">
                {cat.pages.slice(0, 4).map(p => <li key={p.slug}>· {p.title}</li>)}
              </ul>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
