import {resources} from './progress';
const families=['AlibabaPuHuiTi-3-55-Regular','AlibabaPuHuiTi-3-85-Bold','JIMOJW','TOONISH','Comic Book Italic'];
export const fontUrls=families.map(name=>`/assets/kr1/fonts/${name}.woff2`);
const fonts=new Map<string,Promise<void>>();
export function loadFont(name:string){
  if(!fonts.has(name))fonts.set(name,(async()=>{
    const url=`/assets/kr1/fonts/${name}.woff2`,data=await (await resources.fetch(url)).arrayBuffer();
    const face=new FontFace(name,data);await face.load();document.fonts.add(face);resources.ready(url);
  })());
  return fonts.get(name)!;
}
export async function loadFonts(){await Promise.all(families.map(loadFont));}
