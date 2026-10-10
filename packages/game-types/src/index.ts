export interface Point {x:number;y:number}
export interface Bounds extends Point {width:number;height:number}
export interface AtlasFrame {rect:number[];size:number[];trim:number[]}
export type Resolution='native'|'720p'|'1080p'|'1440p'|'2160p';
export type DisplayMode='auto'|'original-16:9'|'original-view';

// Fusion progression data keeps the original source field names.
export interface ProgressionRule {factor?:number;base?:number;cicle?:number;limit?:number;limit_value?:number;activeAfterWave?:number;factor_steps?:number[]}
export interface Volumes {sfx:number;music:number}
