import './styles.css';
import resourceSizes from 'virtual:resource-sizes';
import {resources} from './loading/progress';
import {chooseSaveSlot} from './rendering/title';
import {GameCursor} from './rendering/cursor';
import {registerPwa} from './pwa/client';
import {LoadingScreen} from './rendering/loading';
export const gameCursor = new GameCursor();
export const loading = new LoadingScreen(()=>gameCursor.setTarget(false));
resources.configure(resourceSizes);
void (async()=>{
  await registerPwa();
  await chooseSaveSlot(loading);
  await loading.transition('正在启动游戏引擎…',async()=>{await (await import('./main')).ready;});
})();
