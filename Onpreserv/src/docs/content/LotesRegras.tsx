import { Lead, P, H2, H3, UL, Callout, Mock, Code } from "../components";
import imgFiltroStatus from "@/docs/assets/lotes-filtro-status.png";
import imgFiltroSituacao from "@/docs/assets/lotes-filtro-situacao.png";
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
        Esta página reúne todas as <strong>regras de negócio</strong> que o sistema aplica automaticamente em
        Lotes — identificador, status, situação, exclusão e validações. Conhecer essas regras evita surpresas
        durante a operação.
      </Lead>

      {/* ---------------- 1. Identificador ---------------- */}
      <H2 id="identificador"><SectionTag>1</SectionTag> Identificador interno</H2>
      <UL>
        <li>Gerado automaticamente no formato <strong>NOV-XXXX</strong> (Novo) ou <strong>RTC-XXXX</strong> (Retirado de Campo).</li>
        <li>É <strong>sequencial</strong> e <strong>único</strong> em todo o sistema. Não é editável.</li>
        <li>É a chave usada em rastreabilidade, exportações, auditoria e integrações.</li>
        <li>Mesmo se um lote for inativado, o número não é reutilizado.</li>
      </UL>

      <H2 id="codigo-duplicado"><SectionTag>2</SectionTag> Código duplicado é permitido</H2>
      <Callout type="rule" title="Sem deduplicação por código">
        Lotes diferentes podem compartilhar o mesmo <strong>código de embalagem</strong>. Isso é proposital —
        embalagens físicas distintas podem ter o mesmo número impresso. O sistema os diferencia pelo
        <em> identificador interno</em>.
      </Callout>
      <P>
        Consequência prática: importar a mesma planilha duas vezes <strong>cria duplicatas</strong>. Sempre
        confira o resumo da importação antes de reimportar.
      </P>

      {/* ---------------- 3. Status ---------------- */}
      <H2 id="status"><SectionTag>3</SectionTag> Status do lote (Ativo / Inativo)</H2>
      <Mock title="Filtro de Status" ratio="16/4">
        <img src={imgFiltroStatus} alt="Status Ativo / Inativo" className="w-full h-full object-contain bg-background" />
      </Mock>
      <UL>
        <li><strong>Ativo</strong> — lote em uso. Aparece em todos os relatórios e gráficos.</li>
        <li><strong>Inativo</strong> — lote arquivado. Não aparece em KPIs nem em cronograma, mas continua consultável via filtro.</li>
      </UL>
      <P>Use <em>Inativo</em> em vez de excluir quando o lote não é mais utilizado mas você quer manter o histórico.</P>

      {/* ---------------- 4. Situação ---------------- */}
      <H2 id="situacao"><SectionTag>4</SectionTag> Situação de preservação (calculada)</H2>
      <Mock title="Filtro de Situação" ratio="16/4">
        <img src={imgFiltroSituacao} alt="Em dia, Próxima, Vencida, Sem preservação" className="w-full h-full object-contain bg-background" />
      </Mock>
      <P>
        A situação <strong>não é cadastrada</strong> — ela é calculada a partir da próxima preservação:
      </P>
      <Code lang="ts">{`diffDays = nextDate - hoje
diffDays < 0      => "Vencida"
diffDays <= 7     => "Próxima do vencimento"
diffDays > 7      => "Em dia"
sem preservação   => "Sem registro"`}</Code>
      <Callout type="tip">
        Por isso <em>não existe</em> botão para "marcar como vencido": basta uma preservação com data passada.
      </Callout>

      {/* ---------------- 5. Exclusão ---------------- */}
      <H2 id="exclusao"><SectionTag>5</SectionTag> Exclusão controlada</H2>
      <UL>
        <li>Lotes <strong>não são apagados diretamente</strong>.</li>
        <li>Usuários comuns abrem uma <strong>solicitação de exclusão</strong> (ícone de lixeira na coluna Ações).</li>
        <li>Administradores recebem a solicitação no módulo <em>Solicitações</em> e decidem aprovar ou recusar.</li>
        <li>Aprovações disparam a exclusão definitiva e geram registro na auditoria.</li>
      </UL>
      <Callout type="warning" title="Exclusão é irreversível">
        Após aprovada, a exclusão remove o lote e todas as preservações vinculadas. Considere
        <em> Inativar</em> primeiro.
      </Callout>

      {/* ---------------- 6. Validações ---------------- */}
      <H2 id="validacoes"><SectionTag>6</SectionTag> Validações de campo</H2>
      <H3 id="rua-prateleira">Rua / Prateleira</H3>
      <Code lang="regex">/^[A-Za-z0-9-]*$/</Code>
      <P>Aceita letras, números e hífen. Espaços, pontos, barras e underlines são bloqueados.</P>

      <H3 id="tipo">Tipo de Lote</H3>
      <UL>
        <li>Somente <strong>Novo</strong> ou <strong>Retirado de Campo</strong>.</li>
        <li>Na importação, aceita variações: <code>novo</code>, <code>NOV</code>, <code>N</code>, <code>retirado_campo</code>, <code>RTC</code>, <code>R</code>.</li>
      </UL>

      <H3 id="obrigatorios">Campos obrigatórios</H3>
      <UL>
        <li><strong>Tipo de Lote</strong> (default: Novo).</li>
        <li><strong>Código</strong> da embalagem.</li>
        <li><strong>Nome / Descrição</strong>.</li>
      </UL>

      {/* ---------------- 7. Boas práticas ---------------- */}
      <H2 id="boas-praticas"><SectionTag>7</SectionTag> Boas práticas operacionais</H2>
      <UL>
        <li>Sempre preencha <strong>Rua</strong> e <strong>Prateleira</strong> — sem isso, a busca física não funciona.</li>
        <li>Defina um padrão de nomenclatura para Rua/Prateleira e <em>documente com a equipe</em>.</li>
        <li>Use <strong>Inativo</strong> antes de pedir exclusão — preserva histórico.</li>
        <li>Faça uma varredura semanal por <em>Situação: Vencida</em> para zerar a fila.</li>
        <li>Antes de reimportar, exporte a tabela atual para conferir contra a planilha nova.</li>
      </UL>
    </>
  );
}
