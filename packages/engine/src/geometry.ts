import type {Point} from '@kingdom-rush/game-types';
export const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
