import { Lead, P, H2, UL, Steps, Step, Callout } from "../components";

export default function Page() {
  return (
    <>
      <Lead>Para evitar perda acidental de dados, exclusões precisam de aprovação.</Lead>
      <H2 id="fluxo">Fluxo</H2>
      <Steps>
        <Step title="Usuário solicita">Clica em excluir, escreve uma justificativa.</Step>
        <Step title="Solicitação fica pendente">Admins recebem notificação. Item permanece visível até aprovação.</Step>
        <Step title="Admin aprova ou recusa">Se aprovar → item é excluído. Se recusar → item volta ao estado normal e usuário recebe motivo.</Step>
      </Steps>
      <Callout type="tip">O contador no menu lateral mostra solicitações pendentes para administradores.</Callout>
    </>
  );
}
