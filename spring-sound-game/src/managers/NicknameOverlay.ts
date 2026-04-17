/**
 * NicknameOverlay
 * ===============
 * Overlay HTML pixel-style per la scelta del nickname.
 * Non dipende da Phaser — si inietta nel DOM sopra il canvas.
 *
 * Uso:
 *   const nick = await NicknameOverlay.show(checker);
 *   // nick è null se l'utente ha saltato
 */
export class NicknameOverlay {
  /**
   * Mostra il modale e risolve con il nickname scelto (uppercase, max 10 chars)
   * oppure null se l'utente ha saltato.
   *
   * @param checkAvailability  funzione async: true = nick libero, false = già usato
   */
  public static show(
    checkAvailability: (nick: string) => Promise<boolean>,
  ): Promise<string | null> {
    return new Promise((resolve) => {
      /* ── Overlay backdrop ─────────────────────────────────────────────── */
      const overlay = document.createElement("div");
      overlay.style.cssText = `
        position: fixed; inset: 0;
        background: rgba(0,0,0,0.72);
        display: flex; align-items: center; justify-content: center;
        z-index: 9999;
        font-family: 'ChillPixels', monospace;
      `;

      /* ── Card ─────────────────────────────────────────────────────────── */
      overlay.innerHTML = `
        <div id="nn-card" style="
          background: #F8F0CD;
          border: 4px solid #000;
          box-shadow: 6px 6px 0 #000;
          padding: 28px 24px 20px;
          text-align: center;
          width: min(320px, 88vw);
          box-sizing: border-box;
        ">
          <div style="
            font-size: 22px; font-weight: bold; color: #000;
            letter-spacing: 2px; margin-bottom: 4px;
          ">🏆 NUOVO RECORD!</div>

          <div style="
            font-size: 11px; color: #555;
            letter-spacing: 1px; margin-bottom: 20px; line-height: 1.5;
          ">Scegli il tuo nickname<br>per la classifica globale</div>

          <input id="nn-input" type="text" maxlength="10"
            autocomplete="off" autocorrect="off" autocapitalize="characters"
            spellcheck="false" placeholder="MAX 10 CARATTERI"
            style="
              width: 100%; box-sizing: border-box;
              padding: 10px 12px;
              font-family: 'ChillPixels', monospace;
              font-size: 18px; text-align: center;
              text-transform: uppercase; letter-spacing: 3px;
              border: 3px solid #000; background: #fff; color: #000;
              outline: none;
            "
          />

          <div id="nn-error" style="
            min-height: 18px; margin: 8px 0 0;
            font-size: 11px; color: #cc0000;
            letter-spacing: 1px;
          "></div>

          <button id="nn-confirm" style="
            margin-top: 12px; width: 100%; padding: 12px;
            font-family: 'ChillPixels', monospace;
            font-size: 15px; font-weight: bold; letter-spacing: 2px;
            background: #408CF4; color: #000;
            border: 3px solid #000;
            box-shadow: 3px 3px 0 #000;
            cursor: pointer;
          ">CONFERMA</button>

          <button id="nn-skip" style="
            margin-top: 10px; width: 100%; padding: 8px;
            font-family: 'ChillPixels', monospace;
            font-size: 10px; letter-spacing: 1px;
            background: transparent; color: #888;
            border: 2px solid #ccc; cursor: pointer;
          ">SALTA — non salvare in classifica</button>
        </div>
      `;

      document.body.appendChild(overlay);

      const input = overlay.querySelector<HTMLInputElement>("#nn-input")!;
      const errorEl = overlay.querySelector<HTMLElement>("#nn-error")!;
      const confirmBtn =
        overlay.querySelector<HTMLButtonElement>("#nn-confirm")!;
      const skipBtn = overlay.querySelector<HTMLButtonElement>("#nn-skip")!;

      /* ── Helper: hover effect su pulsanti ──────────────────────────────── */
      const addHover = (
        btn: HTMLButtonElement,
        onColor: string,
        offColor: string,
      ) => {
        btn.addEventListener("mouseenter", () => {
          btn.style.transform = "translate(-1px, -1px)";
          btn.style.boxShadow = "4px 4px 0 #000";
          btn.style.background = onColor;
        });
        btn.addEventListener("mouseleave", () => {
          btn.style.transform = "";
          btn.style.boxShadow = "3px 3px 0 #000";
          btn.style.background = offColor;
        });
      };
      addHover(confirmBtn, "#5ea0ff", "#408CF4");

      /* ── Auto-uppercase mentre si digita ───────────────────────────────── */
      input.addEventListener("input", () => {
        const pos = input.selectionStart ?? input.value.length;
        input.value = input.value.toUpperCase();
        input.setSelectionRange(pos, pos);
      });

      /* ── Invio con tasto Enter ─────────────────────────────────────────── */
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") confirmBtn.click();
      });

      input.focus();

      /* ── Cleanup ───────────────────────────────────────────────────────── */
      const cleanup = () => overlay.remove();

      /* ── Salta ─────────────────────────────────────────────────────────── */
      skipBtn.addEventListener("click", () => {
        cleanup();
        resolve(null);
      });

      /* ── Conferma ──────────────────────────────────────────────────────── */
      confirmBtn.addEventListener("click", async () => {
        const nick = input.value.trim().toUpperCase();

        if (nick.length < 2) {
          errorEl.textContent = "MINIMO 2 CARATTERI!";
          input.focus();
          return;
        }

        // Stato caricamento
        confirmBtn.textContent = "VERIFICA...";
        confirmBtn.disabled = true;
        errorEl.textContent = "";

        const available = await checkAvailability(nick);

        if (!available) {
          errorEl.textContent = "NICKNAME GIÀ IN USO — SCEGLINE UN ALTRO.";
          confirmBtn.textContent = "CONFERMA";
          confirmBtn.disabled = false;
          input.select();
          return;
        }

        cleanup();
        resolve(nick);
      });
    });
  }
}
