import { Suspense, lazy } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AppProviders from "@/context/AppProviders";
import AppLayout from "@/components/AppLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import RouteFallback from "@/components/RouteFallback";
import { Seo } from "./components/Seo.tsx";

// Rotas em lazy loading: cada módulo vira um chunk próprio, então abrir o app
// não baixa mais o código de Cronograma, Tarefas e Docs de uma vez.
const Index = lazy(() => import("./pages/Index.tsx"));
const Dashboard = lazy(() => import("./pages/Dashboard.tsx"));
const Activities = lazy(() => import("./pages/Activities.tsx"));
const Auth = lazy(() => import("./pages/Auth.tsx"));
const Signup = lazy(() => import("./pages/Signup.tsx"));
const AccountSettings = lazy(() => import("./pages/AccountSettings.tsx"));
const Users = lazy(() => import("./pages/UsersKanban.tsx"));
const DeletionRequests = lazy(() => import("./pages/DeletionRequests.tsx"));
const Cronograma = lazy(() => import("./pages/Cronograma.tsx"));
const Tasks = lazy(() => import("./pages/Tasks.tsx"));
const BoardDetail = lazy(() => import("./pages/BoardDetail.tsx"));
const DocsLayout = lazy(() => import("./pages/docs/DocsLayout.tsx"));
const DocsHome = lazy(() => import("./pages/docs/DocsHome.tsx"));
const DocsPage = lazy(() => import("./pages/docs/DocsPage.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <AppProviders>
          <Seo />
          <Toaster />
          <Sonner />
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              {/* Cadastro por convite: publico, validado pelo token no banco. */}
              <Route path="/cadastro/:token" element={<Signup />} />
              <Route path="/docs" element={<DocsLayout />}>
                <Route index element={<DocsHome />} />
                <Route path=":categoryId" element={<DocsPage />} />
                <Route path=":categoryId/:slug" element={<DocsPage />} />
              </Route>
              <Route element={<ProtectedRoute />}>
                <Route element={<AppLayout />}>
                  <Route element={<ProtectedRoute requireModule="lotes" />}>
                    <Route path="/" element={<Index />} />
                  </Route>
                  <Route element={<ProtectedRoute requireModule="dashboard" />}>
                    <Route path="/dashboard" element={<Dashboard />} />
                  </Route>
                  <Route element={<ProtectedRoute requireModule="atividades" />}>
                    <Route path="/atividades" element={<Activities />} />
                  </Route>
                  <Route element={<ProtectedRoute requireModule="cronograma" />}>
                    <Route path="/cronograma" element={<Cronograma />} />
                  </Route>
                  <Route element={<ProtectedRoute requireModule="tarefas" />}>
                    <Route path="/tarefas" element={<Tasks />} />
                    <Route path="/tarefas/quadro/:boardId" element={<BoardDetail />} />
                  </Route>
                  <Route element={<ProtectedRoute requireModule="solicitacoes" />}>
                    <Route path="/solicitacoes" element={<DeletionRequests />} />
                  </Route>
                  {/* Conta: qualquer usuario autenticado gerencia a propria. */}
                  <Route path="/conta" element={<AccountSettings />} />
                  <Route element={<ProtectedRoute requireAdmin />}>
                    <Route path="/usuarios" element={<Users />} />
                  </Route>
                </Route>
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AppProviders>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
