import { Lead, Steps, Step, Callout } from "../components";

export default function Page() {
  return (
    <>
      <Lead>Treinamento operacional: do cadastro de um lote até a baixa do cronograma.</Lead>
      <Steps>
        <Step title="1. Cadastrar o lote">Manual ou via importação. Garante que o lote existe no sistema.</Step>
        <Step title="2. Vincular atividade no cronograma">Em Cronograma → + Novo item. Selecione o lote, atividade e frequência.</Step>
        <Step title="3. Aguardar a data prevista">Sistema move o item para "Próximo" 7 dias antes.</Step>
        <Step title="4. Executar a preservação fisicamente">Vá ao almoxarifado, localize pelo Rua/Prateleira.</Step>
        <Step title="5. Dar baixa no cronograma">Marque o item, clique em Baixa em lote, registre observações.</Step>
        <Step title="6. Conferir nova data">A próxima execução é calculada automaticamente.</Step>
      </Steps>
      <Callout type="rule">Nunca execute uma preservação sem dar baixa — o item ficará marcado como atrasado mesmo tendo sido feito.</Callout>
    </>
  );
}
