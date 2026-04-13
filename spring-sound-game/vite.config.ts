/// <reference types="node" />
import { defineConfig } from "vite";
import basicSsl from "@vitejs/plugin-basic-ssl";

/**
 * HTTPS automatico: si attiva SOLO quando viene passato --host.
 * Questo copre esattamente il caso "devo testare su telefono in LAN"
 * senza impattare lo sviluppo normale su localhost.
 *
 * - npm run dev             → HTTP su localhost (dev su PC, zero overhead SSL)
 * - npm run dev -- --host   → HTTPS su LAN (serve per deviceorientation su iOS Safari)
 *
 * Al primo accesso da iPhone: Safari → "Mostra dettagli" → "Apri il sito web".
 */
export default defineConfig(({ command }) => {
  // --host viene passato solo quando si serve in LAN (test da telefono)
  const wantsHost = command === "serve" && process.argv.includes("--host");
  return {
    plugins: wantsHost ? [basicSsl()] : [],
  };
});
