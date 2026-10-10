import {Container,Graphics,type Texture} from 'pixi.js';
import {GameView,type ViewData} from './ui-tree';
import {FrameRate} from './frame-rate';

/** ENHANCEMENT: screen-space performance counters; memory is JS heap, not total/GPU RAM. */
export class PerformanceHud extends Container {
  private frameRate=new FrameRate();
  private fps:GameView;
  private usedMemory:GameView;
  private allocatedMemory:GameView;
  constructor(label:ViewData,textures:Map<string,Texture>){
    super();this.eventMode='none';
    this.addChild(new Graphics()
      .poly([8,0,207,0,215,8,215,37,207,45,8,45,0,37,0,8]).fill(0x1b2015).stroke({color:0x302d21,width:4})
      .roundRect(4,4,207,37,6).stroke({color:0x8b8062,width:2})
      .roundRect(8,8,199,29,4).fill(0x11170f).stroke({color:0x4c5334,width:1})
      .moveTo(78,10).lineTo(78,35).stroke({color:0x716344,width:1}));
    const make=(x:number,y:number,width:number,height:number,fontSize:number,text:string,color:number[])=>{
      const data=structuredClone(label);data.pos={x,y};data.size={x:width,y:height};data.text_size={...data.size};
      data.font_size=fontSize;delete data._fitted_font_size;delete data.source_lines;
      // This custom panel centers the actual glyphs, not the source wave label's baseline.
      const context=document.createElement('canvas').getContext('2d')!;
      context.font=`${Math.round(fontSize*data._font_scale!*1.4)}px "${data.font_metrics!.name}"`;
      const metrics=context.measureText(text),ascent=metrics.actualBoundingBoxAscent,descent=metrics.actualBoundingBoxDescent;
      data.font_metrics={...data.font_metrics!,baseline:ascent,height:ascent+descent,descent:-descent};
      data.font_adj={};data.text_offset={x:0,y:0};data.vertical_align='middle';
      data.text=text;data.text_align='center';data.colors.text=color;
      const view=new GameView(data,textures,768/1080);this.addChild(view);return view;
    };
    this.fps=make(10,0,62,45,10,'FPS 120',[229,202,135]);
    this.usedMemory=make(83,6,120,16,8.5,'堆已用 48 MB',[190,199,152]);
    this.allocatedMemory=make(83,23,120,16,8.5,'堆分配 64 MB',[159,172,128]);
    this.fps.setText('FPS —');this.usedMemory.setText('堆已用 — MB');this.allocatedMemory.setText('堆分配 — MB');
  }
  sample(milliseconds:number){
    if(!this.frameRate.sample(milliseconds))return;
    this.fps.setText(`FPS ${this.frameRate.value}`);
    const memory=(performance as Performance & {memory?:{usedJSHeapSize:number;totalJSHeapSize:number}}).memory;
    this.usedMemory.setText(memory?`堆已用 ${(memory.usedJSHeapSize/1048576).toFixed(0)} MB`:'JS 内存不可用');
    this.allocatedMemory.setText(memory?`堆分配 ${(memory.totalJSHeapSize/1048576).toFixed(0)} MB`:'');
  }
  get value(){return this.frameRate.value;}
}
