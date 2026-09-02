import { Search, X, SlidersHorizontal, CalendarRange, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { LOT_TIPO_LABEL } from "@/types/lot";
import {
  type LotFiltersValue,
  type PeriodoCadastro,
  DEFAULT_FILTERS,
  PERIODO_CADASTRO_LABEL,
  PRESERVATION_LABEL,
  activeFilterChips,
  countAdvancedFilters,
} from "@/lib/lotFilters";
import { cn } from "@/lib/utils";

interface Props {
  value: LotFiltersValue;
  onChange: (v: LotFiltersValue) => void;
  /** Total após o filtro, para o contador de resultados. */
  resultCount: number;
  totalCount: number;
}

const PERIODOS: PeriodoCadastro[] = ["all", "hoje", "7d", "30d", "custom"];

/**
 * Barra de filtros dos lotes.
 *
 * Reduzida de sete controles permanentemente visíveis para três, mais um
 * popover de avançados e outro de período. O critério de corte foi a frequência
 * de uso: busca, preservação e período são consulta diária; rua e prateleira
 * são consulta pontual, de quem vai até o galpão.
 *
 * O filtro por código foi removido: a busca livre já procura em código, e ter
 * dois campos que fazem a mesma coisa só cria dúvida sobre qual usar.
 */
export function LotFilterBar({ value, onChange, resultCount, totalCount }: Props) {
  const chips = activeFilterChips(value);
  const advancedCount = countAdvancedFilters(value);
  const periodoAtivo = value.periodoCadastro !== "all";

  const set = (patch: Partial<LotFiltersValue>) => onChange({ ...value, ...patch });

  return (
    <div className="space-y-2.5">
      {/* ---------- Linha de controles ---------- */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[240px] flex-1">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={value.query}
            onChange={(e) => set({ query: e.target.value })}
            placeholder="Buscar por identificador, código, nome, local ou responsável…"
            aria-label="Buscar lotes"
            className="h-9 pl-9 pr-8"
          />
          {value.query && (
            <button
              type="button"
              onClick={() => set({ query: "" })}
              aria-label="Limpar busca"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <Select
          value={value.preservation}
          onValueChange={(v) => set({ preservation: v as LotFiltersValue["preservation"] })}
        >
          <SelectTrigger className="h-9 w-[170px]" aria-label="Situação da preservação">
            <SelectValue placeholder="Preservação" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toda preservação</SelectItem>
            <SelectItem value="overdue">{PRESERVATION_LABEL.overdue}</SelectItem>
            <SelectItem value="upcoming">{PRESERVATION_LABEL.upcoming}</SelectItem>
            <SelectItem value="preserved">{PRESERVATION_LABEL.preserved}</SelectItem>
            <SelectItem value="none">{PRESERVATION_LABEL.none}</SelectItem>
          </SelectContent>
        </Select>

        <Select value={value.status} onValueChange={(v) => set({ status: v as LotFiltersValue["status"] })}>
          <SelectTrigger className="h-9 w-[130px]" aria-label="Status do lote">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="ativo">Ativo</SelectItem>
            <SelectItem value="inativo">Inativo</SelectItem>
          </SelectContent>
        </Select>

        {/* ---------- Período de cadastro ---------- */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn("h-9", periodoAtivo && "border-primary/60 text-primary")}
            >
              <CalendarRange className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">
                {periodoAtivo ? PERIODO_CADASTRO_LABEL[value.periodoCadastro] : "Cadastro"}
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-72 p-0">
            <div className="border-b border-border px-3 py-2.5">
              <p className="font-hud text-[9px] uppercase text-primary">Histórico de cadastro</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Filtra os lotes pela data em que foram cadastrados.
              </p>
            </div>
            <div className="p-1.5">
              {PERIODOS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => set({ periodoCadastro: p })}
                  className={cn(
                    "flex w-full items-center justify-between px-2.5 py-1.5 text-left text-sm transition-colors",
                    value.periodoCadastro === p
                      ? "bg-primary-soft text-primary"
                      : "text-foreground hover:bg-accent",
                  )}
                >
                  {PERIODO_CADASTRO_LABEL[p]}
                  {value.periodoCadastro === p && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                </button>
              ))}
            </div>

            {value.periodoCadastro === "custom" && (
              <div className="grid grid-cols-2 gap-2 border-t border-border p-3">
                <div className="space-y-1.5">
                  <Label htmlFor="cad-de" className="font-hud text-[9px] uppercase text-muted-foreground">
                    De
                  </Label>
                  <Input
                    id="cad-de"
                    type="date"
                    value={value.cadastroDe}
                    max={value.cadastroAte || undefined}
                    onChange={(e) => set({ cadastroDe: e.target.value })}
                    className="h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cad-ate" className="font-hud text-[9px] uppercase text-muted-foreground">
                    Até
                  </Label>
                  <Input
                    id="cad-ate"
                    type="date"
                    value={value.cadastroAte}
                    min={value.cadastroDe || undefined}
                    onChange={(e) => set({ cadastroAte: e.target.value })}
                    className="h-9"
                  />
                </div>
              </div>
            )}
          </PopoverContent>
        </Popover>

        {/* ---------- Filtros avançados ---------- */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn("h-9", advancedCount > 0 && "border-primary/60 text-primary")}
            >
              <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Mais filtros</span>
              {advancedCount > 0 && (
                <span className="font-hud ml-0.5 bg-primary px-1 text-[9px] text-primary-foreground">
                  {advancedCount}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-72 space-y-3 p-3">
            <p className="font-hud text-[9px] uppercase text-primary">Filtros avançados</p>

            <div className="space-y-1.5">
              <Label htmlFor="f-tipo" className="font-hud text-[9px] uppercase text-muted-foreground">
                Tipo de lote
              </Label>
              <Select
                value={value.tipoLote}
                onValueChange={(v) => set({ tipoLote: v as LotFiltersValue["tipoLote"] })}
              >
                <SelectTrigger id="f-tipo" className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="novo">{LOT_TIPO_LABEL.novo}</SelectItem>
                  <SelectItem value="retirado_campo">{LOT_TIPO_LABEL.retirado_campo}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="f-rua" className="font-hud text-[9px] uppercase text-muted-foreground">
                  Rua
                </Label>
                <Input
                  id="f-rua"
                  value={value.rua}
                  onChange={(e) => set({ rua: e.target.value })}
                  placeholder="Ex.: 3"
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="f-prat" className="font-hud text-[9px] uppercase text-muted-foreground">
                  Prateleira
                </Label>
                <Input
                  id="f-prat"
                  value={value.prateleira}
                  onChange={(e) => set({ prateleira: e.target.value })}
                  placeholder="Ex.: B2"
                  className="h-9"
                />
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* ---------- Chips dos filtros ativos + contagem ---------- */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="font-hud text-[9px] uppercase text-muted-foreground" aria-live="polite">
          {resultCount === totalCount
            ? `${totalCount} lotes`
            : `${resultCount} de ${totalCount} lotes`}
        </span>

        {chips.length > 0 && <span className="mx-1 h-3 w-px bg-border" aria-hidden="true" />}

        {chips.map((chip) => (
          <button
            key={chip.key}
            type="button"
            onClick={() => onChange(chip.clear(value))}
            aria-label={`Remover filtro ${chip.label}`}
            className="group inline-flex items-center gap-1.5 border border-border bg-card px-2 py-0.5 text-[11px] text-muted-foreground transition-colors duration-200 hover:border-primary/60 hover:text-primary"
          >
            <span className="max-w-[220px] truncate">{chip.label}</span>
            <X className="h-3 w-3 shrink-0 opacity-60 group-hover:opacity-100" aria-hidden="true" />
          </button>
        ))}

        {chips.length > 1 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onChange(DEFAULT_FILTERS)}
            className="h-6 px-2 text-[11px]"
          >
            Limpar tudo
          </Button>
        )}
      </div>
    </div>
  );
}
