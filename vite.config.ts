import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { existsSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";

/**
 * Statische Unterseiten aus `public/` (etwa /api-docs/) unter ihrem
 * Verzeichnispfad ausliefern. Ohne das greift Vites SPA-Fallback und
 * beantwortet /api-docs/ mit der Anwendung — in Produktion liefert Netlify
 * dort den Verzeichnisindex, die Entwicklung wiche also vom Betrieb ab.
 */
function publicDirectoryIndex(): Plugin {
  return {
    name: "evaro-public-directory-index",
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const path = req.url?.split("?")[0];
        if (path?.endsWith("/") && path !== "/") {
          const candidate = fileURLToPath(new URL(`./frontend/public${path}index.html`, import.meta.url));
          if (existsSync(candidate)) req.url = `${path}index.html`;
        }
        next();
      });
    },
  };
}

// The frontend lives in ./frontend; the backend (Netlify functions) is bundled
// separately by Netlify and is not part of this Vite build.
export default defineConfig({
  root: "frontend",
  plugins: [react(), tailwindcss(), publicDirectoryIndex()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./frontend/src", import.meta.url)),
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  server: {
    port: 5173,
  },
});
