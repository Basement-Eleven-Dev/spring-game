import * as Phaser from "phaser";
import { GAME, minutesToClockString } from "./GameConfig";

/**
 * Schermata di Game Over — Design Unificato
 * ==========================================
 * Layout verticale ottimizzato seguendo il pattern del menu di pausa:
 * - Logo circolare in alto
 * - 3 blocchi affiancati (Partita, Classifica, Impostazioni)
 * - Blocco blu con risultati dettagliati
 * - Bottoni azione (Ritenta, Condividi)
 */
export class GameOverScene extends Phaser.Scene {
  constructor() {
    super("GameOverScene");
  }

  preload(): void {
    // Background
    if (!this.textures.exists("menuBg")) {
      this.load.image("menuBg", "/assets/background/background menu.png");
    }

    // Logo (più grande)
    this.load.svg(
      "gameOverLogo",
      "/assets/ui/gamestart-over-pause/logo pixel.svg",
      { width: 110, height: 110 },
    );

    // Blocchi
    this.load.svg(
      "gameOverBlockBlue",
      "/assets/ui/gamestart-over-pause/blocco_blu_game_over.svg",
      { width: 300, height: 240 },
    );
    this.load.svg(
      "gameOverBlockRed",
      "/assets/ui/gamestart-over-pause/block_red.svg",
      { width: 240, height: 60 },
    );
    this.load.svg(
      "gameOverBlockWhite",
      "/assets/ui/gamestart-over-pause/block_white.svg",
      { width: 240, height: 60 },
    );

    // Icone per i 3 blocchi superiori (ancora più grandi per leggere i testi)
    this.load.svg(
      "gameOverPartita",
      "/assets/ui/gamestart-over-pause/partita.svg",
      { width: 140, height: 140 },
    );
    this.load.svg(
      "gameOverRanking",
      "/assets/ui/gamestart-over-pause/ranking.svg",
      { width: 140, height: 140 },
    );
    this.load.svg(
      "gameOverSetting",
      "/assets/ui/gamestart-over-pause/SETTING.svg",
      { width: 45, height: 45 },
    );

    // Icone
    this.load.svg(
      "gameOverCardIcon",
      "/assets/ui/gamestart-over-pause/card icon.svg",
      { width: 40, height: 40 },
    );
    this.load.svg(
      "gameOverDrinkIcon",
      "/assets/ui/gamestart-over-pause/drink icon.svg",
      { width: 40, height: 40 },
    );
    this.load.svg(
      "gameOverDayIcon",
      "/assets/ui/gamestart-over-pause/day_icon.svg",
      { width: 40, height: 40 },
    );
    this.load.svg(
      "gameOverSunsetIcon",
      "/assets/ui/gamestart-over-pause/sunset_icon.svg",
      { width: 40, height: 40 },
    );
    this.load.svg(
      "gameOverNightIcon",
      "/assets/ui/gamestart-over-pause/night_icon.svg",
      { width: 40, height: 40 },
    );
    // Points bar (se non già caricata)
    if (!this.textures.exists("pointsBar")) {
      this.load.svg("pointsBar", "/assets/ui/points_bar.svg", {
        width: 180,
        height: 30,
      });
    }
  }

