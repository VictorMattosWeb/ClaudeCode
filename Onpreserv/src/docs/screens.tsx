/**
 * Stylized SVG mockups representing each screen of the system.
 * Designed in viewBox 0 0 100 100 (coords match annotation layer).
 * Replace with real screenshots later if desired.
 */
import { ReactNode } from "react";

const C = {
  bg: "hsl(var(--background))",
  card: "hsl(var(--card))",
  border: "hsl(var(--border))",
  primary: "hsl(var(--primary))",
  primarySoft: "hsl(var(--primary-soft))",
  muted: "hsl(var(--muted))",
  mutedFg: "hsl(var(--muted-foreground))",
  fg: "hsl(var(--foreground))",
  success: "hsl(var(--success))",
  warning: "hsl(var(--warning))",
  destructive: "hsl(var(--destructive))",
  info: "hsl(var(--info))",
};

function Frame({ children, header = true, sidebar = true }: { children: ReactNode; header?: boolean; sidebar?: boolean }) {
  return (
    <svg viewBox="0 0 100 62.5" className="w-full h-full" preserveAspectRatio="none">
      <rect width="100" height="62.5" fill={C.bg} />
      {sidebar && (
        <g>
          <rect x="0" y="0" width="14" height="62.5" fill={C.card} stroke={C.border} strokeWidth="0.1" />
          {/* logo */}
          <rect x="1.5" y="1.5" width="2.5" height="2.5" rx="0.6" fill={C.primary} />
          <rect x="4.6" y="2.2" width="6" height="0.9" rx="0.2" fill={C.fg} opacity="0.85" />
          <rect x="4.6" y="3.4" width="4" height="0.5" rx="0.2" fill={C.mutedFg} opacity="0.6" />
          {/* nav */}
          {["Dashboard", "Lotes", "Atividades", "Cronograma", "Tarefas", "Solicitações", "Docs", "Usuários"].map((n, i) => {
            const y = 7 + i * 3.4;
            const active = n === "Lotes";
            return (
              <g key={n}>
                <rect x="1" y={y} width="12" height="2.7" rx="0.6" fill={active ? C.primarySoft : "transparent"} />
                <rect x="2" y={y + 0.9} width="0.9" height="0.9" rx="0.2" fill={active ? C.primary : C.mutedFg} />
                <rect x="3.4" y={y + 0.95} width="7" height="0.8" rx="0.2" fill={active ? C.primary : C.mutedFg} opacity={active ? 1 : 0.7} />
              </g>
            );
          })}
        </g>
      )}
      {header && (
        <g>
          <rect x={sidebar ? 14 : 0} y="0" width={100 - (sidebar ? 14 : 0)} height="3.6" fill={C.card} stroke={C.border} strokeWidth="0.1" />
          <rect x={sidebar ? 16 : 2} y="1.2" width="10" height="1.2" rx="0.2" fill={C.fg} opacity="0.85" />
          <circle cx="96" cy="1.8" r="1" fill={C.primarySoft} />
        </g>
      )}
      <g transform={`translate(${sidebar ? 14 : 0}, ${header ? 3.6 : 0})`}>
        <svg viewBox="0 0 100 58.9" preserveAspectRatio="none" width={sidebar ? 86 : 100} height={header ? 58.9 : 62.5} x="0" y="0">
          {children}
        </svg>
      </g>
    </svg>
  );
}

function Card({ x, y, w, h, children, title }: { x: number | string; y: number | string; w: number | string; h: number | string; children?: ReactNode; title?: string }) {
  const nx = +x, ny = +y;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx="1" fill={C.card} stroke={C.border} strokeWidth="0.15" />
      {title && <text x={nx + 1.5} y={ny + 3} fontSize="2" fill={C.fg} fontWeight="600">{title}</text>}
      {children}
    </g>
  );
}

function Btn({ x, y, w = 12, h = 4, label, primary }: { x: number | string; y: number | string; w?: number | string; h?: number | string; label: string; primary?: boolean }) {
  const nx = +x, ny = +y, nw = +w, nh = +h;
  return (
    <g>
      <rect x={nx} y={ny} width={nw} height={nh} rx="0.8" fill={primary ? C.primary : C.card} stroke={primary ? C.primary : C.border} strokeWidth="0.15" />
      <text x={nx + nw / 2} y={ny + nh / 2 + 0.8} textAnchor="middle" fontSize="1.8" fill={primary ? "white" : C.fg} fontWeight="500">{label}</text>
    </g>
  );
}

