export type ActivityLocal = "campo" | "almoxarifado";

export const ACTIVITY_LOCAL_LABEL: Record<ActivityLocal, string> = {
  campo: "Campo",
  almoxarifado: "Almoxarifado",
};

export interface PreservationActivity {
  id: string;
  codigo: string;
  descricao: string;
  local: ActivityLocal;
  frequencia: number;
  // Mantidos para compatibilidade com dados antigos
  frequenciaAlmoxarifado: number;
  frequenciaCampo: number;
  createdAt: string;
  updatedAt: string;
}

type SeedActivity = {
  codigo: string;
  descricao: string;
  local: ActivityLocal;
  frequencia: number;
};

export const SEED_ACTIVITIES: SeedActivity[] = [
  { codigo: "1.003", descricao: "Realizar inspeção externa do gabinete", local: "campo", frequencia: 30 },
  { codigo: "1.202", descricao: "Realizar limpeza externa do gabinete", local: "campo", frequencia: 30 },
  { codigo: "1.702", descricao: "Realizar inspeção interna do gabinete", local: "campo", frequencia: 90 },
  { codigo: "2.203", descricao: "Manter conexões livres do equipamento tamponadas", local: "campo", frequencia: 30 },
  { codigo: "2.501", descricao: "Realizar limpeza interna do gabinete", local: "campo", frequencia: 90 },
  { codigo: "2.601", descricao: "Manter filtro de ar limpo (substituí-lo, se necessário)", local: "campo", frequencia: 90 },
  { codigo: "2.610", descricao: "Manter dispositivo contra umidade operacional", local: "campo", frequencia: 90 },
  { codigo: "2.620", descricao: "Fixar etiqueta de preservação", local: "campo", frequencia: 30 },
  { codigo: "2.630", descricao: "Manter lacre nas portas (Se necessário)", local: "campo", frequencia: 30 },
  { codigo: "2.640", descricao: "Manter equipamento protegido contra intempéries", local: "campo", frequencia: 30 },
  { codigo: "2.650", descricao: "Limpar resíduos de preservação", local: "campo", frequencia: 30 },
  { codigo: "2.660", descricao: "Manter armazenado em local abrigado", local: "campo", frequencia: 30 },
];
