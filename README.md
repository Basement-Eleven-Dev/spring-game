# 🎶 Spring Sound Game

Un **vertical climbing game** a tema festa/discoteca, costruito con **Phaser 3** + **TypeScript** + **Vite**.

Il giocatore salta tra piattaforme salendo sempre più in alto, raccoglie drink che alzano il "party level", e affronta ostacoli come bouncer e fango. Quando il party level raggiunge il massimo, si entra nello stato "wasted" e appare il DJ Stage — un checkpoint che porta al livello successivo.

> **Target primario**: browser mobile (smartphone). Il gioco è progettato per essere avviato rapidamente da un link, senza installazione.

---

## 🛠️ Tech Stack

| Tecnologia | Versione | Ruolo |
|------------|----------|-------|
| [Phaser 3](https://phaser.io/) | ^3.90.0 | Game engine (rendering, fisica, input) |
| TypeScript | ~6.0.2 | Type safety |
| Vite | ^8.0.4 | Dev server + bundler |

---

## 🚀 Quick Start

```bash
# Installa le dipendenze
cd spring-sound-game
npm install

# Avvia il dev server
npm run dev
# → http://localhost:5173/

# Build per produzione
npm run build
```

---

## 🏗️ Architettura

Il progetto segue un'architettura **Manager Pattern**: la scena principale (`GameScene`) è un orchestratore snello che delega la logica a manager specializzati.

```
src/
├── main.ts                ← Entry point, configurazione Phaser
├── GameConfig.ts          ← Costanti centralizzate (bilanciamento)
├── GameScene.ts           ← Scena principale (orchestratore)
├── GameOverScene.ts       ← Schermata di Game Over
│
├── Player.ts              ← Giocatore (input: tastiera/touch/giroscopio)
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
│
├── assets/                ← Asset interni (hero.png, vite.svg)
└── style.css              ← Stili base (centramento canvas)

public/
└── assets/                ← Sprite di gioco (caricati da Phaser)
    ├── player.png
    ├── pedana_standard.png
    ├── pedana_rotta.png
    ├── pedana_scorrevole.png
    ├── trampolino.png
    ├── drink.png
    └── buttafuori.png
```

### Diagramma delle dipendenze

```
main.ts
  └── GameScene (orchestratore)
        ├── CameraManager ← scrolling + blur + rotazione
        ├── ScoreManager ← punteggio + HUD
        ├── PartyManager ← party bar + wasted → emette evento "wasted-ready"
        ├── LevelManager ← livello + gravità + visual
        ├── SpawnManager ← possiede tutti i gruppi Phaser:
        │     ├── platforms (Platform)
        │     ├── drinks (Drink)
        │     ├── muds (generico)
        │     └── bouncers (Bouncer)
        └── Player ← input (tastiera/touch/giroscopio)
  └── GameOverScene ← statistiche finali + pulsante "Riprova"
```

---

## 📁 Dettaglio File

### `main.ts` — Entry Point
- Configurazione Phaser (dimensioni, fisica, scene, scaling)
- Importa `GameConfig` per le costanti di dimensione e gravità
- Registra `GameScene` e `GameOverScene`

### `GameConfig.ts` — Configurazione Centralizzata
**Tutte** le costanti di bilanciamento del gioco in un unico file:
- `GAME` — dimensioni del canvas (400×700)
- `PHYSICS` — gravità base e scaling per livello
- `CAMERA` — lerp dello scrolling, parametri oscillazione ubriachezza
- `PLAYER` — velocità, forza salto, deadzone giroscopio
- `PLATFORM` — dimensioni, spacing, probabilità di spawn per tipo
- `MUD` — probabilità e dimensioni del fango
- `DRINK` — intervallo spawn, velocità caduta, guadagno party
- `BOUNCER` — dimensioni, velocità, intervallo spawn, knockback
- `PARTY` — soglie colore barra, moltiplicatori punteggio
- `LEVEL` — parametri DJ Stage, bonus level up
- `JUMP_MULTIPLIERS` — normale (×1), subwoofer (×1.6), fango (×0.8)

### `GameScene.ts` — Scena Principale (~170 righe)
Orchestratore che:
1. **`preload()`** — carica tutti gli asset da `public/assets/`
2. **`create()`** — inizializza manager, piattaforme, player, collider
3. **`setupColliders()`** — registra le interazioni fisiche:
   - Player ↔ Platform → salto (con modificatori per tipo)
   - Player ↔ Drink → raccolta (incrementa party)
   - Player ↔ Bouncer → respinta verso il basso
4. **`update()`** — delega ai manager nell'ordine:
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
  3. **Giroscopio** (`deviceorientation`) — sovrascrive gli altri se il tilt supera la deadzone
- **Effetto inerzia**: il party level rende il movimento più "pesante" (lerp factor cubico)
- **Wrap ai bordi**: effetto Pac-Man (esce da un lato, rientra dall'altro)
- **Permessi iOS**: su iOS 13+ richiede `DeviceOrientationEvent.requestPermission()` al primo tap
- **Cleanup**: rimuove il listener `deviceorientation` su `destroy()` per evitare memory leak

### `Platform.ts` — Piattaforme
4 tipi con comportamenti diversi:

| Tipo | Texture | Comportamento |
|------|---------|---------------|
| `standard` | `pedana_standard.png` | Ferma. Può avere fango sopra (dal livello 2) |
| `moving` | `pedana_scorrevole.png` | Si muove orizzontalmente, rimbalza ai bordi |
| `fragile` | `pedana_rotta.png` | Si distrugge al primo tocco del giocatore |
| `subwoofer` | `trampolino.png` | Dà un salto potenziato (×1.6) |

Proprietà speciali:
- `isBasePlatform` — piattaforme non riciclabili (pavimento iniziale, DJ Stage)
- `isDJStage` — checkpoint di livello (atterrandoci si passa al livello successivo)
- Collisioni solo dall'alto (il giocatore può saltare attraverso dal basso)

### `Drink.ts` — Drink Collezionabili
- **Statico**: fermo su una piattaforma (10% di probabilità)
- **Cadente**: piove dall'alto ogni 250px di salita
- Ogni drink raccolto incrementa il party level di +8 (su 100)

### `Bouncer.ts` — Buttafuori
- **Telegraph**: prima appare un "!" rosso lampeggiante (3 flash)
- **Spawn**: dopo il flash, il bouncer cade dall'alto
- **Collisione**: respinge il giocatore verso il basso con forza 800
- **Velocità** crescente col livello: `250 + livello × 20`

---

## ⚙️ Manager

### `CameraManager` — Camera + Effetti Visivi
- **Smooth scroll**: segue il giocatore verso l'alto con lerp 0.12 (non scende mai)
- **Rotazione ubriachezza**: oscillazione sinusoidale con ampiezza esponenziale (si attiva sopra la soglia gialla del party)
- **Blur post-processing**: effetto sfocatura attivato nello stato wasted
- **`clearEffects()`**: rimuove blur e rotazione al reset del livello

### `ScoreManager` — Punteggio + HUD
- **Distanza**: 10 pixel = 1 metro
- **Punteggio** = distanza × livello × moltiplicatore party:

| Party Level | Soglia | Moltiplicatore |
|-------------|--------|----------------|
| 0-33 | Verde | ×1 |
| 34-66 | Giallo | ×1.5 |
| 67-99 | Arancio | ×2 |
| 100 (wasted) | Rosso | ×3 |

- **Bonus**: +1000 × livello al completamento di ogni livello
- **HUD**: testo fisso in alto a sinistra `Xm | Y pts | Lvl Z`

### `PartyManager` — Party System + Wasted
- **Party Bar**: barra colorata in alto a destra (240, 15)
- **Raccolta drink**: +8 party level per drink raccolto
- **Stato Wasted** (party = 100):
  1. Attiva blur tramite `CameraManager`
  2. Dopo 4500ms emette l'evento `"wasted-ready"`
  3. `GameScene` riceve l'evento e chiede a `SpawnManager` di generare il DJ Stage
- **Reset**: al level up, party torna a 0, wasted si disattiva, effetti visivi rimossi

### `LevelManager` — Progressione Livelli
- **Gravità crescente**: `800 × (1 + (livello - 1) × 0.15)`
  - Livello 1: 800 | Livello 2: 920 | Livello 3: 1040 | ...
- **Level Up**: incrementa livello, aggiorna gravità, mostra animazione
- **Animazione**: testo "LEVEL X!" che sale e sfuma in 1.5 secondi

### `SpawnManager` — Spawning/Riciclo/Pulizia
Il manager più grande (~280 righe). Gestisce:
- **Gruppi Phaser**: `platforms`, `drinks`, `muds`, `bouncers`
- **Texture procedurali**: crea runtime le texture per fango e DJ Stage
- **Spawn piattaforme**: posizione X vincolata (max ±140px dalla precedente)
- **Probabilità spawn per livello**:

| Tipo | Base | Per Livello | Max |
|------|------|-------------|-----|
| Moving | 10% | +5%/lvl | 35% |
| Fragile | 10% | +5%/lvl | 30% |
| Subwoofer | 10% | fisso | 10% |
| Standard | resto | — | — |
| Fango (su standard) | 20% | +5%/lvl | 50% (dal lvl 2) |

- **Riciclo**: piattaforme uscite dal basso vengono distrutte e rigenerate in alto
- **Cleanup**: drink, fango e bouncer usciti dal basso vengono distrutti
- **DJ Stage**: piattaforma checkpoint larga quanto lo schermo, con flag `isDJStage`

---

## 🌊 Flusso di Gioco

```
START
  │
  ▼
┌─────────────────┐
│  GameScene       │
│  create()        │
│  - 12 piattaforme│
│  - player a 600Y │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────────┐
│  GAME LOOP (update ogni frame)              │
│                                             │
│  1. Player input (tastiera/touch/gyro)      │
│  2. Camera segue il player verso l'alto     │
│  3. Calcola punteggio e distanza            │
│  4. Spawna drink cadenti e bouncer          │
│  5. Ricicla piattaforme fuori schermo       │
│  6. Pulisci entità fuori schermo            │
│  7. Controlla game over                     │
│                                             │
│  COLLISIONI:                                │
│  - Player atterra su piattaforma → SALTA    │
│  - Player tocca drink → party level ↑       │
│  - Player tocca bouncer → respinto giù      │
│                                             │
│  PARTY LEVEL:                               │
│  - Drink raccolti alzano il party (0-100)   │
│  - A 100 → WASTED (blur + inerzia)         │
│  - Dopo 4.5s → appare DJ Stage             │
│  - Atterrando sul DJ Stage → LEVEL UP      │
│  - Party resetta a 0, si ricomincia        │
│                                             │
│  GAME OVER:                                 │
│  - Il player cade sotto lo schermo          │
│  - → GameOverScene con statistiche          │
│  - → "Riprova" per ricominciare             │
└─────────────────────────────────────────────┘
```

---

## 🐛 Bug Noti & Roadmap

### Bug Critici

- [ ] **🔴 BUG #1 — Bouncer spawna a metà schermo**: il bouncer non piove correttamente dal bordo superiore, ma appare a metà viewport. Il calcolo della posizione Y nello spawn va rivisto per garantire che il bouncer parta fuori dallo schermo visibile e cada verso il basso.

- [ ] **🔴 BUG #2 — Il livello non scatta senza toccare il DJ Stage**: se il giocatore non atterra sulla piattaforma DJ Stage, il livello non avanza. Va valutata una meccanica alternativa o un modo per "forzare" l'interazione col DJ Stage (es. renderlo più grande, aggiungere un magnete, o far avanzare il livello automaticamente dopo un timeout).

### Miglioramenti Necessari

- [ ] **🟡 #3 — Responsive design / dimensioni adattive**: attualmente le dimensioni del canvas sono fisse (400×700). Su schermi di dimensioni diverse la percezione del gioco cambia drasticamente. Serve una soluzione che adatti le dimensioni di gioco (piattaforme, player, spacing) al dispositivo, mantenendo le proporzioni coerenti. Possibili approcci:
  - Ricalcolo dinamico di tutti i valori in `GameConfig.ts` basato sull'aspect ratio
  - Utilizzo di coordinate normalizzate (percentuali) invece di pixel assoluti
  - Mantenere il canvas fisso ma adattare `Scale.FIT` con bande nere

- [ ] **🟡 #4 — Supporto giroscopio completo**: il codice per `deviceorientation` è già presente in `Player.ts` ma necessita di verifica su dispositivi reali. In particolare:
  - Testare la richiesta permessi su iOS Safari
  - Calibrare deadzone e sensibilità (`TILT_DEADZONE`, `TILT_MAX_ANGLE` in `GameConfig.ts`)
  - Aggiungere feedback visivo che indichi se il giroscopio è attivo
  - Considerare se usare `DeviceMotionEvent` in combinazione/alternativa

- [ ] **🟠 #5 — Ridefinire la UI**: l'HUD attuale è minimale e poco leggibile. Da rifare:
  - Score/distanza/livello con font custom (Google Fonts) e sfondo semi-trasparente
  - Party bar con design migliore (gradiente, icone, etichetta)
  - Indicatori visivi per i power-up attivi (moltiplicatore punteggio corrente)
  - Schermata di start / titolo con istruzioni
  - Mobile-friendly: pulsanti e testi dimensionati per touch

- [ ] **🟠 #6 — Bilanciamento elementi e punteggio**: tutti i valori sono in `GameConfig.ts`, da calibrare:
  - Frequenza dei drink (troppi? troppo pochi?)
  - Guadagno party per drink (`PARTY_GAIN = 8` → servono ~13 drink per wasted)
  - Moltiplicatori punteggio per soglia party
  - Velocità e frequenza dei bouncer
  - Probabilità fango vs altri tipi di piattaforma
  - Distanza tra piattaforme (`SPACING_MIN/MAX`)

- [ ] **🟠 #7 — Curva di difficoltà**: attualmente la difficoltà cresce linearmente col livello, ma va affinata:
  - La gravità sale del 15% per livello → potrebbe essere troppo aggressiva ai livelli alti
  - Le piattaforme mobili diventano troppo veloci?
  - I bouncer sono troppo frequenti ai livelli alti?
  - Valutare una curva logaritmica invece che lineare per la difficoltà
  - Introdurre nuove meccaniche ai livelli superiori (nuovi tipi di piattaforme, power-up, ecc.)

---

## 📝 Note per gli Sviluppatori

### Come modificare il bilanciamento
Tutti i numeri che influenzano il gameplay sono in **`src/GameConfig.ts`**. Ogni costante ha un commento che spiega cosa fa. Modifica i valori lì e il cambiamento si propagherà ovunque.

### Come aggiungere un nuovo tipo di piattaforma
1. Aggiungi il tipo a `PlatformType` in `Platform.ts`
2. Aggiungi la texture al `preload()` di `GameScene.ts`
3. Implementa il comportamento in `Platform.initPlatform()`
4. Aggiungi le probabilità di spawn in `GameConfig.ts`
5. Aggiorna la logica in `SpawnManager.spawnPlatform()`

### Come aggiungere un nuovo nemico
1. Crea una classe in `src/` che estende `Phaser.Physics.Arcade.Sprite`
2. Aggiungi un gruppo in `SpawnManager.createGroups()`
3. Aggiungi il metodo di spawn in `SpawnManager`
4. Registra il collider in `GameScene.setupColliders()`
5. Aggiungi le costanti in `GameConfig.ts`

### Evento personalizzato usato
- **`"wasted-ready"`**: emesso da `PartyManager` quando il delay dello stato wasted scade. `GameScene` lo ascolta per chiamare `SpawnManager.spawnDJStage()`.

---

## 📄 Licenza

*Da definire*