  create(data: {
    score: number;
    clockMinutes: number;
    level: number;
    drinkCount: number;
    isTimeout: boolean;
  }) {
    const { score, clockMinutes, level, drinkCount, isTimeout } = data;
    const cx = GAME.WIDTH / 2;
    const cy = GAME.HEIGHT / 2;
    const S = GAME.SCALE;
    /** Shorthand: scala e arrotonda */
    const r = (v: number) => Math.round(v * S);

    // Background menu
    const bg = this.add.image(cx, cy, "menuBg");
    const scaleX = GAME.WIDTH / bg.width;
    const scaleY = GAME.HEIGHT / bg.height;
    const bgScale = Math.max(scaleX, scaleY);
    bg.setScale(bgScale).setDepth(0);

    // Overlay scuro per leggibilità
    this.add
      .rectangle(cx, cy, GAME.WIDTH, GAME.HEIGHT, 0x000000, 0.6)
      .setDepth(1);

    // Container principale
    const container = this.add.container(cx, cy).setDepth(2);

    // --- LOGO CIRCOLARE ---
    const logoCircle = this.add
      .circle(0, r(-240), r(45), 0xf8f0cd)
      .setStrokeStyle(r(3), 0x000000);
    container.add(logoCircle);

    const logo = this.add
      .image(0, r(-240), "gameOverLogo")
      .setDisplaySize(r(70), r(70));
    container.add(logo);

    // Scritta GAME OVER (più grande)
    const gameOverText = this.add
      .text(0, r(-175), "GAME OVER", {
        fontFamily: "ChillPixels",
        fontSize: `${r(28)}px`,
        color: "#F8F0CD",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    container.add(gameOverText);

    // --- 3 ICONE AFFIANCATE (senza box) ---
    const iconsY = r(-120);
    const iconSpacingTop = r(110); // Distanza maggiore per evitare collisioni

    // Icona PARTITA (sinistra) - senza opacità
    const partitaIcon = this.add
      .image(-iconSpacingTop, iconsY, "gameOverPartita")
      .setInteractive({ useHandCursor: true });
    container.add(partitaIcon);
    partitaIcon.on("pointerover", () => partitaIcon.setScale(1.05));
    partitaIcon.on("pointerout", () => partitaIcon.setScale(1));

    // Icona CLASSIFICA (centro) - senza opacità
    const classificaIcon = this.add
      .image(0, iconsY, "gameOverRanking")
      .setInteractive({ useHandCursor: true });
    container.add(classificaIcon);
    classificaIcon.on("pointerover", () => classificaIcon.setScale(1.05));
    classificaIcon.on("pointerout", () => classificaIcon.setScale(1));

    // Icona IMPOSTAZIONI (destra)
    const settingsIcon = this.add
      .image(iconSpacingTop, iconsY, "gameOverSetting")
      .setDisplaySize(r(45), r(45))
      .setInteractive({ useHandCursor: true })
      .setAlpha(0.7);
    container.add(settingsIcon);
    settingsIcon.on("pointerover", () => settingsIcon.setAlpha(1));
    settingsIcon.on("pointerout", () => settingsIcon.setAlpha(0.7));

    // --- BLOCCO BLU RISULTATI (staccato più in basso) ---
    const resultsBlockY = r(30);
    const resultsBlock = this.add
      .image(0, resultsBlockY, "gameOverBlockBlue")
      .setDisplaySize(r(300), r(240));
    container.add(resultsBlock);

    // Label "RISULTATI"
    const resultsLabel = this.add
      .text(0, resultsBlockY - r(80), "RISULTATI", {
        fontFamily: "ChillPixels",
        fontSize: `${r(16)}px`,
        color: "#F8F0CD",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    container.add(resultsLabel);

    // Points bar
    const pointsBar = this.add
      .image(0, resultsBlockY - r(50), "pointsBar")
      .setDisplaySize(r(180), r(30));
    container.add(pointsBar);

    // Punteggio
    const scoreText = this.add
      .text(0, resultsBlockY - r(50), `${Math.floor(score)}`, {
        fontFamily: "ChillPixels",
        fontSize: `${r(18)}px`,
        color: "#000000",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    container.add(scoreText);

    // Testo descrittivo
    const clockStr = minutesToClockString(clockMinutes);
    const descText = this.add
      .text(
        0,
        resultsBlockY - r(15),
        `Hai resistito fino alle ${clockStr}\nbevendo ${drinkCount} drink`,
        {
          fontFamily: "ChillPixels",
          fontSize: `${r(11)}px`,
          color: "#FFFFFF",
          align: "center",
        },
      )
      .setOrigin(0.5);
    container.add(descText);

    // Icone + valori (affiancate: card, drink, tempo)
    const iconY = resultsBlockY + r(40);
    const iconSpacing = r(55);

    // Icona CARD (sinistra)
    const timeIcon = this.getTimeIcon(clockMinutes);
    const cardIcon = this.add
      .image(-iconSpacing * 1.5, iconY, "gameOverCardIcon")
      .setDisplaySize(r(35), r(35));
    container.add(cardIcon);

    const cardValue = this.add
      .text(-iconSpacing * 1.5, iconY + r(25), "0/5", {
        fontFamily: "ChillPixels",
        fontSize: `${r(14)}px`,
        color: "#000000",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    container.add(cardValue);

    // Icona DRINK (centro)
    const drinkIcon = this.add
      .image(0, iconY, "gameOverDrinkIcon")
      .setDisplaySize(r(35), r(35));
    container.add(drinkIcon);

    const drinkValue = this.add
      .text(0, iconY + r(25), `${drinkCount}`, {
        fontFamily: "ChillPixels",
        fontSize: `${r(14)}px`,
        color: "#000000",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    container.add(drinkValue);

    // Icona TEMPO (destra)
    const clockIcon = this.add
      .image(iconSpacing * 1.5, iconY, timeIcon)
      .setDisplaySize(r(35), r(35));
    container.add(clockIcon);

    const clockValue = this.add
      .text(iconSpacing * 1.5, iconY + r(25), clockStr, {
        fontFamily: "ChillPixels",
        fontSize: `${r(14)}px`,
        color: "#000000",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    container.add(clockValue);

    // --- BOTTONI AZIONE (in colonna) ---
    const retryBtnY = r(180);
    const shareBtnY = r(235);

    // Bottone RITENTA (blu grande come RIPRENDI)
    const retryBtn = this.createActionButton(
      0,
      retryBtnY,
      "RITENTA",
      "gameOverBlockBlue",
      r(240),
      r(60),
      r(18),
      "#FFFFFF",
      () => {
        this.cameras.main.fadeOut(300, 0, 0, 0);
        this.cameras.main.once("camerafadeoutcomplete", () => {
          this.scene.start("GameScene");
        });
      },
    );
    container.add(retryBtn);

    // Bottone CONDIVIDI (giallo piccolino)
    const shareBtn = this.createActionButton(
      0,
      shareBtnY,
      "CONDIVIDI",
      null, // Nessun blocco SVG, creiamo un rettangolo giallo
      r(160),
      r(45),
      r(13),
      "#000000",
      () => {
        console.log("Condividi risultati (TODO)");
        // TODO: Implementare condivisione
      },
    );
    container.add(shareBtn);
  }

  /**
   * Crea un bottone azione (Ritenta, Condividi).
   */
  private createActionButton(
    x: number,
    y: number,
    label: string,
    blockTexture: string | null,
    width: number,
    height: number,
    fontSize: number,
    textColor: string,
    callback: () => void,
  ): Phaser.GameObjects.Container {
    const button = this.add.container(x, y);

    // Blocco (SVG o rettangolo giallo per condividi)
    // Le dimensioni arrivano già scalate, non ri-scalare!
    let bg: Phaser.GameObjects.Image | Phaser.GameObjects.Rectangle;
    if (blockTexture) {
      bg = this.add
        .image(0, 0, blockTexture)
        .setDisplaySize(width, height)
        .setInteractive({ useHandCursor: true });
    } else {
      // Rettangolo giallo per CONDIVIDI
      bg = this.add
        .rectangle(0, 0, width, height, 0xffd700)
        .setStrokeStyle(2, 0x000000)
        .setInteractive({ useHandCursor: true });
    }
    button.add(bg);

    // Testo
    const text = this.add
      .text(0, 0, label, {
        fontFamily: "ChillPixels",
        fontSize: `${fontSize}px`,
        color: textColor,
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    button.add(text);

    // Hover
    bg.on("pointerover", () => {
      bg.setScale(1.05);
      text.setScale(1.05);
    });
    bg.on("pointerout", () => {
      bg.setScale(1);
      text.setScale(1);
    });

    // Click
    bg.on("pointerdown", callback);

    return button;
  }

  /**
   * Determina l'icona tempo da mostrare in base ai minuti narrativi.
   */
  private getTimeIcon(clockMinutes: number): string {
    if (clockMinutes < 300) return "gameOverDayIcon"; // 14:00-19:00
    if (clockMinutes < 540) return "gameOverSunsetIcon"; // 19:00-23:00
    return "gameOverNightIcon"; // 23:00+
  }
}
