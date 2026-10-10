interface Key {frame:number;x:number;y:number;sx:number;sy:number;alpha:number;ease:number}
interface ComicSprite {id:string;image:{url:string;width:number;height:number};anchor:number[];keys:Key[]}
export interface ComicData {width:number;height:number;end:number;sprites:ComicSprite[];texts:{sid:string;text:string;x:number;y:number;width:number;height:number;rotation:number;font?:string;lines?:string[]}[]}
/** Source CSV frames at 30 fps, including source anchors, per-panel tween and text. */
export class Comic {
 private dialog=document.createElement('dialog');private stage=document.createElement('div');private raf=0;private frame=0;private last=0;private resolve!:()=>void;
 private views=new Map<string,HTMLElement>();private finishing=false;
 constructor(private data:ComicData,private images:string[],private options:{label:string;activation:'click'|'pointerdown';exitSeconds:number;onExit:()=>void}){this.dialog.id='comic';this.dialog.setAttribute('aria-label',options.label);this.stage.className='comic-stage';this.dialog.append(this.stage);}

 play(fadeIn?:{color:string;duration:number}){
  this.data.sprites.forEach((s,i)=>{const view=document.createElement('div'),image=document.createElement('img');view.className='comic-panel';view.style.width=`${s.image.width*768/1080}px`;view.style.height=`${s.image.height*768/1080}px`;image.src=this.images[i];image.alt='';view.append(image);this.views.set(s.id,view);this.stage.append(view);});
  for(const t of this.data.texts){const view=this.views.get(t.sid)!,s=this.data.sprites.find(s=>s.id===t.sid)!,text=document.createElement('span');text.textContent=t.text;Object.assign(text.style,{left:`${t.x+s.anchor[0]*s.image.width*768/1080-t.width/2}px`,top:`${t.y+s.anchor[1]*s.image.height*768/1080-t.height/2}px`,width:`${t.width}px`,height:`${t.height}px`,transform:`rotate(${-t.rotation}deg)`});if(t.font)text.style.font=t.font;if(t.lines){text.textContent=t.lines.join('\n');text.style.whiteSpace='pre';}view.append(text);}
  const advance=()=>{if(this.finishing)return;if(this.frame<this.data.end){this.frame=this.data.end;this.render();}else{this.finishing=true;this.options.onExit();if(this.options.exitSeconds===0){this.destroy();this.resolve();}else{const fade=this.stage.animate([{opacity:1},{opacity:0}],{duration:this.options.exitSeconds*1000,fill:'forwards'});fade.onfinish=()=>{this.destroy();this.resolve();};}}};
  this.dialog.addEventListener(this.options.activation,advance);this.dialog.onkeydown=e=>{e.preventDefault();e.stopPropagation();advance();};this.dialog.oncancel=e=>e.preventDefault();document.body.append(this.dialog);this.dialog.showModal();
  if(fadeIn){const cover=document.createElement('div');Object.assign(cover.style,{position:'absolute',inset:'0',background:fadeIn.color,pointerEvents:'none'});this.dialog.append(cover);cover.animate([{opacity:1},{opacity:0}],{duration:fadeIn.duration*1000,fill:'forwards'});}
  const tick=(now:number)=>{if(this.last)this.frame=Math.min(this.data.end,this.frame+(now-this.last)*.03);this.last=now;this.render();this.raf=requestAnimationFrame(tick);};this.raf=requestAnimationFrame(tick);
  return new Promise<void>(resolve=>{this.resolve=resolve;});
 }
 private render(){
  this.stage.style.transform=`translate(-50%,-50%) scale(${Math.min(innerWidth/this.data.width,innerHeight/this.data.height)})`;
  for(const s of this.data.sprites){const v=this.views.get(s.id)!;let k=s.keys[0];for(let i=1;i<s.keys.length;i++){const b=s.keys[i];if(this.frame>=b.frame){k=b;continue;}const a=s.keys[i-1],p=Math.max(0,Math.min(1,(this.frame-a.frame)/(b.frame-a.frame))),e=p===0?0:p===1?1:b.ease>0?1-2**(-10*p):2**(10*p-10);k={...a,x:a.x+(b.x-a.x)*e,y:a.y+(b.y-a.y)*e,sx:a.sx+(b.sx-a.sx)*e,sy:a.sy+(b.sy-a.sy)*e,alpha:a.alpha+(b.alpha-a.alpha)*e};break;}
   v.style.opacity=String(this.frame<s.keys[0].frame?0:k.alpha);v.style.transformOrigin=`${s.anchor[0]*100}% ${s.anchor[1]*100}%`;v.style.left=`${k.x-s.anchor[0]*s.image.width*768/1080}px`;v.style.top=`${k.y-s.anchor[1]*s.image.height*768/1080}px`;v.style.transform=`scale(${k.sx},${k.sy})`;
  }
 }
 destroy(){cancelAnimationFrame(this.raf);this.dialog.remove();}
}
