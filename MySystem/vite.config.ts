import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": "/src" } },
  // IPv4 explícito: no Windows "localhost" às vezes só escuta em [::1] e o navegador abre em branco.
  server: { host: "127.0.0.1", port: 5173, strictPort: true, open: "/atividades" },
  build: {
    rollupOptions: {
      output: {
        // Bibliotecas em arquivos próprios: um deploy do app não invalida o cache delas.
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          supabase: ["@supabase/supabase-js"],
          charts: ["chart.js"],
          dnd: ["@dnd-kit/core", "@dnd-kit/sortable", "@dnd-kit/utilities"],
        },
      },
    },
  },
});
