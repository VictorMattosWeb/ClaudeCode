import type { Services } from "./types";
import { supabaseLotsService } from "./adapters/supabase/lots";

/**
 * Ponto único de montagem dos serviços.
 *
 * -----------------------------------------------------------------------------
 * Trocar de backend é trocar as linhas deste arquivo.
 * -----------------------------------------------------------------------------
 *
 * Quando a API própria estiver de pé, cria-se `adapters/http/lots.ts` com a
 * mesma interface e substitui-se aqui — um módulo por vez, sem parar o sistema
 * e sem tocar em contexto, página ou componente.
 *
 * Nada fora de `services/adapters/` deve importar `supabase`.
 */
export const services: Services = {
  lots: supabaseLotsService,
};

export type { Services, LotsService, NovoLote, EdicaoLote, NovaPreservacao } from "./types";
