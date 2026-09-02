import { Lead } from "../components";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const ITEMS = [
  ["Posso reimportar a mesma planilha de lotes?", "Sim, mas cada importação cria novos lotes (com identificadores únicos). Para atualizar, edite manualmente."],
  ["Como recupero um lote excluído?", "Exclusões precisam de aprovação admin. Antes de aprovada, basta recusar a solicitação. Após aprovada, contate o admin para restauração via banco."],
  ["Esqueci minha senha, e agora?", "Na tela de login, clique em 'Esqueci a senha' (em breve). Por enquanto, peça ao administrador para reenviar o convite."],
  ["A planilha precisa estar em uma ordem específica?", "Não. Apenas os cabeçalhos precisam estar exatamente como no modelo."],
  ["Posso usar acentos no nome do produto?", "Sim, em conteúdo. Apenas evite acentos nos cabeçalhos do CSV."],
  ["Por que meu lote ficou 'Vencido' sozinho?", "O sistema atualiza diariamente. Se a validade passou, o status muda automaticamente."],
  ["Como mudo o tema para escuro?", "Use o ícone de lua no canto superior direito. A preferência é salva."],
  ["Onde vejo quem fez uma alteração?", "Em Atividades — toda ação fica registrada com usuário e data."],
];

export default function Page() {
  return (
    <>
      <Lead>Perguntas frequentes da equipe operacional.</Lead>
      <Accordion type="single" collapsible className="my-6">
        {ITEMS.map(([q, a], i) => (
          <AccordionItem key={i} value={`f${i}`}>
            <AccordionTrigger>{q}</AccordionTrigger>
            <AccordionContent>{a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </>
  );
}
