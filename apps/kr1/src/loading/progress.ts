import {ResourceLoader as SharedResourceLoader,manifestAccounting} from '@kingdom-rush/asset-runtime/progress';
import {resourceUrl} from './resource-url';
export type {ResourceProgress,LoadingProgress} from '@kingdom-rush/asset-runtime/progress';
export class ResourceLoader extends SharedResourceLoader {constructor(){super(resourceUrl,manifestAccounting);}}
export const resources=new ResourceLoader();