function Row({ x, y, w, cells }: { x: number | string; y: number | string; w: number | string; cells: { w: number; v: string; bold?: boolean; tone?: string }[] }) {
  let off = 0;
  const nx = +x;
  return (
    <g>
      {cells.map((c, i) => {
        const cx = nx + off + 1;
        off += c.w;
        return (
          <text key={i} x={cx} y={y} fontSize="1.7" fill={c.tone || C.fg} fontWeight={c.bold ? 600 : 400}>{c.v}</text>
        );
      })}
    </g>
  );
}

/* =========================================================
 * Individual screens
 * ========================================================= */

export function ScreenLotesList() {
  return (
    <Frame>
      <text x="2" y="4" fontSize="3.2" fill={C.fg} fontWeight="700">Lotes</text>
      <text x="2" y="7" fontSize="1.8" fill={C.mutedFg}>Gerencie todos os lotes do almoxarifado</text>

      <Btn x="62" y="2.5" w="9" h="3.5" label="Importar" />
      <Btn x="72" y="2.5" w="9" h="3.5" label="Exportar" />
      <Btn x="82" y="2.5" w="13" h="3.5" label="+ Novo lote" primary />

      {/* Filters bar */}
      <Card x="2" y="9" w="93" h="6">
        <rect x="3" y="10.5" width="22" height="3" rx="0.5" fill={C.muted} />
        <text x="4" y="12.6" fontSize="1.6" fill={C.mutedFg}>Buscar...</text>
        <rect x="26" y="10.5" width="14" height="3" rx="0.5" fill={C.muted} />
        <text x="27" y="12.6" fontSize="1.6" fill={C.mutedFg}>Status</text>
        <rect x="41" y="10.5" width="14" height="3" rx="0.5" fill={C.muted} />
        <text x="42" y="12.6" fontSize="1.6" fill={C.mutedFg}>Tipo</text>
        <rect x="56" y="10.5" width="12" height="3" rx="0.5" fill={C.muted} />
        <text x="57" y="12.6" fontSize="1.6" fill={C.mutedFg}>Rua</text>
        <rect x="69" y="10.5" width="12" height="3" rx="0.5" fill={C.muted} />
        <text x="70" y="12.6" fontSize="1.6" fill={C.mutedFg}>Prateleira</text>
      </Card>

      {/* Table */}
      <Card x="2" y="16" w="93" h="42">
        <rect x="2.5" y="16.5" width="92" height="3.4" fill={C.muted} />
        <Row x="2" y="18.5" w="92" cells={[
          { w: 14, v: "Código", bold: true, tone: C.mutedFg },
          { w: 22, v: "Nome", bold: true, tone: C.mutedFg },
          { w: 12, v: "Tipo", bold: true, tone: C.mutedFg },
          { w: 11, v: "Status", bold: true, tone: C.mutedFg },
          { w: 10, v: "Rua", bold: true, tone: C.mutedFg },
          { w: 12, v: "Prateleira", bold: true, tone: C.mutedFg },
          { w: 11, v: "Ações", bold: true, tone: C.mutedFg },
        ]} />
        {[
          ["NOV-001", "Tinta epóxi cinza 18L", "Novo", "Disponível", "A-12", "P-04"],
          ["RTC-008", "Lubrificante AW46", "Retorno", "Em preservação", "B-03", "P-02"],
          ["NOV-014", "Solvente 5L", "Novo", "Vencido", "C-07", "P-09"],
          ["NOV-022", "Vedante térmico", "Novo", "Disponível", "A-04", "P-01"],
          ["RTC-031", "Graxa industrial", "Retorno", "Pendente", "B-09", "P-06"],
          ["NOV-040", "Anel de vedação", "Novo", "Disponível", "A-15", "P-03"],
          ["RTC-051", "Óleo hidráulico", "Retorno", "Disponível", "B-11", "P-08"],
        ].map((r, i) => {
          const y = 22 + i * 4.5;
          const statusTone = r[3] === "Disponível" ? C.success : r[3] === "Vencido" ? C.destructive : r[3] === "Pendente" ? C.warning : C.info;
          return (
            <g key={i}>
              <line x1="2.5" y1={y + 2.5} x2="94.5" y2={y + 2.5} stroke={C.border} strokeWidth="0.1" />
              <text x="3.5" y={y + 1.5} fontSize="1.7" fill={C.fg} fontWeight="600">{r[0]}</text>
              <text x="17.5" y={y + 1.5} fontSize="1.7" fill={C.fg}>{r[1]}</text>
              <text x="39.5" y={y + 1.5} fontSize="1.7" fill={C.mutedFg}>{r[2]}</text>
              <rect x="51" y={y + 0} width="9" height="2.2" rx="0.4" fill={statusTone} opacity="0.15" />
              <text x="55.5" y={y + 1.5} fontSize="1.5" fill={statusTone} textAnchor="middle" fontWeight="600">{r[3]}</text>
              <text x="62.5" y={y + 1.5} fontSize="1.7" fill={C.fg}>{r[4]}</text>
              <text x="73" y={y + 1.5} fontSize="1.7" fill={C.fg}>{r[5]}</text>
              <text x="84" y={y + 1.5} fontSize="1.7" fill={C.mutedFg}>···</text>
            </g>
          );
        })}
      </Card>
    </Frame>
  );
}

