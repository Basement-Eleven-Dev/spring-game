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
  ├── Overlay HTML (start screen + permesso iOS) → startGame()
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

- `GAME` — dimensioni del canvas (400×altezza responsiva)
- `PHYSICS` — gravità base e scaling per livello
- `TIME` — orologio narrativo: `START_MINUTES` (960 = 16:00), `DURATION_MINUTES` (720), `NIGHT_TRIGGER_MINUTES` (300 = 21:00)
- `SKY` — colori di sfondo giorno (`0x87CEEB`) e notte (`0x0a0a2e`)
- `minutesToClockString()` — helper esportato: converte minuti trascorsi in stringa "HH:MM"
- `CAMERA` — lerp dello scrolling, parametri oscillazione ubriachezza
- `PLAYER` — velocità, forza salto, `GYRO_DEADZONE` (8°) e `GYRO_MAX_TILT` (28°) per il controllo via device orientation
- `PLATFORM` — dimensioni, spacing, probabilità di spawn per tipo
- `MUD` — probabilità e dimensioni del fango
- `DRINK` — intervallo spawn, velocità caduta, guadagno party
- `BOUNCER` — dimensioni, velocità, intervallo spawn, knockback
- `PARTY` — soglie colore barra, moltiplicatori punteggio
- `LEVEL` — parametri DJ Stage, bonus level up
- `JUMP_MULTIPLIERS` — normale (×1), subwoofer (×1.7), fango (×0.75)

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
  3. **Device orientation** (`deviceorientation` → valore `gamma`) — sovrascrive gli altri se il tilt supera la deadzone
