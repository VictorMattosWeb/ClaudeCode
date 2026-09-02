import { Outlet, useLocation } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, User as UserIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { NotificationsBell } from "@/components/NotificationsBell";
import { LiveIndicator } from "@/components/LiveIndicator";
import { UserAvatar } from "@/components/UserAvatar";

const titles: Record<string, string> = {
  "/": "Lotes",
  "/atividades": "Atividades de Preservação",
  "/cronograma": "Cronograma de Preservação",
  "/tarefas": "Tarefas",
  "/usuarios": "Usuários",
  "/solicitacoes": "Solicitações de Exclusão",
  "/docs": "Documentação",
};

export default function AppLayout() {
  const { profile, role, signOut } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const title =
    titles[pathname] ??
    (Object.entries(titles).find(([k]) => k !== "/" && pathname.startsWith(k))?.[1] ?? "");


  const handleLogout = async () => {
    await signOut();
    toast.success("Sessão encerrada");
    navigate("/auth");
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-16 flex items-center gap-3 border-b border-border bg-background/90 backdrop-blur-xl sticky top-0 z-40 px-4">
            <SidebarTrigger className="text-muted-foreground transition-colors duration-300 ease-out-expo hover:text-primary" />
            <div className="h-5 w-px bg-border" />
            <h1 key={title} className="text-sm font-semibold uppercase tracking-wide truncate animate-slide-up">{title}</h1>
            <div className="ml-auto flex items-center gap-3">
              <LiveIndicator className="hidden sm:inline-flex" />
              <NotificationsBell />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2 h-9 pl-1.5 pr-2.5 transition-colors duration-300 ease-out-expo">
                    <UserAvatar path={profile?.avatar_url} nome={profile?.nome} size={28} />
                    <span className="hidden sm:flex flex-col items-start leading-tight">
                      <span className="text-xs font-medium">{profile?.nome ?? "Usuário"}</span>
                      <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                        {role === "admin" ? "Administrador" : "Usuário"}
                      </span>
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-0.5">
                      <p className="text-sm font-medium">{profile?.nome}</p>
                      <p className="text-xs text-muted-foreground truncate">{profile?.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/conta">
                      <UserIcon className="h-4 w-4" /> Minha conta
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                    <LogOut className="h-4 w-4" /> Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>
          <main key={pathname} className="flex-1 min-w-0 pt-4 animate-fade-in">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
