import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const AVATAR_BUCKET = "avatars";

/** Uma hora. O usuário renova ao recarregar; não vale segurar mais que isso. */
const EXPIRACAO_PADRAO = 60 * 60;

/**
 * Fotos de perfil em bucket privado.
 *
 * A política do workspace do projeto proíbe buckets públicos, então `avatars`
 * é privado e `getPublicUrl` devolve um endereço que não abre. O acesso passa a
 * ser por URL assinada, gerada sob demanda a partir do caminho do arquivo.
 *
 * Por isso `profiles.avatar_url` guarda o **caminho** (`<uid>/avatar-123.jpg`),
 * não uma URL: uma URL assinada expira, e persistir algo que vence garante link
 * quebrado depois. O caminho é estável; a assinatura é descartável.
 */

/** Distingue um valor legado (URL completa) do caminho novo. */
const ehUrlCompleta = (valor: string) => /^https?:\/\//i.test(valor);

/**
 * Resolve o valor guardado em `avatar_url` para algo exibível.
 *
 * Aceita tanto o caminho novo quanto uma URL completa, caso algum registro
 * antigo tenha sido salvo antes desta mudança.
 */
export async function resolveAvatarUrl(
  valor: string | null | undefined,
  expiresIn = EXPIRACAO_PADRAO,
): Promise<string | null> {
  if (!valor) return null;
  if (ehUrlCompleta(valor)) return valor;

  const { data, error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .createSignedUrl(valor, expiresIn);

  if (error) {
    console.error("[avatar] falha ao assinar URL:", error);
    return null;
  }
  return data?.signedUrl ?? null;
}

/**
 * Hook de leitura: recebe o caminho e devolve a URL assinada.
 *
 * Cancela a atualização se o componente desmontar antes da resposta — sem isso,
 * trocar de foto rápido faria a assinatura antiga sobrescrever a nova.
 */
export function useAvatarUrl(valor: string | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;

    if (!valor) {
      setUrl(null);
      return;
    }

    void resolveAvatarUrl(valor).then((resolvida) => {
      if (!cancelado) setUrl(resolvida);
    });

    return () => { cancelado = true; };
  }, [valor]);

  return url;
}

/**
 * Envia a foto e devolve o caminho a ser gravado em `profiles.avatar_url`.
 *
 * O prefixo com o uid não é decoração: a policy do bucket exige que o primeiro
 * segmento do caminho seja o id de quem envia, o que impede escrever na pasta
 * de outra pessoa mesmo forjando a chamada.
 */
export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const caminho = `${userId}/avatar-${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(caminho, file, { upsert: true, contentType: file.type });

  if (error) throw error;
  return caminho;
}

/**
 * Remove um arquivo do bucket.
 *
 * Silencia a falha de propósito: o objetivo de quem chama é trocar ou apagar a
 * foto, e o cadastro já foi atualizado. Um arquivo órfão é lixo, não um erro
 * que valha interromper a operação na cara do usuário.
 */
export async function removeAvatarFile(valor: string | null | undefined): Promise<void> {
  if (!valor || ehUrlCompleta(valor)) return;
  const { error } = await supabase.storage.from(AVATAR_BUCKET).remove([valor]);
  if (error) console.error("[avatar] falha ao remover arquivo:", error);
}
