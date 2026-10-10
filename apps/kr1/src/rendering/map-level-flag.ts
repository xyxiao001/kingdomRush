import {MapLevelFlag as SharedMapLevelFlag} from '@kingdom-rush/game-web/map-level-flag';
import {loadLevelProgress,isLevelUnlocked} from '../storage/progress';
import {loadChallenges} from '../storage/challenges';
import type {GameView} from './ui-tree';
import type {Texture} from 'pixi.js';
export class MapLevelFlag extends SharedMapLevelFlag {
 constructor(id:number,view:GameView,textures:Map<string,Texture>,sound:()=>void){super(id,view,textures,sound,{stars:id=>loadLevelProgress(id).stars,challenges:loadChallenges,unlocked:isLevelUnlocked});}
}
