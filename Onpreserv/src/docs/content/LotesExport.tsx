import { Lead, P, H2, UL, Mock, Steps, Step, Callout } from "../components";
import imgExportarBtn from "@/docs/assets/lotes-exportar-btn.png";
import imgExportarMenu from "@/docs/assets/lotes-exportar-menu.png";
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
        Exporte sua listagem de lotes para análise externa, backup, conferência com o time ou geração de
        relatório formal. A exportação <strong>respeita os filtros aplicados</strong> e oferece dois recortes:
        resultados filtrados ou apenas selecionados.
      </Lead>

      {/* ---------------- 1. Botão ---------------- */}
      <H2 id="abrir"><SectionTag>1</SectionTag> Abrir o menu de exportação</H2>
      <P>No bloco <em>Lotes</em>, clique em <strong>Exportar</strong> (botão à esquerda das ações).</P>
      <Mock title="Bloco de ações" ratio="16/3">
        <img src={imgExportarBtn} alt="Botão Exportar destacado" className="w-full h-full object-contain bg-background" />
      </Mock>

      {/* ---------------- 2. Menu ---------------- */}
      <H2 id="menu"><SectionTag>2</SectionTag> Escolher escopo e formato</H2>
      <Mock title="Menu de exportação" ratio="3/4">
        <img src={imgExportarMenu} alt="Menu com Resultados filtrados e Selecionados" className="w-full h-full object-contain bg-background" />
      </Mock>
      <P>O menu tem <strong>dois grupos</strong>:</P>
      <UL>
        <li><strong>Resultados filtrados (N)</strong> — exporta tudo que está aparecendo na tabela depois dos filtros. O número entre parênteses é a contagem.</li>
        <li><strong>Selecionados (N)</strong> — exporta apenas as linhas marcadas com checkbox. Útil quando você quer um subconjunto específico.</li>
      </UL>

      <H2 id="formatos"><SectionTag>3</SectionTag> Diferenças entre os formatos</H2>
      <UL>
        <li><strong>Excel (.xlsx)</strong> — recomendado. Mantém tipos de dados, é fácil de filtrar, ordenar e <em>reimportar</em>.</li>
        <li><strong>CSV (.csv)</strong> — formato universal para integrações com outros sistemas (ERP, BI). Sem formatação.</li>
        <li><strong>PDF</strong> — relatório formatado, pronto para imprimir ou enviar por e-mail.</li>
      </UL>

      {/* ---------------- 4. Passo a passo ---------------- */}
      <H2 id="passo-a-passo"><SectionTag>4</SectionTag> Passo a passo</H2>
      <Steps>
        <Step title="Aplique filtros (opcional)">Filtre por situação, status, rua, prateleira ou termo de busca para isolar o que importa.</Step>
        <Step title="(Opcional) marque linhas específicas">Use os checkboxes na primeira coluna se quiser exportar somente alguns lotes.</Step>
        <Step title="Clique em Exportar">O menu suspenso abre com os dois grupos de escopo.</Step>
        <Step title="Escolha o formato">XLSX, CSV ou PDF — dentro do escopo desejado.</Step>
        <Step title="Conferir o arquivo">O download começa automaticamente com o nome <code>lotes_AAAA-MM-DD.xlsx</code>.</Step>
      </Steps>

      <H2 id="campos"><SectionTag>5</SectionTag> Campos exportados</H2>
      <UL>
        <li>Identificador interno, Tipo, Código, Nome, Local, Rua, Prateleira, Responsável, Status, Observações.</li>
        <li>Data e responsável da <strong>última preservação</strong>.</li>
        <li>Data da <strong>próxima preservação</strong> e <em>situação</em> (Em dia / Próxima / Vencida / Sem registro).</li>
      </UL>

      <Callout type="tip" title="Reimportação">
        Você pode editar o XLSX e reimportar — mas atenção: a importação <strong>cria novos lotes</strong>,
        ela não atualiza os existentes. Para atualizar lotes já cadastrados, abra cada um pelo ícone de edição.
      </Callout>

      <Callout type="warning" title="Quando o resultado vier vazio">
        Se o PDF/Excel saiu sem linhas, o filtro está restritivo demais. Limpe os filtros e tente novamente.
      </Callout>
    </>
  );
}
