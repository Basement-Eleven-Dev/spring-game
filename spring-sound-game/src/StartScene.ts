import * as Phaser from "phaser";
import { GAME } from "./GameConfig";

export class StartScene extends Phaser.Scene {
  constructor() {
    super({ key: "StartScene" });
  }

  preload(): void {
    // Background first_bg
    this.load.image("firstBg", "/assets/background/first_bg.png");

    // Logo
    this.load.svg(
      "startLogo",
      "/assets/ui/gamestart-over-pause/logo pixel.svg",
      { width: 240, height: 240 },
    );

    // Play icon (cerchio giallo con triangolo)
    this.load.svg("playIcon", "/assets/ui/play.svg", { width: 40, height: 40 });

    // Bottone rosso gamestart
    this.load.svg("blockRed", "/assets/ui/gamestart-over-pause/block_red.svg", {
      width: 240,
      height: 75,
    });
  }

  create(): void {
    const cx = GAME.WIDTH / 2;
    const { SCALE } = GAME;
    const r = (v: number) => Math.round(v * SCALE);

    // Background first_bg
    // Align to bottom to show the ground/character
    const bg = this.add.image(cx, GAME.HEIGHT, "firstBg").setOrigin(0.5, 1);

    // Scale to cover the screen
    const scaleX = GAME.WIDTH / bg.width;
    const scaleY = GAME.HEIGHT / bg.height;
    const bgScale = Math.max(scaleX, scaleY);
    bg.setScale(bgScale).setDepth(0);

    // --- CONTENITORE PRINCIPALE ---
    const container = this.add.container(0, 0).setDepth(2);

    // Logo
    const logoY = GAME.HEIGHT * 0.4;
    const logo = this.add
      .image(cx, logoY, "startLogo")
      .setDisplaySize(r(160), r(160));
    container.add(logo);

    // --- PULSANTE GIOCA ---
    const btnY = logoY + r(120);
    const playBtnContainer = this.add.container(cx, btnY);

    const playBtnBg = this.add
      .image(0, 0, "blockRed")
      .setDisplaySize(r(200), r(75));
    playBtnContainer.add(playBtnBg);

    const playIcon = this.add
      .image(-r(70), 0, "playIcon")
      .setDisplaySize(r(35), r(35));
    playBtnContainer.add(playIcon);

    const playText = this.add
      .text(r(15), 0, "GIOCA", {
        fontFamily: "ChillPixels",
        fontSize: `${r(28)}px`,
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    playBtnContainer.add(playText);

    const playBtnHit = this.add
      .rectangle(0, 0, r(240), r(75), 0x000000, 0)
      .setInteractive({ useHandCursor: true });
    playBtnContainer.add(playBtnHit);

    container.add(playBtnContainer);

    // Animazione pulsante
    this.tweens.add({
      targets: playBtnContainer,
      scaleX: 1.05,
      scaleY: 1.05,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    // Interazioni pulsante
    playBtnHit.on("pointerover", () => {
      playBtnBg.setTint(0xffcccc);
    });

    playBtnHit.on("pointerout", () => {
      playBtnBg.clearTint();
    });

    playBtnHit.on("pointerdown", () => {
      this.cameras.main.fadeOut(300, 0, 0, 0);
    });

    this.cameras.main.once("camerafadeoutcomplete", () => {
      this.scene.start("TutorialScene");
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
