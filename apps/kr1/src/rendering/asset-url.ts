import urls from '../content/generated/web-assets.json';
// Build-time format choices; no runtime format negotiation or fallback requests.
export function assetUrl(pngUrl:string) {return (urls as Record<string,string>)[pngUrl];}
