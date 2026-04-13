import { defineConfig } from "vite";
import basicSsl from "@vitejs/plugin-basic-ssl";

/**
 * Plugin basicSsl genera un certificato self-signed in locale.
 * Necessario per DeviceOrientationEvent su iOS Safari (richiede HTTPS anche in LAN).
 *
 * Avvio con accesso da rete locale:
 *   npm run dev -- --host
 * → https://<IP-del-Mac>:5173/
 *
 * Al primo accesso da iPhone: Safari mostrerà "Certificato non attendibile" →
 * tocca "Mostra dettagli" → "Apri il sito web" → il gioco caricherà normalmente.
 */
export default defineConfig({
  plugins: [basicSsl()],
});
