import * as Phaser from "phaser";
import { GAME, SCORING, SKY } from "./GameConfig";

export class StartScene extends Phaser.Scene {
  constructor() {
    super({ key: "StartScene" });
  }

  preload(): void {
    // Caricamento asset base per il tutorial
    this.load.svg("playIcon", "/assets/ui/play.svg", { width: 40, height: 40 });
    this.load.image("day_bg", "/assets/background/day_one/day_1.png");
    this.load.image("drinkTex", "/assets/drinks/drink.png");
    this.load.image("beerTex", "/assets/drinks/beer.png");
    this.load.spritesheet("subwooferSheet", "/assets/platforms/subwoofer_sheet.png", { frameWidth: 200, frameHeight: 100 });
    this.load.spritesheet("bouncerSheet", "/assets/players/buttafuori.png", { frameWidth: 128, frameHeight: 158 });
  }

  create(): void {
    const cx = GAME.WIDTH / 2;
    const { SCALE } = GAME;

    // Sfondo azzurro coprente
    this.cameras.main.setBackgroundColor(SKY.DAY);

    // Titolo
    this.add.text(cx, Math.round(80 * SCALE), "SPRING SOUND", {
      fontFamily: "ChillPixels",
      fontSize: `${Math.round(48 * SCALE)}px`,
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: Math.round(6 * SCALE),
    }).setOrigin(0.5);

    // Sottotitolo
    this.add.text(cx, Math.round(140 * SCALE), "TUTORIAL & REGOLE", {
      fontFamily: "ChillPixels",
      fontSize: `${Math.round(20 * SCALE)}px`,
      color: "#ffdd00",
      stroke: "#000000",
      strokeThickness: Math.round(3 * SCALE),
    }).setOrigin(0.5);

    const startY = Math.round(200 * SCALE);
    const lineSpacing = Math.round(60 * SCALE);
    const spriteX = Math.round(40 * SCALE);
    const textX = Math.round(80 * SCALE);

    const style = {
      fontFamily: "ChillPixels",
      fontSize: `${Math.round(14 * SCALE)}px`,
      color: "#ffffff",
      wordWrap: { width: GAME.WIDTH - textX - Math.round(20 * SCALE) }
    };

    // --- Rigo 1: Movimento ---
    this.add.text(cx, startY, "📱 Tocca i lati (Tastiera/Tilt)", style).setOrigin(0.5);
    this.add.text(cx, startY + Math.round(20 * SCALE), "per muoverti e salire!", {
      ...style, color: "#aaddff"
    }).setOrigin(0.5);

    // --- Rigo 2: Drink ---
    const row2 = startY + lineSpacing * 1.5;
    const dSprite = this.add.sprite(spriteX, row2, "beerTex").setDisplaySize(Math.round(30 * SCALE), Math.round(30 * SCALE));
    this.add.text(textX, row2 - Math.round(10 * SCALE), `Bevi Drink! +${SCORING.DRINK_STATIC} pt`, style);
    this.add.text(textX, row2 + Math.round(10 * SCALE), `Drink al volo! +${SCORING.DRINK_FALLING} pt`, { ...style, color: "#55ff55" });

    // --- Rigo 3: Subwoofer ---
    const row3 = row2 + lineSpacing;
    this.add.sprite(spriteX, row3, "subwooferSheet", 0).setDisplaySize(Math.round(45 * SCALE), Math.round(24 * SCALE));
    this.add.text(textX, row3 - Math.round(6 * SCALE), "Sfrutta i Subwoofer per Mega-Salti!", style);

    // --- Rigo 4: Bouncer ---
    const row4 = row3 + lineSpacing;
    this.add.sprite(spriteX, row4, "bouncerSheet", 0).setDisplaySize(Math.round(32 * SCALE), Math.round(40 * SCALE));
    this.add.text(textX, row4 - Math.round(10 * SCALE), "Attento ai Bouncer...", style);
    this.add.text(textX, row4 + Math.round(10 * SCALE), `Schiacciali: +${SCORING.BOUNCER_STOMP} pt!`, { ...style, color: "#ff5555" });

    // --- Rigo 5: Nottata ---
    const row5 = row4 + lineSpacing;
    this.add.text(cx, row5, "🌙 Sopravvivi fino alle 02:00", style).setOrigin(0.5);
    this.add.text(cx, row5 + Math.round(20 * SCALE), `Extrabonus: +${SCORING.SURVIVAL_BONUS} pt!`, {
      ...style, color: "#ffff55", fontSize: `${Math.round(16 * SCALE)}px`
    }).setOrigin(0.5);

    // --- Pulsante Play ---
    const playBtnBg = this.add.rectangle(cx, GAME.HEIGHT - Math.round(100 * SCALE), Math.round(200 * SCALE), Math.round(60 * SCALE), 0xff44aa)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .setStrokeStyle(Math.round(4 * SCALE), 0xffffff);

    const playIcon = this.add.image(cx - Math.round(40 * SCALE), playBtnBg.y, "playIcon").setDisplaySize(Math.round(24 * SCALE), Math.round(24 * SCALE)).setTint(0xffffff);
    const playText = this.add.text(cx + Math.round(10 * SCALE), playBtnBg.y, "GIOCA", {
      fontFamily: "ChillPixels",
      fontSize: `${Math.round(28 * SCALE)}px`,
      color: "#ffffff"
    }).setOrigin(0.5);

    // Hover + click
    playBtnBg.on("pointerover", () => playBtnBg.fillColor = 0xff66cc);
    playBtnBg.on("pointerout", () => playBtnBg.fillColor = 0xff44aa);
    playBtnBg.on("pointerdown", () => {
      this.cameras.main.fadeOut(300, 0, 0, 0);
    });

    this.cameras.main.once("camerafadeoutcomplete", () => {
      this.scene.start("GameScene");
    });
  }
}
