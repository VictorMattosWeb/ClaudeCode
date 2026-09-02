import { Lead, P, H2, H3, UL, Mock, Callout } from "../components";
import imgFull from "@/docs/assets/dashboard-full.png";
import imgHeader from "@/docs/assets/dashboard-header.png";
import imgKpis from "@/docs/assets/dashboard-kpis.png";
import imgExecucao from "@/docs/assets/dashboard-execucao.png";
import imgTabelas from "@/docs/assets/dashboard-tabelas.png";
import {
  LayoutDashboard, Package, ListChecks, Activity, AlertTriangle,
  Clock, BarChart3, Boxes, CheckCircle2,
} from "lucide-react";
import type { ReactNode } from "react";

/* ---------- helpers locais (apenas visuais) ---------- */
function KpiCard({ icon: Icon, label, hint, tone = "default" }: { icon: any; label: string; hint: string; tone?: "default" | "warn" | "ok" | "bad" }) {
  const toneCls = {
    default: "border-border bg-card",
    ok: "border-success/30 bg-success/5",
    warn: "border-warning/40 bg-warning/5",
    bad: "border-destructive/30 bg-destructive/5",
  }[tone];
  return (
    <div className={`rounded-lg border p-3 ${toneCls}`}>
      <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <p className="text-[12px] text-muted-foreground mt-1 leading-snug">{hint}</p>
    </div>
  );
}

function SectionTag({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-primary-soft text-primary">
      {children}
    </span>
  );
}

