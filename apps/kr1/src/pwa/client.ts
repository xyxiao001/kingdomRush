import {createPwaClient} from '@kingdom-rush/game-web/pwa';
import {game} from '../../game.config';
import {resources} from '../loading/progress';
import {formatBytes} from '../rendering/loading';
export type {UpdateState} from '@kingdom-rush/game-web/pwa';
const client=createPwaClient(game,formatBytes,import.meta.env.PROD);
export const {subscribeUpdates,updateAction,checkForUpdates,showPwa}=client;
export const registerPwa=()=>client.registerPwa(resources);
