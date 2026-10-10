import {createStorageKeys} from '@kingdom-rush/game-storage';
import {game} from '../../game.config';

export const storageKeys=createStorageKeys(game.id,game.saveVersion);
export const settingsStorage={
  getItem:(field:string)=>localStorage.getItem(storageKeys.settings(field)),
  setItem:(field:string,value:string)=>localStorage.setItem(storageKeys.settings(field),value),
};
