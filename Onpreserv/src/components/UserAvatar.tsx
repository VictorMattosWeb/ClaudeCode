import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { resolveAvatarUrl } from "@/lib/avatar";

/** Iniciais a partir do nome — o fallback quando não há foto exibível. */
function iniciaisDe(nome: string | null | undefined): string {
  const limpo = (nome ?? "").trim();
  if (!limpo) return "U";
  return limpo
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

interface Props {
  /** Caminho no bucket `avatars`, ou uma URL completa (formato legado). */
  path?: string | null;
  nome?: string | null;
  /** Lado do círculo, em px. */
  size?: number;
  className?: string;
  /** Preview local que tem prioridade sobre o que está salvo. */
  previewUrl?: string | null;
}

/**
 * Foto de perfil.
 *
 * Componente único para o cabeçalho e a tela de conta — antes cada um montava o
 * seu, e o do cabeçalho quebrava sozinho por três motivos que este resolve:
 *
 *  1. **Sem fallback de erro.** Uma URL assinada expirada, ou um arquivo já
 *     apagado, deixava o navegador exibindo o ícone de imagem quebrada. Agora
 *     qualquer falha de carregamento cai nas iniciais.
 *
 *  2. **Assinatura vencida.** A URL vale 1 hora; com a aba aberta mais que
 *     isso, a foto sumia. No primeiro erro o componente reassina uma vez antes
 *     de desistir.
 *
 *  3. **Corrida entre trocas.** Trocar de foto rápido fazia a assinatura antiga
 *     chegar depois da nova e sobrescrevê-la. Cada resolução verifica se ainda
 *     é a atual antes de aplicar.
 */
export function UserAvatar({ path, nome, size = 28, className, previewUrl }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [falhou, setFalhou] = useState(false);
  // Contador de tentativas: permite uma reassinatura antes de desistir.
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    let cancelado = false;
    setFalhou(false);

    if (!path) {
      setUrl(null);
      return;
    }

    void resolveAvatarUrl(path).then((resolvida) => {
      if (!cancelado) setUrl(resolvida);
    });

    return () => { cancelado = true; };
  }, [path, tentativa]);

  const exibida = previewUrl ?? (falhou ? null : url);
  const iniciais = iniciaisDe(nome);

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-background",
        "font-hud font-semibold text-primary",
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.max(9, Math.round(size * 0.36)) }}
      aria-hidden={!nome}
    >
      {exibida ? (
        <img
          src={exibida}
          alt={nome ? `Foto de ${nome}` : ""}
          className="h-full w-full object-cover"
          onError={() => {
            // Primeira falha: pode ser assinatura vencida. Reassina uma vez.
            if (tentativa === 0 && !previewUrl) setTentativa(1);
            else setFalhou(true);
          }}
        />
      ) : (
        iniciais
      )}
    </span>
  );
}
