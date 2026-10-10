import {readdir,stat} from 'node:fs/promises';
import {resolve} from 'node:path';
import type {Plugin} from 'vite';

// Only byte counts are bundled; level content and assets remain lazy.
export function resourceSizes(gameId:string):Plugin {
  let root:string;
  return {
    name:'resource-sizes',
    configResolved(config){root=resolve(config.root,'public');},
    resolveId(id){if(id==='virtual:resource-sizes')return '\0resource-sizes';},
    async load(id){
      if(id!=='\0resource-sizes')return;
      const entries=await readdir(resolve(root,'assets',gameId),{recursive:true,withFileTypes:true});
      const paths=entries.filter(entry=>entry.isFile()).map(entry=>resolve(entry.parentPath,entry.name)).sort();
      const sizes=await Promise.all(paths.map(async path=>{
        return [path.slice(root.length),(await stat(path)).size];
      }));
      return `export default ${JSON.stringify(Object.fromEntries(sizes))};`;
    },
  };
}
