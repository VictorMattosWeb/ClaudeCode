import { Lead, P, H2, H3, UL, Callout, Steps, Step, Mock, Compare, Kbd } from "../components";
import imgNovoBtn from "@/docs/assets/lotes-novo-btn.png";
import imgForm from "@/docs/assets/lotes-form.png";
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
        Use o cadastro manual quando precisar registrar um lote pontual — uma embalagem nova que acabou de
        chegar ou um retorno de campo que foi entregue ao almoxarifado. Para volumes maiores, prefira a
        <strong> importação por planilha</strong>.
      </Lead>

      <Callout type="info" title="Antes de começar">
        Tenha em mãos a <strong>etiqueta da embalagem</strong> (código), a <strong>descrição do material</strong>
        e a <strong>localização</strong> onde o lote ficará guardado (rua e prateleira). Sem código e nome
        você não consegue salvar.
      </Callout>

      {/* ---------------- 1. Acessar ---------------- */}
      <H2 id="acessar"><SectionTag>1</SectionTag> Acessar o módulo Lotes</H2>
      <P>No menu lateral, clique em <strong>Lotes</strong>. A tela mostra os KPIs, o bloco de ações e a tabela.</P>
      <Mock title="Sidebar → Lotes" ratio="16/8">
        <img src={imgFull} alt="Menu lateral com Lotes selecionado" className="w-full h-full object-cover object-top" />
      </Mock>

      {/* ---------------- 2. Botão ---------------- */}
      <H2 id="abrir"><SectionTag>2</SectionTag> Abrir o formulário</H2>
      <P>
        No canto superior direito do bloco <em>Lotes</em>, clique em <strong>+ Novo Lote</strong> (botão verde).
        Um diálogo abre por cima da tabela.
      </P>
      <Mock title="Bloco de ações" ratio="16/3">
        <img src={imgNovoBtn} alt="Botão Novo Lote destacado" className="w-full h-full object-contain bg-background" />
      </Mock>

      {/* ---------------- 3. Preencher ---------------- */}
      <H2 id="preencher"><SectionTag>3</SectionTag> Preencher o formulário</H2>
      <Mock title="Diálogo Novo Lote" ratio="3/4">
        <img src={imgForm} alt="Formulário Novo Lote com todos os campos" className="w-full h-full object-contain bg-background" />
      </Mock>

      <H3 id="campos">Significado de cada campo</H3>
      <UL>
        <li><strong>Tipo de Lote</strong> — <em>Novo (NOV)</em> para material novo recebido; <em>Retirado de Campo (RTC)</em> para retorno. Define o prefixo do identificador.</li>
        <li><strong>Código</strong> — número da embalagem que está na etiqueta. Pode repetir entre lotes diferentes.</li>
        <li><strong>Nome / Descrição</strong> — descrição do material (ex.: <em>CABO P9O97MR</em>, <em>RH101FQ</em>). Aparece em todas as buscas.</li>
        <li><strong>Local</strong> — texto livre (ex.: <em>ALMOXARIFADO</em>).</li>
        <li><strong>Responsável</strong> — quem é o dono operacional do lote.</li>
        <li><strong>Rua</strong> e <strong>Prateleira</strong> — endereço físico no almoxarifado. Aceita letras, números e hífen.</li>
        <li><strong>Status</strong> — <em>Ativo</em> (em uso) ou <em>Inativo</em> (arquivado).</li>
        <li><strong>Observações</strong> — campo livre para anotações.</li>
      </UL>

      <Callout type="rule" title="Identificador é automático">
        Você não precisa (e não pode) digitar o identificador. Assim que salvar, o sistema gera
        <code> NOV-XXXX</code> ou <code>RTC-XXXX</code> — o próximo número da sequência.
      </Callout>

      {/* ---------------- 4. Validações ---------------- */}
      <H2 id="validacoes"><SectionTag>4</SectionTag> Formato aceito em Rua e Prateleira</H2>
      <Compare
        doItems={["A-12", "B3", "12-A", "P-04", "01"]}
        dontItems={["A 12 (espaço)", "A.12 (ponto)", "A/12 (barra)", "A_12 (underline)"]}
      />
      <P>
        A regra é <code>/^[A-Za-z0-9-]*$/</code>. O hífen é aceito; espaços e qualquer outro caractere especial
        bloqueiam o salvamento.
      </P>

      {/* ---------------- 5. Salvar ---------------- */}
      <H2 id="salvar"><SectionTag>5</SectionTag> Criar e conferir</H2>
      <Steps>
        <Step title="Clique em Criar">O botão verde no rodapé do diálogo. Use <Kbd>Enter</Kbd> como atalho.</Step>
        <Step title="Confira o identificador">A nova linha aparece no topo da tabela com o identificador gerado (ex.: <code>NOV-0140</code>).</Step>
        <Step title="Adicione a primeira preservação">Clique no ícone de olho na coluna <em>Ações</em> para abrir o lote e registrar uma preservação inicial.</Step>
      </Steps>

      <Callout type="tip" title="Atalhos do formulário">
        Use <Kbd>Tab</Kbd> para pular entre campos e <Kbd>Esc</Kbd> para cancelar sem salvar.
      </Callout>
    </>
  );
}
