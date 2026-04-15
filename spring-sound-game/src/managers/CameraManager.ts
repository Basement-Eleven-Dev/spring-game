import * as Phaser from "phaser";
import { CAMERA, GAME, PARTY, SKY } from "../GameConfig";

/**
 * CameraManager
 * ==============
 * Gestisce lo scrolling verticale fluido e gli effetti visivi della camera:
 *
 * - Scrolling verso l'alto che segue il giocatore (mai verso il basso)
 * - Effetti ubriachezza progressivi: rotazione + vista doppia (vedi updateDrunkEffects)
 * - Transizione giorno/notte del background (backgroundColor della camera)
 */
export class CameraManager {
  private scene: Phaser.Scene;
  private camera: Phaser.Cameras.Scene2D.Camera;

  /**
   * Ampiezza corrente della rotazione sinusoidale.
   * Non viene impostata direttamente al valore target ma interpolata (lerp)
   * ogni frame: questo garantisce sia l'ingresso graduale man mano che il
   * party level sale, sia l'uscita graduale al reset del livello (niente snap a 0).
   */
  private rotationAmplitude: number = 0;

  /**
   * Ghost camera per l'effetto vista doppia (wasted only).
   * È una seconda camera Phaser che clona la scena con un offset orizzontale
   * e alpha ridotta, creando il ghosting tipico da ubriachezza senza
   * alcuna sfocatura né pixelazione.
   * Viene creata lazy quando ghostCurrentAlpha supera la soglia minima,
   * e rimossa quando torna a zero.
   */
  private ghostCam: Phaser.Cameras.Scene2D.Camera | null = null;

  /**
   * Valore corrente dell'alpha della ghost camera, interpolato ogni frame.
   * Non viene mai impostato di scatto: lerp verso il target oscillante garantisce
   * sia l'ingresso graduale (comparsa morbida) che l'uscita graduale (scomparsa).
   */
  private ghostCurrentAlpha: number = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.camera = scene.cameras.main;

    // Sfondo: usiamo il backgroundColor della camera principale che NON ruota
    // anche quando la camera viene ruotata. Questo è esattamente quello che vogliamo!
    scene.cameras.main.setBackgroundColor(SKY.DAY);

