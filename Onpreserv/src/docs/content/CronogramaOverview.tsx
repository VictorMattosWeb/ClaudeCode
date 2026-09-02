import { Lead, P, H2, UL, Mock, Callout, CardGrid, LinkCard } from "../components";
import imgFull from "@/docs/assets/cronograma-full.png";
import imgNovaBtn from "@/docs/assets/cronograma-nova-btn.png";
import imgNovaDialog from "@/docs/assets/cronograma-nova-dialog.png";
import imgTabs from "@/docs/assets/cronograma-tabs.png";
import imgArrows from "@/docs/assets/cronograma-arrows.png";
import imgEditBtn from "@/docs/assets/cronograma-edit-btn.png";
import imgEditDialog from "@/docs/assets/cronograma-edit-dialog.png";
import imgDeleteBtn from "@/docs/assets/cronograma-delete-btn.png";
import imgDeleteDialog from "@/docs/assets/cronograma-delete-dialog.png";
import imgItemBtn from "@/docs/assets/cronograma-item-btn.png";
import imgItemDialog from "@/docs/assets/cronograma-item-dialog.png";
import imgRowEdit from "@/docs/assets/cronograma-row-edit.png";
import imgRowDelete from "@/docs/assets/cronograma-row-delete.png";
import imgRowDeleteDialog from "@/docs/assets/cronograma-row-delete-dialog.png";
import imgFiltros from "@/docs/assets/cronograma-filtros.png";
import { Upload, Download, GitMerge, ListChecks } from "lucide-react";

