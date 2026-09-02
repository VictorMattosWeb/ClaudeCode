import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";
import { findPage } from "@/docs/registry";

const BASE_URL = "https://onpreserv.lovable.app";

const ROUTE_META: Record<string, { title: string; description: string }> = {
  "/": {
    title: "Lotes — onPreserv",
    description:
      "Cadastro e acompanhamento de lotes: recebimento, localização, situação de preservação e histórico completo de cada item.",
  },
  "/auth": {
    title: "Acesso ao sistema — onPreserv",
    description:
      "Entre no onPreserv para gerenciar preservação de lotes, atividades, cronogramas técnicos e tarefas da equipe.",
  },
  "/dashboard": {
    title: "Dashboard — onPreserv",
    description: "Indicadores de preservação, pendências e evolução das atividades técnicas em tempo real.",
  },
  "/atividades": {
    title: "Atividades — onPreserv",
    description: "Catálogo de atividades de preservação com frequências de almoxarifado e campo.",
  },
  "/cronograma": {
    title: "Cronograma — onPreserv",
    description: "Planejamento e baixa das medições de preservação por tag, unidade e gabinete.",
  },
  "/tarefas": {
    title: "Tarefas — onPreserv",
    description: "Quadros kanban para organizar tarefas da equipe com responsáveis, prazos e comentários.",
  },
  "/solicitacoes": {
    title: "Solicitações — onPreserv",
    description: "Fluxo de aprovação de solicitações de exclusão e edição de registros do sistema.",
  },
  "/usuarios": {
    title: "Usuários — onPreserv",
    description: "Gestão de usuários, cargos e permissões globais por módulo.",
  },
  "/docs": {
    title: "Documentação — onPreserv Docs",
    description:
      "Documentação oficial do onPreserv: tutoriais visuais, regras de negócio e treinamentos operacionais de cada módulo.",
  },
};

const DEFAULT_META = {
  title: "onPreserv — Gestão de Preservação de Lotes",
  description:
    "Sistema completo para gestão de preservação de lotes: atividades, cronogramas técnicos e tarefas da equipe.",
};

/** Metadados de <head> por rota (título, descrição, canonical, Open Graph e JSON-LD). */
export function Seo() {
  const { pathname } = useLocation();
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : "/";
  const canonical = `${BASE_URL}${path === "/" ? "/" : path}`;

  const docsSegments = path.startsWith("/docs/") ? path.slice("/docs/".length).split("/") : null;
  const docPage = docsSegments ? findPage(docsSegments[0], docsSegments[1]) : null;

  const meta = docPage
    ? {
        title: `${docPage.page.title} | Docs onPreserv`,
        description:
          docPage.page.description ??
          `Documentação do onPreserv sobre ${docPage.page.title} (${docPage.categoryTitle}).`,
      }
    : ROUTE_META[path] ?? DEFAULT_META;

  const jsonLd = docPage
    ? {
        "@context": "https://schema.org",
        "@type": "TechArticle",
        headline: docPage.page.title,
        description: meta.description,
        inLanguage: "pt-BR",
        url: canonical,
        isPartOf: { "@type": "WebSite", name: "onPreserv Docs", url: `${BASE_URL}/docs` },
        publisher: { "@type": "Organization", name: "onPreserv", url: BASE_URL },
      }
    : null;

  return (
    <Helmet>
      <title>{meta.title}</title>
      <meta name="description" content={meta.description} />
      <link rel="canonical" href={canonical} />
      <meta property="og:title" content={meta.title} />
      <meta property="og:description" content={meta.description} />
      <meta property="og:url" content={canonical} />
      <meta property="og:type" content={docPage ? "article" : "website"} />
      <meta name="twitter:title" content={meta.title} />
      <meta name="twitter:description" content={meta.description} />
      {jsonLd && <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>}
    </Helmet>
  );
}

export default Seo;
