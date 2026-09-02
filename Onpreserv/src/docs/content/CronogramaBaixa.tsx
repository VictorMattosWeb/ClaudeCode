import { Lead, P, H2, Steps, Step, Callout, Mock, UL } from "../components";
import imgCheckbox from "@/docs/assets/cronograma-baixa-checkbox.png";
import imgBtn from "@/docs/assets/cronograma-baixa-btn.png";
import imgDialog from "@/docs/assets/cronograma-baixa-dialog.png";

export default function Page() {
  return (
    <>
      <Lead>Dê baixa em vários itens do cronograma de uma vez só.</Lead>

      <H2 id="passo-a-passo">Passo a passo</H2>
      <Steps>
        <Step title="Selecionar itens">
          Marque a <strong>checkbox</strong> no início de cada linha. Use a checkbox do
          <strong> cabeçalho</strong> para selecionar todos os itens visíveis da medição ativa.
        </Step>
        <Step title="Clicar em Dar baixa em lote">
          O botão verde <strong>Dar baixa em lote (N)</strong> aparece no topo, mostrando a
          quantidade de itens selecionados entre parênteses.
        </Step>
        <Step title="Confirmar a data">
          Por padrão, a baixa é registrada com a data atual — você pode alterar para uma data
          passada.
        </Step>
        <Step title="Adicionar observação opcional">
          O comentário fica no histórico de auditoria do item.
        </Step>
        <Step title="Confirmar">
          Os itens passam para <strong>PRESERVADO</strong> e a situação é recalculada na hora.
        </Step>
      </Steps>

      <H2 id="selecao">1. Selecionar os itens</H2>
      <P>
        Marque a checkbox da primeira coluna em cada linha desejada. Para selecionar todos os
        itens da medição de uma vez, clique na checkbox do cabeçalho.
      </P>
      <Mock title="Seleção de itens com a checkbox do cabeçalho" ratio="4/3">
        <img src={imgCheckbox} alt="Checkbox do cabeçalho selecionando todas as linhas do cronograma" className="w-full h-full object-contain bg-background" />
      </Mock>

      <H2 id="botao">2. Dar baixa em lote</H2>
      <P>
        Assim que houver pelo menos um item selecionado, o botão <strong>Dar baixa em lote (N)
        </strong> fica disponível na barra de ações, com o contador entre parênteses indicando
        quantos itens serão atualizados.
      </P>
      <Mock title="Botão Dar baixa em lote com 98 itens selecionados" ratio="4/3">
        <img src={imgBtn} alt="Botão Dar baixa em lote (98) na barra de ações do Cronograma" className="w-full h-full object-contain bg-background" />
      </Mock>

      <H2 id="dialog">3. Confirmar a baixa</H2>
      <P>
        O diálogo <strong>"Dar baixa em lote"</strong> mostra um resumo da seleção e pede a data
        da preservação antes de aplicar:
      </P>
      <Mock title="Diálogo Dar baixa em lote" ratio="4/3">
        <img src={imgDialog} alt="Diálogo de confirmação de baixa em lote com data e observações" className="w-full h-full object-contain bg-background" />
      </Mock>
      <UL>
        <li><strong>N selecionado(s)</strong> — total de itens marcados na tabela.</li>
        <li><strong>N a preservar</strong> — quantos efetivamente receberão a baixa.</li>
        <li><strong>N já preservado(s) — serão ignorados</strong> — itens que já estão como PRESERVADO ficam de fora automaticamente, sem sobrescrever a data original.</li>
        <li><strong>Data da preservação *</strong> — obrigatória; vem preenchida com a data atual e pode ser alterada para uma data passada.</li>
        <li><strong>Observações</strong> — texto opcional aplicado a todos os itens daquela baixa, visível no histórico.</li>
        <li><strong>Confirmar baixa (N)</strong> — o número entre parênteses reflete apenas os itens que serão atualizados.</li>
      </UL>

      <Callout type="tip">
        Você pode dar baixa parcial — itens não selecionados continuam pendentes. Para registrar
        baixas de muitos itens com <strong>datas diferentes</strong>, prefira o caminho via
        <strong> importar planilha</strong> com merge.
      </Callout>
    </>
  );
}
