import {saveStorage} from './slots';
export type Difficulty = 1 | 2 | 3 | 4;
const KEY = 'difficulty';
export function hasSavedDifficulty() { return saveStorage.getItem(KEY)!==null; }
export function loadDifficulty(): Difficulty {
  const saved = saveStorage.getItem(KEY);
  return saved === null ? 2 : JSON.parse(saved);
}
export function saveDifficulty(value: Difficulty) { saveStorage.setItem(KEY, JSON.stringify(value)); }
export function nextDifficulty(value: Difficulty): Difficulty { return (value % 4 + 1) as Difficulty; }
