import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth, AppModule } from "@/context/AuthContext";
import { AlertCircle, Loader2 } from "lucide-react";

interface Props {
  requireAdmin?: boolean;
  requireModule?: AppModule;
}

const moduleRoutes: Partial<Record<AppModule, string>> = {
  dashboard: "/dashboard",
  lotes: "/",
  atividades: "/atividades",
  cronograma: "/cronograma",
  tarefas: "/tarefas",
  solicitacoes: "/solicitacoes",
};

export default function ProtectedRoute({ requireAdmin = false, requireModule }: Props) {
  const { session, loading, isAdmin, permissions, canAccess } = useAuth();
  const { pathname } = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) return <Navigate to="/auth" replace />;
  if (requireAdmin && !isAdmin) return <Navigate to="/" replace />;
  if (requireModule && !canAccess(requireModule)) {
    const fallback = Object.entries(moduleRoutes).find(([module]) => permissions[module as AppModule])?.[1];
    if (fallback && fallback !== pathname) return <Navigate to={fallback} replace />;

    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-sm text-center space-y-3">
          <AlertCircle className="mx-auto h-8 w-8 text-muted-foreground" />
          <h1 className="text-lg font-semibold">Acesso não permitido</h1>
          <p className="text-sm text-muted-foreground">Seu perfil não possui nenhum módulo liberado nas permissões globais.</p>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
