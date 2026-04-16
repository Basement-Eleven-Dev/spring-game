import * as Phaser from "phaser";
import { GAME, SCORING } from "./GameConfig";

export class StartScene extends Phaser.Scene {
  constructor() {
    super({ key: "StartScene" });
  }

  preload(): void {
    // Background menu
    this.load.image("menuBg", "/assets/background/background menu.png");

    // Logo
    this.load.svg(
      "startLogo",
      "/assets/ui/gamestart-over-pause/logo pixel.svg",
      { width: 120, height: 120 },
    );

    // Caricamento asset base per il tutorial
    this.load.svg("playIcon", "/assets/ui/play.svg", { width: 40, height: 40 });
    this.load.image("drinkTex", "/assets/drinks/drink.png");
    this.load.image("beerTex", "/assets/drinks/beer.png");
    this.load.spritesheet(
      "subwooferSheet",
      "/assets/platforms/subwoofer_sheet.png",
      { frameWidth: 200, frameHeight: 100 },
    );
    this.load.spritesheet("bouncerSheet", "/assets/players/buttafuori.png", {
      frameWidth: 128,
      frameHeight: 158,
    });
  }

  create(): void {
    const cx = GAME.WIDTH / 2;
    const cy = GAME.HEIGHT / 2;
    const { SCALE } = GAME;
    const r = (v: number) => Math.round(v * SCALE);

    // Background menu
    const bg = this.add.image(cx, cy, "menuBg");
    const scaleX = GAME.WIDTH / bg.width;
    const scaleY = GAME.HEIGHT / bg.height;
    const bgScale = Math.max(scaleX, scaleY);
    bg.setScale(bgScale).setDepth(0);

    // Overlay scuro per leggibilità
    this.add
      .rectangle(cx, cy, GAME.WIDTH, GAME.HEIGHT, 0x000000, 0.4)
      .setDepth(1);

    // --- CONTENITORE PRINCIPALE ---
    const container = this.add.container(0, 0).setDepth(2);

    // Logo con cerchio bianco
    const logoCircle = this.add
      .circle(cx, r(80), r(75), 0xffffff)
      .setStrokeStyle(r(3), 0x000000);
    container.add(logoCircle);

    const logo = this.add
      .image(cx, r(80), "startLogo")
      .setDisplaySize(r(120), r(120));
    container.add(logo);

    // Sottotitolo
    const subtitle = this.add
      .text(cx, r(160), "Sopravvivi fino alle 02:00", {
        fontFamily: "ChillPixels",
        fontSize: `${r(18)}px`,
        color: "#ffdd88",
        stroke: "#000000",
        strokeThickness: r(3),
      })
      .setOrigin(0.5);
    container.add(subtitle);

    // --- PANNELLO REGOLE ---
    const rulesY = r(230);
    const rulesPanel = this.add
      .rectangle(cx, rulesY + r(140), r(320), r(280), 0x000000, 0.7)
      .setStrokeStyle(r(3), 0xff44aa, 0.8);
    container.add(rulesPanel);

    // Titolo regole
    const rulesTitle = this.add
      .text(cx, rulesY, "COME GIOCARE", {
        fontFamily: "ChillPixels",
        fontSize: `${r(22)}px`,
        color: "#ffdd00",
        stroke: "#000000",
        strokeThickness: r(4),
      })
      .setOrigin(0.5);
    container.add(rulesTitle);

    // Regole con icone
    const rules = [
      { icon: "🎮", text: "Tocca i lati per muoverti", y: rulesY + r(40) },
      {
        icon: "🍺",
        text: `Bevi drink: +${SCORING.DRINK_STATIC} pt`,
        y: rulesY + r(80),
      },
      {
        icon: "🔊",
        text: "Usa i Subwoofer per mega-salti",
        y: rulesY + r(120),
      },
      {
        icon: "🚨",
        text: `Schiaccia Bouncer: +${SCORING.BOUNCER_STOMP} pt`,
        y: rulesY + r(160),
      },
      {
        icon: "🌙",
        text: `Arriva alle 02:00: +${SCORING.SURVIVAL_BONUS} pt!`,
        y: rulesY + r(200),
      },
    ];

    rules.forEach((rule) => {
      const ruleText = this.add
        .text(cx, rule.y, `${rule.icon} ${rule.text}`, {
          fontFamily: "ChillPixels",
          fontSize: `${r(15)}px`,
          color: "#ffffff",
          align: "center",
        })
        .setOrigin(0.5);
      container.add(ruleText);
    });

    // --- PULSANTE GIOCA ---
    const btnY = GAME.HEIGHT - r(120);

    const playBtn = this.add
      .rectangle(cx, btnY, r(220), r(70), 0xff44aa, 1)
      .setStrokeStyle(r(4), 0xffffff)
      .setInteractive({ useHandCursor: true });
    container.add(playBtn);

    const playText = this.add
      .text(cx, btnY, "▶ GIOCA", {
        fontFamily: "ChillPixels",
        fontSize: `${r(32)}px`,
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    container.add(playText);

    // Animazione pulsante
    this.tweens.add({
      targets: playBtn,
      scaleX: 1.05,
      scaleY: 1.05,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    // Interazioni pulsante
    playBtn.on("pointerover", () => {
      playBtn.setFillStyle(0xff66cc);
      playText.setScale(1.1);
    });

    playBtn.on("pointerout", () => {
      playBtn.setFillStyle(0xff44aa);
      playText.setScale(1);
    });

    playBtn.on("pointerdown", () => {
      this.cameras.main.fadeOut(300, 0, 0, 0);
    });

    this.cameras.main.once("camerafadeoutcomplete", () => {
      this.scene.start("GameScene");
    });

    // Animazione entrata
    container.setAlpha(0);
    this.tweens.add({
      targets: container,
      alpha: 1,
      duration: 600,
      ease: "Power2",
    });
  }
}
