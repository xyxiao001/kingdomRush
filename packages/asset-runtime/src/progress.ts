export interface ResourceProgress {
  url:string; loaded:number; total:number;
  state:'queued'|'reading'|'processing'|'ready'; reused:boolean;
}
export interface LoadingProgress {stage:string;resources:ResourceProgress[]}

/** The two existing byte-accounting contracts; selected by the owning app. */
export interface ByteAccounting {
 total(size:number):number;
 begin(row:ResourceProgress):{chunk(bytes:number):void;finish():void};
}
export const manifestAccounting:ByteAccounting={
 total:size=>size,
 begin:row=>({chunk:bytes=>{row.loaded+=bytes;},finish:()=>{}}),
};
export class ResourceLoader {
  constructor(private resourceUrl:(url:string)=>string,private accounting:ByteAccounting){}
  private sizes:Record<string,number>={};
  private records=new Map<string,ResourceProgress>();
  private current:LoadingProgress={stage:'正在启动游戏…',resources:[]};
  private listeners=new Set<(progress:LoadingProgress)=>void>();
  configure(sizes:Record<string,number>){this.sizes=Object.fromEntries(Object.entries(sizes).map(([url,size])=>[this.resourceUrl(url),size]));}
  subscribe(listener:(progress:LoadingProgress)=>void){this.listeners.add(listener);listener(this.current);}
  publish(progress:LoadingProgress){this.current=progress;this.emit();}
  private emit(){for(const listener of this.listeners)listener(this.current);}
  private record(url:string){
    url=this.resourceUrl(url);
    if(!this.records.has(url))this.records.set(url,{url,total:this.accounting.total(this.sizes[url]),loaded:0,state:'queued',reused:false});
    return this.records.get(url)!;
  }
  phase(stage:string,urls:string[]=[]){
    this.current={stage,resources:[...new Set(urls.map(this.resourceUrl))].map(url=>{
      const row=this.record(url);row.reused=row.state==='ready';return row;
    })};this.emit();
  }
  stage(stage:string){this.current.stage=stage;this.emit();}
  private active(url:string){
    const row=this.record(url);
    if(!this.current.resources.includes(row))this.current.resources.push(row);
    return row;
  }
  ready(url:string){const row=this.active(url);row.state='ready';this.emit();}
  async fetch(url:string):Promise<Response>{
    const row=this.active(url);row.state='reading';row.reused=false;const reading=this.accounting.begin(row);this.emit();
    const response=await fetch(row.url),reader=response.body!.getReader();
    const body=new ReadableStream<Uint8Array>({
      pull:async controller=>{
        const {done,value}=await reader.read();
        if(done){reading.finish();row.state='processing';controller.close();}
        else {reading.chunk(value.byteLength);controller.enqueue(value);}
        this.emit();
      },
      cancel:reason=>reader.cancel(reason),
    });
    return new Response(body,{status:response.status,statusText:response.statusText,headers:response.headers});
  }
  async json<T>(url:string):Promise<T>{
    const value=await (await this.fetch(url)).json();this.ready(url);return value;
  }
}
