import { Badge } from "@/components/ui/badge";
import { SituacaoCalculada, SITUACAO_LABEL } from "@/types/cronograma";

const styles: Record<SituacaoCalculada, string> = {
  no_prazo: "bg-success/10 text-success border-success/30",
  divergencia: "bg-warning/10 text-warning border-warning/30",
  pendente: "bg-muted text-muted-foreground border-border",
  vence_em_breve: "bg-warning/10 text-warning border-warning/30",
  vencido: "bg-destructive/10 text-destructive border-destructive/30",
  nao_aplicavel: "bg-muted/50 text-muted-foreground border-border",
};

export function SituacaoBadge({ situacao }: { situacao: SituacaoCalculada }) {
  return (
    <Badge variant="outline" className={`${styles[situacao]} font-medium`}>
      {SITUACAO_LABEL[situacao]}
    </Badge>
  );
}
