import {createHash} from 'node:crypto';
import {readdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {transformWithEsbuild,type Plugin} from 'vite';

export function isShellAsset(path:string,gameId:string){
  return path==='/index.html'||path==='/favicon.svg'||path==='/manifest.webmanifest'
    ||path.startsWith(`/assets/${gameId}/title/`)||path===`/assets/${gameId}/fonts/JIMOJW.woff2`
    ||path.startsWith('/icons/')||path.startsWith(`/assets/${gameId}/loading/`)
    ||path===`/assets/${gameId}/cursors/hand.png`
    ||(/^\/assets\/[^/]+\.(js|css)$/.test(path));
}

export function pwa(gameId:string,additionalShell:readonly string[]):Plugin{
  let outDir:string,root:string,base:string;
  return {
    name:'classic-pwa',apply:'build',
    configResolved(config){root=config.root;base=config.base;outDir=resolve(root,config.build.outDir);},
    async closeBundle(){
      const workerSource=await readFile(new URL('../../packages/asset-runtime/src/pwa-worker.ts',import.meta.url),'utf8');
      const files=(await readdir(outDir,{recursive:true,withFileTypes:true}))
        .filter(entry=>entry.isFile()&&entry.name!=='sw.js')
        .map(entry=>resolve(entry.parentPath,entry.name).slice(outDir.length)).sort();
      // Stable asset URLs require a new cache when any published content changes.
      const hash=createHash('sha256').update(gameId).update(base).update(workerSource);
      for(const file of files)hash.update(file).update(await readFile(outDir+file));
      const release=hash.digest('hex').slice(0,16),shellFiles=files.filter(file=>isShellAsset(file,gameId)||additionalShell.includes(file)),shell=shellFiles.map(file=>base+file.slice(1));
      const shellSizes=Object.fromEntries(await Promise.all(shellFiles.map(async file=>[base+file.slice(1),(await readFile(outDir+file)).byteLength])));
      const source=`const BASE=${JSON.stringify(base)};const CACHE_PREFIX=${JSON.stringify(`kingdom-rush:${gameId}:pwa:`)};const RELEASE=${JSON.stringify(release)};const SHELL=${JSON.stringify(shell)};const SHELL_SIZES=${JSON.stringify(shellSizes)};\n${workerSource}`;
      const {code}=await transformWithEsbuild(source,'worker.ts',{loader:'ts',format:'iife',target:'es2022',minify:true});
      await writeFile(resolve(outDir,'sw.js'),code);
      console.log(`PWA ${release}: ${shell.length} startup files; game packages cached on demand.`);
    },
  };
}
