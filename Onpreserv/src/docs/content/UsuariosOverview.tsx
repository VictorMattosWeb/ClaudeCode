import { Lead, P, H2, UL, Callout, Steps, Step } from "../components";

export default function Page() {
  return (
    <>
      <Lead>Gerencie quem pode acessar o sistema e o que cada pessoa pode fazer.</Lead>
      <H2 id="papeis">Papéis disponíveis</H2>
      <UL>
        <li><strong>Administrador</strong> — acesso total, gerencia usuários e aprova solicitações.</li>
        <li><strong>Usuário</strong> — acesso limitado a módulos liberados.</li>
      </UL>
      <H2 id="convidar">Como convidar</H2>
      <Steps>
        <Step title="Menu → Usuários">Apenas administradores enxergam essa área.</Step>
        <Step title="+ Novo usuário">Informe e-mail, nome e papel.</Step>
        <Step title="Selecione módulos">Marque quais módulos o usuário poderá acessar.</Step>
        <Step title="Enviar convite">O usuário recebe um e-mail para criar a senha.</Step>
      </Steps>
      <Callout type="warning">Cuidado ao revogar acesso — o usuário deslogado perde sessão imediatamente.</Callout>
    </>
  );
}