export function ScreenLoteForm() {
  return (
    <Frame>
      <rect x="0" y="0" width="100" height="58.9" fill="black" opacity="0.3" />
      <Card x="18" y="5" w="64" h="50" title="Novo lote">
        {[
          ["Código*", "NOV-101"],
          ["Nome do produto*", "Tinta epóxi azul 18L"],
          ["Tipo de lote*", "Novo"],
          ["Status*", "Disponível"],
          ["Rua", "A-12"],
          ["Prateleira", "P-04"],
          ["Data de fabricação", "12/05/2025"],
          ["Validade", "12/05/2027"],
        ].map(([lbl, val], i) => {
          const col = i % 2;
          const row = Math.floor(i / 2);
          const x = 20 + col * 30;
          const y = 12 + row * 7;
          return (
            <g key={lbl}>
              <text x={x} y={y} fontSize="1.6" fill={C.mutedFg} fontWeight="500">{lbl}</text>
              <rect x={x} y={y + 0.7} width="28" height="3.5" rx="0.5" fill={C.bg} stroke={C.border} strokeWidth="0.15" />
              <text x={x + 1} y={y + 3} fontSize="1.7" fill={C.fg}>{val}</text>
            </g>
          );
        })}
        <text x="20" y="48" fontSize="1.6" fill={C.mutedFg} fontWeight="500">Observações</text>
        <rect x="20" y="48.7" width="58" height="3.5" rx="0.5" fill={C.bg} stroke={C.border} strokeWidth="0.15" />
        <Btn x="58" y="50.5" w="9" h="3.5" label="Cancelar" />
        <Btn x="68" y="50.5" w="11" h="3.5" label="Salvar lote" primary />
      </Card>
    </Frame>
  );
}

export function ScreenLoteImport() {
  return (
    <Frame>
      <rect x="0" y="0" width="100" height="58.9" fill="black" opacity="0.3" />
      <Card x="20" y="6" w="60" h="48" title="Importar lotes">
        <text x="22" y="10" fontSize="1.7" fill={C.mutedFg}>Faça upload de uma planilha .xlsx ou .csv</text>
        <Btn x="22" y="13" w="20" h="4" label="↓ Baixar modelo" />
        <rect x="22" y="20" width="56" height="18" rx="1" fill={C.primarySoft} stroke={C.primary} strokeWidth="0.2" strokeDasharray="0.8 0.4" />
        <text x="50" y="28" fontSize="2.2" fill={C.primary} textAnchor="middle" fontWeight="600">Arraste a planilha aqui</text>
        <text x="50" y="31" fontSize="1.6" fill={C.mutedFg} textAnchor="middle">ou clique para selecionar</text>
        <text x="22" y="42" fontSize="1.7" fill={C.fg} fontWeight="600">Colunas esperadas</text>
        <text x="22" y="44.5" fontSize="1.5" fill={C.mutedFg}>codigo · nome · tipoLote · status · rua · prateleira · observacoes</text>
        <Btn x="60" y="49.5" w="9" h="3.5" label="Cancelar" />
        <Btn x="70" y="49.5" w="9" h="3.5" label="Importar" primary />
      </Card>
    </Frame>
  );
}

