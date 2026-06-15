import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [tailwindcss(), react()],
    server: {
      proxy: {
        // Local server handles Gemini, ELO, and prediction records
        '/api/predict':        { target: 'http://localhost:3001', changeOrigin: false },
        '/api/agents':         { target: 'http://localhost:3001', changeOrigin: false },
        '/api/elo':            { target: 'http://localhost:3001', changeOrigin: false },
        '/api/records':        { target: 'http://localhost:3001', changeOrigin: false },
        // football-data.org still proxied directly by Vite (auth header injected here)
        '/api/football': {
          target: 'https://api.football-data.org',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/football/, '/v4'),
          headers: { 'X-Auth-Token': env.VITE_FOOTBALL_API_KEY ?? '' },
        },
      },
    },
  }
})
