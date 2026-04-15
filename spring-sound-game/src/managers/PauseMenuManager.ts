import * as Phaser from "phaser";
import { GAME, UI } from "../GameConfig";

/**
 * PauseMenuManager
 * ================
 * Gestisce il menu di pausa con overlay semi-trasparente e opzioni:
 * - Livello attuale
 * - Riprendi
 * - Accelerometro on/off
 * - Audio on/off
 *
 * Lo stile è coerente con il gioco: colori vivaci, font ChillPixels.
 */
export class PauseMenuManager {
  private scene: Phaser.Scene;
  private r: (v: number) => number;

  // --- Elementi UI ---
  private overlay!: Phaser.GameObjects.Rectangle;
  private menuContainer!: Phaser.GameObjects.Container;
  private titleText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private resumeButton!: Phaser.GameObjects.Container;
  private gyroButton!: Phaser.GameObjects.Container;
  private audioButton!: Phaser.GameObjects.Container;

  // --- Callbacks ---
  private onResume?: () => void;
  private onToggleGyro?: () => void;
  private onToggleAudio?: () => void;

  // --- Stato ---
  private isVisible: boolean = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.r = (v: number) => Math.round(v * GAME.SCALE);
  }

  /**
   * Crea tutti gli elementi del menu di pausa.
   * Tutti gli elementi hanno depth 200+ per stare sopra la UI.
   */
  public create(
    onResume: () => void,
    onToggleGyro: () => void,
    onToggleAudio: () => void,
  ): void {
    this.onResume = onResume;
    this.onToggleGyro = onToggleGyro;
    this.onToggleAudio = onToggleAudio;

    const r = this.r;
    const centerX = GAME.WIDTH / 2;
    const centerY = GAME.HEIGHT / 2;

    // --- Overlay semi-trasparente ---
    this.overlay = this.scene.add
      .rectangle(0, 0, GAME.WIDTH, GAME.HEIGHT, 0x0a0a2e, 0.85)
      .setOrigin(0, 0)
      .setDepth(200)
      .setScrollFactor(0)
      .setVisible(false);

    // --- Container principale del menu ---
    this.menuContainer = this.scene.add
      .container(centerX, centerY)
      .setDepth(201)
      .setScrollFactor(0)
      .setVisible(false);

    // --- Titolo "PAUSA" ---
    this.titleText = this.scene.add
      .text(0, r(-180), "PAUSA", {
        fontFamily: "ChillPixels",
        fontSize: `${r(40)}px`,
        color: "#FFD700",
        stroke: "#000000",
        strokeThickness: r(4),
      })
      .setOrigin(0.5);
    this.menuContainer.add(this.titleText);

    // --- Livello corrente ---
    this.levelText = this.scene.add
      .text(0, r(-120), "LIVELLO 1", {
        fontFamily: "ChillPixels",
        fontSize: `${r(24)}px`,
        color: "#FFFFFF",
      })
      .setOrigin(0.5);
    this.menuContainer.add(this.levelText);

    // --- Bottone RIPRENDI ---
    this.resumeButton = this.createButton(
      0,
      r(-40),
      "RIPRENDI",
      "#4CAF50",
      () => this.onResume?.(),
    );
    this.menuContainer.add(this.resumeButton);

    // --- Bottone ACCELEROMETRO ---
    this.gyroButton = this.createToggleButton(0, r(30), "ACCELEROMETRO", () =>
      this.onToggleGyro?.(),
    );
    this.menuContainer.add(this.gyroButton);

    // --- Bottone AUDIO ---
    this.audioButton = this.createToggleButton(0, r(100), "AUDIO", () =>
      this.onToggleAudio?.(),
    );
    this.menuContainer.add(this.audioButton);
  }

  /**
   * Crea un bottone standard con sfondo colorato.
   */
  private createButton(
    x: number,
    y: number,
    label: string,
    color: string,
    onClick: () => void,
  ): Phaser.GameObjects.Container {
    const r = this.r;
    const container = this.scene.add.container(x, y);

    const bg = this.scene.add
      .rectangle(0, 0, r(220), r(50), parseInt(color.replace("#", "0x")))
      .setStrokeStyle(r(3), 0x000000);

    const text = this.scene.add
      .text(0, 0, label, {
        fontFamily: "ChillPixels",
        fontSize: `${r(18)}px`,
        color: "#FFFFFF",
      })
      .setOrigin(0.5);

    container.add([bg, text]);
    container.setSize(r(220), r(50));
    container.setInteractive({ useHandCursor: true });

    // Hover effect
    container.on("pointerover", () => {
      bg.setScale(1.05);
      text.setScale(1.05);
    });

    container.on("pointerout", () => {
      bg.setScale(1);
      text.setScale(1);
    });

    container.on("pointerdown", () => {
      bg.setScale(0.95);
      text.setScale(0.95);
    });

    container.on("pointerup", () => {
      bg.setScale(1.05);
      text.setScale(1.05);
      onClick();
    });

    return container;
  }

  /**
   * Crea un bottone toggle (ON/OFF) con sfondo che cambia colore.
   */
  private createToggleButton(
    x: number,
    y: number,
    label: string,
    onClick: () => void,
  ): Phaser.GameObjects.Container {
    const r = this.r;
    const container = this.scene.add.container(x, y);

    const bg = this.scene.add
      .rectangle(0, 0, r(220), r(50), 0x2196f3)
      .setStrokeStyle(r(3), 0x000000);

    const labelText = this.scene.add
      .text(r(-60), 0, label, {
        fontFamily: "ChillPixels",
        fontSize: `${r(16)}px`,
        color: "#FFFFFF",
      })
      .setOrigin(0, 0.5);

    const stateText = this.scene.add
      .text(r(70), 0, "ON", {
        fontFamily: "ChillPixels",
        fontSize: `${r(18)}px`,
        color: "#4CAF50",
      })
      .setOrigin(1, 0.5);

    container.add([bg, labelText, stateText]);
    container.setSize(r(220), r(50));
    container.setInteractive({ useHandCursor: true });

    // Store references for updating
    (container as any).bg = bg;
    (container as any).stateText = stateText;

    // Hover effect
    container.on("pointerover", () => {
      bg.setScale(1.05);
      labelText.setScale(1.05);
      stateText.setScale(1.05);
    });

    container.on("pointerout", () => {
      bg.setScale(1);
      labelText.setScale(1);
      stateText.setScale(1);
    });

    container.on("pointerdown", () => {
      bg.setScale(0.95);
      labelText.setScale(0.95);
      stateText.setScale(0.95);
    });

    container.on("pointerup", () => {
      bg.setScale(1.05);
      labelText.setScale(1.05);
      stateText.setScale(1.05);
      onClick();
    });

    return container;
  }

  /**
   * Mostra il menu di pausa.
   */
  public show(currentLevel: number): void {
    this.levelText.setText(`LIVELLO ${currentLevel}`);
    this.overlay.setVisible(true);
    this.menuContainer.setVisible(true);
    this.isVisible = true;

    // Animazione di entrata
    this.menuContainer.setAlpha(0);
    this.menuContainer.setScale(0.8);
    this.scene.tweens.add({
      targets: this.menuContainer,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      duration: 200,
      ease: "Back.easeOut",
    });
  }

  /**
   * Nasconde il menu di pausa.
   */
  public hide(): void {
    this.scene.tweens.add({
      targets: this.menuContainer,
      alpha: 0,
      scaleX: 0.8,
      scaleY: 0.8,
      duration: 150,
      ease: "Back.easeIn",
      onComplete: () => {
        this.overlay.setVisible(false);
        this.menuContainer.setVisible(false);
        this.isVisible = false;
      },
    });
  }

  /**
   * Aggiorna lo stato visivo dei toggle button.
   */
  public updateGyroState(enabled: boolean): void {
    const stateText = (this.gyroButton as any)
      .stateText as Phaser.GameObjects.Text;
    stateText.setText(enabled ? "ON" : "OFF");
    stateText.setColor(enabled ? "#4CAF50" : "#F44336");
  }

  public updateAudioState(enabled: boolean): void {
    const stateText = (this.audioButton as any)
      .stateText as Phaser.GameObjects.Text;
    stateText.setText(enabled ? "ON" : "OFF");
    stateText.setColor(enabled ? "#4CAF50" : "#F44336");
  }

  /**
   * Getter per stato visibilità.
   */
  public get visible(): boolean {
    return this.isVisible;
  }
}