export function ScreenDashboard() {
  return (
    <Frame>
      <text x="2" y="4" fontSize="3.2" fill={C.fg} fontWeight="700">Dashboard</text>
      <text x="2" y="7" fontSize="1.8" fill={C.mutedFg}>Visão geral consolidada do almoxarifado</text>

      {/* KPI cards */}
      {[
        { t: "Total de lotes", v: "1.248", d: "+12% mês", tone: C.success },
        { t: "Em preservação", v: "187", d: "Esta semana", tone: C.info },
        { t: "Vencendo em 30d", v: "32", d: "Atenção", tone: C.warning },
        { t: "Vencidos", v: "8", d: "Ação requerida", tone: C.destructive },
      ].map((k, i) => (
        <Card key={i} x={2 + i * 23.5} y="9" w="22" h="9">
          <text x={4 + i * 23.5} y="12" fontSize="1.6" fill={C.mutedFg}>{k.t}</text>
          <text x={4 + i * 23.5} y="15.4" fontSize="3.4" fill={C.fg} fontWeight="700">{k.v}</text>
          <text x={4 + i * 23.5} y="17.5" fontSize="1.5" fill={k.tone} fontWeight="600">{k.d}</text>
        </Card>
      ))}

      {/* Chart left */}
      <Card x="2" y="19" w="58" h="22" title="Lotes por mês">
        {[8, 14, 11, 17, 13, 19, 15, 21, 18, 24, 22, 27].map((v, i) => (
          <rect key={i} x={5 + i * 4.5} y={38 - v * 0.8} width="3.4" height={v * 0.8} rx="0.3" fill={C.primary} opacity={0.85} />
        ))}
        <line x1="4" y1="38" x2="58" y2="38" stroke={C.border} strokeWidth="0.15" />
      </Card>

      {/* Donut right */}
      <Card x="62" y="19" w="33" h="22" title="Status">
        <circle cx="78" cy="32" r="6" fill="none" stroke={C.muted} strokeWidth="2" />
        <circle cx="78" cy="32" r="6" fill="none" stroke={C.success} strokeWidth="2" strokeDasharray="22 38" transform="rotate(-90 78 32)" />
        <circle cx="78" cy="32" r="6" fill="none" stroke={C.warning} strokeWidth="2" strokeDasharray="8 52" strokeDashoffset="-22" transform="rotate(-90 78 32)" />
        <text x="78" y="33" fontSize="2.2" fill={C.fg} textAnchor="middle" fontWeight="700">73%</text>
        {[["Disponível", C.success], ["Vencendo", C.warning], ["Vencido", C.destructive]].map(([n, c], i) => (
          <g key={i}>
            <circle cx="87" cy={26 + i * 3} r="0.6" fill={c as string} />
            <text x="88.5" y={26.5 + i * 3} fontSize="1.5" fill={C.mutedFg}>{n}</text>
          </g>
        ))}
      </Card>

      {/* Table */}
      <Card x="2" y="42" w="93" h="14" title="Atividades recentes">
        {["Lote NOV-014 vencido", "Importação de 142 lotes", "Lote RTC-051 preservado", "Cronograma atualizado"].map((t, i) => (
          <g key={i}>
            <circle cx="4" cy={48 + i * 2.2} r="0.6" fill={C.primary} />
            <text x="5.5" y={48.5 + i * 2.2} fontSize="1.6" fill={C.fg}>{t}</text>
            <text x="92" y={48.5 + i * 2.2} fontSize="1.4" fill={C.mutedFg} textAnchor="end">há {i + 1}h</text>
          </g>
        ))}
      </Card>
    </Frame>
  );
}