- **Mappatura gamma → velocità**: `clamp((|gamma| - DEADZONE) / (MAX_TILT - DEADZONE), 0, 1) × MOVE_SPEED × sign(gamma)`. Tra 0° e 8° (deadzone) non si muove nulla; a 28° si raggiunge la velocità piena.
- **Permessi**: la logica di `requestPermission()` è gestita interamente dall'overlay in `main.ts`, non qui. `Player` si limita ad aggiungere il listener `deviceorientation`: su iOS riceve eventi solo dopo il permesso, su Android funziona subito.
- **Effetto inerzia**: il party level rende il movimento più "pesante" (lerp factor cubico)
- **Wrap ai bordi**: effetto Pac-Man (esce da un lato, rientra dall'altro)
- **Cleanup**: rimuove il listener `deviceorientation` su `destroy()` per evitare memory leak tra un game over e l'altro

### `Platform.ts` — Piattaforme

4 tipi con comportamenti diversi:

| Tipo        | Texture                 | Comportamento                                |
| ----------- | ----------------------- | -------------------------------------------- |
| `standard`  | `pedana_standard.png`   | Ferma. Può avere fango sopra (dal livello 2) |
| `moving`    | `pedana_scorrevole.png` | Si muove orizzontalmente, rimbalza ai bordi  |
| `fragile`   | `pedana_rotta.png`      | Si distrugge al primo tocco del giocatore    |
| `subwoofer` | `trampolino.png`        | Dà un salto potenziato (×1.6)                |

Proprietà speciali:

- `isBasePlatform` — piattaforme non riciclabili (pavimento iniziale, DJ Stage)
- `isDJStage` — checkpoint di livello (atterrandoci si passa al livello successivo)
- Collisioni solo dall'alto (il giocatore può saltare attraverso dal basso)

### `Drink.ts` — Drink Collezionabili

- **Statico**: fermo su una piattaforma (10% di probabilità)
- **Cadente**: piove dall'alto ogni 250px di salita
- Ogni drink raccolto incrementa il party level di +8 (su 100)

### `Bouncer.ts` — Buttafuori

- Posizionato su un **bordo** (sx o dx, casuale) delle piattaforme standard e fragili
- Dimensione ridotta (40px) per lasciare spazio al giocatore sul lato opposto
- È immobile: non ha gravità né velocità, è solidale alla posizione della piattaforma
- Al contatto respinge il giocatore verso il basso con forza 700
- Appare dal livello 2, con probabilità crescente: `15% + 4%/livello` (max 40%)

---

## ⚙️ Manager

### `CameraManager` — Camera + Effetti Visivi

- **Smooth scroll**: segue il giocatore verso l'alto con lerp 0.1 (non scende mai)
- **Background giorno/notte**: un rettangolo fixed (`scrollFactor 0`, `depth -1`) parte con il colore giorno. Al primo level up dopo le 21:00, `switchToNight()` anima un tween di 2s verso blu notte.
- **Rotazione ubriachezza**: oscillazione sinusoidale con ampiezza esponenziale (si attiva sopra la soglia gialla del party)
- **Blur post-processing**: effetto sfocatura attivato nello stato wasted
- **`clearEffects()`**: rimuove blur e rotazione al reset del livello

### `ScoreManager` — Punteggio + HUD

- **Punteggio** basato su distanza verticale percorsa (10px = 1 unità) × livello × moltiplicatore party:

| Party Level  | Soglia  | Moltiplicatore |
| ------------ | ------- | -------------- |
| 0-33         | Verde   | ×1             |
| 34-66        | Giallo  | ×1.5           |
| 67-99        | Arancio | ×2             |
| 100 (wasted) | Rosso   | ×3             |

- **Bonus**: +1500 × livello al completamento di ogni livello
- **HUD**: orario narrativo in alto a sinistra `HH:MM | Y pts | Lv Z`. L'orario è gestito dall'orologio indipendente di `GameScene` (1 sec reale = 1 min).

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

| Tipo                | Base  | Per Livello | Max             |
| ------------------- | ----- | ----------- | --------------- |
| Moving              | 10%   | +5%/lvl     | 35%             |
| Fragile             | 10%   | +5%/lvl     | 30%             |
| Subwoofer           | 10%   | fisso       | 10%             |
| Standard            | resto | —           | —               |
| Fango (su standard) | 20%   | +5%/lvl     | 50% (dal lvl 2) |

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

- [x] **🔴 BUG #1 — Bouncer spawna a metà schermo** ✅ FIXATO
  - **Causa**: `camScrollY` veniva catturato quando partiva il telegraph "!" (~900ms prima dello spawn). Durante l'animazione la camera saliva col giocatore, rendendo la posizione salvata ormai a metà schermo.
  - **Fix**: in `SpawnManager.spawnBouncerTelegraph()`, la scrollY viene letta nel callback `onComplete` del tween (non al momento del trigger).

- [x] **🔴 BUG #2 — Il livello non scatta senza toccare il DJ Stage** ✅ FIXATO
  - **Causa**: il DJ Stage aveva collisione solo dall'alto (`checkCollision.down = false`). Il giocatore lo attraversava dal basso e atterrava sulle piattaforme sopra, saltando il livello.
  - **Fix**: in `SpawnManager.spawnDJStage()`, il DJ Stage ora ha collisione da tutte le direzioni. In `GameScene.setupColliders()`, il level-up scatta a qualsiasi contatto col DJ Stage, poi la collisione viene resettata a "solo dall'alto" per permettere il salto successivo.

### Miglioramenti Necessari

- [ ] **🟡 #3 — Responsive design / dimensioni adattive**: attualmente le dimensioni del canvas sono fisse (400×700). Su schermi di dimensioni diverse la percezione del gioco cambia drasticamente. Serve una soluzione che adatti le dimensioni di gioco (piattaforme, player, spacing) al dispositivo, mantenendo le proporzioni coerenti. Possibili approcci:
- [x] **🟡 #3 — Responsive design / dimensioni adattive** ✅ FIXATO
  - **Soluzione**: l'altezza del canvas viene calcolata dinamicamente in `GameConfig.ts` basandosi sull'aspect ratio del dispositivo (`window.innerHeight / window.innerWidth`), clampato tra 1.5 e 2.3.
  - La larghezza resta fissa a 400px (gameplay orizzontale coerente), solo l'altezza varia.
  - Tutte le posizioni iniziali (player, piattaforma base) sono ora derivate da `INITIAL.PLAYER_START_Y` e `INITIAL.BASE_PLATFORM_Y`.
  - Esempi: iPhone 14 → 400×864, iPhone SE → 400×711, Pixel 7 → 400×888.
  - `Scale.FIT` + `CENTER_BOTH` gestiscono lo scaling al viewport.

- [x] **🟡 #4 — Supporto device orientation (gamma)** ✅ COMPLETATO
  - **Tecnologia corretta**: non il giroscopio grezzo ma `DeviceOrientationEvent.gamma` (sensor fusion OS) — inclinazione sinistra/destra, range -90°/+90°.
  - **HTTPS in LAN**: `vite.config.ts` con `@vitejs/plugin-basic-ssl` genera un certificato self-signed. Basta avviare con `npm run dev -- --host` per servire in HTTPS su tutta la rete locale. Necessario per Safari iOS anche in sviluppo.
  - **Permesso iOS**: gestito da un `<button>` HTML puro nell'overlay di `main.ts` — fuori da Phaser. Safari richiede che `DeviceOrientationEvent.requestPermission()` venga chiamato sincronicamente dall'handler nativo di un gesto utente; Phaser bufferizza tutto nel game loop rompendo questo requisito.
  - **Overlay start screen**: blocca l'avvio di Phaser finché l'utente non preme GIOCA. Su Android avvia direttamente; su iOS richiede prima il permesso sensore.
  - **Player.ts**: aggiunge il listener `deviceorientation` direttamente. Deadzone 2°, velocità piena a 28°. Listener rimosso su `destroy()`.
  - **File toccati**: `vite.config.ts` (nuovo), `main.ts`, `Player.ts`, `GameConfig.ts`

- [x] **🟠 #5 — Ridefinire la UI** ✅ COMPLETATO
  - **HUD premium**: barra scura semitrasparente in alto, distanza/punteggio a sinistra, livello/moltiplicatore a destra
  - **Font custom**: Google Fonts "Outfit" importato nel CSS
  - **Party bar**: centrata sotto l'HUD, angoli arrotondati, sfondo scuro, percentuale dinamica, flash bianco al raccoglimento drink, etichetta "🍺 WASTED"
  - **Moltiplicatore visibile**: il moltiplicatore punteggio attivo è mostrato con colore corrispondente (verde/giallo/arancio/rosso)
  - **Level Up**: animazione gold con glow, scale-in con bounce + fade out
  - **Game Over**: due versioni a seconda della causa:
    - **Caduta** (`isTimeout: false`): titolo "GAME OVER" rosso, sottotitolo "Sei tornato a casa troppo presto"
    - **Sopravvissuto** (`isTimeout: true`): titolo "04:00" oro, sottotitolo "Hai retto fino all'alba! 🌅"
    - Statistiche: orario raggiunto (`HH:MM`), punteggio, livello — pulsante "RIPROVA" con hover interattivo
  - **Mobile-friendly**: touch-action: manipulation (no zoom), user-select: none, viewport 100dvh

- [x] **🟠 #6 — Bilanciamento elementi e punteggio** ✅ COMPLETATO
  - Party gain: 10 per drink (servono 10 drink per wasted, prima erano 13)
  - Drink su piattaforma: 12% (prima 10%)
  - Drink cadenti: ogni 300px (prima 250px) — meno spam
  - Moltiplicatori punteggio: ×1 / ×1.5 / ×2.5 / ×4 (prima ×1/1.5/2/3)
  - Bouncer: appare dal livello 2 (prima dal 1), knockback ridotto a 700 (prima 800)
  - Bouncer intervallo base: 800px (prima 700px), riduzione più lenta per livello
  - Piattaforme fragili: 0% al livello 1, crescono dal 2 (+6%/lvl, max 25%)
  - Fango: appare dal livello 3 (prima dal 2)
  - Piattaforme mobili: 5% al livello 1 (prima 10%), crescita più graduale
  - Spacing: 55-115px (prima 50-130px) — range più coerente
  - 14 piattaforme iniziali (prima 12) — inizio meno claustrofobico
  - DJ Stage: più lontano (180px offset vs 150), più piattaforme dopo (10 vs 8)
  - Bonus level up: 1500 × livello (prima 1000)

- [x] **🟠 #7 — Curva di difficoltà** ✅ COMPLETATO
  - **Gravità logaritmica**: `BASE × (1 + 0.22 × ln(livello))` invece che lineare +15%/livello
    - Lvl 1: 750 → 2: 866 → 3: 931 → 5: 1016 → 10: 1130
    - Cresce veloce ai primi livelli, poi si stabilizza — molto meno punitiva ai livelli alti
  - **Introduzione graduale degli ostacoli**:
    - Livello 1: solo piattaforme standard + mobili (rare) + subwoofer
    - Livello 2: si aggiungono bouncer e piattaforme fragili
    - Livello 3: si aggiunge il fango
  - **Velocità piattaforme mobili**: +15%/livello (prima +20%) con cap più basso

- [x] **🟣 #8 — Orologio narrativo + background giorno/notte** ✅ COMPLETATO
  - Il tempo scorre in modo **indipendente dal gameplay**: 1 secondo reale = 1 minuto narrativo
  - La serata parte alle **16:00** e termina alle **04:00** (720 secondi = ~12 minuti reali)
  - **HUD**: mostra l'ora corrente `HH:MM` — il punteggio rimane basato sulla salita verticale del giocatore
  - **Background**: solo 2 stati (giorno / notte). Dopo le **21:00** (300 sec), al **prossimo level up** scatta un tween di 2s da azzurro a blu notte
  - **Fine gioco alle 04:00**: `GameScene` intercetta il timeout e mostra la `GameOverScene` con titolo speciale "04:00" e messaggio "Hai retto fino all'alba!"
  - **File toccati**: `GameConfig.ts`, `ScoreManager.ts`, `CameraManager.ts`, `GameScene.ts`, `GameOverScene.ts`

- [x] **🟣 #9 — Bouncer su piattaforma** ✅ COMPLETATO
  - I bouncer non cadono più dall'alto: sono **fissi su un bordo** (sx o dx, casuale) delle piattaforme standard e fragili
  - Dimensione ridotta a **40px** (da 70px) — resta interamente dentro la pedana con ~22px liberi sul lato opposto
  - Rimossi: telegraph "!", velocità di caduta, `lastBouncerSpawnY`, `spawnBouncerTelegraph()`
  - Probabilità spawn: `15% + 4%/livello` (max 40%) — le piattaforme mobili e subwoofer non hanno bouncer
  - **File toccati**: `GameConfig.ts`, `Bouncer.ts`, `SpawnManager.ts`

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

_Da definire_
