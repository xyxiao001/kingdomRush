import {saveStorage} from './slots';
const KEY = 'seen';
export function loadSeen(): string[] {
  const value = saveStorage.getItem(KEY);
  return value === null ? [] : JSON.parse(value);
}
export function recordSeen(name: string) {
  const seen = loadSeen();
  if (seen.includes(name)) return;
  seen.push(name);
  saveStorage.setItem(KEY, JSON.stringify(seen));
}
