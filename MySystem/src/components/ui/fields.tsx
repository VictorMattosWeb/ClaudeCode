import { forwardRef, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { Check } from "lucide-react";
import { cx } from "@/lib/cx";
import { HUES, HUE_LIST } from "@/lib/hues";
import type { Hue } from "@/types/activities";

/*
 * Campos de formulário: o design system não traz inputs, então derivam do inset tile
 * (rounded-xl ring-1 bg-stone-50 ring-stone-200) com foco em ring-stone-900, a cor de tinta.
 */
const fieldBase =
  "w-full rounded-xl px-3 py-2 text-sm ring-1 bg-stone-50 ring-stone-200 placeholder:text-stone-400 outline-none focus:bg-white focus:ring-2 focus:ring-stone-900 transition";

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-stone-500">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-stone-400">{hint}</span>}
    </label>
  );
}

export const TextInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function TextInput(
  { className, ...props },
  ref,
) {
  return <input ref={ref} className={cx(fieldBase, className)} {...props} />;
});

export const TextArea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function TextArea(
  { className, ...props },
  ref,
) {
  return <textarea ref={ref} className={cx(fieldBase, "min-h-[88px] resize-y", className)} {...props} />;
});

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cx(fieldBase, "appearance-none pr-8 bg-no-repeat", className)} style={{
      backgroundImage:
        "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2378716c' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
      backgroundPosition: "right .6rem center",
    }} {...props}>
      {children}
    </select>
  );
}

/** Seletor de matiz: amostras redondas nas cores sólidas da paleta. */
export function HuePicker({ value, onChange }: { value: Hue; onChange: (h: Hue) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {HUE_LIST.map((h) => (
        <button
          key={h}
          type="button"
          title={HUES[h].label}
          aria-label={HUES[h].label}
          aria-pressed={value === h}
          onClick={() => onChange(h)}
          className={cx(
            "flex h-7 w-7 items-center justify-center rounded-full text-white ring-offset-2 transition",
            HUES[h].dot,
            value === h ? "ring-2 ring-stone-900" : "hover:scale-110",
          )}
        >
          {value === h && <Check className="h-3.5 w-3.5" />}
        </button>
      ))}
    </div>
  );
}
