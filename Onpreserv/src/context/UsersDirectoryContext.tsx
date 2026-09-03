import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "@/services/adapters/supabase/client";
import { useAuth } from "@/context/AuthContext";

/**
 * Diretório de usuários: nome e foto de qualquer pessoa do sistema.
 *
 * -----------------------------------------------------------------------------
 * Existe porque a foto precisa aparecer ao lado do nome em TODA a aplicação.
 * -----------------------------------------------------------------------------
 *
 * Antes, cada tela que precisava de nomes carregava a sua própria lista pela
 * RPC `list_public_profiles`, que devolve `id`, `nome`, `cargo` e `status` —
 * mas **não** o avatar. Resultado: só o cabeçalho e a tela de conta mostravam
 * foto, porque só eles conheciam o perfil do próprio usuário. Em tarefas,
 * comentários e históricos aparecia um ícone genérico para todo mundo.
 *
 * O diretório carrega uma vez, é compartilhado por todas as telas e indexa por
 * id **e por nome**. O índice por nome não é luxo: parte do sistema guarda o
 * responsável como texto livre (as preservações e o responsável do lote, por
 * exemplo), não como id, e sem ele essas telas ficariam sem foto.
 */

export interface UsuarioDoDiretorio {
  id: string;
  nome: string;
  /** Caminho no bucket `avatars`, resolvido pelo `UserAvatar`. */
  avatarPath: string | null;
  status: string;
}

interface UsersDirectoryValue {
  usuarios: UsuarioDoDiretorio[];
  porId: (id: string | null | undefined) => UsuarioDoDiretorio | undefined;
  porNome: (nome: string | null | undefined) => UsuarioDoDiretorio | undefined;
  /** Falso enquanto carrega — evita piscar as iniciais antes da foto chegar. */
  pronto: boolean;
  /** Verdadeiro quando a leitura de fotos não foi permitida. Ver `carregar`. */
  semFotos: boolean;
}

const UsersDirectoryContext = createContext<UsersDirectoryValue | undefined>(undefined);

/** Normaliza o nome para casar "José Silva", "jose silva" e "JOSÉ  SILVA". */
function chaveDoNome(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function UsersDirectoryProvider({ children }: { children: React.ReactNode }) {
  const { session, authReady } = useAuth();
  const [usuarios, setUsuarios] = useState<UsuarioDoDiretorio[]>([]);
  const [pronto, setPronto] = useState(false);
  const [semFotos, setSemFotos] = useState(false);

  /**
   * Duas fontes, combinadas — e é preciso combinar, não escolher.
   *
   * A RPC `list_public_profiles` é a lista COMPLETA e autorizada de usuários,
   * mas não devolve o avatar. A tabela `profiles` tem o `avatar_url`, porém a
   * RLS pode devolver só as linhas que o usuário atual enxerga — para um perfil
   * não administrador isso pode ser apenas a própria linha.
   *
   * Ficar só com `profiles` daria um diretório incompleto (nomes sumindo das
   * telas); ficar só com a RPC daria a lista certa sem foto nenhuma. Então a
   * RPC define QUEM existe e `profiles` acrescenta a foto de quem for legível.
   */
  const carregar = useCallback(async () => {
    const [lista, comFoto] = await Promise.all([
      supabase.rpc("list_public_profiles"),
      supabase.from("profiles").select("id, nome, avatar_url, status"),
    ]);

    // `types.ts` foi gerado antes de `avatar_url` existir na tabela; a coluna
    // está no banco (a consulta acima não devolve `42703`).
    const fotos = new Map<string, string | null>(
      ((comFoto.data ?? []) as unknown as { id: string; avatar_url: string | null }[]).map((p) => [
        p.id,
        p.avatar_url ?? null,
      ]),
    );

    const base = (lista.data ?? []) as { id: string; nome: string; status: string }[];

    // Se a RPC falhar, o que `profiles` trouxe ainda é melhor que nada.
    const registros: UsuarioDoDiretorio[] = base.length
      ? base.map((u) => ({
          id: u.id,
          nome: u.nome,
          avatarPath: fotos.get(u.id) ?? null,
          status: u.status,
        }))
      : ((comFoto.data ?? []) as unknown as {
          id: string;
          nome: string | null;
          avatar_url: string | null;
          status: string | null;
        }[]).map((u) => ({
          id: u.id,
          nome: u.nome ?? "",
          avatarPath: u.avatar_url ?? null,
          status: u.status ?? "ativo",
        }));

    registros.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
    setUsuarios(registros);
    // Sinaliza a degradação: os nomes aparecem, as fotos não.
    setSemFotos(registros.length > 0 && registros.every((u) => !u.avatarPath));
    setPronto(true);
  }, []);

  useEffect(() => {
    if (!authReady) return;
    if (!session) {
      setUsuarios([]);
      setPronto(false);
      return;
    }
    void carregar();
  }, [authReady, session, carregar]);

  // Recarrega quando alguém troca a própria foto: sem isto, a foto nova só
  // apareceria para os outros no próximo recarregamento da página.
  useEffect(() => {
    if (!session) return;
    const canal = supabase
      .channel("directory-profiles")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => {
        void carregar();
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(canal);
    };
  }, [session, carregar]);

  const porIdMap = useMemo(() => new Map(usuarios.map((u) => [u.id, u])), [usuarios]);
  const porNomeMap = useMemo(() => {
    const m = new Map<string, UsuarioDoDiretorio>();
    for (const u of usuarios) {
      const chave = chaveDoNome(u.nome);
      // O primeiro vence: em caso de nomes repetidos, um deles teria de ganhar
      // de qualquer forma, e trocar de foto a cada render seria pior.
      if (chave && !m.has(chave)) m.set(chave, u);
    }
    return m;
  }, [usuarios]);

  const valor = useMemo<UsersDirectoryValue>(
    () => ({
      usuarios,
      pronto,
      semFotos,
      porId: (id) => (id ? porIdMap.get(id) : undefined),
      porNome: (nome) => (nome ? porNomeMap.get(chaveDoNome(nome)) : undefined),
    }),
    [usuarios, pronto, semFotos, porIdMap, porNomeMap],
  );

  return <UsersDirectoryContext.Provider value={valor}>{children}</UsersDirectoryContext.Provider>;
}

/**
 * Acesso ao diretório.
 *
 * Devolve um diretório vazio quando usado fora do provider, em vez de lançar:
 * a foto é enfeite informativo, e uma tela de erro por causa dela seria uma
 * troca ruim. Os nomes continuam sendo exibidos pelo texto que o chamador já
 * tem em mãos.
 */
export function useUsersDirectory(): UsersDirectoryValue {
  const ctx = useContext(UsersDirectoryContext);
  if (ctx) return ctx;
  return {
    usuarios: [],
    pronto: false,
    semFotos: true,
    porId: () => undefined,
    porNome: () => undefined,
  };
}
