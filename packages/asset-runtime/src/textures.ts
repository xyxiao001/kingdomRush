import {Assets,DOMAdapter,Texture,Rectangle} from 'pixi.js';
import type {ResourceLoader} from './progress';
import type {AtlasFrame} from '@kingdom-rush/game-types';

// One adapter per application; Pixi continues owning texture caching and decoding.
export function textureLoader(resources:Pick<ResourceLoader,'fetch'|'ready'>,resourceUrl:(url:string)=>string){
  Assets.setPreferences({preferWorkers:false});
  DOMAdapter.set({...DOMAdapter.get(),fetch:input=>resources.fetch(decodeURI(new URL(String(input),location.href).pathname))});
  return async (url:string)=>{const texture=await Assets.load<Texture>(resourceUrl(url));resources.ready(url);return texture;};
}
export function atlasFrames(atlas:Texture,frames:Record<string,AtlasFrame>){
  return new Map(Object.entries(frames).map(([name,f])=>[name,new Texture({source:atlas.source,
    frame:new Rectangle(...f.rect as [number,number,number,number]),
    orig:new Rectangle(0,0,f.size[0],f.size[1]),
    trim:new Rectangle(f.trim[0],f.trim[1],f.rect[2],f.rect[3]),
  })]));
}
