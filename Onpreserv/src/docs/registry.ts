import { LucideIcon, ShieldCheck } from "lucide-react";
import { ComponentType } from "react";

/**
 * Índice da documentação.
 *
 * A documentação foi zerada a pedido: hoje ela cobre apenas a regra de negócio
 * da preservação, que é a única que precisa estar escrita e auditável. As
 * páginas antigas — visão geral, importação, cronograma, treinamento, FAQ —
 * descreviam telas que mudaram várias vezes e tinham virado informação errada.
 *
 * Para voltar a crescer, basta acrescentar categorias e páginas aqui; o resto
 * da navegação (menu, busca, anterior/próxima) é montado a partir desta lista.
 */

export type DocCategory = {
  id: string;
  title: string;
  icon: LucideIcon;
  pages: DocPage[];
};
export type DocPage = {
  slug: string; // unique within category, used in URL: /docs/:cat/:slug or /docs/:cat for index
  title: string;
  icon?: LucideIcon;
  description: string;
  /** Lazy import of content component */
  load: () => Promise<{ default: ComponentType }>;
  /** Plain-text body for search index (lazy-built later) */
  keywords?: string[];
};

/* prettier-ignore */
export const CATEGORIES: DocCategory[] = [
  {
    id: "preservacao",
    title: "Preservação",
    icon: ShieldCheck,
    pages: [
      { slug: "", title: "Regra de preservação", icon: ShieldCheck, description: "Frequências, janela semanal, os quatro status e os indicadores.", load: () => import("./content/LotesPreservacaoRegra") },
    ],
  },
];

/** Flat ordered list for next/prev navigation and search */
export type FlatPage = { categoryId: string; categoryTitle: string; categoryIcon: LucideIcon; page: DocPage; href: string };
export const FLAT: FlatPage[] = CATEGORIES.flatMap((c) =>
  c.pages.map((p) => ({
    categoryId: c.id,
    categoryTitle: c.title,
    categoryIcon: c.icon,
    page: p,
    href: p.slug ? `/docs/${c.id}/${p.slug}` : `/docs/${c.id}`,
  })),
);

export function findPage(catId?: string, slug?: string): FlatPage | undefined {
  if (!catId) return FLAT[0];
  return FLAT.find((f) => f.categoryId === catId && f.page.slug === (slug ?? ""));
}
