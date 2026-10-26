import type { Hue, Priority } from "@/types/activities";

/**
 * Classes por matiz, escritas por extenso para o Tailwind encontrá-las.
 * Cada papel replica um padrão do design system:
 *  - pill:    status pill  → text-{hue}-700 bg-{hue}-100
 *  - tile:    icon tile    → bg-{hue}-100 text-{hue}-600
 *  - surface: tinted tile  → bg-{hue}-50 ring-{hue}-200
 *  - dot:     ponto sólido da etapa
 *  - bar:     barra com gradiente (goal rows)
 *  - hex:     cor sólida para o Chart.js
 */
interface HueClasses {
  label: string;
  pill: string;
  tile: string;
  surface: string;
  dot: string;
  bar: string;
  hex: string;
}

export const HUES: Record<Hue, HueClasses> = {
  stone: {
    label: "Neutro",
    pill: "text-stone-600 bg-stone-200",
    tile: "bg-stone-200 text-stone-600",
    surface: "bg-stone-50 ring-stone-200",
    dot: "bg-stone-400",
    bar: "from-stone-400 to-stone-500",
    hex: "#a8a29e",
  },
  amber: {
    label: "Âmbar",
    pill: "text-amber-700 bg-amber-100",
    tile: "bg-amber-100 text-amber-700",
    surface: "bg-amber-50 ring-amber-200",
    dot: "bg-amber-500",
    bar: "from-amber-400 to-orange-500",
    hex: "#f59e0b",
  },
  orange: {
    label: "Laranja",
    pill: "text-orange-700 bg-orange-100",
    tile: "bg-orange-100 text-orange-600",
    surface: "bg-orange-50 ring-orange-200",
    dot: "bg-orange-500",
    bar: "from-yellow-400 to-orange-500",
    hex: "#f97316",
  },
  rose: {
    label: "Rosa",
    pill: "text-rose-700 bg-rose-100",
    tile: "bg-rose-100 text-rose-600",
    surface: "bg-rose-50 ring-rose-200",
    dot: "bg-rose-500",
    bar: "from-rose-400 to-pink-500",
    hex: "#f43f5e",
  },
  red: {
    label: "Vermelho",
    pill: "text-red-700 bg-red-100",
    tile: "bg-red-100 text-red-600",
    surface: "bg-red-50 ring-red-200",
    dot: "bg-red-400",
    bar: "from-red-400 to-rose-500",
    hex: "#f87171",
  },
  yellow: {
    label: "Amarelo",
    pill: "text-yellow-700 bg-yellow-100",
    tile: "bg-yellow-100 text-yellow-600",
    surface: "bg-yellow-50 ring-yellow-200",
    dot: "bg-yellow-400",
    bar: "from-yellow-400 to-amber-500",
    hex: "#facc15",
  },
  emerald: {
    label: "Verde",
    pill: "text-emerald-700 bg-emerald-100",
    tile: "bg-emerald-100 text-emerald-600",
    surface: "bg-emerald-50 ring-emerald-200",
    dot: "bg-emerald-500",
    bar: "from-emerald-400 to-green-500",
    hex: "#10b981",
  },
  blue: {
    label: "Azul",
    pill: "text-blue-700 bg-blue-100",
    tile: "bg-blue-100 text-blue-600",
    surface: "bg-blue-50 ring-blue-200",
    dot: "bg-blue-400",
    bar: "from-blue-400 to-cyan-500",
    hex: "#2563eb",
  },
  indigo: {
    label: "Índigo",
    pill: "text-indigo-700 bg-indigo-100",
    tile: "bg-indigo-100 text-indigo-600",
    surface: "bg-indigo-50 ring-indigo-200",
    dot: "bg-indigo-500",
    bar: "from-indigo-400 to-purple-500",
    hex: "#4f46e5",
  },
  purple: {
    label: "Roxo",
    pill: "text-purple-700 bg-purple-100",
    tile: "bg-purple-100 text-purple-600",
    surface: "bg-purple-50 ring-purple-200",
    dot: "bg-purple-500",
    bar: "from-purple-400 to-indigo-500",
    hex: "#9333ea",
  },
};

export const HUE_LIST = Object.keys(HUES) as Hue[];

export const PRIORITIES: Record<Priority, { label: string; hue: Hue; rank: number }> = {
  alta: { label: "Alta", hue: "rose", rank: 0 },
  media: { label: "Média", hue: "orange", rank: 1 },
  baixa: { label: "Baixa", hue: "stone", rank: 2 },
};
