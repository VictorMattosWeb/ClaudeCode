import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { UserSelect } from "@/components/UserSelect";
import { Preservation } from "@/types/lot";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { ShieldCheck, Send } from "lucide-react";
import { runWithRetry } from "@/lib/runWithRetry";
import { notifyError } from "@/lib/errorMessages";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preservation: Preservation;
  lotId: string;
}

export function PreservationEditDialog({ open, onOpenChange, preservation, lotId }: Props) {
  const { isAdmin, user } = useAuth();
  const [date, setDate] = useState(preservation.date);
  const [nextDate, setNextDate] = useState(preservation.nextDate);
  const [responsible, setResponsible] = useState(preservation.responsible);
  const [observation, setObservation] = useState(preservation.observation ?? "");
  const [justificativa, setJustificativa] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const dadosAtuais = {
    data: preservation.date,
    tipo: preservation.nextDate,
    responsavel: preservation.responsible,
    observacoes: preservation.observation ?? "",
  };
  const dadosPropostos = {
    data: date,
    tipo: nextDate,
    responsavel: responsible,
    observacoes: observation,
  };

  const hasChanges =
    dadosAtuais.data !== dadosPropostos.data ||
    dadosAtuais.tipo !== dadosPropostos.tipo ||
    dadosAtuais.responsavel !== dadosPropostos.responsavel ||
    dadosAtuais.observacoes !== dadosPropostos.observacoes;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!hasChanges) {
      toast.info("Nenhuma alteração foi feita.");
      return;
    }
    setSubmitting(true);

    if (isAdmin) {
      // Admin altera diretamente
      const { error } = await runWithRetry(async () => await supabase
        .from("preservations" as any)
        .update({
          data: dadosPropostos.data,
          tipo: dadosPropostos.tipo,
          responsavel: dadosPropostos.responsavel,
          observacoes: dadosPropostos.observacoes,
        })
        .eq("id", preservation.id));
      setSubmitting(false);
      if (error) return notifyError(error, "Não foi possível salvar as alterações.");
      toast.success("Preservação atualizada.");
      onOpenChange(false);
      return;
    }

    if (!justificativa.trim()) {
      setSubmitting(false);
      return toast.error("Informe uma justificativa para a solicitação.");
    }

    const { error } = await runWithRetry(async () => await supabase
      .from("solicitacoes_edicao_preservacao" as any)
      .insert({
        preservation_id: preservation.id,
        lot_id: lotId,
        dados_atuais: dadosAtuais,
        dados_propostos: dadosPropostos,
        justificativa: justificativa.trim(),
        solicitante_id: user.id,
      }));
    setSubmitting(false);
    if (error) return notifyError(error, "Não foi possível enviar a solicitação.");
    toast.success("Solicitação enviada para aprovação do administrador.");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md w-[95vw]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isAdmin ? <ShieldCheck className="h-4 w-4 text-primary" /> : <Send className="h-4 w-4 text-primary" />}
            {isAdmin ? "Editar Preservação" : "Solicitar Edição"}
          </DialogTitle>
          <DialogDescription>
            {isAdmin
              ? "Você é administrador — as alterações serão aplicadas imediatamente."
              : "Sua solicitação será enviada para aprovação de um administrador."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="ed-date">Data da Realização</Label>
            <Input id="ed-date" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ed-next">Próxima Preservação</Label>
            <Input id="ed-next" type="date" required value={nextDate} onChange={(e) => setNextDate(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ed-resp">Responsável</Label>
            <UserSelect id="ed-resp" value={responsible} onChange={setResponsible} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ed-obs">Observação</Label>
            <Textarea id="ed-obs" value={observation} onChange={(e) => setObservation(e.target.value)} />
          </div>
          {!isAdmin && (
            <div className="space-y-1.5">
              <Label htmlFor="ed-just">Justificativa <span className="text-destructive">*</span></Label>
              <Textarea
                id="ed-just"
                required
                placeholder="Explique o motivo da alteração"
                value={justificativa}
                onChange={(e) => setJustificativa(e.target.value)}
              />
            </div>
          )}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting || !hasChanges}>
              {isAdmin ? "Salvar alterações" : "Enviar solicitação"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
