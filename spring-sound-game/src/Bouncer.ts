import * as Phaser from "phaser";
import { BOUNCER } from "./GameConfig";

/**
 * Bouncer (Buttafuori)
 * ====================
 * Nemico posizionato su un bordo della piattaforma.
 * Fermo al frame 0 (posizione di guardia). Al contatto col giocatore scatta
 * l'animazione di lancio (frame 0→1→2): lo afferra e lo scaglia lateralmente.
 *
 * L'interazione usa overlap (non collider): il bouncer non blocca fisicamente
 * il giocatore ma applica un impulso diagonale. Un cooldown evita trigger multipli.
 *
 * Spritesheet 3 frame (128×158 ciascuno):
 * - Frame 0: idle (fermo, posizione di guardia)
 * - Frame 1: afferra il giocatore
 * - Frame 2: lo lancia via
 *
 * Viene usato come classType nel gruppo Phaser, quindi NON si auto-aggiunge alla scena.
 */
export class Bouncer extends Phaser.Physics.Arcade.Sprite {
  declare public body: Phaser.Physics.Arcade.Body;

  /** Timestamp dell'ultimo lancio — usato per il cooldown */
  private lastThrowTime: number = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, texture: string) {
    super(scene, x, y, texture);
  }

  /**
   * Inizializza dimensioni, hitbox e frame iniziale.
   * Chiamato dopo group.get() per configurare l'istanza.
   *
   * L'origine è impostata a (0.5, 1) = centro-basso, così la Y di spawn
   * coincide con il punto dove il bouncer appoggia i piedi.
   */
  public initBouncer(): void {
    this.setOrigin(0.5, 1);
    this.setDisplaySize(BOUNCER.WIDTH, BOUNCER.HEIGHT);
    this.setDepth(12);

    if (this.body) {
      this.body.setSize(this.width, this.height);
      this.body.allowGravity = false;
      this.body.immovable = true;
    }

    // Frame 0: posizione di guardia (fermo, nessuna animazione loop)
    this.setFrame(0);
    this.lastThrowTime = 0;
  }

  /**
   * Verifica se il bouncer può lanciare (cooldown scaduto).
   * Restituisce true se è pronto per un nuovo lancio.
   */
  public canThrow(now: number): boolean {
    return now - this.lastThrowTime > BOUNCER.COOLDOWN_MS;
  }

  /**
   * Avvia l'animazione di lancio e segna il timestamp.
   * Il reset al frame 0 è gestito dal callback in GameScene.setupColliders()
   * che coordina anche il lancio del player.
   */
  public performThrow(now: number): void {
    this.lastThrowTime = now;
    this.play("bouncerThrow");
  }
}
