import { defineConfig } from 'vite';
import {game} from './game.config';
import {pwa} from '../../tools/build/pwa';
import {resourceSizes} from '../../tools/build/resource-sizes';

export default defineConfig({
  base:game.base,
  plugins:[resourceSizes(game.id),pwa(game.id,game.pwaShell)],
  server: { host: '127.0.0.1', port: game.port, strictPort: true },
  preview:{host:'127.0.0.1',port:game.port,strictPort:true},
  build: { target: 'es2022', outDir: '../../dist/kr1', emptyOutDir: true },
});
