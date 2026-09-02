import { LucideIcon, Rocket, LayoutDashboard, Package, CalendarRange,
  Users as UsersIcon, Inbox, Bell, HelpCircle, AlertTriangle, BookOpen,
  Upload, Download, Plus, MapPin, Scale, GitMerge, CheckSquare, RefreshCw,
  ListChecks, Workflow, ShieldCheck, FileText, Activity,
} from "lucide-react";
import { ComponentType } from "react";

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
    id: "introducao",
    title: "Introdução",
    icon: Rocket,
    pages: [
      { slug: "",          title: "Visão geral",        icon: BookOpen,  description: "O que é o onPreserv e como ele te ajuda.", load: () => import("./content/IntroOverview") },
      { slug: "comecar",   title: "Primeiros passos",   icon: Rocket,    description: "Login, navegação e onboarding em 5 minutos.", load: () => import("./content/IntroQuickstart") },
      { slug: "conceitos", title: "Conceitos-chave",    icon: BookOpen,  description: "Lotes, cronograma, tarefas e regras essenciais.", load: () => import("./content/IntroConcepts") },
    ],
  },
  {
    id: "dashboard",
    title: "Dashboard",
    icon: LayoutDashboard,
    pages: [
      { slug: "",        title: "Visão geral",   icon: LayoutDashboard, description: "Indicadores, gráficos e atividades recentes.", load: () => import("./content/DashboardOverview") },
      { slug: "filtros", title: "Filtros e métricas", icon: ListChecks, description: "Como filtrar e interpretar os dados.", load: () => import("./content/DashboardFilters") },
    ],
  },
  {
    id: "lotes",
    title: "Lotes",
    icon: Package,
    pages: [
      { slug: "",            title: "Visão geral",          icon: Package,  description: "Tudo sobre o módulo de Lotes.", load: () => import("./content/LotesOverview") },
      { slug: "cadastrar",   title: "Como cadastrar lote",  icon: Plus,     description: "Cadastro manual de um lote do zero.", load: () => import("./content/LotesCreate") },
      { slug: "importar",    title: "Como importar lotes",  icon: Upload,   description: "Importação em massa via planilha.", load: () => import("./content/LotesImport") },
      { slug: "exportar",    title: "Como exportar lotes",  icon: Download, description: "Exportação em XLSX, CSV e PDF.", load: () => import("./content/LotesExport") },
      { slug: "localizar",   title: "Localização física",   icon: MapPin,   description: "Rua, prateleira e busca por localização.", load: () => import("./content/LotesLocalizar") },
      { slug: "regras",      title: "Regras de negócio",    icon: Scale,    description: "Identificadores, status, validação e duplicidade.", load: () => import("./content/LotesRegras") },
    ],
  },
  {
    id: "cronograma",
    title: "Cronograma",
    icon: CalendarRange,
    pages: [
      { slug: "",            title: "Visão geral",          icon: CalendarRange, description: "Como o cronograma de preservação funciona.", load: () => import("./content/CronogramaOverview") },
      { slug: "importar",    title: "Como importar",        icon: Upload,        description: "Planilha de cronograma e validação.", load: () => import("./content/CronogramaImportar") },
      { slug: "merge",       title: "Merge inteligente",    icon: GitMerge,      description: "Como o sistema atualiza sem duplicar.", load: () => import("./content/CronogramaMerge") },
      { slug: "baixa",       title: "Baixa em lote",        icon: CheckSquare,   description: "Dar baixa em vários itens de uma vez.", load: () => import("./content/CronogramaBaixa") },
      { slug: "status",      title: "Atualização de status",icon: RefreshCw,     description: "Como o status é calculado.", load: () => import("./content/CronogramaStatus") },
    ],
  },
  {
    id: "atividades",
    title: "Atividades",
    icon: Activity,
    pages: [
      { slug: "", title: "Atividades de preservação", icon: Activity, description: "Registro e histórico de atividades.", load: () => import("./content/AtividadesOverview") },
    ],
  },
  {
    id: "usuarios",
    title: "Usuários",
    icon: UsersIcon,
    pages: [
      { slug: "",          title: "Gestão de usuários", icon: UsersIcon,   description: "Convites, papéis e permissões.", load: () => import("./content/UsuariosOverview") },
      { slug: "permissoes",title: "Permissões",         icon: ShieldCheck, description: "O que cada papel pode fazer.", load: () => import("./content/UsuariosPermissoes") },
    ],
  },
  {
    id: "solicitacoes",
    title: "Solicitações",
    icon: Inbox,
    pages: [
      { slug: "", title: "Solicitações de exclusão", icon: Inbox, description: "Como funciona o fluxo de aprovação.", load: () => import("./content/SolicitacoesOverview") },
    ],
  },
  {
    id: "notificacoes",
    title: "Notificações",
    icon: Bell,
    pages: [
      { slug: "", title: "Notificações", icon: Bell, description: "Tipos, leitura e preferências.", load: () => import("./content/NotificacoesOverview") },
    ],
  },
  {
    id: "treinamento",
    title: "Treinamento operacional",
    icon: Workflow,
    pages: [
      { slug: "fluxo-cronograma",  title: "Fluxo do cronograma",     icon: Workflow,  description: "Do cadastro à baixa.",         load: () => import("./content/FluxoCronograma") },
      { slug: "fluxo-preservacao", title: "Fluxo de preservação",    icon: Workflow,  description: "Como preservar corretamente.", load: () => import("./content/FluxoPreservacao") },
      { slug: "fluxo-importacao",  title: "Importação correta",      icon: Workflow,  description: "Boas práticas de planilha.",   load: () => import("./content/FluxoImportacao") },
      { slug: "fluxo-atualizacao", title: "Atualização correta",     icon: Workflow,  description: "Update sem perder dados.",     load: () => import("./content/FluxoAtualizacao") },
    ],
  },
  {
    id: "ajuda",
    title: "Ajuda",
    icon: HelpCircle,
    pages: [
      { slug: "faq",       title: "FAQ",              icon: HelpCircle,    description: "Perguntas frequentes.",   load: () => import("./content/FAQ") },
      { slug: "problemas", title: "Problemas comuns", icon: AlertTriangle, description: "Erros e como resolver.",  load: () => import("./content/Problemas") },
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
