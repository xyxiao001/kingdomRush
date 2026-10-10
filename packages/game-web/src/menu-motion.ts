import type {Container} from 'pixi.js';

export const progress = (now: number, start: number, duration: number) => Math.max(0, Math.min(1, (now - start) / duration));
export const outQuad = (t: number) => 1 - (1 - t) ** 2;

// game_gui.lua TowerMenu: .12 s in both directions, no input during either tween.
export class TowerMenuMotion {
  private started: number;
  private closing = false;
  private fromAlpha = 0;
  private fromScale = .6;
  constructor(readonly view: Pick<Container, 'alpha' | 'scale' | 'interactiveChildren' | 'destroy'>, now: number) {
    this.started = now; this.update(now);
  }
  hide(now: number) {
    this.update(now); this.started = now; this.closing = true;
    this.fromAlpha = this.view.alpha; this.fromScale = this.view.scale.x;
    this.view.interactiveChildren = false;
  }
  update(now: number) {
    const t = progress(now, this.started, .12), e = outQuad(t);
    this.view.alpha = this.closing ? this.fromAlpha * (1 - e) : e;
    this.view.scale.set(this.closing ? this.fromScale + (.6 - this.fromScale) * e : .6 + .4 * e);
    this.view.interactiveChildren = !this.closing && t === 1;
    return this.closing && t === 1;
  }
  get state() { return {closing:this.closing,alpha:this.view.alpha,scale:this.view.scale.x,ready:this.view.interactiveChildren}; }
}
