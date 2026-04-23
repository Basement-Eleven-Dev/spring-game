import * as Phaser from "phaser";
import { GAME, minutesToClockString } from "./GameConfig";
import { LeaderboardManager } from "./managers/LeaderboardManager";
import { NicknameOverlay } from "./managers/NicknameOverlay";

/**
 * Schermata di Game Over — Design Reference Faithful
 * ===================================================
 * Layout:
 * - Logo circolare Spring Sound
 * - Titolo "GAME OVER"
 * - 3 tab (Partita [composito SVG], Classifica [composito SVG], Impostazioni [gear])
 * - Blocco blu risultati con carosello (RISULTATI ↔ ACHIEVEMENT)
 * - Frecce gialle left/right per navigare il carosello
 * - Bottone RITENTA (blocco blu + play icon + testo)
 * - Bottone CONDIVIDI (giallo piccolo)
 */
export class GameOverScene extends Phaser.Scene {
  private currentPage = 0;
  private pages: Phaser.GameObjects.Container[] = [];
  private partitaView!: Phaser.GameObjects.Container;
  private classificaView!: Phaser.GameObjects.Container;
  private scoresContainer!: Phaser.GameObjects.Container;
  private loadingText!: Phaser.GameObjects.Text;
  private partitaTab!: Phaser.GameObjects.Container;
  private classificaTab!: Phaser.GameObjects.Container;
  private scrollMaskGfx?: Phaser.GameObjects.Graphics;
  private _leaderScrollY = 0;
  private _leaderMaxScroll = 0;
  private _leaderBaseY = 0;
  private _leaderDragStartY = 0;
  private _leaderDragStartScroll = 0;

  constructor() {
    super("GameOverScene");
  }

  preload(): void {
    // Background
    if (!this.textures.exists("menuBg")) {
      this.load.image("menuBg", "/assets/background/background menu.png");
    }

    // Logo
    if (!this.textures.exists("gameOverLogo")) {
      this.load.svg(
        "gameOverLogo",
        "/assets/ui/gamestart-over-pause/logo pixel.svg",
        { width: 1100, height: 1100 },
      );
    }

    // Blocco blu risultati (grande, quadratone)
    if (!this.textures.exists("gameOverBlockBlueBig")) {
      this.load.svg(
        "gameOverBlockBlueBig",
        "/assets/ui/gamestart-over-pause/blocco_blu_game_over.svg",
        { width: 400, height: 390 },
      );
    }

    // Tab compositi (icona + blocco colorato baked-in, senza testo)
    // partita.svg: mascot icon + blocco blu (#408cf4)
    if (!this.textures.exists("gameOverPartita")) {
      this.load.svg(
        "gameOverPartita",
        "/assets/ui/gamestart-over-pause/partita.svg",
        { width: 200, height: 120 },
      );
    }
    // ranking.svg: star icon + blocco gold (#f7c831)
    if (!this.textures.exists("gameOverRanking")) {
      this.load.svg(
        "gameOverRanking",
        "/assets/ui/gamestart-over-pause/ranking.svg",
        { width: 200, height: 120 },
      );
    }

    // Icona impostazioni (ingranaggio)
    if (!this.textures.exists("gameOverSetting")) {
      this.load.svg(
        "gameOverSetting",
        "/assets/ui/gamestart-over-pause/SETTING.svg",
        { width: 60, height: 60 },
      );
    }

    // Frecce navigazione carosello
    if (!this.textures.exists("gameOverLeft")) {
      this.load.svg(
        "gameOverLeft",
        "/assets/ui/gamestart-over-pause/left.svg",
        { width: 40, height: 40 },
      );
    }
    if (!this.textures.exists("gameOverRight")) {
      this.load.svg(
        "gameOverRight",
        "/assets/ui/gamestart-over-pause/right.svg",
        { width: 40, height: 40 },
      );
    }

    // Play icon (cerchio giallo con triangolo) per bottone RITENTA
    if (!this.textures.exists("gameOverPlay")) {
      this.load.svg("gameOverPlay", "/assets/ui/play.svg", {
        width: 60,
        height: 60,
      });
    }

    // Blocco blu per bottone RITENTA
    if (!this.textures.exists("gameOverBtnBlue")) {
      this.load.svg(
        "gameOverBtnBlue",
        "/assets/ui/gamestart-over-pause/block_blue.svg",
        { width: 320, height: 100 },
      );
    }

    // Icone statistiche
    if (!this.textures.exists("gameOverCardIcon")) {
      this.load.svg(
        "gameOverCardIcon",
        "/assets/ui/gamestart-over-pause/card icon.svg",
        { width: 50, height: 50 },
      );
    }
    if (!this.textures.exists("gameOverDrinkIcon")) {
      this.load.svg(
        "gameOverDrinkIcon",
        "/assets/ui/gamestart-over-pause/drink icon.svg",
        { width: 50, height: 50 },
      );
    }
    if (!this.textures.exists("gameOverDayIcon")) {
      this.load.svg(
        "gameOverDayIcon",
        "/assets/ui/gamestart-over-pause/day_icon.svg",
        { width: 50, height: 50 },
      );
    }
    if (!this.textures.exists("gameOverSunsetIcon")) {
      this.load.svg(
        "gameOverSunsetIcon",
        "/assets/ui/gamestart-over-pause/sunset_icon.svg",
        { width: 50, height: 50 },
      );
    }
    if (!this.textures.exists("gameOverNightIcon")) {
      this.load.svg(
        "gameOverNightIcon",
        "/assets/ui/gamestart-over-pause/night_icon.svg",
        { width: 50, height: 50 },
      );
    }

    // Points bar (barra punteggio crema)
    if (!this.textures.exists("pointsBar")) {
      this.load.svg("pointsBar", "/assets/ui/points_bar.svg", {
        width: 240,
        height: 50,
      });
    }

    // DJ achievement cards (portrait 1080×1550) + relative sagome placeholder
    for (let i = 1; i <= 5; i++) {
      if (!this.textures.exists(`dj${i}`)) {
        this.load.svg(`dj${i}`, `/assets/djSprite/${i}.svg`, {
          width: 180,
          height: 258,
        });
      }
      if (!this.textures.exists(`dj${i}ph`)) {
        this.load.svg(`dj${i}ph`, `/assets/djSprite/${i}ph.svg`, {
          width: 180,
          height: 258,
        });
      }
    }
  }

