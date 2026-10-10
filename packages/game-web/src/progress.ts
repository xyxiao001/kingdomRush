// Compatibility entry preserving KR1's manifest-based accounting.
import {ResourceLoader as SharedResourceLoader,manifestAccounting} from '@kingdom-rush/asset-runtime/progress';
export type {ResourceProgress,LoadingProgress} from '@kingdom-rush/asset-runtime/progress';
export class ResourceLoader extends SharedResourceLoader {constructor(resourceUrl:(url:string)=>string){super(resourceUrl,manifestAccounting);}}
