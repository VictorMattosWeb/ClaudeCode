/**
 * Substituto vazio para as dependências OPCIONAIS do jsPDF.
 *
 * O jsPDF declara `html2canvas`, `dompurify` e `canvg` como opcionais e as
 * importa para dar suporte ao método `doc.html()` — que converte um nó do DOM
 * em PDF rasterizado. Este projeto não usa esse método: as exportações montam o
 * PDF pela API do jsPDF e pelo jspdf-autotable, que desenham vetor.
 *
 * Sem este stub, o Vite não consegue eliminar as importações condicionais e
 * carrega 230 kB de código morto em todo build.
 *
 * Se algum dia alguém chamar `doc.html()`, vai receber um erro claro em vez de
 * um comportamento silenciosamente errado — remova o alias no `vite.config.ts`
 * e as dependências voltam.
 */
const naoDisponivel = new Proxy(
  {},
  {
    get() {
      throw new Error(
        "Dependência opcional do jsPDF removida do bundle. " +
          "Este projeto não usa doc.html(); veja src/lib/jspdf-stub.ts.",
      );
    },
  },
);

export default naoDisponivel;
