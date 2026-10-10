import type {Bounds} from './types';
import type {DisplayMode,Resolution} from './types';

export const REFERENCE_BOUNDS:Bounds={x:0,y:0,width:1920,height:1080};
export const MAX_NATIVE_PIXELS=3840*2160;
const PRESET_PIXELS={'720p':1280*720,'1080p':1920*1080,'1440p':2560*1440,'2160p':3840*2160};

// ADAPTATION: screen coordinates depend on CSS aspect only, never pixel density.
export function screenLayout(cssWidth:number,cssHeight:number,mode:DisplayMode){
  const cssScale=Math.min(cssWidth/1920,cssHeight/1080);
  const width=cssWidth/cssScale,height=cssHeight/cssScale;
  const viewport=mode==='original-16:9'
    ? {x:(width-1920)/2,y:(height-1080)/2,width:1920,height:1080}
    : {x:0,y:0,width,height};
  return {width,height,cssScale,viewport};
}

// Presets are 16:9-equivalent pixel budgets; responsive backing keeps the CSS aspect.
export function renderQuality(cssWidth:number,cssHeight:number,dpr:number,choice:Resolution){
  const area=cssWidth*cssHeight;
  const requestedScale=choice==='native'?dpr:Math.sqrt(PRESET_PIXELS[choice]/area);
  const renderScale=choice==='native'?Math.min(requestedScale,Math.sqrt(MAX_NATIVE_PIXELS/area)):requestedScale;
  return {dpr,requestedBacking:{width:cssWidth*requestedScale,height:cssHeight*requestedScale},
    finalBacking:{width:Math.floor(cssWidth*renderScale),height:Math.floor(cssHeight*renderScale)},renderScale};
}

export function cameraFrame(viewport:Bounds,world:Bounds,mode:DisplayMode,safe?:Bounds){
  const contain=Math.min(viewport.width/world.width,viewport.height/world.height);
  const cover=Math.max(viewport.width/world.width,viewport.height/world.height);
  const fitSafe=safe?Math.min(viewport.width/safe.width,viewport.height/safe.height):cover;
  const scale=mode==='auto'?Math.min(cover,fitSafe):contain;
  const width=Math.min(viewport.width,world.width*scale),height=Math.min(viewport.height,world.height*scale);
  return {scale,viewport:{x:viewport.x+(viewport.width-width)/2,y:viewport.y+(viewport.height-height)/2,width,height}};
}