  create(data: {
    score: number;
    clockMinutes: number;
    level: number;
    drinkCount: number;
    cardsCollected: number;
    djAssignments: number[];
    isTimeout: boolean;
  }) {
    const {
      score,
      clockMinutes,
      level,
      drinkCount,
      cardsCollected = 0,
      djAssignments = [1, 2, 3, 4, 5],
      isTimeout: _isTimeout,
    } = data;
    const isTimeout = _isTimeout;
    const cx = GAME.WIDTH / 2;
    const cy = GAME.HEIGHT / 2;
    const S = GAME.SCALE;
    /** Shorthand: scala e arrotonda */
    const r = (v: number) => Math.round(v * S);

    // Reset stato carosello
    this.currentPage = 0;
    this.pages = [];

    // ========== BACKGROUND ==========
    const bg = this.add.image(cx, cy, "menuBg");
    bg.setScale(
      Math.max(GAME.WIDTH / bg.width, GAME.HEIGHT / bg.height),
    ).setDepth(0);

    // Overlay scuro per leggibilità
    this.add
      .rectangle(cx, cy, GAME.WIDTH, GAME.HEIGHT, 0x000000, 0.65)
      .setDepth(1);

    // Container principale (centrato sullo schermo)
    const container = this.add.container(cx, cy).setDepth(2);

    // ========== LOGO CIRCOLARE ==========
    const logoY = r(-260);

    container.add(
      this.add.circle(0, logoY, r(42), 0xf8f0cd).setStrokeStyle(r(3), 0x000000),
    );
    container.add(
      this.add.image(0, logoY, "gameOverLogo").setDisplaySize(r(65), r(65)),
    );

    // ========== TITOLO ==========
    container.add(
      this.add
        .text(0, r(-195), isTimeout ? "SERATA EPICA!" : "GAME OVER", {
          fontFamily: "ChillPixels",
          fontSize: `${r(30)}px`,
          color: isTimeout ? "#FFD700" : "#F8F0CD",
          fontStyle: "bold",
        })
        .setOrigin(0.5),
    );

    // Sottotitolo contestuale
    container.add(
      this.add
        .text(
          0,
          r(-165),
          isTimeout
            ? "hai ballato fino all'ultima nota"
            : clockMinutes >= 540
              ? "quasi fino alla fine..."
              : clockMinutes >= 180
                ? "la notte era ancora giovane"
                : "uscito troppo presto!",
          {
            fontFamily: "ChillPixels",
            fontSize: `${r(9)}px`,
            color: "#B0C8FF",
          },
        )
        .setOrigin(0.5),
    );

    // ========== TAB BUTTONS ==========
    // Tab ben spaziati e centrati orizzontalmente
    const tabY = r(-130);

    // --- Tab PARTITA (composito SVG: mascot + blue block) ---
    this.partitaTab = this.add.container(-r(80), tabY);
    const partitaTab = this.partitaTab;
    const partitaImg = this.add
      .image(0, 0, "gameOverPartita")
      .setDisplaySize(r(90), r(50));
    const partitaLabel = this.add
      .text(0, r(12), "PARTITA", {
        fontFamily: "ChillPixels",
        fontSize: `${r(8)}px`,
        color: "#000000",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    partitaTab.add([partitaImg, partitaLabel]);
    const partitaHit = this.add
      .rectangle(0, 0, r(100), r(60), 0x000000, 0)
      .setInteractive({ useHandCursor: true });
    partitaTab.add(partitaHit);
    partitaHit.on("pointerover", () => partitaTab.setScale(1.05));
    partitaHit.on("pointerout", () => partitaTab.setScale(1));
    partitaHit.on("pointerdown", () => this.switchView("partita"));
    container.add(partitaTab);

    // --- Tab CLASSIFICA (composito SVG: star + gold block) ---
    this.classificaTab = this.add.container(r(25), tabY);
    const classificaTab = this.classificaTab;
    const classificaImg = this.add
      .image(0, 0, "gameOverRanking")
      .setDisplaySize(r(90), r(50));
    const classificaLabel = this.add
      .text(0, r(12), "CLASSIFICA", {
        fontFamily: "ChillPixels",
        fontSize: `${r(7)}px`,
        color: "#000000",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    classificaTab.add([classificaImg, classificaLabel]);
    const classificaHit = this.add
      .rectangle(0, 0, r(105), r(60), 0x000000, 0)
      .setInteractive({ useHandCursor: true });
    classificaTab.add(classificaHit);
    classificaHit.on("pointerover", () => classificaTab.setScale(1.05));
    classificaHit.on("pointerout", () => classificaTab.setScale(1));
    classificaHit.on("pointerdown", () => this.switchView("classifica"));
    container.add(classificaTab);

    // --- Settings gear (a destra, ben spaziato) ---
    const settingsIcon = this.add
      .image(r(115), tabY, "gameOverSetting")
      .setDisplaySize(r(30), r(30))
      .setInteractive({ useHandCursor: true })
      .setAlpha(0.8);
    settingsIcon.on("pointerover", () => settingsIcon.setAlpha(1));
    settingsIcon.on("pointerout", () => settingsIcon.setAlpha(0.8));
    settingsIcon.on("pointerdown", () => this.openNicknameChange());
    container.add(settingsIcon);

    // ========== BLOCCO BLU RISULTATI (sfondo fisso) ==========
    const resultsY = r(20);
    container.add(
      this.add
        .image(0, resultsY, "gameOverBlockBlueBig")
        .setDisplaySize(r(300), r(250)),
    );

    // ========== PARTITA VIEW (carosello: RISULTATI ↔ ACHIEVEMENT) ==========
    this.partitaView = this.add.container(0, 0);

    // --- Pagina 0: RISULTATI ---
    const page0 = this.add.container(0, 0);

    page0.add(
      this.add
        .text(0, resultsY - r(100), "RISULTATI", {
          fontFamily: "ChillPixels",
          fontSize: `${r(16)}px`,
          color: "#000000",
          fontStyle: "bold",
        })
        .setOrigin(0.5),
    );

    const scoreBarY = resultsY - r(60);
    page0.add(
      this.add.image(0, scoreBarY, "pointsBar").setDisplaySize(r(200), r(38)),
    );
    page0.add(
      this.add
        .text(0, scoreBarY, this.formatScore(Math.floor(score)), {
          fontFamily: "ChillPixels",
          fontSize: `${r(20)}px`,
          color: "#000000",
          fontStyle: "bold",
        })
        .setOrigin(0.5),
    );

    const clockStr = minutesToClockString(clockMinutes);
    const descText = isTimeout
      ? `Sei rimasto in pista\nfino alle 02:00!\n${drinkCount} drink per la gloria.`
      : clockMinutes >= 540
        ? `Ci sei quasi!\nHai tenuto duro\nfino alle ${clockStr} bevendo ${drinkCount} drink.`
        : clockMinutes >= 180
          ? `Bella resistenza!\nHai ballato\nfino alle ${clockStr} bevendo ${drinkCount} drink.`
          : `La serata era appena iniziata...\nsolo ${drinkCount} drink e poi niente.`;
    page0.add(
      this.add
        .text(0, resultsY - r(15), descText, {
          fontFamily: "ChillPixels",
          fontSize: `${r(10)}px`,
          color: "#F7F0D0",
          align: "center",
        })
        .setOrigin(0.5),
    );

    const iconY = resultsY + r(40);
    const iconSpacing = r(70);

    page0.add(
      this.add
        .image(-iconSpacing, iconY, "gameOverCardIcon")
        .setDisplaySize(r(35), r(35)),
    );
    page0.add(
      this.add
        .text(-iconSpacing, iconY + r(28), `${cardsCollected}/5`, {
          fontFamily: "ChillPixels",
          fontSize: `${r(14)}px`,
          color: "#000000",
          fontStyle: "bold",
        })
        .setOrigin(0.5),
    );

    page0.add(
      this.add
        .image(0, iconY, "gameOverDrinkIcon")
        .setDisplaySize(r(35), r(35)),
    );
    page0.add(
      this.add
        .text(0, iconY + r(28), `${drinkCount}`, {
          fontFamily: "ChillPixels",
          fontSize: `${r(14)}px`,
          color: "#000000",
          fontStyle: "bold",
        })
        .setOrigin(0.5),
    );

    page0.add(
      this.add
        .image(iconSpacing, iconY, this.getTimeIcon(clockMinutes))
        .setDisplaySize(r(35), r(35)),
    );
    page0.add(
      this.add
        .text(iconSpacing, iconY + r(28), clockStr, {
          fontFamily: "ChillPixels",
          fontSize: `${r(14)}px`,
          color: "#000000",
          fontStyle: "bold",
        })
        .setOrigin(0.5),
    );

    this.partitaView.add(page0);
    this.pages.push(page0);

    // --- Pagina 1: ACHIEVEMENT ---
    const page1 = this.add.container(0, 0);
    page1.setVisible(false);

    page1.add(
      this.add
        .text(0, resultsY - r(100), "ACHIEVEMENT", {
          fontFamily: "ChillPixels",
          fontSize: `${r(16)}px`,
          color: "#000000",
          fontStyle: "bold",
        })
        .setOrigin(0.5),
    );

    // 5 carte DJ: 3 in fila sopra, 2 centrate sotto
    const cardW = r(56);
    const cardH = r(80);
    const colSpacing = r(64);
    const rowSpacing = r(88);
    const topRowY = resultsY - r(35);
    const botRowY = topRowY + rowSpacing;

    // Posizioni: top row centrata su 3, bottom row centrata su 2
    const positions: { x: number; y: number }[] = [
      { x: -colSpacing, y: topRowY },
      { x: 0, y: topRowY },
      { x: colSpacing, y: topRowY },
      { x: -colSpacing / 2, y: botRowY },
      { x: colSpacing / 2, y: botRowY },
    ];

    positions.forEach(({ x, y }, i) => {
      const djIndex = djAssignments[i] ?? i + 1;
      const isUnlocked = i < cardsCollected;
      const textureKey = isUnlocked ? `dj${djIndex}` : `dj${djIndex}ph`;

      const djImg = this.add
        .image(x, y, textureKey)
        .setDisplaySize(cardW, cardH)
        .setInteractive({ useHandCursor: true });

      // Hover: scala mantenendo le dimensioni originali (no setScale che impatta displaySize)
      djImg.on("pointerover", () =>
        djImg.setDisplaySize(cardW * 1.12, cardH * 1.12),
      );
      djImg.on("pointerout", () => djImg.setDisplaySize(cardW, cardH));
      djImg.on("pointerdown", () => {
        djImg.setDisplaySize(cardW, cardH);
        this.showDjZoom(djIndex, isUnlocked);
      });

      page1.add(djImg);
    });

    // Banner se tutte e 5 sbloccate
    if (cardsCollected >= 5) {
      page1.add(
        this.add
          .text(0, resultsY + r(100), "+10.000 DJ SET COMPLETO!", {
            fontFamily: "ChillPixels",
            fontSize: `${r(9)}px`,
            color: "#408CF4",
            fontStyle: "bold",
          })
          .setOrigin(0.5),
      );
    }

    this.partitaView.add(page1);
    this.pages.push(page1);

    // Frecce carosello (dentro partitaView)
    const arrowY = resultsY - r(15);
    const arrowOffsetX = r(165);

    const leftArrow = this.add
      .image(-arrowOffsetX, arrowY, "gameOverLeft")
      .setDisplaySize(r(18), r(24))
      .setInteractive({ useHandCursor: true });
    leftArrow.on("pointerover", () => leftArrow.setScale(1.15));
    leftArrow.on("pointerout", () => leftArrow.setScale(1));
    leftArrow.on("pointerdown", () => this.prevPage());
    this.partitaView.add(leftArrow);

    const rightArrow = this.add
      .image(arrowOffsetX, arrowY, "gameOverRight")
      .setDisplaySize(r(18), r(24))
      .setInteractive({ useHandCursor: true });
    rightArrow.on("pointerover", () => rightArrow.setScale(1.15));
    rightArrow.on("pointerout", () => rightArrow.setScale(1));
    rightArrow.on("pointerdown", () => this.nextPage());
    this.partitaView.add(rightArrow);

    container.add(this.partitaView);

    // ========== CLASSIFICA VIEW (ranking / leaderboard) ==========
    this.classificaView = this.add.container(0, 0);
    this.classificaView.setVisible(false);

    this.classificaView.add(
      this.add
        .text(0, resultsY - r(100), "CLASSIFICA TOP 20", {
          fontFamily: "ChillPixels",
          fontSize: `${r(16)}px`,
          color: "#000000",
          fontStyle: "bold",
        })
        .setOrigin(0.5),
    );

    this.loadingText = this.add
      .text(0, resultsY, "Caricamento...", {
        fontFamily: "ChillPixels",
        fontSize: `${r(14)}px`,
        color: "#000000",
      })
      .setOrigin(0.5);
    this.classificaView.add(this.loadingText);

    this.scoresContainer = this.add.container(0, resultsY - r(60));
    this.classificaView.add(this.scoresContainer);

    container.add(this.classificaView);

    // ========== SALVATAGGIO PUNTEGGIO + NICKNAME ==========
    const finalScore = Math.floor(score);
    if (finalScore > 0) {
      const nickname = localStorage.getItem("spring_nickname");
      if (!nickname) {
        // Piccolo delay: lascia che la scena finisca il fade-in prima di mostrare l'overlay
        setTimeout(async () => {
          const chosen = await NicknameOverlay.show((nick) =>
            LeaderboardManager.isNicknameAvailable(nick),
          );
          if (chosen) {
            localStorage.setItem("spring_nickname", chosen);
            LeaderboardManager.submitScore(chosen, finalScore, level);
          }
        }, 600);
      } else {
        // Nickname già salvato sul dispositivo — aggiorna solo se batte il record
        LeaderboardManager.submitScore(nickname, finalScore, level);
      }
    }

    // ========== BOTTONE RITENTA (blocco blu + play icon + testo) ==========
    const retryY = r(190);
    const retryContainer = this.add.container(0, retryY);

    const retryBg = this.add
      .image(0, 0, "gameOverBtnBlue")
      .setDisplaySize(r(230), r(50));
    retryContainer.add(retryBg);

    const playIcon = this.add
      .image(-r(55), 0, "gameOverPlay")
      .setDisplaySize(r(30), r(30));
    retryContainer.add(playIcon);

    const retryText = this.add
      .text(r(15), 0, "RITENTA", {
        fontFamily: "ChillPixels",
        fontSize: `${r(16)}px`,
        color: "#000000",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    retryContainer.add(retryText);

    // Hit area per il bottone intero
    const retryHit = this.add
      .rectangle(0, 0, r(230), r(50), 0x000000, 0)
      .setInteractive({ useHandCursor: true });
    retryContainer.add(retryHit);

    retryHit.on("pointerover", () => retryContainer.setScale(1.05));
    retryHit.on("pointerout", () => retryContainer.setScale(1));
    retryHit.on("pointerdown", () => {
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.cameras.main.once("camerafadeoutcomplete", () => {
        this.scene.start("GameScene");
      });
    });

    container.add(retryContainer);

    // ========== BOTTONE CONDIVIDI (giallo piccolo) ==========
    const shareY = r(243);
    const shareContainer = this.add.container(0, shareY);

    const shareBg = this.add
      .rectangle(0, 0, r(130), r(30), 0xffd700)
      .setStrokeStyle(r(2), 0x000000);
    shareContainer.add(shareBg);

    const shareText = this.add
      .text(0, 0, "CONDIVIDI", {
        fontFamily: "ChillPixels",
        fontSize: `${r(10)}px`,
        color: "#000000",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    shareContainer.add(shareText);

    const shareHit = this.add
      .rectangle(0, 0, r(130), r(30), 0x000000, 0)
      .setInteractive({ useHandCursor: true });
    shareContainer.add(shareHit);

    shareHit.on("pointerover", () => shareContainer.setScale(1.05));
    shareHit.on("pointerout", () => shareContainer.setScale(1));
    shareHit.on("pointerdown", () => {
      this.game.renderer.snapshot(async (image) => {
        try {
          const img = image as HTMLImageElement;
          const response = await fetch(img.src);
          const blob = await response.blob();
          const file = new File([blob], "spring-sound-score.png", {
            type: "image/png",
          });

          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
              files: [file],
              title: "Spring Sound Game",
              text: `Ho fatto ${this.formatScore(Math.floor(score))} punti su Spring Sound! 🎵`,
            });
          } else {
            // Fallback: download diretto
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "spring-sound-score.png";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }
        } catch (e) {
          if ((e as Error).name !== "AbortError") {
            console.error("Errore condivisione:", e);
          }
        }
      });
    });

    container.add(shareContainer);

    // ========== ANIMAZIONE ENTRATA ==========
    container.setAlpha(0);
    this.tweens.add({
      targets: container,
      alpha: 1,
      duration: 500,
      ease: "Power2",
    });
  }

  // ==================== VIEW SWITCHING ====================

  /**
   * Cambia tra vista PARTITA (carosello) e vista CLASSIFICA (ranking).
   * Quando si apre la classifica, fetcha i punteggi da Firestore.
   */
  private async switchView(view: "partita" | "classifica"): Promise<void> {
    if (view === "partita") {
      this.classificaView.setVisible(false);
      this.partitaView.setVisible(true);
      this.partitaTab.setAlpha(1);
      this.classificaTab.setAlpha(0.5);
      // Rimuovi maschera e listener scroll
      this.input.off("wheel", this._onLeaderWheel, this);
      this.input.off("pointerdown", this._onLeaderDragStart, this);
      this.input.off("pointermove", this._onLeaderDrag, this);
      this.scoresContainer.clearMask(false);
      this.scrollMaskGfx?.destroy();
      this.scrollMaskGfx = undefined;
    } else {
      this.partitaView.setVisible(false);
      this.classificaView.setVisible(true);
      this.classificaTab.setAlpha(1);
      this.partitaTab.setAlpha(0.5);

      // Ripristina stato di caricamento ad ogni apertura della tab
      this.loadingText.setText("Caricamento...").setVisible(true);
      this.scoresContainer.removeAll(true);

      try {
        const topScores = await LeaderboardManager.getTopScores();

        this.loadingText.setVisible(false);

        const S = GAME.SCALE;
        const r = (v: number) => Math.round(v * S);
        let startY = 0;
        const playerNickname = localStorage.getItem("spring_nickname");

        topScores.forEach((entry, index) => {
          const isPlayer =
            playerNickname !== null && entry.nickname === playerNickname;

          if (isPlayer) {
            const highlight = this.add
              .rectangle(0, startY, r(260), r(26), 0xf7c831, 0.55)
              .setStrokeStyle(r(1.5), 0xe6a800)
              .setOrigin(0.5, 0.5);
            this.scoresContainer.add(highlight);
          }

          const rankText = this.add
            .text(-r(120), startY, `${index + 1}. ${entry.nickname}`, {
              fontFamily: "ChillPixels",
              fontSize: `${r(12)}px`,
              color: isPlayer ? "#7a4800" : "#000000",
              fontStyle: "bold",
            })
            .setOrigin(0, 0.5);

          const scoreText = this.add
            .text(r(120), startY, this.formatScore(entry.score), {
              fontFamily: "ChillPixels",
              fontSize: `${r(12)}px`,
              color: isPlayer ? "#7a4800" : "#000000",
              fontStyle: isPlayer ? "bold" : "normal",
            })
            .setOrigin(1, 0.5);

          this.scoresContainer.add([rankText, scoreText]);
          startY += r(28);
        });

        if (topScores.length === 0) {
          this.loadingText.setText("Nessun punteggio ancora!").setVisible(true);
        }

        // ===== SCROLL =====
        const cx = GAME.WIDTH / 2;
        const cy = GAME.HEIGHT / 2;
        const resultsY = r(20);
        const visibleHeight = r(175);
        const maskWorldX = cx - r(130);
        const maskWorldY = cy + (resultsY - r(60)) - r(10);

        this.scrollMaskGfx?.destroy();
        this.scrollMaskGfx = this.add.graphics();
        this.scrollMaskGfx.fillRect(
          maskWorldX,
          maskWorldY,
          r(260),
          visibleHeight,
        );
        this.scoresContainer.setMask(this.scrollMaskGfx.createGeometryMask());

        this._leaderBaseY = resultsY - r(60);
        this._leaderScrollY = 0;
        this._leaderMaxScroll = Math.max(
          0,
          topScores.length * r(28) - visibleHeight + r(28),
        );
        this.scoresContainer.y = this._leaderBaseY;

        this.input.off("wheel", this._onLeaderWheel, this);
        this.input.off("pointerdown", this._onLeaderDragStart, this);
        this.input.off("pointermove", this._onLeaderDrag, this);
        this.input.on("wheel", this._onLeaderWheel, this);
        this.input.on("pointerdown", this._onLeaderDragStart, this);
        this.input.on("pointermove", this._onLeaderDrag, this);
      } catch (e) {
        console.error("Errore caricamento classifica:", e);
        this.loadingText.setText("Errore connessione");
      }
    }
  }

  // ==================== CAROSELLO ====================

  /**
   * Mostra la pagina del carosello con transizione fade.
   */
  private showPage(index: number): void {
    if (index < 0 || index >= this.pages.length || index === this.currentPage) {
      return;
    }

    const oldPage = this.pages[this.currentPage];
    const newPage = this.pages[index];

    this.tweens.add({
      targets: oldPage,
      alpha: 0,
      duration: 150,
      onComplete: () => {
        oldPage.setVisible(false);
        oldPage.setAlpha(1);

        newPage.setAlpha(0);
        newPage.setVisible(true);
        this.tweens.add({
          targets: newPage,
          alpha: 1,
          duration: 150,
        });
      },
    });

    this.currentPage = index;
  }

  /** Pagina successiva del carosello (con wrap). */
  private nextPage(): void {
    const next = (this.currentPage + 1) % this.pages.length;
    this.showPage(next);
  }

  /** Pagina precedente del carosello (con wrap). */
  private prevPage(): void {
    const prev = (this.currentPage - 1 + this.pages.length) % this.pages.length;
    this.showPage(prev);
  }

  // ==================== UTILITY ====================

  /**
   * Formatta il punteggio con separatore delle migliaia italiano (punto).
   * Es: 923124 → "923.124"
   */
  private formatScore(score: number): string {
    return score.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  }

  /**
   * Determina l'icona tempo da mostrare in base ai minuti narrativi trascorsi.
   * - < 300 min (19:00): giorno
   * - < 540 min (23:00): tramonto
   * - >= 540 min: notte
   */
  private getTimeIcon(clockMinutes: number): string {
    if (clockMinutes < 300) return "gameOverDayIcon";
    if (clockMinutes < 540) return "gameOverSunsetIcon";
    return "gameOverNightIcon";
  }

  /**
   * Mostra un overlay di zoom per la carta DJ.
   * Tap/click ovunque per chiuderlo.
   */
  private showDjZoom(djIndex: number, isUnlocked: boolean): void {
    const r = (v: number) => Math.round(v * GAME.SCALE);
    const cx = GAME.WIDTH / 2;
    const cy = GAME.HEIGHT / 2;
    const textureKey = isUnlocked ? `dj${djIndex}` : `dj${djIndex}ph`;

    // Overlay scuro
    const dimmer = this.add
      .rectangle(cx, cy, GAME.WIDTH, GAME.HEIGHT, 0x000000, 0.78)
      .setDepth(50)
      .setScrollFactor(0)
      .setInteractive();

    // Immagine grande centrata
    const zoomImg = this.add
      .image(cx, cy, textureKey)
      .setDisplaySize(r(160), r(230))
      .setDepth(51)
      .setScrollFactor(0)
      .setAlpha(0);

    const hint = this.add
      .text(cx, cy + r(125), "tap per chiudere", {
        fontFamily: "ChillPixels",
        fontSize: `${r(8)}px`,
        color: "#aaaaaa",
      })
      .setOrigin(0.5)
      .setDepth(51)
      .setScrollFactor(0)
      .setAlpha(0);

    const all = [zoomImg, hint];

    this.tweens.add({
      targets: all,
      alpha: 1,
      duration: 180,
    });

    const close = () => {
      this.tweens.add({
        targets: [dimmer, ...all],
        alpha: 0,
        duration: 150,
        onComplete: () => {
          dimmer.destroy();
          all.forEach((o) => o.destroy());
        },
      });
    };

    dimmer.on("pointerdown", close);
  }

  /**
   * Apre il modale di cambio nickname.
   * Se l'utente ne sceglie uno nuovo, aggiorna localStorage.
   * Il vecchio nick rimane su Firestore (il record storico non viene toccato).
   */
  private openNicknameChange(): void {
    const currentNick = localStorage.getItem("spring_nickname") ?? "";
    NicknameOverlay.show(
      (nick) => LeaderboardManager.isNicknameAvailable(nick),
      { mode: "edit", currentNick },
    ).then((chosen) => {
      if (chosen) {
        localStorage.setItem("spring_nickname", chosen);
      }
    });
  }

  private _onLeaderWheel(
    _p: unknown,
    _g: unknown,
    _dx: number,
    dy: number,
  ): void {
    this._leaderScrollY = Phaser.Math.Clamp(
      this._leaderScrollY + dy * 0.5,
      0,
      this._leaderMaxScroll,
    );
    this.scoresContainer.y = this._leaderBaseY - this._leaderScrollY;
  }

  private _onLeaderDragStart(p: Phaser.Input.Pointer): void {
    this._leaderDragStartY = p.y;
    this._leaderDragStartScroll = this._leaderScrollY;
  }

  private _onLeaderDrag(p: Phaser.Input.Pointer): void {
    if (!p.isDown) return;
    const delta = this._leaderDragStartY - p.y;
    this._leaderScrollY = Phaser.Math.Clamp(
      this._leaderDragStartScroll + delta,
      0,
      this._leaderMaxScroll,
    );
    this.scoresContainer.y = this._leaderBaseY - this._leaderScrollY;
  }
}
