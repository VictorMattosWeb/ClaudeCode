import { useRealtimeStatus } from "@/hooks/useRealtimeStatus";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface Props {
  className?: string;
  /** Quando true, mostra apenas o ponto sem o texto. */
  compact?: boolean;
}

const LABEL: Record<string, string> = {
  live: "AO VIVO",
  connecting: "CONECTANDO",
  offline: "OFFLINE",
};

const TONE: Record<string, string> = {
  live: "border-success/40 bg-success/10 text-success",
  connecting: "border-warning/40 bg-warning/10 text-warning",
  offline: "border-destructive/40 bg-destructive/10 text-destructive",
};

const DOT: Record<string, string> = {
  live: "bg-success",
  connecting: "bg-warning",
  offline: "bg-destructive",
};

export function LiveIndicator({ className, compact = false }: Props) {
  const status = useRealtimeStatus();
  const label = LABEL[status];

  const content = (
    <span
      className={cn(
        "font-hud inline-flex select-none items-center gap-1.5 border px-1.5 py-0.5 text-[9px]",
        TONE[status],
        compact && "px-1",
        className,
      )}
      aria-live="polite"
      aria-label={`Status em tempo real: ${label}`}
    >
      <span className="relative inline-flex h-2 w-2">
        {status === "live" && (
          <span
            className={cn("absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping", DOT[status])}
          />
        )}
        <span className={cn("relative inline-flex h-2 w-2 rounded-full", DOT[status])} />
      </span>
      {!compact && <span>{label}</span>}
    </span>
  );

  if (!compact) return content;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{content}</TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
