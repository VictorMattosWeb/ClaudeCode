import { Lead, Steps, Step, UL, Callout } from "../components";

export default function Page() {
  return (
    <>
      <Lead>Como executar a preservação corretamente para garantir conformidade.</Lead>
      <Steps>
        <Step title="Localize o lote">Use Rua/Prateleira para encontrar fisicamente.</Step>
        <Step title="Confira a atividade">Veja qual atividade é (lubrificação, inspeção, etc).</Step>
        <Step title="Reúna materiais necessários">Lubrificante, EPI, instrumento conforme o procedimento.</Step>
        <Step title="Execute a atividade">Siga o procedimento técnico aplicável.</Step>
        <Step title="Dê baixa no cronograma">Adicione observação detalhada.</Step>
      </Steps>
      <Callout type="rule">Preservar sem dar baixa no cronograma gera divergência futura na medição.</Callout>
    </>
  );
}
