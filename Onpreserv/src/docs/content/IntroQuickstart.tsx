import { Lead, P, H2, Steps, Step, Callout, Mock, Kbd } from "../components";
import { ScreenAuth, ScreenDashboard } from "../screens";

export default function Page() {
  return (
    <>
      <Lead>Configure seu acesso e faça um tour guiado pelo sistema em 5 minutos.</Lead>

      <H2 id="login">1. Fazer login</H2>
      <Mock
        title="onpreserv.app/auth"
        annotations={[
          { kind: "circle", x: 50, y: 47, r: 6, n: 1, label: "campos" },
          { kind: "circle", x: 50, y: 64, r: 4, n: 2, label: "entrar" },
        ]}
      >
        <ScreenAuth />
      </Mock>
      <P>Use o e-mail e senha enviados pelo administrador. Caso seja seu primeiro acesso, será solicitada a redefinição da senha.</P>

      <H2 id="tour">2. Conhecer a interface</H2>
      <Steps>
        <Step title="Sidebar à esquerda">Contém todas as áreas do sistema. Clique no logo para recolher.</Step>
        <Step title="Cabeçalho superior">Mostra o título da página, sino de notificações, alternador de tema e seu perfil.</Step>
        <Step title="Área central">É onde o conteúdo de cada módulo é exibido.</Step>
      </Steps>

      <Mock title="Dashboard — visão inicial"><ScreenDashboard /></Mock>

      <H2 id="atalhos">3. Atalhos úteis</H2>
      <P>
        Pressione <Kbd>Ctrl</Kbd>+<Kbd>K</Kbd> em qualquer lugar para abrir a busca global desta documentação. Use <Kbd>Esc</Kbd> para fechar diálogos.
      </P>

      <Callout type="tip">Recomendamos começar cadastrando um lote de teste em <strong>Lotes → Novo lote</strong> para se familiarizar com o fluxo.</Callout>
    </>
  );
}