    // NON creiamo più skyBg rectangle - usiamo direttamente il background della camera
    // che è più efficiente e non ruota mai
  }

  /**
   * Aggiorna la camera ogni frame:
   * - Scrolling fluido verso l'alto (segue il giocatore, non scende mai)
   * - Effetti di ubriachezza progressivi (vedi updateDrunkEffects)
   */
  public update(playerY: number, partyLevel: number, isWasted: boolean): void {
    const targetY = playerY - this.camera.height / 2;
    if (targetY < this.camera.scrollY) {
      this.camera.scrollY = Phaser.Math.Linear(
        this.camera.scrollY,
        targetY,
        CAMERA.LERP,
      );
    }

    this.updateDrunkEffects(partyLevel, isWasted);
  }

  /**
   * Transizione al background notturno con un tween sul backgroundColor della camera.
   * Chiamato da GameScene al primo level up dopo le 21:00.
   */
  public switchToNight(): void {
    this.scene.tweens.addCounter({
      from: 0,
      to: 1,
      duration: 2000,
      ease: "Sine.easeInOut",
      onUpdate: (tween) => {
        const t = tween.getValue() ?? 0;
        const from = Phaser.Display.Color.IntegerToRGB(SKY.DAY);
        const to = Phaser.Display.Color.IntegerToRGB(SKY.NIGHT);
        const r = Math.round(from.r + (to.r - from.r) * t);
        const g = Math.round(from.g + (to.g - from.g) * t);
        const b = Math.round(from.b + (to.b - from.b) * t);
        const color = Phaser.Display.Color.GetColor(r, g, b);
        this.camera.setBackgroundColor(color);
        // Ghost camera è trasparente, non ha backgroundColor da aggiornare
      },
    });
  }

  /**
   * Aggiorna ogni frame gli effetti di ubriachezza progressivi.
   *
   * Rotazione sinusoidale (30%+):
   *   L'ampiezza viene interpolata verso il target tramite lerp (fattore 0.05/frame).
   *   Questo fa sì che la rotazione cresca gradualmente all'aumentare del party level
   *   e che torni a 0 gradualmente al reset del livello — senza nessuno snap brusco.
   *
   * Vista doppia (wasted only):
   *   L'alpha della ghost camera oscilla con max(0, sin(time/PERIOD)) * GHOST_ALPHA:
   *   la funzione è positiva metà del tempo e zero l'altra metà, con cadenza naturale
   *   di ~2.2s visibile / ~2.2s invisibile (ciclo completo ~4.4s).
   *   ghostCurrentAlpha lerpa ogni frame verso questo target oscillante: il lerp
   *   smussa sia la comparsa (graduale, non immediata) sia la scomparsa,
   *   evitando qualsiasi click visivo.
   *   La ghost camera viene creata/distrutta lazy in base all'alpha corrente,
   *   senza tween espliciti — il sistema si auto-gestisce anche al level up.
   */
  private updateDrunkEffects(partyLevel: number, isWasted: boolean): void {
    // Intensità target: 0 se sotto soglia, lineare 0→1 da THRESHOLD_YELLOW a MAX
    const targetIntensity = isWasted
      ? 1.0
      : partyLevel < PARTY.THRESHOLD_YELLOW
        ? 0
        : Phaser.Math.Percent(
            partyLevel,
            PARTY.THRESHOLD_YELLOW,
            PARTY.MAX_LEVEL,
          );

    // --- Rotazione sinusoidale con ampiezza interpolata ---
    // Il lerp di rotationAmplitude verso il target garantisce transizioni fluide
    // sia in ingresso (party level sale) che in uscita (level up → partyLevel=0).
    const targetAmplitude =
      Math.pow(targetIntensity, 2) * CAMERA.DRUNK_MAX_AMPLITUDE;
    this.rotationAmplitude = Phaser.Math.Linear(
      this.rotationAmplitude,
      targetAmplitude,
      0.05, // fattore lerp per frame: ~1-2s per raggiungere il target a 60fps
    );

    if (this.rotationAmplitude > 0.001) {
      this.camera.setRotation(
        Math.sin(this.scene.time.now / CAMERA.DRUNK_ROTATION_SPEED) *
          this.rotationAmplitude,
      );
    } else {
      // Sotto soglia minima: azzera per evitare deriva numerica
      this.camera.setRotation(0);
      this.rotationAmplitude = 0;
    }

    // --- Vista doppia: ghost camera con alpha oscillante ---
    // Target alpha: a wasted oscilla tra 0 e DRUNK_GHOST_ALPHA con funzione
    // max(0, sin(time/period)). Fuori dal wasted il target è 0 e
    // il lerp si occupa da solo di abbassare ghostCurrentAlpha a zero.
    const ghostTargetAlpha = isWasted
      ? Math.max(0, Math.sin(this.scene.time.now / CAMERA.DRUNK_GHOST_PERIOD)) *
        CAMERA.DRUNK_GHOST_ALPHA
      : 0;

    // Lerp verso il target: ingresso e uscita sempre graduali
    this.ghostCurrentAlpha = Phaser.Math.Linear(
      this.ghostCurrentAlpha,
      ghostTargetAlpha,
      CAMERA.DRUNK_GHOST_LERP,
    );

    if (this.ghostCurrentAlpha > 0.005) {
      // Crea la camera la prima volta che l'alpha supera la soglia
      if (!this.ghostCam) {
        this.ghostCam = this.scene.cameras.add(0, 0, GAME.WIDTH, GAME.HEIGHT);

        // Background TRASPARENTE: la ghost camera renderizza solo il mondo di gioco
        // con alpha oscillante, creando l'effetto di sdoppiatura/ghosting.
        // Lo sfondo rimane fisso sulla main camera.
        this.ghostCam.setBackgroundColor("rgba(0,0,0,0)");

        // Configura la ghost camera per ignorare solo la UI (depth >= 100)
        // Il mondo di gioco (depth 0-99) viene renderizzato ghostato
        const allObjects = this.scene.children.list;
        const ignoreObjects = allObjects.filter(
          (obj: any) => obj.depth !== undefined && obj.depth >= 100,
        );
        if (ignoreObjects.length > 0) {
          this.ghostCam.ignore(ignoreObjects);
        }
      }
      this.ghostCam.setAlpha(this.ghostCurrentAlpha);
      this.ghostCam.scrollX = this.camera.scrollX + CAMERA.DRUNK_GHOST_OFFSET;
      this.ghostCam.scrollY = this.camera.scrollY;
      // Stessa rotazione della principale: il ghost barcolla insieme alla scena
      this.ghostCam.setRotation(
        Math.sin(this.scene.time.now / CAMERA.DRUNK_ROTATION_SPEED) *
          this.rotationAmplitude,
      );
    } else if (this.ghostCam) {
      // Alpha scesa sotto la soglia: rimuove la camera e azzera lo stato
      this.scene.cameras.remove(this.ghostCam);
      this.ghostCam = null;
      this.ghostCurrentAlpha = 0;
    }
  }

  /**
   * Chiamato da PartyManager.resetForNewLevel() al cambio di livello.
   *
   * Non è necessaria nessuna azione esplicita: il lerp in updateDrunkEffects
   * si occupa autonomamente sia della rotazione (partyLevel torna a 0 → ampiezza
   * scende gradualmente) sia della ghost camera (isWasted=false → ghostTargetAlpha=0
   * → ghostCurrentAlpha lerpa verso 0 → camera rimossa quando under-threshold).
   */
  public clearEffects(): void {
    // Intenzionalmente vuoto: il sistema si auto-smonta via lerp.
  }

  /** Posizione Y corrente della camera (bordo superiore visibile). */
  public get scrollY(): number {
    return this.camera.scrollY;
  }

  /** Altezza della viewport della camera. */
  public get height(): number {
    return this.camera.height;
  }
}
