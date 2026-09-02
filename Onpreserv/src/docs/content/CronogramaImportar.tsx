import { Lead, P, H2, UL, Steps, Step, Code, Callout, Mock } from "../components";
import imgImportarBtn from "@/docs/assets/cronograma-importar-btn.png";
import imgImportarDialog from "@/docs/assets/cronograma-importar-dialog.png";
import imgExportarBtn from "@/docs/assets/cronograma-exportar-btn.png";
import imgExportarMenu from "@/docs/assets/cronograma-exportar-menu.png";

export default function Page() {
  return (
    <>
      <Lead>
        Importe (ou <strong>reimporte</strong>) um cronograma inteiro a partir de uma planilha. A
        importação é <strong>incremental</strong>: cada execução pode tanto criar itens novos quanto
        atualizar os que já existem, graças ao <em>merge inteligente</em>.
      </Lead>

      <Callout type="rule" title="Importação = Atualização">
        Importar a mesma planilha duas vezes <strong>não duplica</strong> os itens. O sistema reconhece
        TAGs já cadastradas na medição ativa e <strong>atualiza apenas os campos preenchidos</strong>.
        Use isso para corrigir datas, mudar status em massa ou complementar observações sem precisar
        editar item por item.
      </Callout>

      <H2 id="passo-a-passo">Passo a passo</H2>
      <Steps>
        <Step title="Selecionar a medição">
          Escolha primeiro a <strong>aba da medição</strong> que vai receber os itens. A importação
          sempre acontece dentro da medição ativa.
        </Step>
        <Step title="Abrir Cronograma → Importar">
          <Mock title="Botão Importar" ratio="16/3">
            <img src={imgImportarBtn} alt="Botão Importar no topo do Cronograma" className="w-full h-full object-cover object-top" />
          </Mock>
        </Step>
        <Step title="Baixar o modelo">
          No diálogo, clique em <strong>Baixar modelo</strong> para gerar uma planilha já com as
          colunas corretas. Sempre prefira o modelo oficial.
          <Mock title="Diálogo Importar cronograma" ratio="16/7">
            <img src={imgImportarDialog} alt="Diálogo de importação com área de drop e lista de colunas" className="w-full h-full object-contain bg-background" />
          </Mock>
        </Step>
        <Step title="Preencher a planilha">
          Mantenha o cabeçalho. Colunas obrigatórias: <strong>tag</strong>, <strong>unidade</strong>,
          <strong> gabinete</strong>. As demais são opcionais.
          <Code lang="csv">semana,preservacao,tag,unidade,gabinete,tipo,dataPrevista,dataRealizada,status,observacoes</Code>
        </Step>
        <Step title="Enviar o arquivo">
          Arraste o <code>.xlsx</code> ou <code>.csv</code> para a área tracejada — ou clique em
          <strong> Selecionar arquivo</strong>. O sistema processa e mostra quantos itens foram
          <strong> criados</strong> e quantos foram <strong>atualizados</strong>.
        </Step>
      </Steps>

      <H2 id="campos">Campos aceitos</H2>
      <UL>
        <li><strong>tag</strong> *, <strong>unidade</strong> *, <strong>gabinete</strong> * — chaves do item.</li>
        <li><strong>semana</strong> — texto livre (ex.: <em>SEMANA 1 27/04 a 30/04</em>).</li>
        <li><strong>preservacao</strong> — frequência aplicada (<em>30 dias</em>, <em>60 dias</em>…).</li>
        <li><strong>tipo</strong> — RDC, SDCD, Switch, Triconex…</li>
        <li><strong>dataPrevista</strong> e <strong>dataRealizada</strong> — datas no formato <code>AAAA-MM-DD</code>.</li>
        <li><strong>status</strong> — <em>PENDENTE</em> ou <em>PRESERVADO</em>.</li>
        <li><strong>observacoes</strong> — texto livre.</li>
      </UL>

      <Callout type="tip" title="Dica de uso real">
        Receba a planilha mensal já preenchida com as <em>datas realizadas</em>, importe sobre a
        medição correspondente e o sistema dá baixa de tudo de uma vez — sem clicar item por item.
      </Callout>

      <H2 id="exportar">Exportar para conferir antes</H2>
      <P>
        Antes de qualquer importação grande, exporte o cronograma atual e edite em cima dele. Assim
        você garante que as TAGs vão bater na hora do merge.
      </P>
      <div className="grid sm:grid-cols-2 gap-4">
        <Mock title="Botão Exportar" ratio="16/3">
          <img src={imgExportarBtn} alt="Botão Exportar do Cronograma" className="w-full h-full object-cover object-top" />
        </Mock>
        <Mock title="Formatos disponíveis" ratio="4/3">
          <img src={imgExportarMenu} alt="Menu com Excel, CSV e PDF" className="w-full h-full object-contain bg-background" />
        </Mock>
      </div>
      <UL>
        <li><strong>Excel (.xlsx)</strong> — ideal para reimportação posterior (mantém formatos).</li>
        <li><strong>CSV (.csv)</strong> — leve, bom para integrações.</li>
        <li><strong>PDF (.pdf)</strong> — para envio e impressão; não serve para reimportar.</li>
      </UL>

      <Callout type="warning">
        A exportação respeita os <strong>filtros ativos</strong> da tabela. Se quiser o cronograma
        completo, limpe os filtros antes de exportar.
      </Callout>
    </>
  );
}
