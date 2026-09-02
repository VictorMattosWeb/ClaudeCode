import { Lead, UL, Callout, Compare } from "../components";

export default function Page() {
  return (
    <>
      <Lead>Atualize informações sem perder dados existentes.</Lead>
      <Compare
        doTitle="Para atualizar"
        dontTitle="Para criar novo"
        doItems={[
          "Cronograma: reimporte com identificador/código existente",
          "Edite manualmente clicando na linha",
          "Use baixa em lote para atualizar status em massa",
        ]}
        dontItems={[
          "Lotes: importação sempre cria novo (use edição manual para alterar)",
          "Não reaproveite identificadores antigos",
        ]}
      />
      <Callout type="rule">Quer alterar dados de muitos lotes? Edite um por um — não há atualização em massa de lotes via planilha por design (rastreabilidade).</Callout>
    </>
  );
}
