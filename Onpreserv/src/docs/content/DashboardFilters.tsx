import { Lead, P, H2, H3, UL, Mock, Callout, Code } from "../components";
import imgMedicao from "@/docs/assets/dashboard-medicao.png";
import imgFiltroMedicao from "@/docs/assets/dashboard-filtro-medicao.png";
import imgFiltroSemana from "@/docs/assets/dashboard-filtro-semana.png";
import imgFiltroUnidade from "@/docs/assets/dashboard-filtro-unidade.png";
import type { ReactNode } from "react";

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
        O Dashboard tem dois níveis de filtro: o <strong>seletor global de Medição</strong> (no topo direito) e o
        <strong> bloco de Filtros</strong> (abaixo do cabeçalho). Juntos eles refinam KPIs, donuts, gráficos e listas
        ao mesmo tempo.
      </Lead>

      <Callout type="info" title="Ordem de aplicação">
        Os filtros agem em <strong>cascata</strong>:
        <Code lang="text">{`Medição global  →  Filtro de Medição  →  Semana  →  Unidade  →  Resultado`}</Code>
        Cada etapa restringe o que a próxima vê. Se o resultado parecer estranho, suba na cascata.
      </Callout>

      {/* 1. Medição global */}
      <H2 id="medicao-global"><SectionTag>1</SectionTag> Seletor global de Medição</H2>
      <Mock title="Seletor de Medição (topo direito)" caption="Define o período base do Dashboard inteiro." ratio="16/6">
        <img src={imgMedicao} alt="Seletor global de medição" className="w-full h-full object-contain bg-background" />
      </Mock>
      <P>
        Define o <strong>período base</strong> de tudo que aparece na tela. As opções são geradas automaticamente a
        partir das medições cadastradas (ex.: <em>1ª Medição 16/03/2026 - 19/04/2026</em>).
      </P>
      <UL>
        <li><strong>Todas as medições</strong> — visão acumulada do projeto.</li>
        <li><strong>Uma medição específica</strong> — recorta os KPIs, gráficos e listas àquela janela.</li>
      </UL>
      <Callout type="rule">
        Esse filtro é independente dos demais e <strong>sempre é aplicado primeiro</strong>. Trocar a medição muda o
        universo dos números antes de qualquer outro filtro.
      </Callout>

      {/* 2. Bloco de Filtros */}
      <H2 id="bloco-filtros"><SectionTag>2</SectionTag> Bloco de Filtros</H2>
      <P>
        Aparece logo abaixo do cabeçalho e tem três campos + botão <em>Limpar</em>. A combinação dos três responde a
        90% das perguntas operacionais.
      </P>

      <H3 id="filtro-medicao">2.1 Filtro Medição</H3>
      <Mock title="Filtro Medição" caption="Permite trocar de medição sem usar o seletor global." ratio="16/8">
        <img src={imgFiltroMedicao} alt="Dropdown do filtro de medição" className="w-full h-full object-contain bg-background" />
      </Mock>
      <P>
        Útil quando você quer comparar rapidamente a medição atual com uma anterior <em>sem perder</em> os outros
        filtros já configurados.
      </P>

      <H3 id="filtro-semana">2.2 Filtro Semana</H3>
      <Mock title="Filtro Semana" caption="Lista as semanas operacionais existentes." ratio="16/9">
        <img src={imgFiltroSemana} alt="Dropdown do filtro de semana" className="w-full h-full object-contain bg-background" />
      </Mock>
      <P>
        Mostra ranges como <em>SEMANA 1 11/05 a 15/05</em>. Use para focar em um intervalo curto — perfeito para
        reuniões diárias e fechamento semanal.
      </P>

      <H3 id="filtro-unidade">2.3 Filtro Unidade</H3>
      <Mock title="Filtro Unidade" caption="Almoxarifado, U-12, U-22, U-29S, U-32, U-34, U-36..." ratio="16/8">
        <img src={imgFiltroUnidade} alt="Dropdown do filtro de unidade" className="w-full h-full object-contain bg-background" />
      </Mock>
      <P>
        Limita a visão a uma unidade específica. Combinado com Medição e Semana, isola exatamente onde concentrar esforço.
      </P>

      {/* 3. Comportamento */}
      <H2 id="comportamento"><SectionTag>3</SectionTag> Como os filtros se combinam</H2>
      <UL>
        <li>Os filtros são aplicados em <strong>AND</strong> — quanto mais filtros, mais específico o resultado.</li>
        <li>A mudança é <strong>instantânea</strong>: KPIs, donuts, barras e listas atualizam juntos.</li>
        <li><strong>Limpar</strong> volta ao estado padrão (<em>Todos</em> em todos os campos), mas mantém o seletor global de Medição.</li>
      </UL>
      <Callout type="tip" title="Combinação que mais usamos">
        Para reportar performance da semana de uma unidade: defina <strong>Medição</strong> + <strong>Semana</strong> +
        <strong> Unidade</strong> e exporte uma captura da tela.
      </Callout>

      {/* 4. Métricas */}
      <H2 id="metricas"><SectionTag>4</SectionTag> Como as métricas são calculadas</H2>
      <Code lang="text">{`% Execução       = itens executados ÷ itens previstos        (dentro do filtro)
No prazo         = executados até a data prevista
Divergência      = executados fora da data prevista
Vencidos         = previstos com data < hoje e não executados
Aderência        = % no prazo, ignorando itens N/A
`}</Code>
      <Callout type="warning">
        Se um número parecer estranho, verifique se há um <strong>filtro ativo</strong> escondido — basta clicar em
        <em>Limpar</em> e refazer a seleção.
      </Callout>

      {/* 5. Exportar */}
      <H2 id="exportar"><SectionTag>5</SectionTag> Exportar a visão</H2>
      <P>
        O Dashboard não exporta imagem direta. Para relatórios formais, use a exportação dos módulos
        (<a className="text-primary underline" href="/docs/lotes/exportar">Lotes</a>,
        <a className="text-primary underline" href="/docs/cronograma"> Cronograma</a> e
        <a className="text-primary underline" href="/docs/cronograma/exportar"> Cronograma</a>) que já trazem os dados
        detalhados em XLSX/CSV/PDF.
      </P>
    </>
  );
}
