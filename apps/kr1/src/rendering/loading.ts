import {LoadingScreen as SharedLoadingScreen} from '@kingdom-rush/game-web/loading';
import {game} from '../../game.config';
import {resources} from '../loading/progress';
export {formatBytes} from '@kingdom-rush/game-web/loading';
export class LoadingScreen extends SharedLoadingScreen {constructor(resetCursor:()=>void){super(resetCursor,resources,game);}}
