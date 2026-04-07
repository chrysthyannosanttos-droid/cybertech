import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: true,
    port: 5173,
    allowedHosts: true,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    {
      name: 'ponto-proxy',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (req.url?.startsWith('/api-proxy')) {
            try {
              const url = new URL(req.url, `http://${req.headers.host}`);
              const target = url.searchParams.get('target');
              if (!target) return next();

              // Log para debug no terminal do usuário
              console.log(`[Proxy Ponto] Redirecionando para: ${target}`);

              const chunks: any[] = [];
              req.on('data', chunk => chunks.push(chunk));
              req.on('end', async () => {
                const body = Buffer.concat(chunks).toString();
                
                try {
                  const response = await fetch(target, {
                    method: req.method,
                    headers: { 'Content-Type': 'application/json' },
                    body: req.method !== 'GET' ? body : undefined
                  });
                  
                  const data = await response.text();
                  res.setHeader('Content-Type', 'application/json');
                  res.setHeader('Access-Control-Allow-Origin', '*');
                  res.end(data);
                } catch (err: any) {
                  res.statusCode = 500;
                  res.end(JSON.stringify({ error: err.message }));
                }
              });
            } catch (e) {
              next();
            }
          } else {
            next();
          }
        });
      }
    }
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
