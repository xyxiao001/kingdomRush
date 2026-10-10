export {GameView,setTextDensity,type ViewData} from '@kingdom-rush/game-web/ui-tree';
export {loadFonts,fontUrls} from '../loading/fonts';
import {atlasFrames} from '@kingdom-rush/game-web/textures';
import {loadTexture} from '../loading/textures';
import type {AtlasFrame} from '../content/types';
import {assetUrl} from './asset-url';
export async function atlasTextures(url:string,frames:Record<string,AtlasFrame>){return atlasFrames(await loadTexture(assetUrl(url)),frames);}
