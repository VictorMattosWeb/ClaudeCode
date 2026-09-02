import { Lead, P, UL, Callout } from "../components";

export default function Page() {
  return (
    <>
      <Lead>Notificações em tempo real para eventos importantes.</Lead>
      <UL>
        <li>Solicitações de exclusão (admins).</li>
        <li>Lotes vencendo em 7 dias.</li>
        <li>Cronograma com itens atrasados.</li>
      </UL>
      <P>Acesse pelo sino no canto superior direito. Clique em uma notificação para ir direto ao item.</P>
      <Callout type="tip">Notificações lidas ficam mais claras. Use "Marcar todas como lidas" para limpar.</Callout>
    </>
  );
}
