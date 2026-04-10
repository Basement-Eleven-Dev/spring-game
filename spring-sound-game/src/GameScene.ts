import * as Phaser from "phaser";
import { Player } from "./Player"; // Importiamo la nostra nuova classe

export class GameScene extends Phaser.Scene {
  private player!: Player; // Ora usiamo il nostro tipo personalizzato
  private platform!: Phaser.Types.Physics.Arcade.SpriteWithStaticBody;

  constructor() {
    super("GameScene");
  }

  create() {
    this.cameras.main.setBackgroundColor("#87CEEB");

    // Generazione Placeholder Piattaforma (Verde)
    const platformGraphics = this.add.graphics();
    platformGraphics.fillStyle(0x00ff00, 1);
    platformGraphics.fillRect(0, 0, 400, 50);
    platformGraphics.generateTexture("platformTexture", 400, 50);
    platformGraphics.destroy();

    // Aggiungiamo la piattaforma
    this.platform = this.physics.add.staticSprite(200, 680, "platformTexture");

    // Generazione Placeholder Player (Rosso)
    const playerGraphics = this.add.graphics();
    playerGraphics.fillStyle(0xff0000, 1);
    playerGraphics.fillRect(0, 0, 40, 40);
    playerGraphics.generateTexture("playerTexture", 40, 40);
    playerGraphics.destroy();

    // INIZIALIZZIAMO IL NOSTRO PLAYER CUSTOM
    this.player = new Player(this, 200, 100, "playerTexture");

    // Gestione Collisioni
    this.physics.add.collider(this.player, this.platform);
  }

  update() {
    // Diciamo al player di aggiornare i suoi controlli e la logica ad ogni frame
    this.player.update();
  }
}
