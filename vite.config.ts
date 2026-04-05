import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Carrega as variáveis de ambiente (como a GEMINI_API_KEY)
  const env = loadEnv(mode, '.', '');
  
  return {
    // ESSENCIAL: O ponto e a barra garantem que o APK encontre os arquivos localmente
    base: './', 
    
    plugins: [react(), tailwindcss()],
    
    define: {
      // Garante que o código consiga ler a chave de API tanto no PC quanto no Android
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    
    resolve: {
      alias: {
        // Ajuda o Vite a encontrar os arquivos usando o atalho @
        '@': path.resolve(__dirname, '.'),
      },
    },

    build: {
      // Define a pasta de saída que o Capacitor espera (dist)
      outDir: 'dist',
      assetsDir: 'assets',
      // Limpa a pasta antiga antes de criar uma nova
      emptyOutDir: true,
      // Garante que o build seja compatível com dispositivos móveis
      target: 'esnext',
    },

    server: {
      // Configuração padrão do AI Studio (mantida para compatibilidade)
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
