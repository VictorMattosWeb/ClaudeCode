import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useNotifications } from "@/context/NotificationsContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/PageHeader";
import { Inbox, Loader2, Check, X, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { runWithRetry } from "@/lib/runWithRetry";
import { cn } from "@/lib/utils";
import { RefuseRequestDialog } from "@/components/RefuseRequestDialog";
import { notifyError } from "@/lib/errorMessages";

type Status = "pendente" | "aprovado" | "recusado";
type Tipo = "lote" | "preservacao" | "atividade" | "tarefa" | "quadro" | "edicao_preservacao";

interface Row {
  id: string;
  tipo: Tipo;
  item_id: string;
  item_descricao: string | null;
  solicitante_id: string;
  solicitante_nome?: string;
  justificativa: string;
  status: Status;
  resposta: string | null;
  data_solicitacao: string;
  data_resposta: string | null;
  // For edit requests:
  dados_atuais?: Record<string, any>;
  dados_propostos?: Record<string, any>;
  origem?: "exclusao" | "edicao_preservacao";
}

// Parcial: solicitações históricas podem apontar para módulos já desativados
// (ex.: estoque). O fallback mantém o registro de auditoria legível.
const tipoLabel: Partial<Record<Tipo, string>> = {
  lote: "Exclusão · Lote",
  preservacao: "Exclusão · Preservação",
  atividade: "Exclusão · Atividade",
  tarefa: "Exclusão · Tarefa",
  quadro: "Exclusão · Quadro",
  edicao_preservacao: "Edição · Preservação",
};

const labelDoTipo = (tipo: Tipo) => tipoLabel[tipo] ?? "Exclusão · Registro";

const statusVariant = (s: Status) =>
  s === "aprovado" ? "default" : s === "recusado" ? "destructive" : "secondary";

export default function DeletionRequests() {
  const { isAdmin, user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [highlighted, setHighlighted] = useState<Set<string>>(new Set());
  const [refuseTarget, setRefuseTarget] = useState<Row | null>(null);
  const nameCacheRef = useRef<Map<string, string>>(new Map());
  const { notifications, markAsRead } = useNotifications();

  // Mark related notifications as read when viewing the page
  useEffect(() => {
    notifications
      .filter((n) => !n.lida && n.referencia_tipo === "solicitacao")
      .forEach((n) => markAsRead(n.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notifications.length]);

  useEffect(() => {
    document.title = isAdmin
      ? "Solicitações | onPreserv"
      : "Minhas Solicitações | onPreserv";
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const flashRow = (id: string) => {
    setHighlighted((prev) => new Set(prev).add(id));
    setTimeout(() => {
      setHighlighted((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 2500);
  };

  const fetchSolicitanteName = async (uid: string): Promise<string> => {
    if (nameCacheRef.current.has(uid)) return nameCacheRef.current.get(uid)!;
    const { data } = await supabase.rpc("list_public_profiles");
    const found = ((data ?? []) as { id: string; nome: string }[]).find((p) => p.id === uid);
    const nome = found?.nome ?? "—";
    nameCacheRef.current.set(uid, nome);
    return nome;
  };

  const mapEdicaoRow = (r: any): Row => ({
    id: r.id,
    tipo: "edicao_preservacao",
    item_id: r.preservation_id,
    item_descricao: `Preservação · Lote ${r.lot_id?.slice(0, 8) ?? ""}`,
    solicitante_id: r.solicitante_id,
    justificativa: r.justificativa,
    status: r.status,
    resposta: r.resposta,
    data_solicitacao: r.data_solicitacao,
    data_resposta: r.data_resposta,
    dados_atuais: r.dados_atuais,
    dados_propostos: r.dados_propostos,
    origem: "edicao_preservacao",
  });

  // Realtime: incremental updates, no full reload
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("solicitacoes-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "solicitacoes_exclusao" },
        async (payload) => {
          const r = { ...(payload.new as any), origem: "exclusao" } as Row;
          if (!isAdmin && r.solicitante_id !== user.id) return;
          if (isAdmin) r.solicitante_nome = await fetchSolicitanteName(r.solicitante_id);
          setRows((prev) => (prev.some((x) => x.id === r.id && x.origem === "exclusao") ? prev : [r, ...prev]));
          flashRow(r.id);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "solicitacoes_exclusao" },
        (payload) => {
          const r = { ...(payload.new as any), origem: "exclusao" } as Row;
          if (!isAdmin && r.solicitante_id !== user.id) return;
          setRows((prev) =>
            prev.map((x) => (x.id === r.id && x.origem === "exclusao" ? { ...x, ...r, solicitante_nome: x.solicitante_nome } : x))
          );
          flashRow(r.id);
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "solicitacoes_exclusao" },
        (payload) => {
          const old = payload.old as { id: string };
          setRows((prev) => prev.filter((x) => !(x.id === old.id && x.origem === "exclusao")));
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "solicitacoes_edicao_preservacao" },
        async (payload) => {
          const r = mapEdicaoRow(payload.new);
          if (!isAdmin && r.solicitante_id !== user.id) return;
          if (isAdmin) r.solicitante_nome = await fetchSolicitanteName(r.solicitante_id);
          setRows((prev) => (prev.some((x) => x.id === r.id && x.origem === "edicao_preservacao") ? prev : [r, ...prev]));
          flashRow(r.id);
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "solicitacoes_edicao_preservacao" },
        (payload) => {
          const r = mapEdicaoRow(payload.new);
          if (!isAdmin && r.solicitante_id !== user.id) return;
          setRows((prev) =>
            prev.map((x) => (x.id === r.id && x.origem === "edicao_preservacao" ? { ...x, ...r, solicitante_nome: x.solicitante_nome } : x))
          );
          flashRow(r.id);
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "solicitacoes_edicao_preservacao" },
        (payload) => {
          const old = payload.old as { id: string };
          setRows((prev) => prev.filter((x) => !(x.id === old.id && x.origem === "edicao_preservacao")));
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, isAdmin]);

  const load = async () => {
    setLoading(true);
    let q1 = supabase
      .from("solicitacoes_exclusao")
      .select("*")
      .order("data_solicitacao", { ascending: false });
    let q2 = supabase
      .from("solicitacoes_edicao_preservacao" as any)
      .select("*")
      .order("data_solicitacao", { ascending: false });
    if (!isAdmin && user) {
      q1 = q1.eq("solicitante_id", user.id);
      q2 = q2.eq("solicitante_id", user.id);
    }
    const [{ data: d1, error: e1 }, { data: d2, error: e2 }] = await Promise.all([q1, q2]);
    if (e1 || e2) {
      notifyError(e1 ?? e2, "Não foi possível carregar as solicitações.");
      setLoading(false);
      return;
    }
    const list: Row[] = [
      ...((d1 ?? []) as any[]).map((r) => ({ ...r, origem: "exclusao" as const })),
      ...((d2 ?? []) as any[]).map(mapEdicaoRow),
    ].sort((a, b) => +new Date(b.data_solicitacao) - +new Date(a.data_solicitacao));

    if (isAdmin && list.length > 0) {
      const ids = Array.from(new Set(list.map((r) => r.solicitante_id)));
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, nome")
        .in("id", ids);
      (profs ?? []).forEach((p: any) => nameCacheRef.current.set(p.id, p.nome));
      list.forEach((r) => (r.solicitante_nome = nameCacheRef.current.get(r.solicitante_id) ?? "—"));
    }

    setRows(list);
    setLoading(false);
  };

  const respond = async (row: Row, novo: "aprovado" | "recusado", motivo?: string) => {
    if (!user) return;
    setActing(row.id);
    const table = row.origem === "edicao_preservacao" ? "solicitacoes_edicao_preservacao" : "solicitacoes_exclusao";
    const { error } = await runWithRetry(async () => await supabase
      .from(table as any)
      .update({
        status: novo,
        analisado_por: user.id,
        data_resposta: new Date().toISOString(),
        resposta: novo === "recusado" ? (motivo ?? null) : null,
      })
      .eq("id", row.id));
    setActing(null);
    if (error) {
      notifyError(error);
      throw error;
    }
    toast.success(novo === "aprovado" ? "Solicitação aprovada" : "Solicitação recusada");
    if (novo === "aprovado" && row.origem === "exclusao") {
      toast.message("Execute a exclusão do item correspondente no módulo de origem.");
    }
  };

  return (
    <main className="container mx-auto space-y-6 px-3 py-6 sm:px-4">
      <PageHeader
        icon={Inbox}
        title={isAdmin ? "Solicitações" : "Minhas solicitações"}
        subtitle={
          isAdmin
            ? "Aprovação de pedidos de exclusão e edição"
            : "Acompanhamento das suas solicitações"
        }
        code="SOL_01"
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {rows.filter((r) => r.status === "pendente").length} pendente(s) ·{" "}
            {rows.length} no total
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Item</TableHead>
                  {isAdmin && <TableHead>Solicitante</TableHead>}
                  <TableHead>Motivo</TableHead>
                  <TableHead>Status</TableHead>
                  {isAdmin && <TableHead className="text-right">Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow
                    key={r.id}
                    className={cn(
                      "transition-colors",
                      highlighted.has(r.id) && "bg-primary/10 animate-pulse"
                    )}
                  >
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(r.data_solicitacao).toLocaleString("pt-BR")}
                    </TableCell>
                    <TableCell>{labelDoTipo(r.tipo)}</TableCell>
                    <TableCell className="max-w-[220px] truncate">
                      <span className="font-medium">{r.item_descricao ?? "—"}</span>
                      <div className="text-[10px] text-muted-foreground font-mono truncate">{r.item_id}</div>
                    </TableCell>
                    {isAdmin && <TableCell>{r.solicitante_nome ?? "—"}</TableCell>}
                    <TableCell className="max-w-[300px] text-sm text-muted-foreground space-y-1">
                      <div>{r.justificativa}</div>
                      {r.origem === "edicao_preservacao" && r.dados_atuais && r.dados_propostos && (
                        <div className="text-[11px] rounded border bg-muted/40 p-1.5 mt-1">
                          {(["data","tipo","responsavel","observacoes"] as const).map((k) => {
                            const a = r.dados_atuais?.[k] ?? "";
                            const b = r.dados_propostos?.[k] ?? "";
                            if (a === b) return null;
                            const label = k === "data" ? "Realização" : k === "tipo" ? "Próxima" : k === "responsavel" ? "Responsável" : "Observação";
                            return (
                              <div key={k} className="flex gap-1 flex-wrap">
                                <span className="font-medium">{label}:</span>
                                <span className="line-through opacity-60">{String(a) || "—"}</span>
                                <span>→</span>
                                <span className="text-foreground font-medium">{String(b) || "—"}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Badge variant={statusVariant(r.status)}>{r.status}</Badge>
                        {r.status === "recusado" && r.resposta && (
                          <div className="flex items-start gap-1 text-xs text-destructive max-w-[260px]">
                            <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
                            <span className="break-words">
                              <span className="font-medium">Motivo:</span> {r.resposta}
                            </span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        {r.status === "pendente" ? (
                          <div className="inline-flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => respond(r, "aprovado")}
                              disabled={acting === r.id}
                            >
                              <Check className="h-3.5 w-3.5" /> Aprovar
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setRefuseTarget(r)}
                              disabled={acting === r.id}
                            >
                              <X className="h-3.5 w-3.5" /> Recusar
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {r.data_resposta ? new Date(r.data_resposta).toLocaleDateString("pt-BR") : "—"}
                          </span>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={isAdmin ? 7 : 5} className="text-center text-muted-foreground py-8">
                      Nenhuma solicitação
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <RefuseRequestDialog
        open={!!refuseTarget}
        onOpenChange={(o) => { if (!o) setRefuseTarget(null); }}
        itemDescricao={refuseTarget?.item_descricao ?? undefined}
        onConfirm={async (motivo) => {
          if (refuseTarget) await respond(refuseTarget, "recusado", motivo);
        }}
      />
    </main>
  );
}
