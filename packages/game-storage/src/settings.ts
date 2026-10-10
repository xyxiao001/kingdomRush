import type {Resolution,DisplayMode,Volumes} from '@kingdom-rush/game-types';
export type {Resolution,DisplayMode,Volumes} from '@kingdom-rush/game-types';
export const RESOLUTIONS:Resolution[]=['native','720p','1080p','1440p','2160p'];
export const RESOLUTION_LABELS={native:'自动 / 原生', '720p':'1280 × 720','1080p':'1920 × 1080','1440p':'2560 × 1440','2160p':'3840 × 2160'};
export const DISPLAY_MODES:DisplayMode[]=['auto','original-16:9','original-view'];
export const DISPLAY_MODE_LABELS={auto:'自动适应','original-16:9':'原版 16:9','original-view':'原版视野'};
export function createSettings(storage:Pick<Storage,'getItem'|'setItem'>,volumeKey:string){
 const load=<T>(key:string,initial:()=>T):T=>{const value=storage.getItem(key);return value===null?initial():JSON.parse(value);};
 const save=(key:string,value:unknown)=>storage.setItem(key,JSON.stringify(value));
 return {
  loadVolumes:():Volumes=>load(volumeKey,()=>({sfx:1,music:.5})),
  saveVolumes:(value:Volumes)=>save(volumeKey,value),
  loadResolution:():Resolution=>load('display',()=>'native'),
  saveResolution:(value:Resolution)=>save('display',value),
  loadDisplayMode:():DisplayMode=>load('display-mode',()=>'auto'),
  saveDisplayMode:(value:DisplayMode)=>save('display-mode',value),
  loadPerformanceHud:():boolean=>load('performance-hud',()=>true),
  savePerformanceHud:(value:boolean)=>save('performance-hud',value),
 };
}
