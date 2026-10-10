import type { Graphics } from 'pixi.js';
import type { GameView } from './ui-tree';

import {progress,outQuad} from './menu-motion';

// PauseView/OverlayView have their own .25 s clock, independent of paused gameplay.
export class PauseAnimation {
  private started = 0;
  private opening = true;
  private fromY = 0;
  private fromAlpha = 0;
  private fromShade = 1;
  constructor(private view: GameView, private shade: Graphics) { view.visible = false; }
  show(now: number) {
    this.started = now; this.opening = true; this.view.visible = true;
    this.fromY = this.view.data.pos.y - 50; this.fromAlpha = 0; this.fromShade = this.shade.alpha;
    this.update(now);
  }
  hide(now: number) {
    this.update(now); this.started = now; this.opening = false;
    this.fromY = this.view.y; this.fromAlpha = this.view.alpha; this.fromShade = this.shade.alpha;
    this.update(now);
  }
  update(now: number) {
    if (!this.view.visible) return;
    const t = progress(now, this.started, .25), e = outQuad(t);
    this.view.y = this.fromY + ((this.opening ? this.view.data.pos.y : this.fromY - 50) - this.fromY) * e;
    this.view.alpha = this.fromAlpha + ((this.opening ? 1 : 0) - this.fromAlpha) * e;
    this.shade.alpha = this.fromShade + ((this.opening ? 1 : 1 / 120) - this.fromShade) * t * t;
    this.view.interactiveChildren = this.opening && t === 1;
    if (!this.opening && t === 1) this.view.visible = false;
  }
  get state() { return {visible:this.view.visible,y:this.view.y,alpha:this.view.alpha,ready:this.view.interactiveChildren}; }
}

// DefeatView: starts above the viewport, out-back with overshoot 1.
export class DefeatAnimation {
  private started = -Infinity;
  constructor(private view: GameView, private width: number) {}
  show(now: number) { this.started = now; this.view.visible = true; this.update(now); }
  update(now: number) {
    const t = progress(now, this.started, .5), e = 1 + 2 * (t - 1) ** 3 + (t - 1) ** 2;
    this.view.y = -this.width / 2 + (this.view.data.pos.y + this.width / 2) * e;
  }
  get state() { return {y:this.view.y,visible:this.view.visible}; }
}
