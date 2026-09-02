import { Lead, P, H2, H3, UL, Callout } from "../components";
import atividadesLista from "../assets/atividades-lista.png";
import atividadesTabs from "../assets/atividades-tabs.png";
import atividadesNova from "../assets/atividades-nova.png";

export default function Page() {
  return (
    <>
      <Lead>
        As <strong>Atividades de Preservação</strong> são o passo a passo que aplicamos em cada
        equipamento durante a preservação. Cada atividade representa uma ação técnica
        (inspeção, limpeza, lubrificação, etc.) executada em uma frequência definida.
      </Lead>

      <H2 id="o-que-e">O que é</H2>
      <P>
        É o catálogo padrão de tarefas que orienta o operador no momento da preservação.
        Cada item da lista possui um <strong>código</strong>, uma <strong>descrição</strong> e
        uma <strong>frequência (em dias)</strong> que define de quanto em quanto tempo a
        ação deve ser repetida no cronograma.
      </P>
      <img src={atividadesLista} alt="Lista de atividades de preservação" className="rounded-lg border border-border my-4" />

      <H2 id="campo-almox">Separação por local</H2>
      <P>
        As atividades são divididas em duas listas independentes, porque o procedimento e a
        frequência variam conforme o local em que o equipamento está armazenado:
      </P>
      <UL>
        <li><strong>Campo</strong> — equipamentos instalados ou armazenados em área externa.</li>
        <li><strong>Almoxarifado</strong> — equipamentos guardados internamente, em prateleiras.</li>
      </UL>
      <img src={atividadesTabs} alt="Abas de Campo e Almoxarifado" className="rounded-lg border border-border my-4 max-w-md" />
      <Callout type="tip">
        Use as abas no topo da página para alternar entre as duas listas. Cada aba mostra
        o total de atividades cadastradas no canto direito.
      </Callout>

      <H2 id="cadastrar">Como cadastrar uma atividade</H2>
      <P>
        Clique em <strong>+ Nova</strong> e preencha os campos obrigatórios:
      </P>
      <UL>
        <li><strong>Código</strong> — identificador único da atividade (ex.: <code>1.003</code>).</li>
        <li><strong>Descrição</strong> — o que deve ser feito.</li>
        <li><strong>Frequência (dias)</strong> — intervalo entre execuções.</li>
      </UL>
      <img src={atividadesNova} alt="Formulário de nova atividade" className="rounded-lg border border-border my-4 max-w-sm" />

      <H2 id="uso">Como é usada no dia a dia</H2>
      <UL>
        <li>No <strong>cronograma</strong>, cada item de preservação é vinculado a uma atividade desta lista.</li>
        <li>A <strong>frequência</strong> definida aqui determina a próxima data de execução após cada baixa.</li>
        <li>Toda baixa registra qual atividade foi executada, gerando histórico para auditoria.</li>
      </UL>

      <Callout type="rule">
        Mantenha os códigos consistentes entre Campo e Almoxarifado. Eles são usados nas
        importações de cronograma para identificar qual atividade aplicar.
      </Callout>
    </>
  );
}
