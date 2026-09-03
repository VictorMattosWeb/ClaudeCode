import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/UserAvatar";
import { useUsersDirectory } from "@/context/UsersDirectoryContext";

/**
 * Identidade de uma pessoa: a foto ao lado do nome.
 *
 * -----------------------------------------------------------------------------
 * Onde aparece o nome de um usuário, aparece a foto dele.
 * -----------------------------------------------------------------------------
 *
 * Aceita as duas formas com que o sistema guarda a autoria, porque as duas
 * existem de fato no banco:
 *
 *   `userId` — tarefas, comentários, histórico e solicitações gravam o id.
 *   `nome`   — preservações e o responsável do lote gravam o texto do nome,
 *              herdado de quando não havia cadastro de usuários.
 *
 * Passando `userId`, o nome também vem do diretório, então renomear uma pessoa
 * se reflete em tudo. Passando `nome`, ele é exibido como está e a foto é
 * procurada pelo nome — quem não estiver no diretório (um fornecedor externo,
 * um registro antigo) simplesmente aparece com as iniciais.
 *
 * Não é usado nas menções: lá o `@nome` é texto corrido dentro da frase, e uma
 * foto no meio do parágrafo atrapalharia a leitura.
 */
interface Props {
  /** Id do usuário. Tem prioridade sobre `nome`. */
  userId?: string | null;
  /** Nome já conhecido — usado quando não há id, ou como reserva. */
  nome?: string | null;
  /** Texto exibido quando não há nome nenhum. */
  vazio?: string;
  /** Lado da foto, em px. */
  size?: number;
  /** Só a foto, sem o nome ao lado. */
  somenteFoto?: boolean;
  className?: string;
  /** Classe aplicada ao nome, para herdar o peso/cor de cada contexto. */
  nomeClassName?: string;
}

export function UserTag({
  userId,
  nome,
  vazio = "—",
  size = 20,
  somenteFoto = false,
  className,
  nomeClassName,
}: Props) {
  const { porId, porNome } = useUsersDirectory();

  const usuario = userId ? porId(userId) : porNome(nome);
  const exibido = usuario?.nome || nome || "";

  if (!exibido) {
    return <span className={cn("text-muted-foreground", className)}>{vazio}</span>;
  }

  return (
    <span className={cn("inline-flex min-w-0 items-center gap-1.5", className)} title={exibido}>
      <UserAvatar path={usuario?.avatarPath} nome={exibido} size={size} />
      {!somenteFoto && <span className={cn("truncate", nomeClassName)}>{exibido}</span>}
    </span>
  );
}

/**
 * Vários usuários lado a lado, com as fotos sobrepostas.
 *
 * Quando a lista passa de `max`, o excedente vira um "+N" — a alternativa era
 * a linha crescer sem limite e empurrar o resto do cartão, que é justamente o
 * defeito que a versão anterior tinha ao listar responsáveis.
 */
export function UserTagGroup({
  userIds,
  max = 3,
  size = 20,
  className,
}: {
  userIds: string[];
  max?: number;
  size?: number;
  className?: string;
}) {
  const { porId } = useUsersDirectory();
  if (userIds.length === 0) return null;

  const visiveis = userIds.slice(0, max);
  const restantes = userIds.length - visiveis.length;
  const todos = userIds.map((id) => porId(id)?.nome ?? "—").join(", ");

  return (
    <span className={cn("inline-flex items-center", className)} title={todos}>
      {visiveis.map((id, i) => {
        const u = porId(id);
        return (
          <span key={id} className={i > 0 ? "-ml-1.5" : undefined}>
            <UserAvatar path={u?.avatarPath} nome={u?.nome ?? "?"} size={size} />
          </span>
        );
      })}
      {restantes > 0 && (
        <span
          className="-ml-1.5 inline-flex items-center justify-center rounded-full border border-border bg-muted font-hud font-semibold text-muted-foreground"
          style={{ width: size, height: size, fontSize: Math.max(9, Math.round(size * 0.36)) }}
        >
          +{restantes}
        </span>
      )}
    </span>
  );
}
