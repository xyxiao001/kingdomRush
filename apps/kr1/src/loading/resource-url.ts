import {game} from '../../game.config';

// Generated content keeps app-relative asset IDs; network/cache URLs use the app base.
export function resourceUrl(path:string){
  return path.startsWith('/assets/')?game.base+path.slice(1):path;
}
