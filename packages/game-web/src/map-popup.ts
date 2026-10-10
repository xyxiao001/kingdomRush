import type { GameView } from './ui-tree';

// gg_views_custom.lua PopUpView: out-quad body / in-quad shade, y travel 50.
// The measured map updates the shared popup timer three times per director tick.
// golden-map/timeline.json and closing.json record the resulting 1/3 s and 1/6 s.
// Map options use the separately measured .5/.25 s (round-03/details/settings-timeline.json).
export class MapPopup {
  private phase: 'hidden' | 'opening' | 'open' | 'closing' = 'hidden';
  private started = 0;
  private closeY = 540;
  private closeAlpha = 1;
  private closeShade = 160 / 255;
  constructor(readonly view: GameView, private openDuration = 1 / 3, private closeDuration = 1 / 6) { view.visible = false; }
  get ready() { return this.phase === 'open'; }
  show(time: number) {
    this.phase = 'opening'; this.started = time; this.view.visible = true;
    this.update(time);
  }
  hide(time: number) {
    this.phase = 'closing'; this.started = time;
    this.closeY = this.view.views[0].y; this.closeAlpha = this.view.views[0].alpha;
    this.closeShade = this.view.background!.alpha;
    this.update(time);
  }
  update(time: number) {
    const back = this.view.views[0];
    if (this.phase === 'opening') {
      const t = Math.min(1, (time - this.started) / this.openDuration), ease = 1 - (1 - t) ** 2;
      back.y = 490 + 50 * ease; back.alpha = ease;
      this.view.background!.alpha = (80 + 80 * t * t) / 255;
      if (t === 1) this.phase = 'open';
    } else if (this.phase === 'closing') {
      const t = Math.min(1, (time - this.started) / this.closeDuration), ease = 1 - (1 - t) ** 2;
      back.y = this.closeY - 50 * ease; back.alpha = this.closeAlpha * (1 - ease);
      this.view.background!.alpha = this.closeShade + (1 / 255 - this.closeShade) * t * t;
      if (t === 1) { this.phase = 'hidden'; this.view.visible = false; }
    }
    back.interactiveChildren = this.ready;
  }
  get state() { return {visible:this.view.visible,ready:this.ready,y:this.view.views[0].y,alpha:this.view.views[0].alpha,shade:this.view.background!.alpha}; }
}