export function ScreenCronograma() {
  return (
    <Frame>
      <text x="2" y="4" fontSize="3.2" fill={C.fg} fontWeight="700">Cronograma de Preservação</text>
      <Btn x="74" y="2.5" w="9" h="3.5" label="Importar" />
      <Btn x="84" y="2.5" w="11" h="3.5" label="Baixa em lote" primary />

      <Card x="2" y="9" w="93" h="48">
        <rect x="2.5" y="9.5" width="92" height="3.2" fill={C.muted} />
        {["Lote", "Atividade", "Próx. preservação", "Frequência", "Status", "Ação"].map((h, i) => (
          <text key={i} x={4 + i * 15.5} y="11.6" fontSize="1.6" fill={C.mutedFg} fontWeight="600">{h}</text>
        ))}
        {[
          ["NOV-001", "Inspeção visual", "15/05/2026", "30 dias", "Em dia", C.success],
          ["RTC-008", "Lubrificação", "08/05/2026", "60 dias", "Atrasado", C.destructive],
          ["NOV-014", "Rotação eixo", "20/05/2026", "90 dias", "Próximo", C.warning],
          ["NOV-022", "Inspeção visual", "30/05/2026", "30 dias", "Em dia", C.success],
          ["RTC-031", "Graxa especial", "12/05/2026", "60 dias", "Próximo", C.warning],
          ["NOV-040", "Vedação", "25/06/2026", "90 dias", "Em dia", C.success],
          ["RTC-051", "Inspeção visual", "01/06/2026", "30 dias", "Em dia", C.success],
        ].map((r, i) => {
          const y = 14 + i * 5.8;
          return (
            <g key={i}>
              <line x1="2.5" y1={y + 3.5} x2="94.5" y2={y + 3.5} stroke={C.border} strokeWidth="0.1" />
              <rect x="3" y={y - 0.5} width="2" height="2" rx="0.3" fill={C.muted} stroke={C.border} strokeWidth="0.1" />
              <text x="6" y={y + 1.2} fontSize="1.7" fill={C.fg} fontWeight="600">{r[0]}</text>
              <text x="19.5" y={y + 1.2} fontSize="1.7" fill={C.fg}>{r[1]}</text>
              <text x="35" y={y + 1.2} fontSize="1.7" fill={C.fg}>{r[2]}</text>
              <text x="50.5" y={y + 1.2} fontSize="1.7" fill={C.mutedFg}>{r[3]}</text>
              <rect x="65" y={y - 0.2} width="11" height="2.4" rx="0.5" fill={r[5] as string} opacity="0.15" />
              <text x="70.5" y={y + 1.4} fontSize="1.5" fill={r[5] as string} textAnchor="middle" fontWeight="600">{r[4]}</text>
              <Btn x="80" y={y - 0.3} w="12" h="2.8" label="Dar baixa" />
            </g>
          );
        })}
      </Card>
    </Frame>
  );
}

export function ScreenAuth() {
  return (
    <Frame header={false} sidebar={false}>
      <rect width="100" height="58.9" fill={C.muted} />
      <Card x="32" y="14" w="36" h="32">
        <rect x="48" y="18" width="4" height="4" rx="1" fill={C.primary} />
        <text x="50" y="27" fontSize="2.6" fill={C.fg} textAnchor="middle" fontWeight="700">onPreserv</text>
        <text x="50" y="29.5" fontSize="1.6" fill={C.mutedFg} textAnchor="middle">Acesso ao sistema</text>
        <rect x="36" y="32" width="28" height="3.5" rx="0.5" fill={C.bg} stroke={C.border} strokeWidth="0.15" />
        <text x="37" y="34.3" fontSize="1.6" fill={C.mutedFg}>email@empresa.com</text>
        <rect x="36" y="36.5" width="28" height="3.5" rx="0.5" fill={C.bg} stroke={C.border} strokeWidth="0.15" />
        <text x="37" y="38.8" fontSize="1.6" fill={C.mutedFg}>••••••••</text>
        <Btn x="36" y="41.5" w="28" h="3.8" label="Entrar" primary />
      </Card>
    </Frame>
  );
}

export function ScreenSidebar() {
  return (
    <Frame sidebar header={false}>
      <rect width="100" height="58.9" fill={C.bg} opacity="0.4" />
    </Frame>
  );
}
