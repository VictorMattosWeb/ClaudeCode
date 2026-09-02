import { Lead, Steps, Step, Compare, Callout } from "../components";

export default function Page() {
  return (
    <>
      <Lead>Boas práticas para garantir que sua importação dê certo de primeira.</Lead>
      <Steps>
        <Step title="Sempre baixe o modelo oficial">Cabeçalhos exatos.</Step>
        <Step title="Valide em pequena escala">Importe 5 linhas primeiro para conferir o resultado.</Step>
        <Step title="Salve como .xlsx, não .xls">Formato antigo pode dar erro.</Step>
        <Step title="Verifique encoding (CSV)">UTF-8 sem BOM evita acentos quebrados.</Step>
      </Steps>
      <Compare
        doItems={["Cabeçalhos sem acento", "Datas no formato dd/mm/aaaa", "Células texto puro"]}
        dontItems={["Mesclar células", "Fórmulas Excel", "Linhas vazias no meio", "Múltiplas planilhas no mesmo arquivo"]}
      />
      <Callout type="rule">Erros em uma linha não impedem o resto — mas sempre revise o resumo final.</Callout>
    </>
  );
}
