import * as Phaser from "phaser";

export class Player extends Phaser.Physics.Arcade.Sprite {
  // Tipizziamo i cursori della tastiera
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private moveSpeed: number = 250; // Velocità di spostamento laterale

  constructor(scene: Phaser.Scene, x: number, y: number, texture: string) {
    super(scene, x, y, texture);

    // Aggiungiamo esplicitamente l'oggetto alla scena visiva e al motore fisico
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Configurazioni fisiche base del player
    this.setBounce(1); // Rimbalzo continuo

    // Inizializziamo i controlli da tastiera (frecce direzionali)
    // Usiamo un controllo di sicurezza nel caso (raro) in cui la tastiera non sia disponibile
    if (scene.input.keyboard) {
      this.cursors = scene.input.keyboard.createCursorKeys();
    } else {
      throw new Error("Tastiera non rilevata dal motore.");
    }
  }

  // Questo metodo verrà chiamato 60 volte al secondo dalla scena principale
  public update(): void {
    // Gestione movimento orizzontale
    if (this.cursors.left.isDown) {
      this.setVelocityX(-this.moveSpeed);
    } else if (this.cursors.right.isDown) {
      this.setVelocityX(this.moveSpeed);
    } else {
      // Aggiungiamo un leggero attrito fermando il personaggio se non premiamo nulla
      this.setVelocityX(0);
    }

    // Screen Wrap: se il giocatore esce dai bordi, riappare dal lato opposto.
    // Il secondo parametro è il "padding", evita che compaia a scatti.
    this.scene.physics.world.wrap(this, this.width / 2);
  }
}
