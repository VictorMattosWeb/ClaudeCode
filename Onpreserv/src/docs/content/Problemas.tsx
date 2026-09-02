import { Lead, Callout, H2 } from "../components";

export default function Page() {
  return (
    <>
      <Lead>Erros mais comuns e como resolver rapidamente.</Lead>

      <H2 id="upload">Erro ao enviar planilha</H2>
      <Callout type="error" title="Cabeçalho inválido">Confira se baixou o modelo correto. Os nomes precisam bater letra a letra.</Callout>
      <Callout type="error" title="Linha ignorada">Provavelmente caractere inválido em rua/prateleira ou tipoLote desconhecido. Veja o resumo da importação.</Callout>

      <H2 id="login">Não consigo fazer login</H2>
      <Callout type="error" title="Credenciais inválidas">Verifique caps lock. Se persistir, peça ao administrador um reset.</Callout>
      <Callout type="error" title="Sessão expirou">Recarregue a página e faça login novamente.</Callout>

      <H2 id="permissao">Não vejo um menu</H2>
      <Callout type="warning">Você não tem permissão para esse módulo. Solicite ao administrador.</Callout>

      <H2 id="lentidao">Sistema lento</H2>
      <Callout type="warning">Tente filtrar listagens grandes. Se persistir, abra ticket ao suporte.</Callout>
    </>
  );
}
