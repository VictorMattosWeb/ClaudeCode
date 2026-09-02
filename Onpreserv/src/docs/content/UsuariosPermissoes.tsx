import { Lead, P, UL, Callout } from "../components";

export default function Page() {
  return (
    <>
      <Lead>Matriz de permissões por papel.</Lead>
      <div className="my-6 overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr><th className="text-left p-3">Ação</th><th className="p-3">Usuário</th><th className="p-3">Admin</th></tr>
          </thead>
          <tbody className="[&_td]:p-3 [&_td]:border-t [&_td]:border-border [&_td:not(:first-child)]:text-center">
            <tr><td>Ver lotes / cronograma / tarefas</td><td>✅</td><td>✅</td></tr>
            <tr><td>Cadastrar / editar lotes</td><td>✅</td><td>✅</td></tr>
            <tr><td>Importar / exportar</td><td>✅</td><td>✅</td></tr>
            <tr><td>Solicitar exclusão</td><td>✅</td><td>✅</td></tr>
            <tr><td>Aprovar exclusão</td><td>❌</td><td>✅</td></tr>
            <tr><td>Gerenciar usuários</td><td>❌</td><td>✅</td></tr>
            <tr><td>Configurar permissões por módulo</td><td>❌</td><td>✅</td></tr>
          </tbody>
        </table>
      </div>
      <Callout type="rule">Permissões são verificadas no servidor — não basta esconder o botão.</Callout>
    </>
  );
}