export default function Page() {
  return (
    <>
      <Lead>
        O Dashboard é a tela inicial do onPreserv e funciona como o <strong>centro de comando</strong> da operação:
        em uma única visão você acompanha cronograma, preservações, divergências e vencidos, com filtros que
        afetam todos os indicadores ao mesmo tempo.
      </Lead>

      <Mock title="onpreserv.app/dashboard" caption="Visão completa: cabeçalho, KPIs, donuts de aderência, gráficos de execução e listas operacionais." ratio="16/8">
        <img src={imgFull} alt="Visão completa do Dashboard com todos os blocos" className="w-full h-full object-cover object-top" />
      </Mock>

      <Callout type="info" title="Como o Dashboard é alimentado">
        Todos os números são <strong>calculados em tempo real</strong> a partir de Lotes, Cronograma e Tarefas.
        Não existe agendamento — qualquer baixa, importação ou cadastro reflete imediatamente.
      </Callout>

      {/* ---------------- 1. Cabeçalho ---------------- */}
      <H2 id="cabecalho"><SectionTag>1</SectionTag> Cabeçalho e contexto</H2>
      <P>
        O cabeçalho confirma <em>o que</em> você está olhando. Antes de tirar conclusões, leia sempre o subtítulo e o
        seletor de Medição — eles definem o universo dos números.
      </P>
      <Mock title="Cabeçalho do Dashboard" ratio="16/2">
        <img src={imgHeader} alt="Cabeçalho com título Dashboard, contexto e seletor de Medição" className="w-full h-full object-cover object-top" />
      </Mock>
      <UL>
        <li><strong>Título e subtítulo</strong> — mostra o escopo (<em>Visão geral · Todas as medições · usuário</em>).</li>
        <li><strong>Seletor de Medição</strong> — filtro <em>global</em>, aplicado antes de qualquer outro.</li>
      </UL>

      {/* ---------------- 2. KPIs ---------------- */}
      <H2 id="kpis"><SectionTag>2</SectionTag> Indicadores (KPIs)</H2>
      <P>
        Os cards trazem os principais números operacionais. Cada um já considera os filtros ativos. Use-os como
        <strong> alarmes rápidos</strong>: alguns devem ficar em zero o tempo todo.
      </P>
      <Mock title="Cards de KPI" ratio="16/5">
        <img src={imgKpis} alt="Cards de indicadores do Dashboard" className="w-full h-full object-cover object-top" />
      </Mock>

      <H3 id="kpis-cronograma">Linha 1 — Cronograma</H3>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 my-4">
        <KpiCard icon={Package} label="Lotes" hint="Total de lotes cadastrados." />
        <KpiCard icon={Activity} label="Preservações" hint="Preservações registradas no período." />
        <KpiCard icon={ListChecks} label="Itens Cronograma" hint="Itens previstos no cronograma." />
        <KpiCard icon={BarChart3} label="% Execução" hint="Executados ÷ previstos. Mostra base ('182 de 287')." tone="ok" />
        <KpiCard icon={Clock} label="Pendentes" hint="Itens ainda não realizados." />
        <KpiCard icon={AlertTriangle} label="Vencidos" hint="Prazo previsto já passou. Deve ficar em 0." tone="bad" />
      </div>

      <H3 id="kpis-operacao">Linha 2 — Operação</H3>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 my-4">
        <KpiCard icon={CheckCircle2} label="No prazo" hint="Executados dentro do prazo previsto." tone="ok" />
        <KpiCard icon={AlertTriangle} label="Divergências" hint="Executados fora do prazo (atrasados/antecipados)." tone="warn" />
        <KpiCard icon={ListChecks} label="Não aplicável" hint="Itens marcados como N/A no cronograma." />
        <KpiCard icon={Activity} label="Solicitações pendentes" hint="Pedidos de exclusão aguardando aprovação." tone="warn" />
      </div>

      <Callout type="tip" title="Leitura rápida (regra de bolso)">
        <strong>Vencidos &gt; 0</strong> e
        <strong> Solicitações pendentes &gt; 0</strong> são pontos que exigem ação no <em>mesmo dia</em>.
      </Callout>

      {/* ---------------- 3. Donuts ---------------- */}
      <H2 id="aderencia"><SectionTag>3</SectionTag> Aderência, Status e Cumprimento de prazo</H2>
      <P>
        Logo abaixo dos KPIs, três blocos resumem a <strong>qualidade da execução</strong> com gráficos de rosca e
        comparativos de prazo previsto vs. realizado.
      </P>
      <UL>
        <li><strong>Aderência ao cronograma</strong> — % no prazo, % divergência, média de divergência (em dias) e o
          bloco <em>Prazo geral</em> (início previsto, fim previsto e fim realizado da medição corrente).</li>
        <li><strong>Status geral</strong> — donut com a distribuição entre <em>Preservado</em>, <em>Pendente</em>,
          <em>Vencido</em> e <em>N/A</em>.</li>
        <li><strong>Cumprimento do prazo</strong> — donut focado em performance: <em>No prazo</em>, <em>Divergência</em>,
          <em>Pendente</em> e <em>Vencido</em>.</li>
      </UL>
      <Callout type="rule" title="Diferença essencial entre os dois donuts">
        <strong>Status geral</strong> mostra <em>o que foi feito</em>; <strong>Cumprimento do prazo</strong> mostra
        <em> como foi feito</em> (no prazo ou com divergência). Use os dois juntos: alta execução + baixa aderência
        significa que a equipe está executando, mas fora do prazo.
      </Callout>

      {/* ---------------- 4. Execução ---------------- */}
      <H2 id="execucao"><SectionTag>4</SectionTag> Execução por medição, semana, unidade e gabinete</H2>
      <Mock title="Gráficos de execução" caption="Barras empilhadas comparam Preservado, Pendente e Vencido em diferentes recortes." ratio="16/5">
        <img src={imgExecucao} alt="Execução por unidade e por tipo de gabinete" className="w-full h-full object-contain bg-background" />
      </Mock>
      <UL>
        <li><strong>Execução por medição</strong> — compara medições históricas para detectar regressão.</li>
        <li><strong>Execução por semana</strong> — distribui itens por semana operacional (ex.: <em>SEMANA 1 11/05 a 15/05</em>).</li>
        <li><strong>Execução por unidade</strong> — saúde de cada unidade (U-12, U-22, U-29S, U-32, U-34, U-36, Almoxarifado).</li>
        <li><strong>Execução por tipo de gabinete</strong> — agrupa por RDC, SDCD, Switch e Triconex.</li>
      </UL>
      <Callout type="tip">
        Barras com muito <strong>vermelho</strong> (Vencido) indicam onde concentrar esforço. Use os filtros para
        isolar a unidade ou semana e confirmar a causa.
      </Callout>

      {/* ---------------- 5. Listas ---------------- */}
      <H2 id="listas"><SectionTag>5</SectionTag> Próximas preservações, vencidos e divergências</H2>
      <Mock title="Listas operacionais" caption="As três tabelas que dirigem o trabalho diário." ratio="16/5">
        <img src={imgTabelas} alt="Próximas preservações, itens vencidos e maiores divergências" className="w-full h-full object-contain bg-background" />
      </Mock>
      <UL>
        <li><strong>Próximas preservações</strong> — itens previstos em breve, com TAG, Unidade, Gabinete, Data prevista e Situação. Use para planejar a semana.</li>
        <li><strong>Itens vencidos</strong> — TAGs com prazo já estourado e quantos dias de atraso (<em>5d</em>, <em>4d</em>…). <strong>Prioridade máxima.</strong></li>
        <li><strong>Maiores divergências</strong> — itens com maior diferença entre data prevista e realizada, ajudando a identificar reincidência por unidade ou gabinete.</li>
      </UL>

      {/* ---------------- 7. Boas práticas ---------------- */}
      <H2 id="boas-praticas"><SectionTag>7</SectionTag> Rotina recomendada de leitura</H2>
      <UL>
        <li><strong>Manhã</strong> — abra o Dashboard com a Medição corrente. Cheque <em>Vencidos</em> e <em>Próximas preservações</em>.</li>
        <li><strong>Distribuição de equipe</strong> — use <em>Execução por unidade</em> para alocar pessoas onde há mais Pendente/Vencido.</li>
        <li><strong>Reporte à liderança</strong> — exporte os módulos detalhados, mas leve <em>Aderência</em> e <em>Cumprimento de prazo</em> como resumo.</li>
        <li>Se um número parecer estranho, confira os <strong>filtros ativos</strong> — eles afetam todos os blocos.</li>
      </UL>

      <Callout type="info" title="Próximo passo">
        Veja em <a className="text-primary underline" href="/docs/dashboard/filtros">Filtros e métricas</a> como
        cada filtro recorta os números e como cada percentual é calculado.
      </Callout>
    </>
  );
}
