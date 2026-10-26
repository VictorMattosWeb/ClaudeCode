import { forwardRef, type ButtonHTMLAttributes, type HTMLAttributes, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cx } from "@/lib/cx";
import { HUES } from "@/lib/hues";
import type { Hue } from "@/types/activities";

/* ------------------------------------------------------------------ Surfaces */

/** Card claro: .ring-1.ring-stone-200.bg-white.rounded-3xl + sombra de seis camadas. */
export function Card({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return <article className={cx("ring-1 ring-stone-200 bg-white rounded-3xl shadow-card", className)} {...props} />;
}

/** Cabeçalho de card: h2 semibold tracking-tight + subtítulo stone-500 + ação à direita. */
export function CardHeader({
  title,
  subtitle,
  action,
  size = "xl",
  className,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  size?: "lg" | "xl" | "2xl";
  className?: string;
}) {
  const titleSize = size === "2xl" ? "text-xl md:text-2xl" : size === "xl" ? "text-xl" : "text-lg";
  return (
    <div className={cx("mb-5 flex items-start justify-between gap-3", className)}>
      <div className="min-w-0">
        <h2 className={cx(titleSize, "font-semibold tracking-tight")}>{title}</h2>
        {subtitle && <p className="text-sm text-stone-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

/** Inset tile: .rounded-2xl.p-3.ring-1.bg-stone-50.ring-stone-200 (sempre sobre card branco). */
export function InsetTile({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx("rounded-2xl p-3 ring-1 bg-stone-50 ring-stone-200", className)} {...props} />;
}

/* ------------------------------------------------------------------- Actions */

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;

/** Primary pill: bg-stone-900 text-stone-100 hover:bg-stone-800, rounded-xl px-3 py-1.5 text-xs. */
export const PrimaryButton = forwardRef<HTMLButtonElement, ButtonProps & { icon?: LucideIcon; trailing?: LucideIcon }>(
  function PrimaryButton({ className, icon: Icon, trailing: Trailing, children, type = "button", ...props }, ref) {
    return (
      <button
        ref={ref}
        type={type}
        className={cx(
          "inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium bg-stone-900 text-stone-100 hover:bg-stone-800 disabled:opacity-40 disabled:pointer-events-none",
          className,
        )}
        {...props}
      >
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {children}
        {Trailing && <Trailing className="h-3 w-3" />}
      </button>
    );
  },
);

/** Botão secundário derivado das pílulas default do week strip: ring-1 bg-stone-50 ring-stone-200. */
export const SecondaryButton = forwardRef<HTMLButtonElement, ButtonProps & { icon?: LucideIcon }>(
  function SecondaryButton({ className, icon: Icon, children, type = "button", ...props }, ref) {
    return (
      <button
        ref={ref}
        type={type}
        className={cx(
          "inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium text-stone-600 ring-1 bg-stone-50 ring-stone-200 hover:text-stone-900 hover:bg-white",
          className,
        )}
        {...props}
      >
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {children}
      </button>
    );
  },
);

/** Outlined icon button: h-8 w-8 rounded-lg ring-1 ring-stone-200 hover:bg-stone-50, ícone h-4. */
export const OutlineIconButton = forwardRef<HTMLButtonElement, ButtonProps & { icon: LucideIcon; label: string }>(
  function OutlineIconButton({ icon: Icon, label, className, type = "button", ...props }, ref) {
    return (
      <button
        ref={ref}
        type={type}
        aria-label={label}
        title={label}
        className={cx(
          "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1 ring-stone-200 text-stone-500 hover:bg-stone-50",
          className,
        )}
        {...props}
      >
        <Icon className="h-4 w-4" />
      </button>
    );
  },
);

/** Ghost icon button: rounded-xl p-2 text-stone-500 hover:bg-stone-50; variante ring no menu do card. */
export const GhostIconButton = forwardRef<
  HTMLButtonElement,
  ButtonProps & { icon: LucideIcon; label: string; ring?: boolean; small?: boolean }
>(function GhostIconButton({ icon: Icon, label, ring, small, className, type = "button", ...props }, ref) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={cx(
        "rounded-xl text-stone-500 hover:bg-stone-50 hover:text-stone-900",
        small ? "p-1.5" : "p-2",
        ring && "ring-1 ring-transparent hover:ring-stone-200",
        className,
      )}
      {...props}
    >
      <Icon className={small ? "h-4 w-4" : "h-5 w-5"} />
    </button>
  );
});

/* ------------------------------------------------------------ Badges, tiles */

/** Status pill: text-xs font-medium px-2 py-1 rounded-full em {hue}-700 sobre {hue}-100. */
export function Pill({ hue, className, children }: { hue: Hue; className?: string; children: ReactNode }) {
  return (
    <span className={cx("inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap", HUES[hue].pill, className)}>
      {children}
    </span>
  );
}

/** Icon tile: flex h-9 w-9 (ou h-10) rounded-lg bg-{hue}-100 text-{hue}-600. */
export function IconTile({ icon: Icon, hue, size = 9, solid }: { icon: LucideIcon; hue: Hue; size?: 9 | 10; solid?: boolean }) {
  return (
    <div
      className={cx(
        "flex shrink-0 items-center justify-center rounded-lg",
        size === 9 ? "h-9 w-9" : "h-10 w-10",
        solid ? "bg-emerald-500 text-white" : HUES[hue].tile,
      )}
    >
      <Icon className="h-5 w-5" />
    </div>
  );
}

/** Ponto de cor da etapa. */
export function Dot({ hue, className }: { hue: Hue; className?: string }) {
  return <span className={cx("inline-block h-2 w-2 shrink-0 rounded-full", HUES[hue].dot, className)} />;
}

/* -------------------------------------------------------------- Data display */

/** Gradient progress bar: .h-2.rounded-full.bg-stone-200 › .bg-gradient-to-r.from-{a}.to-{b}. */
export function ProgressBar({ value, hue = "amber", className }: { value: number; hue?: Hue; className?: string }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className={cx("h-2 w-full overflow-hidden rounded-full bg-stone-200", className)}>
      <div className={cx("h-full rounded-full bg-gradient-to-r transition-[width] duration-500", HUES[hue].bar)} style={{ width: `${pct}%` }} />
    </div>
  );
}

/**
 * Gradient ring do design system (h-24 w-24, disco branco inset-1/inset-2).
 * Aqui o arco conic cobre só a fração concluída; o resto fica na cor do track (stone-200).
 */
export function GradientRing({
  value,
  label,
  caption,
  inset = 2,
}: {
  value: number;
  label: ReactNode;
  caption: ReactNode;
  inset?: 1 | 2;
}) {
  const pct = Math.max(0, Math.min(100, value));
  const background = `conic-gradient(#34d399 0%, #facc15 ${pct * 0.55}%, #fbbf24 ${pct}%, #e7e5e4 ${pct}%, #e7e5e4 100%)`;
  return (
    <div className="relative mx-auto h-24 w-24">
      <div className="absolute inset-0 rounded-full" style={{ background }} />
      <div className={cx("absolute rounded-full bg-white", inset === 1 ? "inset-1" : "inset-2")} />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold tracking-tight">{label}</p>
          <p className="text-xs text-stone-500">{caption}</p>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ Controls */

/**
 * Segmentado no estilo das pílulas do week strip:
 * selecionada bg-stone-900 text-stone-100 · padrão ring-1 bg-stone-50 ring-stone-200.
 */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: Array<{ value: T; label: string; icon?: LucideIcon }>;
}) {
  return (
    <div className="flex items-center gap-2 text-xs font-medium text-stone-600" role="tablist">
      {options.map(({ value: v, label, icon: Icon }) => {
        const on = v === value;
        return (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={on}
            aria-label={label}
            onClick={() => onChange(v)}
            className={cx(
              "inline-flex items-center gap-1.5 rounded-xl px-3 py-2 transition-colors",
              on ? "bg-stone-900 text-stone-100" : "ring-1 bg-stone-50 ring-stone-200 hover:text-stone-900",
            )}
          >
            {Icon && <Icon className="h-4 w-4" />}
            <span className="hidden sm:inline">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
