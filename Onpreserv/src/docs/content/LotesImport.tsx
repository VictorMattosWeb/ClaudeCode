import { Lead, P, H2, H3, UL, Callout, Steps, Step, Mock, Compare, Code } from "../components";
import imgImportarBtn from "@/docs/assets/lotes-importar-btn.png";
import imgImportarDialog from "@/docs/assets/lotes-importar-dialog.png";
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
        A importação por planilha permite criar <strong>dezenas ou centenas de lotes em segundos</strong>.
        É a forma recomendada para receber uma carga inteira de almoxarifado ou trazer um inventário antigo
        para o sistema.
      </Lead>

      <Callout type="rule" title="Códigos podem repetir — sem deduplicação">
        Diferente de outros sistemas, o onPreserv <strong>não mescla</strong> lotes pelo código de embalagem.
        Cada linha da planilha vira um <em>lote novo</em>, com seu próprio identificador interno
        (<code>NOV-XXXX</code> ou <code>RTC-XXXX</code>). Isso espelha a realidade: duas embalagens podem ter
        o mesmo código impresso, mas são objetos físicos distintos.
      </Callout>

      {/* ---------------- 1. Botão ---------------- */}
      <H2 id="abrir"><SectionTag>1</SectionTag> Abrir o diálogo de importação</H2>
      <P>No bloco <em>Lotes</em>, clique em <strong>Importar</strong> (botão central, ao lado do <em>+ Novo Lote</em>).</P>
      <Mock title="Bloco de ações" ratio="16/3">
        <img src={imgImportarBtn} alt="Botão Importar destacado" className="w-full h-full object-contain bg-background" />
      </Mock>

      {/* ---------------- 2. Diálogo ---------------- */}
      <H2 id="dialogo"><SectionTag>2</SectionTag> Entender o diálogo</H2>
      <Mock title="Importar lotes por planilha" ratio="16/10">
        <img src={imgImportarDialog} alt="Diálogo de importação de lotes" className="w-full h-full object-contain bg-background" />
      </Mock>
      <UL>
        <li><strong>Colunas esperadas</strong> — listadas como tags no topo do diálogo. Devem aparecer no cabeçalho exatamente como mostrado.</li>
        <li><strong>Área de upload</strong> — arraste o arquivo para o tracejado ou clique para selecionar. Aceita <code>.xlsx</code> e <code>.csv</code>.</li>
        <li><strong>Baixar modelo Excel</strong> — gera um arquivo pronto, com cabeçalho correto e linhas de exemplo.</li>
      </UL>
      <Callout type="tip">
        Sempre comece pelo botão <strong>Baixar modelo Excel</strong>. Ele garante encoding correto e cabeçalho
        compatível.
      </Callout>

      {/* ---------------- 3. Colunas ---------------- */}
      <H2 id="colunas"><SectionTag>3</SectionTag> Colunas da planilha</H2>
      <Code lang="csv">tipoLote,codigo,nome,local,rua,prateleira,responsavel,observacoes,status</Code>
      <UL>
        <li><strong>tipoLote</strong> — <em>novo</em> ou <em>retirado_campo</em> (também aceita <code>NOV</code>/<code>RTC</code>, <code>N</code>/<code>R</code>). Vazio = <em>novo</em>.</li>
        <li><strong>codigo</strong> — número da embalagem. Pode repetir entre linhas.</li>
        <li><strong>nome</strong> — descrição do material (obrigatório).</li>
        <li><strong>local</strong> — texto livre, geralmente <em>ALMOXARIFADO</em>.</li>
        <li><strong>rua</strong> e <strong>prateleira</strong> — alfanuméricos com hífen.</li>
        <li><strong>responsavel</strong> — nome do dono operacional.</li>
        <li><strong>observacoes</strong> — texto livre.</li>
        <li><strong>status</strong> — <em>ativo</em> ou <em>inativo</em>. Vazio = <em>ativo</em>.</li>
      </UL>

      <Compare
        doItems={[
          "Salvar como .xlsx",
          "Cabeçalhos exatos, sem acento",
          "Datas e códigos como texto puro",
          "Deixar vazio quando não souber",
        ]}
        dontItems={[
          "Renomear coluna (ex.: 'código')",
          "Mesclar células",
          "Inserir fórmulas Excel",
          "Linhas em branco no meio",
          "Múltiplas planilhas no mesmo arquivo",
        ]}
      />

      {/* ---------------- 4. Passo a passo ---------------- */}
      <H2 id="passo-a-passo"><SectionTag>4</SectionTag> Passo a passo completo</H2>
      <Steps>
        <Step title="Baixar o modelo">Clique em <strong>Baixar modelo Excel</strong> dentro do diálogo.</Step>
        <Step title="Preencher offline">Abra no Excel/LibreOffice e preencha as linhas. Use o exemplo como referência de formato.</Step>
        <Step title="Validar antes de subir">Confira se nenhuma coluna foi renomeada e se não há células mescladas.</Step>
        <Step title="Arrastar para o sistema">Volte ao diálogo e arraste o arquivo na área tracejada (ou clique para selecionar).</Step>
        <Step title="Conferir o resumo">Ao final, o sistema mostra <em>quantos lotes foram criados</em> e <em>quantas linhas foram ignoradas</em> (com o motivo).</Step>
        <Step title="Conferir na tabela">Os lotes aparecem no topo da listagem, cada um com seu identificador novo.</Step>
      </Steps>

      {/* ---------------- 5. Validações ---------------- */}
      <H2 id="validacoes"><SectionTag>5</SectionTag> Validações automáticas</H2>
      <UL>
        <li>Cabeçalhos obrigatórios presentes (<code>codigo</code> e <code>nome</code>).</li>
        <li><strong>tipoLote</strong> normalizado (case-insensitive) para <em>novo</em> ou <em>retirado_campo</em>.</li>
        <li><strong>rua</strong> e <strong>prateleira</strong> validadas pela regra alfanumérica com hífen.</li>
        <li><strong>status</strong> inválido vira <em>ativo</em> automaticamente.</li>
        <li>Linhas com erro <strong>não bloqueiam</strong> as válidas — apenas são listadas no resumo.</li>
      </UL>

      <Callout type="warning" title="Reimportar = duplicar">
        Importar a mesma planilha duas vezes <strong>cria lotes duplicados</strong>, cada um com identificador
        próprio. Confira o resumo antes de reimportar e, se for o caso, use <em>Exportar</em> antes para
        comparar.
      </Callout>
    </>
  );
}
