import { Lead, P, H2, UL, Mock, Callout, Compare, Steps, Step } from "../components";
import imgFiltroStatus from "@/docs/assets/lotes-filtro-status.png";
import imgFiltroSituacao from "@/docs/assets/lotes-filtro-situacao.png";
import imgFull from "@/docs/assets/lotes-full.png";
import type { ReactNode } from "react";

function SectionTag({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-primary-soft text-primary">
      {children}
    </span>
  );
}

export default function Page() {
  return (
    <>
      <Lead>
        Cada lote ocupa um lugar físico no almoxarifado. Os campos <strong>Rua</strong> e
        <strong> Prateleira</strong> permitem encontrar a embalagem rapidamente, filtrar por endereço e
        manter inventários organizados.
      </Lead>

      {/* ---------------- 1. Modelo ---------------- */}
      <H2 id="modelo"><SectionTag>1</SectionTag> Como modelar Rua e Prateleira</H2>
      <P>
        Não há regra fixa de como nomear — o importante é que sua equipe siga um padrão único. Os exemplos
        abaixo são aceitos pelo sistema.
      </P>
      <Compare
        doItems={["A-12 / P-04", "B3 / 5", "01 / 12", "12-A / P-03"]}
        dontItems={["A 12 (espaço)", "A.12 (ponto)", "A/12 (barra)", "A_12 (underline)"]}
      />
      <Callout type="rule">
        Validação: <code>/^[A-Za-z0-9-]*$/</code>. Aceita letras, números e hífen. Vazio também é aceito (mas
        não recomendado).
      </Callout>

      {/* ---------------- 2. Onde aparece ---------------- */}
      <H2 id="onde-aparece"><SectionTag>2</SectionTag> Onde Rua e Prateleira aparecem</H2>
      <Mock title="Tabela de Lotes" ratio="16/8">
        <img src={imgFull} alt="Colunas Rua e Prateleira na tabela de lotes" className="w-full h-full object-cover object-top" />
      </Mock>
      <UL>
        <li><strong>Tabela</strong> — duas colunas próprias (Rua e Prateleira) na listagem principal.</li>
        <li><strong>Busca global</strong> — o campo <em>Buscar por código, nome, local, rua, prateleira ou responsável</em> indexa esses dois campos.</li>
        <li><strong>Filtros próprios</strong> — campos <em>Filtrar por rua</em> e <em>Filtrar por prateleira</em> abaixo da busca.</li>
        <li><strong>Exportações</strong> — Rua e Prateleira sempre vão no XLSX/CSV/PDF.</li>
      </UL>

      {/* ---------------- 3. Buscar ---------------- */}
      <H2 id="buscar"><SectionTag>3</SectionTag> Buscar um lote pela localização</H2>
      <Steps>
        <Step title="Filtrar por rua">Digite a rua (ex.: <code>A-12</code>) no campo <em>Filtrar por rua</em>. A tabela atualiza instantaneamente.</Step>
        <Step title="Refinar por prateleira">Combine com o campo <em>Filtrar por prateleira</em> para chegar ao endereço exato.</Step>
        <Step title="Conferir o lote">O identificador, código e nome aparecem na linha — confronte com a etiqueta física.</Step>
      </Steps>
      <Callout type="tip">
        Os filtros são acumulativos (lógica E). Status + Situação + Rua + Prateleira atuam ao mesmo tempo.
      </Callout>

      {/* ---------------- 4. Filtros visuais ---------------- */}
      <H2 id="filtros-relacionados"><SectionTag>4</SectionTag> Filtros relacionados</H2>
      <P>
        Para encontrar um lote físico no almoxarifado, costuma ser útil combinar localização com
        <em> situação de preservação</em>:
      </P>
      <Mock title="Filtro de Status" ratio="16/4">
        <img src={imgFiltroStatus} alt="Dropdown Todos os status com Ativo e Inativo" className="w-full h-full object-contain bg-background" />
      </Mock>
      <Mock title="Filtro de Situação" ratio="16/4">
        <img src={imgFiltroSituacao} alt="Dropdown Todas as situações com Em dia, Próxima, Vencida e Sem preservação" className="w-full h-full object-contain bg-background" />
      </Mock>
      <UL>
        <li><strong>Status</strong> — Ativo (em uso) ou Inativo (arquivado).</li>
        <li><strong>Situação</strong> — Em dia, Próxima do vencimento, Vencida ou Sem preservação.</li>
      </UL>

      {/* ---------------- 5. Atualizar ---------------- */}
      <H2 id="atualizar"><SectionTag>5</SectionTag> Atualizar a localização</H2>
      <UL>
        <li><strong>Manual</strong> — clique no ícone de edição (lápis) na coluna <em>Ações</em> e altere os campos.</li>
        <li><strong>Em massa</strong> — não é possível atualizar pela importação (ela só cria novos lotes). Para muitos lotes, use a edição direta um a um.</li>
      </UL>

      <Callout type="warning" title="Localização em branco quebra a busca física">
        Lotes sem rua/prateleira ainda funcionam no sistema, mas <strong>não são encontrados</strong> pelos
        filtros de localização. Faça uma varredura periódica buscando por rua vazia para corrigir.
      </Callout>
    </>
  );
}
