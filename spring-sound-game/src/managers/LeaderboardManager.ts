import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  setDoc,
  query,
  orderBy,
  limit,
  getDocs,
} from "firebase/firestore";
import { getAuth, signInAnonymously } from "firebase/auth";

// Build > Project Settings > Your apps > Config
const firebaseConfig = {
  apiKey: "AIzaSyDUmSmjdRObhpalREixCkZINO2tRsaeU3k",
  authDomain: "spring-sound-game.firebaseapp.com",
  projectId: "spring-sound-game",
  storageBucket: "spring-sound-game.firebasestorage.app",
  messagingSenderId: "204087163420",
  appId: "1:204087163420:web:59ee407c3fae37b403fdd9",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

export interface ScoreEntry {
  nickname: string;
  score: number;
  level: number;
  timestamp: number;
  hash: string;
}

export class LeaderboardManager {
  /**
   * Autenticazione anonima — va chiamata all'avvio del gioco in background.
   * Senza auth, le regole Firestore bloccano le scritture.
   */
  public static async init(): Promise<void> {
    try {
      await signInAnonymously(auth);
      console.log("LeaderboardManager: autenticazione anonima OK");
    } catch (e) {
      console.error("LeaderboardManager: auth fallita", e);
    }
  }

  private static async generateHash(score: number): Promise<string> {
    const msgBuffer = new TextEncoder().encode(score.toString());
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  /**
   * Controlla se un nickname è ancora libero (nessun documento con quell'ID).
   * In caso di errore di rete restituisce true per non bloccare l'utente.
   */
  public static async isNicknameAvailable(nickname: string): Promise<boolean> {
    try {
      const docRef = doc(db, "leaderboard", nickname);
      const snap = await getDoc(docRef);
      return !snap.exists();
    } catch {
      return true;
    }
  }

  /**
   * Salva il punteggio su Firestore usando il nickname come ID documento.
   * Ogni nickname ha un solo record — viene aggiornato solo se il nuovo
   * punteggio supera quello già salvato (best-score per utente).
   * L'ownerUid collega il record all'identità anonima Firebase del dispositivo:
   * le Firestore Rules bloccano update da UID diversi (protezione incognito).
   */
  public static async submitScore(
    nickname: string,
    score: number,
    level: number,
  ): Promise<void> {
    if (!nickname || score <= 0) return;

    try {
      const docRef = doc(db, "leaderboard", nickname);
      const existing = await getDoc(docRef);

      // Non sovrascrivere se il punteggio salvato è già migliore o uguale
      if (existing.exists() && (existing.data() as ScoreEntry).score >= score) {
        return;
      }

      const timestamp = Date.now();
      const hash = await this.generateHash(score);
      const ownerUid = auth.currentUser?.uid ?? "";

      // setDoc sostituisce l'intero documento (upsert)
      await setDoc(docRef, {
        nickname,
        score,
        level,
        timestamp,
        hash,
        ownerUid,
      });
    } catch (e) {
      console.error("LeaderboardManager: errore salvataggio punteggio", e);
    }
  }

  /**
   * Recupera i top punteggi verificando l'hash anticheat.
   * Poiché ogni documento ha il nickname come ID, non ci sono duplicati:
   * ogni utente compare al massimo una volta con il suo punteggio migliore.
   */
  public static async getTopScores(): Promise<ScoreEntry[]> {
    const q = query(
      collection(db, "leaderboard"),
      orderBy("score", "desc"),
      limit(10),
    );
    const querySnapshot = await getDocs(q);

    const validScores: ScoreEntry[] = [];

    for (const doc of querySnapshot.docs) {
      const data = doc.data() as ScoreEntry;
      const expectedHash = await this.generateHash(data.score);

      if (data.hash === expectedHash) {
        validScores.push(data);
      }
    }

    return validScores;
  }
}
