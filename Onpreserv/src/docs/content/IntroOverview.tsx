import { Lead, P, H2, UL, Callout, CardGrid, LinkCard } from "../components";
import { LayoutDashboard, Package, CalendarRange, Boxes, Rocket, BookOpen, Activity } from "lucide-react";
import dashboardFull from "../assets/dashboard-full.png";
import lotesFull from "../assets/lotes-full.png";
import cronogramaFull from "../assets/cronograma-full.png";

export default function Page() {
  return (
    <>
      <Lead>
        O <strong>onPreserv</strong> é a plataforma que centraliza a gestão de
        <strong> lotes</strong>, <strong>cronograma de preservação</strong> e
        <strong> tarefas da equipe</strong> em um único lugar — do recebimento do material
        até a baixa das atividades de preservação, com histórico auditável.
      </Lead>

      <img src={dashboardFull} alt="Dashboard do onPreserv" className="rounded-lg border border-border my-4" />

      <H2 id="o-que-faz">O que o sistema faz</H2>
      <P>
        Em vez de planilhas espalhadas, o onPreserv organiza em módulos integrados todo o
        ciclo de vida dos materiais e equipamentos sob preservação:
      </P>
      <UL>
        <li><strong>Dashboard</strong> — visão consolidada com KPIs, gráficos de execução e medição.</li>
        <li><strong>Lotes</strong> — cadastro, importação, localização física (rua/prateleira), validade e status.</li>
        <li><strong>Cronograma de preservação</strong> — atividades periódicas vinculadas a cada lote, com baixa individual ou em massa.</li>
        <li><strong>Atividades</strong> — catálogo padronizado do passo a passo aplicado em cada preservação.</li>
        <li><strong>Usuários e permissões</strong> — controle granular de acesso por módulo.</li>
      </UL>

      <H2 id="como-funciona">Como tudo se conecta</H2>
      <P>
        Cada <strong>lote</strong> cadastrado pode ser vinculado a um ou mais itens do
        <strong> cronograma</strong>, que por sua vez referencia uma <strong>atividade</strong>
        com frequência definida (em dias). Quando o operador executa a preservação, ele
        dá <strong>baixa</strong> no cronograma — o sistema atualiza o status, recalcula a
        próxima data de execução e registra tudo no histórico para auditoria.
      </P>

      <img src={lotesFull} alt="Tela de lotes" className="rounded-lg border border-border my-4" />
      <P>
        A tela de <strong>Lotes</strong> é o ponto de partida: cadastre manualmente,
        importe planilhas em massa e acompanhe situação, validade e localização.
      </P>

      <img src={cronogramaFull} alt="Tela de cronograma" className="rounded-lg border border-border my-4" />
      <P>
        No <strong>Cronograma</strong>, você visualiza todas as atividades programadas,
        filtra por status, dá baixa em lote e importa planilhas com merge inteligente
        (atualiza apenas o que foi preenchido, sem sobrescrever o resto).
      </P>

      <H2 id="por-onde-comecar">Por onde começar</H2>
      <CardGrid>
        <LinkCard to="/docs/introducao/comecar"   icon={Rocket}          title="Primeiros passos"        description="Login e tour guiado em 5 minutos." />
        <LinkCard to="/docs/introducao/conceitos" icon={BookOpen}        title="Conceitos-chave"         description="Entenda os termos fundamentais." />
        <LinkCard to="/docs/lotes/cadastrar"      icon={Package}         title="Cadastrar primeiro lote" description="Aprenda na prática." />
        <LinkCard to="/docs/cronograma"           icon={CalendarRange}   title="Cronograma"              description="Como configurar a preservação." />
        <LinkCard to="/docs/atividades"           icon={Activity}        title="Atividades"              description="O passo a passo da preservação." />
        <LinkCard to="/docs/dashboard"            icon={LayoutDashboard} title="Dashboard"               description="Indicadores e gráficos." />
      </CardGrid>

      <Callout type="tip" title="Dica de leitura">
        A documentação foi pensada para ser lida na ordem da sidebar, mas você pode pular
        para qualquer tutorial. Use a busca <kbd>Ctrl/⌘ K</kbd> para encontrar qualquer
        assunto rapidamente.
      </Callout>
    </>
  );
}
