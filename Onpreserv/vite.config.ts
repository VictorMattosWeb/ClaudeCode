import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // O jsPDF importa estas três para dar suporte a `doc.html()`, que este
      // projeto não usa — as exportações desenham o PDF em vetor. Sem o stub,
      // são 230 kB de código morto em todo build.
      html2canvas: path.resolve(__dirname, "./src/lib/jspdf-stub.ts"),
      dompurify: path.resolve(__dirname, "./src/lib/jspdf-stub.ts"),
      canvg: path.resolve(__dirname, "./src/lib/jspdf-stub.ts"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
}));
