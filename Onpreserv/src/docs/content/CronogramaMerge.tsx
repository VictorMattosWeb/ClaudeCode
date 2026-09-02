import { Lead, P, H2, UL, Callout, Compare, Mock } from "../components";
import imgImportarDialog from "@/docs/assets/cronograma-importar-dialog.png";

export default function Page() {
  return (
    <>
      <Lead>
        O <strong>merge inteligente</strong> é o que torna a importação do cronograma segura para ser
        usada várias vezes na mesma medição: você pode <strong>atualizar</strong> dados existentes em
        massa sem perder o que já estava preenchido.
      </Lead>

      <Mock title="Importar cronograma" ratio="16/7">
        <img src={imgImportarDialog} alt="Diálogo de importação do cronograma" className="w-full h-full object-contain bg-background" />
      </Mock>

      <H2 id="como">Como o merge funciona</H2>
      <UL>
        <li>O sistema procura cada linha pela combinação <strong>TAG + Unidade + Gabinete</strong> dentro da medição ativa.</li>
        <li>Se o item já existe, ele é <strong>atualizado</strong>: somente os campos preenchidos na planilha sobrescrevem o valor atual.</li>
        <li>Campos <strong>vazios</strong> na planilha mantêm o valor que já estava no sistema (não apagam).</li>
        <li>Se o item não existe na medição, ele é <strong>criado</strong>.</li>
        <li>Ao final, a tela mostra quantos foram <em>criados</em> e quantos foram <em>atualizados</em>.</li>
      </UL>

      <Callout type="rule" title="Atualização em massa via planilha">
        Esse é o caminho recomendado para registrar <strong>baixas mensais</strong>, <strong>corrigir
        datas previstas</strong> ou <strong>mudar status</strong> de muitas TAGs ao mesmo tempo.
        Basta exportar, ajustar a planilha e reimportar — o merge cuida do resto.
      </Callout>

      <Compare
        doItems={[
          "Reimportar a planilha do mês com as datas realizadas preenchidas",
          "Atualizar só a coluna 'dataPrevista' deixando o resto vazio",
          "Corrigir o tipo de gabinete em várias TAGs de uma vez",
          "Exportar primeiro, editar e reimportar — garante que as TAGs batem",
        ]}
        dontItems={[
          "Apagar células esperando que o sistema 'limpe' o campo (ele mantém o valor antigo)",
          "Mudar a TAG na planilha — vira item novo em vez de atualizar",
          "Importar na medição errada — os itens vão para a aba ativa",
        ]}
      />

      <Callout type="warning" title="Para limpar um campo">
        O merge nunca apaga conteúdo. Se você precisa <em>esvaziar</em> um campo (ex.: remover a data
        realizada), edite o item manualmente pela tabela.
      </Callout>
    </>
  );
}
