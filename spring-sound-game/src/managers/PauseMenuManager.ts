import * as Phaser from "phaser";
import { GAME, SETTINGS } from "../GameConfig";

/**
 * PauseMenuManager
 * ================
 * Gestisce il menu di pausa con overlay semi-trasparente e opzioni:
 * - Livello attuale
 * - Riprendi
 * - Accelerometro on/off (SOLO su smartphone — gestisce permesso iOS)
 * - Audio on/off
 *
 * Lo stile è coerente con il gioco: colori vivaci, font ChillPixels.
 *
 * ACCELEROMETRO:
 * - Visibile solo su dispositivi touch (navigator.maxTouchPoints > 0)
 * - Parte OFF di default
 * - Al primo toggle ON, su iOS chiede il permesso DeviceOrientation
 *   direttamente dal handler del tap (user gesture trusted)
 * - Se il permesso viene negato, resta OFF
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
  private gyroButton!: Phaser.GameObjects.Container | null;
  private audioButton!: Phaser.GameObjects.Container;

  // --- Callbacks ---
  private onResume?: () => void;
  private onToggleGyro?: () => void;
  private onToggleAudio?: () => void;

  // --- Stato ---
  private isVisible: boolean = false;
  /** true = dispositivo touch (smartphone/tablet) */
  private isMobile: boolean = false;
  /** true = il permesso iOS è già stato concesso (evita ripetizioni) */
  private iosPermissionGranted: boolean = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.r = (v: number) => Math.round(v * GAME.SCALE);
    this.isMobile = navigator.maxTouchPoints > 0;
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

    // --- Layout dei bottoni sotto RIPRENDI ---
    // La posizione Y cambia in base alla presenza del toggle accelerometro
    let nextY = r(30);

    // --- Bottone ACCELEROMETRO (solo su smartphone) ---
    if (this.isMobile) {
      this.gyroButton = this.createToggleButton(
        0,
        nextY,
        "ACCELEROMETRO",
        () => this.handleGyroToggle(),
      );
      this.menuContainer.add(this.gyroButton);
      nextY += r(70);
    } else {
      this.gyroButton = null;
    }

    // --- Bottone AUDIO ---
    this.audioButton = this.createToggleButton(0, nextY, "AUDIO", () =>
      this.onToggleAudio?.(),
    );
    this.menuContainer.add(this.audioButton);
  }

  /**
   * Gestisce il toggle dell'accelerometro con permesso iOS.
   *
   * FLUSSO:
   * 1. Se il gyro è attivo → lo disattiva direttamente
   * 2. Se il gyro è spento e serve il permesso iOS → lo chiede
   *    (requestPermission() viene chiamato sincronicamente dal user gesture,
   *    come richiesto da Safari)
   * 3. Se il permesso è concesso → attiva il gyro
   * 4. Se il permesso è negato → non fa nulla
   * 5. Se non serve permesso (Android, o già concesso) → attiva direttamente
   */
  private handleGyroToggle(): void {
    if (SETTINGS.gyroEnabled) {
      // Disabilita: semplice toggle
      this.onToggleGyro?.();
      return;
    }

    // Abilita: potrebbe servire il permesso iOS
    if (this.iosPermissionGranted) {
      // Permesso già concesso in precedenza
      this.onToggleGyro?.();
      return;
    }

    const needsIOSPermission =
      typeof DeviceOrientationEvent !== "undefined" &&
      typeof (
        DeviceOrientationEvent as unknown as {
          requestPermission?: () => Promise<string>;
        }
      ).requestPermission === "function";

    if (needsIOSPermission) {
      // Chiedi il permesso iOS — requestPermission() è chiamato
      // sincronicamente dal handler del tap (user gesture trusted)
      (
        DeviceOrientationEvent as unknown as {
          requestPermission: () => Promise<string>;
        }
      )
        .requestPermission()
        .then((result: string) => {
          if (result === "granted") {
            this.iosPermissionGranted = true;
            this.onToggleGyro?.();
          }
          // Se "denied" o altro, non attiva il gyro
        })
        .catch(() => {
          // Errore nel richiedere il permesso — non attiva il gyro
        });
    } else {
      // Android o browser senza requisito di permesso — attiva direttamente
      this.onToggleGyro?.();
    }
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

    // Imposta direttamente alpha e scala (i tweens sono in pausa durante la pausa)
    this.menuContainer.setAlpha(1);
    this.menuContainer.setScale(1);
  }

  /**
   * Nasconde il menu di pausa.
   */
  public hide(): void {
    // Nascondi direttamente (i tweens potrebbero avere stati inconsistenti)
    this.overlay.setVisible(false);
    this.menuContainer.setVisible(false);
    this.isVisible = false;
  }

  /**
   * Aggiorna lo stato visivo dei toggle button.
   */
  public updateGyroState(enabled: boolean): void {
    if (!this.gyroButton) return; // Non presente su desktop
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

  /**
   * Restituisce gli elementi di gioco del menu di pausa.
   * Usato da UIManager per configurare l'esclusività delle camere.
   */
  public getGameObjects(): Phaser.GameObjects.GameObject[] {
    return [this.overlay, this.menuContainer];
  }
}
