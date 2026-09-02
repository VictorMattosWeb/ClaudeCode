import { Lead, P, H2, H3, UL, Mock, Callout, CardGrid, LinkCard } from "../components";
import imgFull from "@/docs/assets/lotes-full.png";
import imgKpis from "@/docs/assets/lotes-kpis.png";
import imgBulkCheckbox from "@/docs/assets/lotes-bulk-checkbox.png";
import imgBulkPreservar from "@/docs/assets/lotes-bulk-preservar.png";
import imgBulkExcluir from "@/docs/assets/lotes-bulk-excluir.png";
import imgBulkExportar from "@/docs/assets/lotes-bulk-exportar.png";
import { Plus, Upload, Download, MapPin, Scale } from "lucide-react";
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
        O módulo <strong>Lotes</strong> é o coração operacional do onPreserv. Tudo que envolve preservação,
        cronograma e atividades parte de um lote: ele é a unidade física que existe no almoxarifado e
        que precisa ser controlada do recebimento ao retorno para campo.
      </Lead>

      <Mock title="onpreserv.app/lotes" caption="Visão completa do módulo: KPIs no topo, ações, filtros e tabela paginada." ratio="16/9">
        <img src={imgFull} alt="Visão completa do módulo Lotes" className="w-full h-full object-cover object-top" />
      </Mock>

      <Callout type="info" title="O que é um lote no onPreserv">
        Um lote representa <strong>uma embalagem física</strong> recebida ou retornada. Ele guarda código de
        embalagem, descrição, localização (rua e prateleira), responsável, status e o histórico de
        preservações. Cada lote recebe um <strong>identificador interno único</strong> que permite rastreá-lo
        mesmo quando o código de embalagem se repete.
      </Callout>

      {/* ---------------- 1. KPIs ---------------- */}
      <H2 id="kpis"><SectionTag>1</SectionTag> Indicadores no topo</H2>
      <P>
        Antes da listagem, quatro cards resumem a saúde do almoxarifado em tempo real. Eles consideram
        <strong> todos</strong> os lotes cadastrados — não respeitam os filtros aplicados na tabela abaixo.
      </P>
      <Mock title="KPIs de Lotes" ratio="16/3">
        <img src={imgKpis} alt="Cards: Total, Preservados, Próximos e Vencidos" className="w-full h-full object-contain bg-background" />
      </Mock>
      <UL>
        <li><strong>Total de Lotes</strong> — quantos lotes existem no sistema (independente de status).</li>
        <li><strong>Preservados</strong> — lotes com preservação <em>em dia</em> (próxima data ainda distante).</li>
        <li><strong>Próximos</strong> — lotes cuja próxima preservação cai em até <strong>7 dias</strong>. Atenção amarela.</li>
        <li><strong>Vencidos</strong> — lotes com preservação <em>vencida</em>. Crítico, exige ação imediata.</li>
      </UL>
      <Callout type="warning" title="Vencidos &gt; 0">
        Esse número deve ficar em zero. Todo lote vencido representa risco operacional — abra a tabela,
        filtre por <em>Situação: Vencida</em> e priorize a baixa.
      </Callout>

      {/* ---------------- 2. Estrutura ---------------- */}
      <H2 id="estrutura"><SectionTag>2</SectionTag> Estrutura da tela</H2>
      <UL>
        <li><strong>Ações</strong> — três botões à direita: <em>Exportar</em>, <em>Importar</em> e <em>+ Novo Lote</em>.</li>
        <li><strong>Filtros</strong> — busca textual, status (Ativo/Inativo), situação de preservação, rua e prateleira.</li>
        <li><strong>Tabela</strong> — colunas Identificador, Tipo, Código, Nome, Local, Rua, Prateleira, Responsável, Status, Última, Próxima, Situação e Ações.</li>
        <li><strong>Seleção em massa</strong> — checkbox no início de cada linha permite agir sobre vários lotes ao mesmo tempo.</li>
      </UL>

      {/* ---------------- 3. Identificador ---------------- */}
      <H2 id="identificador"><SectionTag>3</SectionTag> Identificador interno vs. Código</H2>
      <Callout type="rule" title="Dois números diferentes, propósitos diferentes">
        <strong>Identificador interno</strong> (<code>NOV-0139</code>, <code>RTC-0021</code>…) é gerado pelo
        sistema e é <em>sempre único</em>. <strong>Código</strong> (<code>N#000027265</code>) é o número de
        embalagem informado por você — pode <em>repetir</em> entre lotes diferentes.
      </Callout>
      <UL>
        <li>O prefixo do identificador depende do tipo: <strong>NOV</strong> para Novo, <strong>RTC</strong> para Retirado de Campo.</li>
        <li>Use o identificador em rastreabilidade, exportações e auditoria.</li>
        <li>Use o código quando precisar conferir contra a etiqueta física da embalagem.</li>
      </UL>

      {/* ---------------- 4. Ações ---------------- */}
      <H2 id="acoes"><SectionTag>4</SectionTag> O que você pode fazer aqui</H2>
      <CardGrid>
        <LinkCard to="/docs/lotes/cadastrar" icon={Plus}     title="Cadastrar lote"     description="Criar manualmente, do zero, com identificador automático." />
        <LinkCard to="/docs/lotes/importar"  icon={Upload}   title="Importar planilha"  description="Adicionar dezenas de lotes de uma vez via Excel/CSV." />
        <LinkCard to="/docs/lotes/exportar"  icon={Download} title="Exportar"           description="Gerar XLSX, CSV ou PDF respeitando filtros." />
        <LinkCard to="/docs/lotes/localizar" icon={MapPin}   title="Localização física" description="Como usar rua e prateleira no almoxarifado." />
        <LinkCard to="/docs/lotes/regras"    icon={Scale}    title="Regras de negócio"  description="Identificador, status, exclusão e validações." />
      </CardGrid>

      {/* ---------------- 5. Ações em lote ---------------- */}
      <H2 id="acoes-em-lote"><SectionTag>5</SectionTag> Ações em lote</H2>
      <P>
        Marque vários lotes de uma vez usando os checkboxes. Use o checkbox do cabeçalho para selecionar
        todas as linhas visíveis.
      </P>
      <Mock title="Selecionar lotes" ratio="4/3">
        <img src={imgBulkCheckbox} alt="Checkbox de seleção em lotes" className="w-full h-full object-contain bg-background" />
      </Mock>
      <P>
        Com pelo menos um lote selecionado, uma barra de ações aparece com três opções:
      </P>

      <H3 id="bulk-exportar">Exportar</H3>
      <P>Gera XLSX, CSV ou PDF apenas com os lotes selecionados — útil para enviar um recorte específico.</P>
      <Mock title="Exportar selecionados" ratio="16/3">
        <img src={imgBulkExportar} alt="Botão Exportar na barra de seleção" className="w-full h-full object-contain bg-background" />
      </Mock>

      <H3 id="bulk-preservar">Registrar preservação</H3>
      <P>
        Aplica uma preservação para todos os lotes marcados de uma só vez, com a mesma data, responsável
        e observação. Ideal quando o time preservou um conjunto inteiro no mesmo dia.
      </P>
      <Mock title="Registrar preservação em lote" ratio="16/3">
        <img src={imgBulkPreservar} alt="Botão Registrar preservação na barra de seleção" className="w-full h-full object-contain bg-background" />
      </Mock>

      <H3 id="bulk-excluir">Excluir selecionados</H3>
      <P>
        Remove vários lotes de uma vez. O comportamento depende do seu papel:
      </P>
      <Mock title="Excluir selecionados" ratio="16/3">
        <img src={imgBulkExcluir} alt="Botão Excluir selecionados na barra de seleção" className="w-full h-full object-contain bg-background" />
      </Mock>
      <UL>
        <li><strong>Administrador</strong> — a exclusão é aplicada imediatamente após a confirmação.</li>
        <li><strong>Demais usuários</strong> — é aberta uma <strong>solicitação de exclusão</strong> com justificativa. Os lotes só são removidos depois que um administrador aprovar a solicitação.</li>
      </UL>
      <Callout type="warning" title="Exclusão é definitiva">
        Lotes excluídos perdem o histórico de preservações vinculado. Em caso de dúvida, prefira marcar
        como <em>Inativo</em> em vez de excluir.
      </Callout>

      <Callout type="tip" title="Rotina recomendada">
        Toda manhã, abra Lotes, filtre por <em>Situação: Vencida</em> e <em>Próxima do vencimento</em>.
        Esses dois grupos definem a fila do dia.
      </Callout>
    </>
  );
}
