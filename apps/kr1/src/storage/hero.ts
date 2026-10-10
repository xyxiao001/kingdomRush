import {saveStorage} from './slots';
import type {HeroId} from '../content/heroes';
const KEY='hero';
export function loadSelectedHero():HeroId {const value=saveStorage.getItem(KEY);return value===null?'gerald':JSON.parse(value);}
export function saveSelectedHero(id:HeroId){saveStorage.setItem(KEY,JSON.stringify(id));}
