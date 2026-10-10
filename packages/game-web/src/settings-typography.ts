import type {ViewData} from './ui-tree';

/** Settings use 1080-space sizes, including the pause menu authored at 768. */
export function settingsPanelData(source:ViewData):ViewData {
 const data=structuredClone(source);
 const size=(label:ViewData,pixels:number)=>{
  const fontSize=pixels/label._font_scale!,ratio=fontSize/(label._fitted_font_size??label.font_size!);
  label.font_size=fontSize;delete label._fitted_font_size;
  const metrics=label.font_metrics!;
  metrics.height*=ratio;metrics.baseline*=ratio;metrics.descent*=ratio;
 };
 const visit=(view:ViewData)=>{
  if(view.class==='class GGOptionsButton')size(view.children[0],19);
  if(view.font_name==='h')size(view,28.125);
  for(const child of view.children)visit(child);
 };
 visit(data);return data;
}
