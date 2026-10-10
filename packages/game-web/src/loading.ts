import type {ResourceLoader,LoadingProgress} from '@kingdom-rush/asset-runtime/progress';

export function formatBytes(bytes:number){
  if(bytes<1024)return `${bytes} B`;
  if(bytes<1024*1024)return `${(bytes/1024).toFixed(1)} KiB`;
  return `${(bytes/1024/1024).toFixed(2)} MiB`;
}
export function setText(element:HTMLElement,text:string){if(element.textContent!==text)element.textContent=text;}
/** Original loading art, with byte progress independent of the game renderer. */
export class LoadingScreen {
  protected view=document.querySelector<HTMLElement>('#loading')!;
  protected fill=this.view.querySelector<HTMLElement>('.loading-fill')!;
  protected label=this.view.querySelector<HTMLElement>('.loading-label')!;
  protected stageLabel=this.view.querySelector<HTMLElement>('.loading-stage')!;
  protected summary=this.view.querySelector<HTMLElement>('.loading-summary')!;
  private list=this.view.querySelector<HTMLElement>('.loading-resources')!;
  protected track=this.view.querySelector<HTMLElement>('.loading-track')!;
  protected readonly debug=new URLSearchParams(location.search).has('debug');
  private details=new Map<string,{item:HTMLLIElement;detail:HTMLSpanElement}>();
  private pending=false;
  protected progress:LoadingProgress={stage:'正在启动游戏…',resources:[]};
  constructor(private resetCursor:()=>void,private resources:ResourceLoader,private game:{id:string;base:string}){
    this.view.toggleAttribute('data-debug',this.debug);
    this.resources.subscribe(progress=>{
      this.progress=progress;
      if(!this.pending){this.pending=true;requestAnimationFrame(()=>{this.pending=false;this.render();});}
    });
  }
  protected formatBytes(bytes:number){return formatBytes(bytes);}
  protected render(){
    const {stage,resources:rows}=this.progress;
    const loaded=rows.reduce((sum,row)=>sum+row.loaded,0),total=rows.reduce((sum,row)=>sum+row.total,0);
    const ready=rows.filter(row=>row.state==='ready').length,reused=rows.filter(row=>row.reused).length;
    const known=rows.length>0,percent=total===0?0:Math.floor(loaded/total*100);
    this.view.dataset.progress=JSON.stringify({stage,loaded,total,ready,count:rows.length,reused});
    setText(this.stageLabel,stage);
    setText(this.summary,known?(this.debug?`已读取 ${this.formatBytes(loaded)} / ${this.formatBytes(total)} · 已就绪 ${ready}/${rows.length} 项${reused?` · 复用 ${reused} 项`:''}`:`资源准备 ${ready} / ${rows.length}`):'正在准备，请稍候…');
    setText(this.label,known?`资源读取 ${percent}%${ready<rows.length&&loaded===total?' · 正在处理…':''}`:stage);
    this.track.classList.toggle('indeterminate',!known);
    if(known){this.fill.style.transform=`scaleX(${loaded/total})`;this.track.setAttribute('aria-valuenow',String(percent));}
    else this.track.removeAttribute('aria-valuenow');
    if(this.debug)this.renderDetails(rows);
  }
  protected renderDetails(rows:LoadingProgress['resources']){
    const urls=new Set(rows.map(row=>row.url));
    for(const [url,{item}] of this.details)if(!urls.has(url)){item.remove();this.details.delete(url);}
    const states={queued:'等待',reading:'读取中',processing:'解码 / 处理',ready:'已就绪'};
    rows.forEach((row,index)=>{
      if(!this.details.has(row.url)){
        const item=document.createElement('li');item.dataset.url=row.url;
        const name=document.createElement('span');name.className='loading-resource-name';
        name.textContent=decodeURI(row.url.replace(this.game.base+'assets/'+this.game.id+'/','').replace('/assets/',''));name.title=row.url;
        const detail=document.createElement('span');item.append(name,detail);
        this.details.set(row.url,{item,detail});
      }
      const {item,detail}=this.details.get(row.url)!;
      if(this.list.children[index]!==item)this.list.insertBefore(item,this.list.children.item(index));
      for(const [key,value] of Object.entries({state:row.state,loaded:String(row.loaded),total:String(row.total)})){
        if(item.dataset[key]!==value)item.dataset[key]=value;
      }
      setText(detail,`${this.formatBytes(row.loaded)} / ${this.formatBytes(row.total)} · ${row.reused?'已复用':states[row.state]}`);
    });
  }
  phase(stage:string,urls:string[]=[]){this.resources.phase(stage,urls);}
  stage(stage:string){this.resources.stage(stage);}
  hide(){this.render();this.view.hidden=true;}
  async transition(text:string,load:()=>Promise<void>){
    this.resetCursor();this.view.hidden=false;this.phase(text);
    await this.paint();await load();this.hide();
  }
  async paint(){await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));}
}
