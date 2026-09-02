import { Lead, P, H2, H3, UL, Callout } from "../components";

export default function Page() {
  return (
    <>
      <Lead>Glossário operacional dos termos mais importantes do sistema.</Lead>

      <H2 id="lote">Lote</H2>
      <P>Unidade física de material rastreável. Cada lote possui um <strong>identificador interno</strong> único, gerado automaticamente:</P>
      <UL>
        <li><strong>NOV-XXX</strong> — lotes novos.</li>
        <li><strong>RTC-XXX</strong> — lotes de retorno (ex.: itens preservados que voltaram do uso).</li>
      </UL>
      <Callout type="rule" title="Identificador vs Código">
        O <strong>identificador interno</strong> é único e gerado pelo sistema. O <strong>código</strong> é o número visível na embalagem e pode se repetir entre lotes diferentes.
      </Callout>

      <H2 id="status">Status do lote</H2>
      <UL>
        <li><strong>Disponível</strong> — pronto para uso.</li>
        <li><strong>Em preservação</strong> — passando por atividade do cronograma.</li>
        <li><strong>Pendente</strong> — aguardando ação.</li>
        <li><strong>Vencido</strong> — fora do prazo de validade.</li>
      </UL>

      <H2 id="cronograma">Cronograma</H2>
      <P>Conjunto de atividades de preservação periódicas (ex.: lubrificação a cada 60 dias). Cada item do cronograma vincula um lote a uma atividade e a uma data prevista.</P>

      <H2 id="merge">Merge inteligente</H2>
      <P>Ao reimportar uma planilha, o sistema atualiza apenas os campos preenchidos, preservando os demais. Saiba mais em <a className="text-primary underline" href="/docs/cronograma/merge">Merge inteligente</a>.</P>
    </>
  );
}
