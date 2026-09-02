import { Loader2 } from "lucide-react";

/** Placeholder exibido enquanto o chunk de uma rota em lazy loading é baixado. */
export default function RouteFallback() {
  return (
    <div
      className="flex min-h-[60vh] w-full items-center justify-center"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden="true" />
      <span className="sr-only">Carregando…</span>
    </div>
  );
}
