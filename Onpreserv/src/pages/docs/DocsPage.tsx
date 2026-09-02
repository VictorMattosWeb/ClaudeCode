import { Component, ReactNode, Suspense, lazy, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { CATEGORIES, FLAT, findPage } from "@/docs/registry";
import { ChevronRight, ArrowLeft, ArrowRight, Loader2, Link2, Printer, List, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/** Auto-retry boundary: a falha mais comum do lazy() é o chunk não baixar de primeira (rede/HMR). */
class LazyRetryBoundary extends Component<
  { resetKey: string; loader: () => Promise<unknown>; children: ReactNode },
  { error: Error | null; attempt: number }
> {
  state = { error: null as Error | null, attempt: 0 };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error) {
    // Tenta de novo automaticamente uma única vez (chunks falham de forma intermitente)
    if (this.state.attempt === 0) {
      setTimeout(() => this.retry(), 150);
    }
    console.error("[Docs] Falha ao carregar página:", error);
  }
  componentDidUpdate(prev: { resetKey: string }) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null, attempt: 0 });
    }
  }
  retry = () => {
    this.setState((s) => ({ error: null, attempt: s.attempt + 1 }));
  };
  render() {
    if (this.state.error) {
      return (
        <div className="my-12 rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
          <p className="text-sm text-destructive font-semibold mb-2">Não foi possível carregar esta página.</p>
          <p className="text-xs text-muted-foreground mb-4">Pode ser uma falha temporária de rede.</p>
          <Button size="sm" variant="outline" onClick={this.retry}>
            <RotateCw className="h-3.5 w-3.5" /> Tentar novamente
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

/** Tenta importar duas vezes antes de jogar o erro pro boundary. */
async function retryImport<T>(loader: () => Promise<T>, attempts = 2, delay = 200): Promise<T> {
  try { return await loader(); }
  catch (err) {
    if (attempts <= 1) throw err;
    await new Promise(r => setTimeout(r, delay));
    return retryImport(loader, attempts - 1, delay * 2);
  }
}


type TocItem = { id: string; text: string; level: 2 | 3 };

export default function DocsPage() {
  const { categoryId, slug } = useParams();
  const location = useLocation();
  const flat = findPage(categoryId, slug);
  const [progress, setProgress] = useState(0);
  const [toc, setToc] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string>("");

  // Título/descrição/canonical desta rota são definidos pelo componente <Seo />.


  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      setProgress(max > 0 ? Math.min(100, (h.scrollTop / max) * 100) : 0);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [location.pathname]);

  // Build TOC and observe sections after content renders
  useEffect(() => {
    let cancelled = false;
    const build = () => {
      if (cancelled) return;
      const root = document.getElementById("docs-article-body");
      if (!root) return;
      const nodes = Array.from(root.querySelectorAll("h2[id], h3[id]")) as HTMLElement[];
      if (!nodes.length) {
        setTimeout(build, 120);
        return;
      }
      setToc(nodes.map(n => ({
        id: n.id,
        text: n.innerText.replace(/#$/, "").trim(),
        level: n.tagName === "H2" ? 2 : 3,
      })));
      const obs = new IntersectionObserver(
        (entries) => {
          const visible = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
          if (visible[0]) setActiveId((visible[0].target as HTMLElement).id);
        },
        { rootMargin: "-80px 0px -70% 0px", threshold: 0.01 },
      );
      nodes.forEach(n => obs.observe(n));
      return () => obs.disconnect();
    };
    const t = setTimeout(build, 120);
    return () => { cancelled = true; clearTimeout(t); };
  }, [location.pathname]);

  // Lazy com retry: se o primeiro import falhar, tenta mais uma vez antes de propagar pro boundary.
  // Precisa ficar ANTES do early return de "página não encontrada": hooks não podem ser
  // chamados condicionalmente, sob pena de a ordem mudar entre renders e o React quebrar.
  const Lazy = useMemo(
    () => (flat ? lazy(() => retryImport(flat.page.load)) : null),
    [flat],
  );

  if (!flat) {
    return (
      <div className="py-20 text-center">
        <h1 className="text-2xl font-bold">Página não encontrada</h1>
        <Button asChild variant="link"><Link to="/docs">Voltar ao início</Link></Button>
      </div>
    );
  }

  const idx = FLAT.findIndex(f => f.href === flat.href);
  const prev = idx > 0 ? FLAT[idx - 1] : null;
  const next = idx < FLAT.length - 1 ? FLAT[idx + 1] : null;

  // Sibling pages of the same category for in-category nav
  const siblings = CATEGORIES.find(c => c.id === flat.categoryId)?.pages ?? [];

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Link copiado");
  };

  return (
    <div className="grid xl:grid-cols-[1fr_220px] gap-10">
      <article className="max-w-3xl w-full mx-auto xl:mx-0">
        {/* progress bar */}
        <div className="fixed top-14 left-0 right-0 h-0.5 bg-transparent z-30">
          <div className="h-full bg-primary transition-[width] duration-150" style={{ width: `${progress}%` }} />
        </div>

        {/* breadcrumb */}
        <nav className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3" aria-label="Breadcrumb">
          <Link to="/docs" className="hover:text-foreground">Docs</Link>
          <ChevronRight className="h-3 w-3" />
          <Link to={`/docs/${flat.categoryId}`} className="hover:text-foreground">{flat.categoryTitle}</Link>
          {flat.page.slug && (
            <>
              <ChevronRight className="h-3 w-3" />
              <span className="text-foreground">{flat.page.title}</span>
            </>
          )}
        </nav>

        <header className="mb-2">
          <h1 className="text-4xl font-bold tracking-tight">{flat.page.title}</h1>
          {flat.page.description && (
            <p className="text-muted-foreground mt-2">{flat.page.description}</p>
          )}
        </header>
        <div className="flex items-center gap-2 mb-2">
          <Button variant="ghost" size="sm" onClick={copyLink}><Link2 className="h-3.5 w-3.5" /> Copiar link</Button>
          <Button variant="ghost" size="sm" onClick={() => window.print()}><Printer className="h-3.5 w-3.5" /> Imprimir</Button>
        </div>

        {/* Sub-nav between sibling pages of the same category */}
        {siblings.length > 1 && (
          <div className="my-4 -mx-1 flex flex-wrap gap-1">
            {siblings.map(p => {
              const href = p.slug ? `/docs/${flat.categoryId}/${p.slug}` : `/docs/${flat.categoryId}`;
              const active = href === flat.href;
              return (
                <Link key={href} to={href}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs border transition-colors",
                    active
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border text-muted-foreground hover:text-foreground hover:border-primary/40",
                  )}>
                  {p.title}
                </Link>
              );
            })}
          </div>
        )}

        <div id="docs-article-body">
          <LazyRetryBoundary resetKey={flat.href} loader={flat.page.load}>
            <Suspense fallback={
              <div className="py-20 grid place-items-center text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            }>
              {Lazy && <Lazy />}
            </Suspense>
          </LazyRetryBoundary>
        </div>

        {/* prev/next */}
        <div className="mt-16 grid sm:grid-cols-2 gap-3 border-t border-border pt-8">
          {prev ? (
            <Link to={prev.href} className="group rounded-xl border border-border p-4 hover:border-primary/40 transition-colors">
              <div className="text-xs text-muted-foreground flex items-center gap-1"><ArrowLeft className="h-3 w-3" /> Anterior</div>
              <div className="font-semibold mt-1">{prev.page.title}</div>
            </Link>
          ) : <div />}
          {next ? (
            <Link to={next.href} className="group rounded-xl border border-border p-4 hover:border-primary/40 transition-colors text-right">
              <div className="text-xs text-muted-foreground flex items-center justify-end gap-1">Próximo <ArrowRight className="h-3 w-3" /></div>
              <div className="font-semibold mt-1">{next.page.title}</div>
            </Link>
          ) : <div />}
        </div>
      </article>

      {/* Right rail: On this page */}
      <aside className="hidden xl:block">
        <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-auto pr-2">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-3">
            <List className="h-3.5 w-3.5" /> Nesta página
          </div>
          {toc.length === 0 ? (
            <div className="text-xs text-muted-foreground">Sem seções</div>
          ) : (
            <ul className="space-y-1 border-l border-border">
              {toc.map(t => (
                <li key={t.id}>
                  <a
                    href={`#${t.id}`}
                    className={cn(
                      "block -ml-px border-l-2 py-1 text-[12.5px] transition-colors",
                      t.level === 3 ? "pl-6" : "pl-3",
                      activeId === t.id
                        ? "border-primary text-primary font-medium"
                        : "border-transparent text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {t.text}
                  </a>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-6 pt-4 border-t border-border text-[11px] text-muted-foreground">
            <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="hover:text-foreground">↑ Voltar ao topo</button>
          </div>
        </div>
      </aside>
    </div>
  );
}
