import { NavLink, useLocation } from "react-router-dom";
import { Package, ClipboardList, Users as UsersIcon, Inbox, LayoutDashboard, CalendarRange, BookOpen, KanbanSquare } from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import { useAuth, AppModule } from "@/context/AuthContext";
import { usePendingRequestsCount } from "@/hooks/usePendingRequestsCount";

type Item = {
  title: string;
  url: string;
  icon: typeof Package;
  module?: AppModule;
  adminOnly?: boolean;
};

const baseItems: Item[] = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, module: "dashboard" },
  { title: "Lotes", url: "/", icon: Package, module: "lotes" },
  { title: "Atividades", url: "/atividades", icon: ClipboardList, module: "atividades" },
  { title: "Cronograma", url: "/cronograma", icon: CalendarRange, module: "cronograma" },
  { title: "Tarefas", url: "/tarefas", icon: KanbanSquare, module: "tarefas" },
  { title: "Solicitações", url: "/solicitacoes", icon: Inbox, module: "solicitacoes" },
  { title: "Usuários", url: "/usuarios", icon: UsersIcon, adminOnly: true },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();
  const { isAdmin, canAccess } = useAuth();
  const pendingCount = usePendingRequestsCount();
  const isActive = (url: string) => (url === "/" ? pathname === "/" : pathname.startsWith(url));

  const items = baseItems.filter((i) => {
    if (i.adminOnly) return isAdmin;
    if (i.module) return canAccess(i.module);
    return true;
  });

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border overflow-hidden">
        <div className="group/brand flex items-center gap-2.5 py-3 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 px-2">
          <div className="flex items-center justify-center h-8 w-8 border border-border bg-background shrink-0 text-primary transition-colors duration-300 ease-out-expo group-hover/brand:border-primary">
            <Package className="h-4 w-4" strokeWidth={2} />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-tight truncate tracking-tightest">onPreserv</p>
              <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-primary truncate">Preservação</p>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent className="overflow-x-hidden">
        <SidebarGroup>
          <SidebarGroupLabel className="font-mono text-[9px] font-medium uppercase tracking-[0.18em] text-muted-foreground/60 group-data-[collapsible=icon]:hidden">
            Navegação
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {items.map((item) => {
                const showBadge = item.url === "/solicitacoes" && pendingCount > 0;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.url)}
                      tooltip={item.title}
                      className="relative transition-colors duration-300 ease-out-expo hover:bg-transparent hover:text-primary data-[active=true]:bg-primary-soft data-[active=true]:text-primary data-[active=true]:before:absolute data-[active=true]:before:left-0 data-[active=true]:before:top-0 data-[active=true]:before:h-full data-[active=true]:before:w-[2px] data-[active=true]:before:bg-primary data-[active=true]:before:shadow-glow"
                    >
                      <NavLink to={item.url} end={item.url === "/"}>
                        <item.icon className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
                        <span className="text-[11px] font-semibold uppercase tracking-wide flex-1 truncate group-data-[collapsible=icon]:hidden">{item.title}</span>
                        {showBadge && !collapsed && (
                          <span className="ml-auto min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground font-mono text-[9px] font-semibold flex items-center justify-center animate-pulse">
                            {pendingCount > 9 ? "9+" : pendingCount}
                          </span>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-1">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              size="sm"
              isActive={pathname.startsWith("/docs")}
              tooltip="Documentação"
              className="text-muted-foreground/80 hover:text-foreground data-[active=true]:text-primary data-[active=true]:bg-primary-soft"
            >
              <NavLink to="/docs">
                <BookOpen className="h-[15px] w-[15px] shrink-0" strokeWidth={2} />
                <span className="text-[10px] font-semibold uppercase tracking-wide group-data-[collapsible=icon]:hidden">Documentação</span>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
