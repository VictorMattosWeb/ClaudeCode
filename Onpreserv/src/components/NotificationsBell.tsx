import { Bell, CheckCheck, Inbox, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useNotifications } from "@/context/NotificationsContext";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

const tipoColor: Record<string, string> = {
  solicitacao_criada: "bg-primary/10 text-primary",
  solicitacao_aprovada: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  solicitacao_recusada: "bg-destructive/10 text-destructive",
  solicitacao_respondida: "bg-secondary text-secondary-foreground",
};

const formatTime = (iso: string) => {
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "agora";
  if (diff < 3600) return `${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return d.toLocaleDateString("pt-BR");
};

export function NotificationsBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearAll } = useNotifications();
  const navigate = useNavigate();

  const handleClick = async (id: string, refId: string | null, lida: boolean, tipo: string) => {
    if (!lida) await markAsRead(id);
    if (tipo.startsWith("tarefa")) {
      if (refId) navigate(`/tarefas?task=${refId}`);
      else navigate("/tarefas");
    } else {
      navigate("/solicitacoes");
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-semibold flex items-center justify-center ring-2 ring-background">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[380px] p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div>
            <h3 className="text-sm font-semibold">Notificações</h3>
            <p className="text-[11px] text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount} não lida(s)` : "Tudo em dia"}
            </p>
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={markAllAsRead}>
                <CheckCheck className="h-3.5 w-3.5" /> Marcar todas
              </Button>
            )}
            {notifications.length > 0 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Limpar
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Limpar histórico de notificações?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Todas as suas notificações serão removidas. Esta ação não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={clearAll}>Limpar tudo</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
        <ScrollArea className="max-h-[420px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
              <Inbox className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-xs">Nenhuma notificação</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {notifications.map((n) => (
                <li key={n.id}>
                  <button
                    onClick={() => handleClick(n.id, n.referencia_id, n.lida, n.tipo)}
                    className={cn(
                      "w-full text-left px-4 py-3 hover:bg-accent transition-colors flex gap-3",
                      !n.lida && "bg-primary/5"
                    )}
                  >
                    <span
                      className={cn(
                        "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
                        tipoColor[n.tipo] ?? "bg-muted text-muted-foreground"
                      )}
                    >
                      <Bell className="h-3.5 w-3.5" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-medium truncate">{n.titulo}</p>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {formatTime(n.created_at)}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
                        {n.mensagem}
                      </p>
                      {!n.lida && (
                        <Badge variant="default" className="mt-1.5 h-4 px-1.5 text-[9px]">
                          nova
                        </Badge>
                      )}
                    </div>
                    {!n.lida && (
                      <span
                        className="h-2 w-2 rounded-full bg-primary self-center shrink-0"
                        aria-label="não lida"
                      />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
