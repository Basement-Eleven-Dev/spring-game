# 🎶 Spring Sound Game

Un **vertical climbing game** a tema festa/discoteca, costruito con **Phaser 3** + **TypeScript** + **Vite**.

Il giocatore salta tra piattaforme salendo sempre più in alto, raccoglie drink che alzano il "party level", e affronta ostacoli come bouncer e fango. Quando il party level raggiunge il massimo, si entra nello stato "wasted" e appare il DJ Stage — un checkpoint che porta al livello successivo.

> **Target primario**: browser mobile (smartphone). Il gioco è progettato per essere avviato rapidamente da un link, senza installazione.

---

## 🛠️ Tech Stack

| Tecnologia                     | Versione | Ruolo                                  |
| ------------------------------ | -------- | -------------------------------------- |
| [Phaser 3](https://phaser.io/) | ^3.90.0  | Game engine (rendering, fisica, input) |
| TypeScript                     | ~6.0.2   | Type safety                            |
| Vite                           | ^8.0.4   | Dev server + bundler                   |
| @vitejs/plugin-basic-ssl       | —        | Certificato HTTPS self-signed in LAN   |

---

## 🚀 Quick Start

```bash
# Installa le dipendenze
cd spring-sound-game
npm install

# Avvia il dev server (solo PC)
npm run dev
# → https://localhost:5173/

# Avvia con accesso da smartphone in LAN
npm run dev -- --host
# → https://<IP-del-Mac>:5173/
# Al primo accesso da iPhone: Safari → "Mostra dettagli" → "Apri il sito web"
# (certificato self-signed, avviso monouso per sessione)

# Build per produzione
npm run build
```

---

## 🏗️ Architettura

Il progetto segue un'architettura **Manager Pattern**: la scena principale (`GameScene`) è un orchestratore snello che delega la logica a manager specializzati.

```
src/
├── main.ts                ← Entry point + overlay start/permesso sensore
├── GameConfig.ts          ← Costanti centralizzate (bilanciamento)
├── GameScene.ts           ← Scena principale (orchestratore)
├── GameOverScene.ts       ← Schermata di Game Over
│
├── Player.ts              ← Giocatore (input: tastiera/touch/device orientation)
├── Platform.ts            ← Piattaforme (4 tipi)
├── Drink.ts               ← Drink collezionabili
├── Bouncer.ts             ← Buttafuori nemici
│
├── managers/
│   ├── CameraManager.ts   ← Scrolling fluido + effetti visivi
│   ├── ScoreManager.ts    ← Punteggio + HUD
│   ├── PartyManager.ts    ← Party system + stato wasted
│   ├── LevelManager.ts    ← Progressione livelli + gravità
│   └── SpawnManager.ts    ← Spawning/riciclo/pulizia entità
```

### Diagramma delle dipendenze

```
main.ts
  ├── Overlay HTML (start screen + permesso iOS) → startGame()
  └── GameScene (orchestratore)
        ├── CameraManager ← scrolling + rotazione + vista doppia
        ├── ScoreManager ← punteggio + HUD
        ├── PartyManager ← party bar + wasted → emette evento "wasted-ready"
        ├── LevelManager ← livello + gravità + visual
        ├── SpawnManager ← possiede tutti i gruppi Phaser:
        │     ├── platforms (Platform)
        │     ├── drinks (Drink)
        │     ├── muds (generico)
        │     └── bouncers (Bouncer)
        └── Player ← input (tastiera/touch/device orientation)
  └── GameOverScene ← statistiche finali + pulsante "Riprova"
```

---

## 📁 Dettaglio File

### `main.ts` — Entry Point

- Configurazione Phaser (dimensioni, fisica, scene, scaling)
- Importa `GameConfig` per le costanti di dimensione e gravità
- Registra `GameScene` e `GameOverScene`
- **Overlay start screen**: un `<div>` HTML fullscreen con bottone **GIOCA** viene mostrato prima che Phaser venga inizializzato. Il gioco non parte fino al tap dell'utente.
- **Permesso iOS**: se il browser espone `DeviceOrientationEvent.requestPermission` (iOS 13+), il click sul bottone chiama il metodo sincronicamente — unico modo affidabile per soddisfare il requisito "user gesture trusted" di Safari. Su Android/desktop il bottone avvia direttamente `startGame()` senza logica di permessi.
- `startGame()` — funzione che istanzia `new Phaser.Game(config)` solo dopo l'interazione dell'utente.

### `GameConfig.ts` — Configurazione Centralizzata

**Tutte** le costanti di bilanciamento del gioco in un unico file:

- `GAME` — dimensioni del canvas (350×altezza responsiva)
- `PHYSICS` — gravità base e scaling per livello
- `TIME` — orologio narrativo: `START_MINUTES` (960 = 16:00), `DURATION_MINUTES` (720), `NIGHT_TRIGGER_MINUTES` (300 = 21:00)
- `SKY` — colori di sfondo giorno (`0x87CEEB`) e notte (`0x0a0a2e`)
- `minutesToClockString()` — helper esportato: converte minuti trascorsi in stringa "HH:MM"
- `CAMERA` — lerp dello scrolling, parametri oscillazione ubriachezza
- `PLAYER` — velocità, forza salto, `GYRO_DEADZONE` (8°) e `GYRO_MAX_TILT` (28°) per il controllo via device orientation
- `PLATFORM` — dimensioni per categoria (wide/compact/subwoofer), spacing, probabilità di spawn per tipo, parametri animazione spritesheet
- `PLATFORM_TEXTURE_CATEGORY` — mappa texture → categoria dimensionale
- `PLATFORM_STANDARD_TEXTURES` — lista texture per varianti standard/mobili
- `MUD` — probabilità e dimensioni del fango
- `DRINK` — intervallo spawn, velocità caduta, guadagno party
- `BOUNCER` — dimensioni, velocità, intervallo spawn, knockback, durata pinball
- `PARTY` — soglie colore barra, moltiplicatori punteggio
- `LEVEL` — parametri DJ Stage, bonus level up
- `JUMP_MULTIPLIERS` — normale (×1), subwoofer (×1.7), fango (×0.75)

### `GameScene.ts` — Scena Principale

Orchestratore che:

1. **`preload()`** — carica tutti gli asset da `public/assets/`, inclusi i 4 spritesheet (`playerJumpRight`, `playerJumpLeft`, `bouncerSheet`, `fragileBreak`, `subwooferPump`)
2. **`createAnimations()`** — definisce le animazioni Phaser:
   - `playerJumpUpRight` / `playerJumpUpLeft` — frame 0-2 loop durante la salita
   - `bouncerThrow` — frame 0→1→2 one-shot al contatto col player
   - `fragileBreak` — 2 frame one-shot al contatto con la piattaforma fragile
   - `subwooferPump` — 4 frame loop continuo a 8 fps
3. **`create()`** — inizializza manager, piattaforme, player, collider
4. **`setupColliders()`** — registra le interazioni fisiche:
   - Player ↔ Platform → salto (con modificatori per tipo)
   - Player ↔ Drink → raccolta (incrementa party)
   - Player ↔ Bouncer → sequenza grab-throw e schiacciamento stile Super Mario
5. **`update()`** — delega ai manager nell'ordine:
   - Input giocatore → Camera → Punteggio → Spawn → Riciclo → Cleanup → Game Over

### `GameOverScene.ts` — Schermata Game Over

- Sfondo scuro con titolo animato "GAME OVER"
- Statistiche: distanza (m), punteggio (pts), livello raggiunto
- Pulsante "RIPROVA" con effetto hover + pulsing
- Click/Tap → riavvia `GameScene`

---

## 🎮 Entità di Gioco

### `Player.ts` — Giocatore

- **3 sistemi di input** (in ordine di priorità):
  1. **Tastiera** (frecce sx/dx) — per PC
  2. **Touch** (tap nella metà sx/dx dello schermo) — per smartphone
  3. **Device orientation** (`deviceorientation` → valore `gamma`) — sovrascrive gli altri se il tilt supera la deadzone
- **Mappatura gamma → velocità**: `clamp((|gamma| - DEADZONE) / (MAX_TILT - DEADZONE), 0, 1) × MOVE_SPEED × sign(gamma)`. Tra 0° e 8° (deadzone) non si muove nulla; a 28° si raggiunge la velocità piena.
- **Effetto inerzia**: il party level rende il movimento più "scivoloso" — il player è lento a cambiare direzione (lerp factor quadratico, percettibile già al 50% del party level)
- **Wrap ai bordi**: effetto Pac-Man (esce da un lato, rientra dall'altro)
- **Stun / Pinball**: quando stordito dal Bouncer, entra in modalità "pinball", rimbalzando violentemente tra i lati (o sul fondo) dello schermo e ruotando su sé stesso senza possibilità di input per l'intervallo `PINBALL_DURATION_MS`.
- **Cleanup**: rimuove il listener `deviceorientation` su `destroy()` per evitare memory leak tra un game over e l'altro

### `Platform.ts` — Piattaforme

| Tipo        | Asset                                             | Dimensione gioco           | Comportamento                                              |
| ----------- | ------------------------------------------------- | -------------------------- | ---------------------------------------------------------- |
| `standard`  | 4 varianti PNG (erba, ubriaco, cassa, cassa_erba) | wide 90×34 / compact 70×32 | Ferma. Può avere fango sopra (dal livello 3)               |
| `moving`    | stesse 4 varianti                                 | wide 90×34 / compact 70×32 | Si muove orizzontalmente, rimbalza ai bordi                |
| `fragile`   | `platform_cassa_rotta_sheet.png` (2 frame)        | compact 70×32              | Animazione di rottura al contatto, poi distruzione         |
| `subwoofer` | `subwoofer_sheet.png` (4 frame)                   | 60×32                      | Loop animazione "cassa che pompa", salto potenziato (×1.7) |

### `Bouncer.ts` — Buttafuori

- Posizionato su un **bordo** (sx o dx, casuale) delle piattaforme standard e fragili
- Appare dal livello 1, con probabilità crescente: `15% + 4%/livello` (max 40%)
- **Nemico difensivo ma eludibile**:
   1. **Super Mario Stomp**: se il giocatore cade sopra la sua testa, annulla la presa avversaria, schiaccia fisicamente il PNG e lo distrugge, ottenendo punti bonus (+300) ed uno slancio verticale salvifico.
   2. **Flusso Grab-Throw**:
      - **Presa**: Se intercettato di lato/fondo ostacola il player congelandolo in aria.
      - **Animazione Lancio**: Esegue stringa animazione `bouncerThrow` per ~500ms.
      - **Lancio "Intelligente"**: Scaglia il giocatore impostando la fase di vulnerabilità **pinball**:
        - Se il giocatore è nella parte alta della telecamera, lo lancia verso il basso.
        - Se il giocatore è nella parte bassa (a serio rischio morte), lo sbalza verso l'**alto** ad altissima velocità scongiurando loop involontari.
      - **Scomparsa**: Dopo il lancio, il Buttafuori innesca un fadeout autonomo disabilitando eventuali ulteriori blocchi al player.

---

## ⚙️ Manager

### `CameraManager` — Camera + Effetti Visivi

- **Smooth scroll**: segue il giocatore verso l'alto con lerp 0.1 (non scende mai)
- **Background giorno/notte**: rettangolo fixed che varia da azzurro a blu notte interpolandosi nei trigger dell'orologio interno (es: start 16:00, animazione di cambio passate le 21:00).
- **Effetti ubriachezza progressivi**: gestiti ad ogni frame basandosi su funzioni logaritmiche di lerping che disorientano lo schermo col _Dual Camera Ghosting_ nello stadio "Wasted".

### `ScoreManager` — Punteggio + HUD

- Calcola il **Punteggio** convertito dalla tolleranza `y` percorsa incrementata dal multiplier dei Drink presi. Costruisce visivamente HUD, statistiche e clock game-time in sovrimpressione.

### `PartyManager` — Party System + Wasted

- **Raccolta drink**: +8 party level per drink raccolto
- **Stato Wasted** (party = 100): Attiva i trigger dell'evento di checkpoint (DJ Stage). Questo causerà nel GameManager il reset dell'ubriachezza ad avvenuto level up. 

### `LevelManager` — Progressione Livelli

- **Gravità logaritmica**: `BASE × (1 + 0.22 × ln(livello))`. Gestisce la complessa scalatura matematica dell'engine limitando l'ingovernabilità del balzo via via all'ascesa limitando pesi estremi.

### `SpawnManager` — Spawning/Riciclo/Pulizia

- Cuore operativo del setup instanziato via `Factory method`. Crea entità per fasce basandosi su array a probabilità e cap procedurali, calcolando i posizionamenti per impedire l'overcrowding offscreen o blocchi statici (generazione costante on fly). 

---

## 🌊 Flusso di Gioco

```
START
  │
  ▼
┌─────────────────┐
│  GameScene       │
│  create()        │
│  - 14 piattaforme│
│  - player Y-Start│
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────────┐
│  GAME LOOP (update ogni frame)              │
│  1. Player input (tastiera/touch/gyro)      │
│  2. Camera segue il player verso l'alto     │
│  3. Calcola punteggio e distanza            │
│  4. Spawna drink cadenti e bouncer          │
│  5. Ricicla piattaforme fuori schermo       │
│  6. Pulisci entità fuori schermo            │
│  7. Controlla game over per drop screen     │
└─────────────────────────────────────────────┘
```

---

## 📝 Note per gli Sviluppatori

### Come modificare il bilanciamento

Tutti i numeri che influenzano il gameplay sono interamente centralizzati ed esportabili in **`src/GameConfig.ts`**. Modifica i valori lì e il cambiamento si propagherà ovunque.

### Aggiungere nuovi contenuti

La factory passiva su `SpawnManager.ts` per le generazioni in real time ti permetterà di inserire asset grafici integrando checks su metodi specifici (e.g., `spawnPlatform`).

---

## 📄 Licenza

_Da definire_
