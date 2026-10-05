import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    /**
     * O padrão é `node`, não `jsdom`.
     *
     * Dos 27 arquivos de teste, 22 são de lógica pura (`src/types`, `src/lib`)
     * e nenhum deles toca `document`, `window` ou testing-library. Subir um
     * jsdom para cada um custava a maior parte do tempo da suíte — 118s de um
     * total de 204s ficavam só em montar e derrubar ambiente.
     *
     * Os 5 arquivos de componente declaram o que precisam na primeira linha,
     * com `// @vitest-environment jsdom`. A diretiva por arquivo é preferível a
     * um `environmentMatchGlobs` central: fica visível em quem a usa e não
     * depende de uma opção que o Vitest já marcou como obsoleta.
     */
    environment: "node",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    /**
     * Vinte segundos, e não os 5 do padrão.
     *
     * Não é lentidão do código: medindo por dentro, o render do autocomplete de
     * menções leva 141ms. O que estoura o prazo é o canal entre o worker do
     * Vitest e o processo pai, que nesta máquina (Windows, projeto dentro do
     * OneDrive) bloqueia por vários segundos a cada mensagem — o mesmo canal do
     * erro `Timeout calling "onTaskUpdate"`. Com o relógio correndo durante o
     * bloqueio, todo teste `async` falhava por tempo, e só os síncronos
     * passavam. O prazo maior absorve essa pausa sem esconder teste lento de
     * verdade, que continua acusando bem antes dos 20s.
     */
    testTimeout: 20000,
    hookTimeout: 20000,
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
