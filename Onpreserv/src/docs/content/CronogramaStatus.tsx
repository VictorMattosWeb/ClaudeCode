import { Lead, P, H2, UL, Code, Callout } from "../components";

export default function Page() {
  return (
    <>
      <Lead>Como o sistema calcula automaticamente "Em dia", "Próximo" e "Atrasado".</Lead>
      <H2 id="formula">Fórmula</H2>
      <Code lang="ts">{`const diff = proximaExecucao - hoje
status = diff < 0 ? "Atrasado"
       : diff <= 7 ? "Próximo"
       : "Em dia"`}</Code>
      <H2 id="recalculo">Quando recalcula</H2>
      <UL>
        <li>Ao abrir a página de cronograma.</li>
        <li>Após cada baixa.</li>
        <li>À meia-noite (job interno).</li>
      </UL>
      <Callout type="rule">A "próxima execução" depois da baixa é calculada como <strong>data da baixa + frequênciaDias</strong>.</Callout>
    </>
  );
}
