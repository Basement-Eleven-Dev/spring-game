/**
 * CONFIGURAZIONE CENTRALIZZATA DEL GIOCO
 * ========================================
 * Tutte le costanti di bilanciamento, dimensioni e probabilità
 * risiedono qui. Modifica questi valori per calibrare il gameplay.
 */

// --- Dimensioni del gioco (responsive) ---

/**
 * Calcola l'altezza del canvas in base all'aspect ratio del dispositivo.
 * Su smartphone moderni (19.5:9) il gioco riempie lo schermo verticalmente.
 * Su tablet/desktop viene clampato a un ratio ragionevole.
 */
function calculateGameHeight(width: number): number {
  if (typeof window === "undefined") return 700;
  const ratio = window.innerHeight / window.innerWidth;
  const clampedRatio = Math.max(1.5, Math.min(ratio, 2.3));
  return Math.round(width * clampedRatio);
}

const GAME_WIDTH = 400;
const GAME_HEIGHT = calculateGameHeight(GAME_WIDTH);

export const GAME = {
  WIDTH: GAME_WIDTH,
  HEIGHT: GAME_HEIGHT,
};

/**
 * Posizioni iniziali calcolate in base all'altezza reale del canvas.
 */
export const INITIAL = {
  BASE_PLATFORM_Y: GAME_HEIGHT - 20,
  PLAYER_START_Y: GAME_HEIGHT - 100,
};

// --- Fisica ---
export const PHYSICS = {
  BASE_GRAVITY: 750,
  /**
   * Incremento gravità per livello — curva LOGARITMICA:
   * Livello 1: 750 | 2: 855 | 3: 923 | 5: 1010 | 10: 1111
   * Formula: BASE × (1 + SCALE × ln(level))
   * Rispetto al lineare (+15%/lvl), cresce meno ai livelli alti → meno punitiva
   */
  GRAVITY_SCALE_PER_LEVEL: 0.22,
} as const;

// --- Camera ---
export const CAMERA = {
  /** Fluidità dello scrolling verticale (0 = lento, 1 = scatto) */
  LERP: 0.1,
  DRUNK_ROTATION_SPEED: 200,
  DRUNK_MAX_AMPLITUDE: 0.05,
} as const;

// --- Giocatore ---
export const PLAYER = {
  SIZE: 40,
  MOVE_SPEED: 280,
  JUMP_FORCE: 580,
} as const;

// --- Piattaforme ---
export const PLATFORM = {
  WIDTH: 85,
  HEIGHT: 18,
  SUBWOOFER_SIZE: 55,

  SPACING_MIN: 55,
  SPACING_MAX: 115,
  /** Max spostamento orizzontale tra piattaforme consecutive */
  REACH_X: 130,
  /** Piattaforme iniziali generate al create */
  INITIAL_COUNT: 14,

  BASE_WIDTH: 400,
  BASE_HEIGHT: 15,

  // --- Probabilità di spawn (crescono col livello) ---
  /** Le piattaforme mobili appaiono dal livello 1 ma sono rare all'inizio */
  MOVING_BASE_PROB: 0.05,
  MOVING_PROB_PER_LEVEL: 0.04,
  MOVING_MAX_PROB: 0.30,

  /** Le piattaforme fragili appaiono dal livello 2 */
  FRAGILE_BASE_PROB: 0.0,
  FRAGILE_PROB_PER_LEVEL: 0.06,
  FRAGILE_MAX_PROB: 0.25,

  /** Subwoofer: raro ma costante */
  SUBWOOFER_PROB: 0.08,

  // --- Velocità piattaforme mobili ---
  MOVING_SPEED_MIN: 50,
  MOVING_SPEED_MAX: 100,
  MOVING_SPEED_SCALE_PER_LEVEL: 0.15,
} as const;

// --- Fango (rallenta il salto) ---
export const MUD = {
  WIDTH: 40,
  HEIGHT: 10,
  BASE_PROB: 0.15,
  PROB_PER_LEVEL: 0.04,
  MAX_PROB: 0.40,
  /** Il fango appare solo dal livello 3 */
  MIN_LEVEL: 3,
  OFFSET: 20,
} as const;

// --- Drink ---
export const DRINK = {
  WIDTH: 20,
  HEIGHT: 30,
  /** Probabilità drink su piattaforma — più alto = party più veloce */
  SPAWN_PROB_ON_PLATFORM: 0.12,
  /** Distanza tra drink cadenti (px di salita) */
  SPAWN_INTERVAL: 300,
  FALLING_SPEED: 110,
  /** Party gain per drink: 10 drink per raggiungere il wasted */
  PARTY_GAIN: 10,
} as const;

// --- Bouncer (buttafuori) ---
export const BOUNCER = {
  SIZE: 70,
  BASE_SPEED: 220,
  SPEED_PER_LEVEL: 15,
  /** I bouncer appaiono ogni N pixel di salita */
  MIN_INTERVAL: 400,
  BASE_INTERVAL: 800,
  INTERVAL_REDUCTION_PER_LEVEL: 40,
  TELEGRAPH_DURATION: 200,
  TELEGRAPH_REPEATS: 3,
  /** I bouncer appaiono solo dal livello 2 */
  MIN_LEVEL: 2,
  KNOCKBACK_FORCE: 700,
} as const;

// --- Party System ---
export const PARTY = {
  /** Posizione dinamica della barra: centrata orizzontalmente, in alto */
  BAR_WIDTH: 140,
  BAR_HEIGHT: 14,
  MAX_LEVEL: 100,

  // Soglie di colore
  THRESHOLD_YELLOW: 30,
  THRESHOLD_ORANGE: 60,
  THRESHOLD_RED: 100,

  // Moltiplicatori punteggio
  MULTIPLIER_NORMAL: 1,
  MULTIPLIER_YELLOW: 1.5,
  MULTIPLIER_ORANGE: 2.5,
  MULTIPLIER_WASTED: 4,
} as const;

// --- Progressione livelli ---
export const LEVEL = {
  DJ_STAGE_OFFSET: 180,
  DJ_STAGE_PLATFORMS: 10,
  DJ_STAGE_SPACING_MIN: 100,
  DJ_STAGE_SPACING_MAX: 180,
  WASTED_DELAY: 4000,
  LEVEL_UP_BONUS: 1500,
  JUMP_BOOST_ON_STAGE: 1.4,
} as const;

// --- Moltiplicatori di salto ---
export const JUMP_MULTIPLIERS = {
  NORMAL: 1,
  SUBWOOFER: 1.7,
  MUD: 0.75,
} as const;
