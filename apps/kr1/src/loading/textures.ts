import {textureLoader} from '@kingdom-rush/asset-runtime/textures';
import {resources} from './progress';
import {resourceUrl} from './resource-url';
export const loadTexture=textureLoader(resources,resourceUrl);
