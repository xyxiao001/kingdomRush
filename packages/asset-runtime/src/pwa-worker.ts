/// <reference lib="webworker" />
export {};
declare const RELEASE:string;
declare const BASE:string;
declare const CACHE_PREFIX:string;
declare const SHELL:string[];
declare const SHELL_SIZES:Record<string,number>;
const worker=self as unknown as ServiceWorkerGlobalScope;
const PREFIX=CACHE_PREFIX;
const CACHE=PREFIX+RELEASE;
const shell=new Set(SHELL);
const progress={stage:'安装启动文件与离线缓存',resources:SHELL.map(url=>({url,total:SHELL_SIZES[url],loaded:0,state:'queued',reused:false}))};
let lastReport=0;
async function reportProgress(force=false){
  if(!force&&Date.now()-lastReport<80)return;
  lastReport=Date.now();
  for(const client of await worker.clients.matchAll({includeUncontrolled:true}))if(client.url.startsWith(worker.location.origin+BASE))client.postMessage({type:'LOADING_PROGRESS',progress});
}

worker.addEventListener('install',event=>{
  // Keep the browser's waiting lifecycle: never replace a running battle.
  event.waitUntil(caches.open(CACHE).then(cache=>Promise.all(progress.resources.map(async row=>{
    row.state='reading';await reportProgress();
    const response=await fetch(new Request(row.url,{cache:'reload'}));
    // cache.addAll rejected HTTP failures too; keep that install contract.
    if(!response.ok)throw new TypeError(`Unable to cache ${row.url}: ${response.status}`);
    const reader=response.body!.getReader();
    const body=new ReadableStream<Uint8Array>({async pull(controller){
      const {done,value}=await reader.read();
      if(done){row.state='processing';controller.close();}
      else {row.loaded+=value.byteLength;controller.enqueue(value);}
      await reportProgress();
    },cancel:reason=>reader.cancel(reason)});
    await cache.put(row.url,new Response(body,{status:response.status,statusText:response.statusText,headers:response.headers}));
    row.state='ready';await reportProgress(true);
  }))));
});
worker.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    for(const key of await caches.keys())if(key.startsWith(PREFIX)&&key!==CACHE)await caches.delete(key);
    await worker.clients.claim();
  })());
});

worker.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url);
  if(request.method!=='GET'||url.origin!==worker.location.origin)return;
  if(request.mode==='navigate'&&url.pathname===BASE){
    event.respondWith(caches.open(CACHE).then(async cache=>(await cache.match(BASE+'index.html'))!));
  }else if(shell.has(url.pathname)||url.pathname.startsWith(BASE+'assets/')){
    event.respondWith((async()=>{
      const cache=await caches.open(CACHE),cached=await cache.match(url.pathname);
      if(cached)return cached;
      const response=await fetch(new Request(request,{cache:'no-cache'}));
      if(response.status===200)event.waitUntil(cache.put(url.pathname,response.clone()));
      return response;
    })());
  }
});

worker.addEventListener('message',event=>{
  if(event.data==='APPLY_UPDATE')event.waitUntil(worker.skipWaiting());
  if(event.data==='LOADING_STATUS')event.source?.postMessage({type:'LOADING_PROGRESS',progress});
  if(event.data==='PWA_STATUS')event.waitUntil((async()=>{
    const cache=await caches.open(CACHE);
    event.source?.postMessage({type:'PWA_STATUS',release:RELEASE,files:(await cache.keys()).length});
  })());
});