export default function Page() {
  return (
    <>
      <Lead>
        O <strong>Cronograma de Preservação</strong> organiza, mede e acompanha todas as preservações
        agrupadas por <strong>medição</strong>. Cada medição é um ciclo (geralmente mensal) com seus
        próprios itens, prazos e indicadores — e pode ser comparada com outras medições no histórico.
      </Lead>

      <Mock title="onpreserv.app/cronograma" caption="Visão completa: cabeçalho, abas de medição, ações, KPIs, prazo geral, filtros e tabela de itens." ratio="16/10">
        <img src={imgFull} alt="Visão completa do Cronograma" className="w-full h-full object-cover object-top" />
      </Mock>

      <Callout type="info" title="Como o Cronograma é alimentado">
        Os itens podem ser cadastrados <strong>um a um</strong>, importados via <strong>planilha</strong>
        ou <strong>reimportados</strong> para atualizar dados existentes (merge inteligente). Os
        indicadores e o prazo geral são <strong>recalculados em tempo real</strong>.
      </Callout>

      {/* ---------- Nova medição ---------- */}
      <H2 id="nova-medicao">Criar uma nova medição</H2>
      <P>
        O botão <strong>+ Nova medição</strong> (canto superior direito) abre o cadastro de um novo
        ciclo. A medição é o "container" de todos os itens daquele período.
      </P>
      <Mock title="Botão Nova medição" ratio="16/3">
        <img src={imgNovaBtn} alt="Botão Nova medição no topo do Cronograma" className="w-full h-full object-cover object-top" />
      </Mock>
      <Mock title="Diálogo Nova medição" ratio="4/3">
        <img src={imgNovaDialog} alt="Formulário de nova medição com nome, data de referência e descrição" className="w-full h-full object-contain bg-background" />
      </Mock>
      <UL>
        <li><strong>Nome</strong> — obrigatório (ex.: <em>1ª Medição 16/03/2026 – 19/04/2026</em>).</li>
        <li><strong>Data de referência</strong> — opcional, usada como âncora cronológica.</li>
        <li><strong>Descrição</strong> — texto livre para contexto interno.</li>
      </UL>

      {/* ---------- Abas + setas ---------- */}
      <H2 id="abas">Abas de medição e ordenação</H2>
      <P>
        Cada medição vira uma <strong>aba</strong> logo abaixo do cabeçalho. Clique para alternar — todos
        os KPIs, o prazo geral, os filtros e a tabela passam a refletir <em>apenas</em> a medição
        selecionada.
      </P>
      <Mock title="Abas de medição" ratio="16/3">
        <img src={imgTabs} alt="Abas de medição com a 3ª medição selecionada" className="w-full h-full object-cover object-top" />
      </Mock>
      <Callout type="rule" title="Setas < e > → reordenam as abas">
        As setas <strong>&lt;</strong> e <strong>&gt;</strong> ao lado direito não navegam entre páginas:
        elas <strong>movem a medição selecionada</strong> uma posição para a esquerda ou para a direita,
        permitindo ajustar a ordem de exibição. Útil quando as medições não foram criadas em ordem
        cronológica.
      </Callout>
      <Mock title="Setas de ordenação" ratio="16/3">
        <img src={imgArrows} alt="Setas para reordenar as abas de medição" className="w-full h-full object-cover object-top" />
      </Mock>

      {/* ---------- Editar medição ---------- */}
      <H2 id="editar-medicao">Editar a medição selecionada</H2>
      <P>
        O ícone de <strong>lápis</strong> (à direita das setas) abre o mesmo formulário, já preenchido,
        para corrigir nome, data de referência ou descrição da medição ativa.
      </P>
      <div className="grid sm:grid-cols-2 gap-4">
        <Mock title="Botão editar medição" ratio="16/4">
          <img src={imgEditBtn} alt="Botão de editar medição (lápis)" className="w-full h-full object-cover object-top" />
        </Mock>
        <Mock title="Diálogo Editar medição" ratio="4/3">
          <img src={imgEditDialog} alt="Formulário de edição de medição preenchido" className="w-full h-full object-contain bg-background" />
        </Mock>
      </div>

      {/* ---------- Excluir medição ---------- */}
      <H2 id="excluir-medicao">Excluir a medição selecionada</H2>
      <P>
        O ícone de <strong>lixeira</strong> remove a medição ativa <em>e todos os itens associados</em>.
        Há um diálogo de confirmação para evitar perda acidental.
      </P>
      <div className="grid sm:grid-cols-2 gap-4">
        <Mock title="Botão excluir medição" ratio="16/4">
          <img src={imgDeleteBtn} alt="Botão de excluir medição (lixeira)" className="w-full h-full object-cover object-top" />
        </Mock>
        <Mock title="Confirmação de exclusão" ratio="4/3">
          <img src={imgDeleteDialog} alt="Diálogo de confirmação de exclusão de medição" className="w-full h-full object-contain bg-background" />
        </Mock>
      </div>
      <Callout type="warning">
        A exclusão de uma medição é <strong>permanente</strong> e leva todos os itens junto. Se for só
        para corrigir um nome, use <em>Editar</em>.
      </Callout>

      {/* ---------- Adicionar item ---------- */}
      <H2 id="adicionar-item">Adicionar um novo item</H2>
      <P>
        Para cadastrar uma TAG manualmente na medição ativa, clique em <strong>+ Item</strong> no
        canto superior direito da tabela. O diálogo <em>"Novo item do cronograma"</em> abre em
        branco para preenchimento.
      </P>
      <Mock title="Botão + Item" ratio="16/4">
        <img src={imgItemBtn} alt="Botão + Item para adicionar um novo registro" className="w-full h-full object-cover object-top" />
      </Mock>
      <Mock title="Diálogo Novo item do cronograma" ratio="4/3">
        <img src={imgItemDialog} alt="Formulário de novo item do cronograma com todos os campos" className="w-full h-full object-contain bg-background" />
      </Mock>
      <UL>
        <li><strong>Semana</strong> — agrupamento operacional (ex.: <em>SEMANA 1 27/04 a 30/04</em>). Opcional.</li>
        <li><strong>Preservação</strong> — descrição livre da preservação a ser executada. Opcional.</li>
        <li><strong>TAG *</strong>, <strong>Unidade *</strong> e <strong>Gabinete *</strong> — obrigatórios; identificam o item de forma única dentro da medição.</li>
        <li><strong>Tipo</strong> — natureza do equipamento (SDCD, Triconex, RDC…).</li>
        <li><strong>Data prevista</strong> — alimenta a situação (No prazo / Vencido / Divergência).</li>
        <li><strong>Data realizada</strong> — registra a baixa; ao preencher, o status passa automaticamente para <em>PRESERVADO</em>.</li>
        <li><strong>Status</strong> — começa como <em>PENDENTE</em> e pode ser alterado manualmente.</li>
        <li><strong>Observações</strong> — texto livre exibido no histórico e na exportação.</li>
      </UL>
      <Callout type="tip">
        Para cadastrar muitos itens de uma vez, prefira a <strong>importação por planilha</strong> — o
        cadastro manual é indicado para ajustes pontuais.
      </Callout>

      {/* ---------- Editar item ---------- */}
      <H2 id="editar-item">Editar um item existente</H2>
      <P>
        Na coluna <strong>Ações</strong> de cada linha da tabela, clique no ícone de <strong>lápis
        </strong> para abrir o mesmo formulário já preenchido com os dados atuais do item.
      </P>
      <Mock title="Ícone de editar na linha" ratio="16/6">
        <img src={imgRowEdit} alt="Ícone de lápis na coluna Ações para editar o item" className="w-full h-full object-cover object-top" />
      </Mock>

      {/* ---------- Excluir item ---------- */}
      <H2 id="excluir-item">Excluir um item</H2>
      <P>
        Ao lado do lápis, o ícone de <strong>lixeira</strong> remove o item. Um diálogo de
        confirmação aparece antes da exclusão — a ação não pode ser desfeita.
      </P>
      <div className="grid sm:grid-cols-2 gap-4">
        <Mock title="Ícone de excluir na linha" ratio="16/6">
          <img src={imgRowDelete} alt="Ícone de lixeira na coluna Ações" className="w-full h-full object-cover object-top" />
        </Mock>
        <Mock title="Confirmação de exclusão" ratio="4/3">
          <img src={imgRowDeleteDialog} alt="Diálogo de confirmação de exclusão do item" className="w-full h-full object-contain bg-background" />
        </Mock>
      </div>

      {/* ---------- Filtros ---------- */}
      <H2 id="filtros">Filtros da tabela</H2>
      <P>
        A barra de filtros refina a tabela de itens da medição ativa. Os filtros são <strong>combinados
        </strong> (AND) e <strong>não afetam</strong> os KPIs do topo — eles continuam mostrando o total
        da medição inteira.
      </P>
      <Mock title="Filtros do Cronograma" ratio="16/2">
        <img src={imgFiltros} alt="Linha de filtros: busca, semana, unidade, gabinete, tipo, status e situação" className="w-full h-full object-cover object-top" />
      </Mock>
      <UL>
        <li><strong>Busca</strong> — pesquisa por TAG, unidade ou gabinete.</li>
        <li><strong>Semana</strong> — agrupamento operacional (ex.: <em>SEMANA 1 27/04 a 30/04</em>).</li>
        <li><strong>Unidade</strong> — U-12, U-22, U-29S, U-32, U-34, U-36, Almoxarifado.</li>
        <li><strong>Gabinete</strong> — agrupador físico (RDC, SDCD, Switch, Triconex…).</li>
        <li><strong>Tipo</strong> — natureza da preservação registrada na linha.</li>
        <li><strong>Status</strong> — situação operacional do item (PENDENTE / PRESERVADO).</li>
        <li>
          <strong>Situação</strong> — classificação calculada automaticamente: <em>No prazo</em>,
          <em> Divergência</em>, <em> Pendente</em>, <em> Vencido</em> ou <em> Não aplicável</em>.
        </li>
      </UL>

      {/* ---------- Próximos passos ---------- */}
      <H2 id="proximos-passos">O que fazer aqui</H2>
      <CardGrid>
        <LinkCard to="/docs/cronograma/importar" icon={Upload}    title="Importar planilha" description="Subir um cronograma inteiro de uma vez (.xlsx ou .csv)." />
        <LinkCard to="/docs/cronograma/merge"    icon={GitMerge}  title="Atualizar via merge" description="Reimportar a planilha para atualizar itens existentes sem perder dados." />
        <LinkCard to="/docs/cronograma/baixa"    icon={ListChecks} title="Baixa em lote"     description="Marcar várias preservações como executadas de uma vez." />
        <LinkCard to="/docs/cronograma/status"   icon={Download}  title="Status calculados" description="Como o sistema decide No prazo, Vencido e Divergência." />
      </CardGrid>
    </>
  );
}
