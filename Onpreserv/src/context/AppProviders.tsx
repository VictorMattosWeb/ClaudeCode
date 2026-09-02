import type { ComponentType, ReactNode } from "react";
import { AuthProvider } from "@/context/AuthContext";
import { LotProvider } from "@/context/LotContext";
import { ActivityProvider } from "@/context/ActivityContext";
import { NotificationsProvider } from "@/context/NotificationsContext";
import { CronogramaProvider } from "@/context/CronogramaContext";
import { TaskProvider } from "@/context/TaskContext";

type ProviderComponent = ComponentType<{ children: ReactNode }>;

/**
 * Ordem importa: cada provider só pode depender dos que estão acima dele.
 * Todos precisam de AuthProvider (usuário autenticado e permissões) para
 * decidir o que carregar.
 */
const providers: ProviderComponent[] = [
  AuthProvider,
  LotProvider,
  ActivityProvider,
  NotificationsProvider,
  CronogramaProvider,
  TaskProvider,
];

/**
 * Compõe os providers da aplicação sem a "pirâmide" de JSX aninhado, que tornava
 * qualquer inclusão ou remoção de contexto uma edição de indentação em cascata.
 */
export default function AppProviders({ children }: { children: ReactNode }) {
  return providers.reduceRight<ReactNode>(
    (tree, Provider) => <Provider>{tree}</Provider>,
    children,
  );
}
