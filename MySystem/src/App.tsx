import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { ActivitiesPage } from "@/features/activities/ActivitiesPage";
import { BoardsOverview } from "@/features/activities/overview/BoardsOverview";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { UsersPage } from "@/features/users/UsersPage";

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/painel" element={<DashboardPage />} />
        <Route path="/atividades" element={<BoardsOverview />} />
        <Route path="/atividades/:boardId" element={<ActivitiesPage />} />
        <Route path="/usuarios" element={<UsersPage />} />
        <Route path="*" element={<Navigate to="/painel" replace />} />
      </Route>
    </Routes>
  );
}
