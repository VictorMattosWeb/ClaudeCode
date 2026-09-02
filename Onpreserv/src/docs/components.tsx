import { ReactNode, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Info, AlertTriangle, CheckCircle2, Lightbulb, Scale, Copy, Check,
  X, ZoomIn, ChevronRight,
} from "lucide-react";
import { toast } from "sonner";

/* ---------- Callout ---------- */
type CalloutType = "info" | "warning" | "tip" | "rule" | "success" | "error";
const CALLOUT: Record<CalloutType, { icon: any; cls: string; label: string }> = {
  info:    { icon: Info,           cls: "border-info/30 bg-info/5 text-info",                  label: "Informação" },
  warning: { icon: AlertTriangle,  cls: "border-warning/40 bg-warning/5 text-warning",         label: "Atenção" },
  tip:     { icon: Lightbulb,      cls: "border-primary/30 bg-primary/5 text-primary",         label: "Dica" },
  rule:    { icon: Scale,          cls: "border-purple-500/30 bg-purple-500/5 text-purple-600 dark:text-purple-400", label: "Regra" },
  success: { icon: CheckCircle2,   cls: "border-success/30 bg-success/5 text-success",         label: "Sucesso" },
  error:   { icon: X,              cls: "border-destructive/30 bg-destructive/5 text-destructive", label: "Erro" },
};

export function Callout({ type = "info", title, children }: { type?: CalloutType; title?: string; children: ReactNode }) {
  const c = CALLOUT[type];
  const Icon = c.icon;
  return (
    <div className={cn("my-5 rounded-xl border-l-4 border bg-card px-5 py-4", c.cls)}>
      <div className="flex items-center gap-2 mb-1.5">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-semibold uppercase tracking-wider">{title ?? c.label}</span>
      </div>
      <div className="text-sm text-foreground/85 leading-relaxed [&>p]:my-2 [&>ul]:my-2 [&>ul]:pl-5 [&>ul]:list-disc [&_strong]:text-foreground">
        {children}
      </div>
    </div>
  );
}

/* ---------- Step ---------- */
export function Steps({ children }: { children: ReactNode }) {
  return <ol className="my-6 space-y-5 [counter-reset:step]">{children}</ol>;
}
export function Step({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <li className="relative pl-12 [counter-increment:step]">
      <span className="absolute left-0 top-0 grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground text-sm font-semibold shadow-sm">
        <span className="before:content-[counter(step)]" />
      </span>
      <h4 className="text-base font-semibold tracking-tight mb-2 mt-1">{title}</h4>
      <div className="text-sm text-muted-foreground leading-relaxed [&>p]:my-2 [&_strong]:text-foreground">
        {children}
      </div>
    </li>
  );
}

/* ---------- Code ---------- */
export function Code({ children, lang = "text" }: { children: string; lang?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(children);
    setCopied(true);
    toast.success("Copiado");
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="my-4 group relative rounded-lg border border-border bg-zinc-950 dark:bg-zinc-900 text-zinc-100 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 text-xs">
        <span className="text-zinc-400 font-mono">{lang}</span>
        <button onClick={copy} className="text-zinc-400 hover:text-white transition-colors">
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-[13px] leading-relaxed font-mono"><code>{children}</code></pre>
    </div>
  );
}

/* ---------- Inline KBD ---------- */
export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="px-1.5 py-0.5 mx-0.5 text-[11px] font-mono rounded border border-border bg-muted text-foreground shadow-[0_1px_0_hsl(var(--border))]">
      {children}
    </kbd>
  );
}

/* ---------- Mock with annotations / lightbox ---------- */
export type Annotation =
  | { kind: "circle"; x: number; y: number; r?: number; n?: number; label?: string }
  | { kind: "rect"; x: number; y: number; w: number; h: number; n?: number; label?: string }
  | { kind: "arrow"; x1: number; y1: number; x2: number; y2: number; label?: string };

export function Mock({
  title,
  caption,
  children,
  annotations = [],
  ratio = "16/10",
}: {
  title?: string;
  caption?: string;
  children: ReactNode;
  annotations?: Annotation[];
  ratio?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <figure className="my-6 group">
        <div
          onClick={() => setOpen(true)}
          className="relative cursor-zoom-in rounded-xl border border-border bg-gradient-to-br from-muted/30 to-muted/10 overflow-hidden shadow-md hover:shadow-lg transition-shadow"
        >
          {/* Browser chrome */}
          <div className="flex items-center gap-1.5 px-3 py-2 border-b border-border bg-card/80 backdrop-blur">
            <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
            {title && <span className="ml-3 text-[11px] text-muted-foreground font-mono truncate">{title}</span>}
            <ZoomIn className="ml-auto h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="relative bg-background" style={{ aspectRatio: ratio }}>
            <div className="absolute inset-0">{children}</div>
            <AnnotationLayer annotations={annotations} />
          </div>
        </div>
        {caption && <figcaption className="mt-2 text-xs text-center text-muted-foreground italic">{caption}</figcaption>}
      </figure>

      {open && (
        <div
          className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8 animate-fade-in"
          onClick={() => setOpen(false)}
        >
          <button className="absolute top-4 right-4 text-white/70 hover:text-white" onClick={() => setOpen(false)}>
            <X className="h-6 w-6" />
          </button>
          <div className="relative w-full max-w-6xl rounded-xl overflow-hidden border border-white/10 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="relative bg-background" style={{ aspectRatio: ratio }}>
              <div className="absolute inset-0">{children}</div>
              <AnnotationLayer annotations={annotations} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function AnnotationLayer({ annotations }: { annotations: Annotation[] }) {
  if (!annotations.length) return null;
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
      <defs>
        <marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill="hsl(var(--destructive))" />
        </marker>
      </defs>
      {annotations.map((a, i) => {
        if (a.kind === "circle") {
          const r = a.r ?? 4;
          return (
            <g key={i}>
              <circle cx={a.x} cy={a.y} r={r} fill="none" stroke="hsl(var(--destructive))" strokeWidth="0.6" strokeDasharray="1.2 0.8" className="animate-pulse" vectorEffect="non-scaling-stroke" />
              {a.n != null && (
                <g>
                  <circle cx={a.x + r + 1} cy={a.y - r - 1} r="2.2" fill="hsl(var(--destructive))" />
                  <text x={a.x + r + 1} y={a.y - r - 0.3} textAnchor="middle" fontSize="2.6" fontWeight="700" fill="white">{a.n}</text>
                </g>
              )}
            </g>
          );
        }
        if (a.kind === "rect") {
          return (
            <g key={i}>
              <rect x={a.x} y={a.y} width={a.w} height={a.h} fill="none" stroke="hsl(var(--destructive))" strokeWidth="0.5" strokeDasharray="1 0.6" rx="1" vectorEffect="non-scaling-stroke" />
              {a.n != null && (
                <g>
                  <circle cx={a.x - 1.5} cy={a.y - 1.5} r="2.2" fill="hsl(var(--destructive))" />
                  <text x={a.x - 1.5} y={a.y - 0.8} textAnchor="middle" fontSize="2.6" fontWeight="700" fill="white">{a.n}</text>
                </g>
              )}
            </g>
          );
        }
        return (
          <line key={i} x1={a.x1} y1={a.y1} x2={a.x2} y2={a.y2} stroke="hsl(var(--destructive))" strokeWidth="0.5" markerEnd="url(#arr)" vectorEffect="non-scaling-stroke" />
        );
      })}
    </svg>
  );
}

/* ---------- Pill cards ---------- */
export function CardGrid({ children }: { children: ReactNode }) {
  return <div className="my-6 grid sm:grid-cols-2 gap-3">{children}</div>;
}
export function LinkCard({
  to, icon: Icon, title, description,
}: { to: string; icon: any; title: string; description: string }) {
  return (
    <a
      href={to}
      className="group flex items-start gap-3 rounded-xl border border-border bg-card p-4 hover:border-primary/40 hover:shadow-md transition-all"
    >
      <span className="grid place-items-center h-10 w-10 rounded-lg bg-primary-soft text-primary shrink-0">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1 text-sm font-semibold">
          {title}
          <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
    </a>
  );
}

/* ---------- Comparison Do / Don't ---------- */
export function Compare({ doTitle = "Faça assim", dontTitle = "Evite", doItems, dontItems }: {
  doTitle?: string; dontTitle?: string; doItems: string[]; dontItems: string[];
}) {
  return (
    <div className="my-5 grid sm:grid-cols-2 gap-3">
      <div className="rounded-xl border border-success/30 bg-success/5 p-4">
        <div className="flex items-center gap-2 text-success font-semibold text-sm mb-2"><CheckCircle2 className="h-4 w-4" />{doTitle}</div>
        <ul className="space-y-1.5 text-sm">{doItems.map((i, idx) => <li key={idx} className="flex gap-2"><span className="text-success">✓</span><span>{i}</span></li>)}</ul>
      </div>
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
        <div className="flex items-center gap-2 text-destructive font-semibold text-sm mb-2"><X className="h-4 w-4" />{dontTitle}</div>
        <ul className="space-y-1.5 text-sm">{dontItems.map((i, idx) => <li key={idx} className="flex gap-2"><span className="text-destructive">✗</span><span>{i}</span></li>)}</ul>
      </div>
    </div>
  );
}

/* ---------- Re-export Tabs ---------- */
export { Tabs, TabsContent, TabsList, TabsTrigger };

/* ---------- Headings with anchor ---------- */
export function H2({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h2 id={id} className="scroll-mt-24 group text-2xl font-bold tracking-tight mt-12 mb-4 flex items-center gap-2">
      {children}
      <a href={`#${id}`} className="opacity-0 group-hover:opacity-100 text-primary text-sm">#</a>
    </h2>
  );
}
export function H3({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h3 id={id} className="scroll-mt-24 group text-lg font-semibold tracking-tight mt-8 mb-3 flex items-center gap-2">
      {children}
      <a href={`#${id}`} className="opacity-0 group-hover:opacity-100 text-primary text-sm">#</a>
    </h3>
  );
}
export function P({ children }: { children: ReactNode }) {
  return <p className="text-[15px] leading-7 text-foreground/85 my-3">{children}</p>;
}
export function UL({ children }: { children: ReactNode }) {
  return <ul className="my-3 space-y-1.5 pl-5 list-disc text-[15px] text-foreground/85 marker:text-primary">{children}</ul>;
}
export function Lead({ children }: { children: ReactNode }) {
  return <p className="text-lg text-muted-foreground leading-relaxed mt-2 mb-6">{children}</p>;
}
