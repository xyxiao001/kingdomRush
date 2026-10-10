// ADAPTATION: the original hand art is composited once above the game. Browser
// cursor URLs are not swapped on canvas hit tests or animation frames.
export class GameCursor {
  private view: HTMLElement;
  private pressed = false;
  private target = false;
  constructor() {
    this.view = document.createElement('div');
    this.view.id = 'game-cursor'; this.view.hidden = true;
    this.view.setAttribute('aria-hidden', 'true');
    document.body.append(this.view);
    const move = (e: PointerEvent) => {
      this.view.hidden = e.pointerType === 'touch';
      this.view.style.transform = `translate3d(${e.clientX - 3}px,${e.clientY - 2}px,0)`;
    };
    window.addEventListener('pointermove', move, {capture: true});
    window.addEventListener('pointerdown', e => { move(e); this.pressed = true; this.sync(); }, {capture: true});
    window.addEventListener('pointerup', () => {this.pressed = false; this.sync();}, {capture: true});
    window.addEventListener('pointercancel', () => {this.pressed = false; this.view.hidden = true; this.sync();});
    document.documentElement.addEventListener('pointerleave', () => {this.view.hidden = true;});
    window.addEventListener('blur', () => {this.pressed = false; this.view.hidden = true; this.sync();});
    this.sync();
  }
  setTarget(target: boolean) { if (target !== this.target) {this.target = target; this.sync();} }
  private sync() {this.view.dataset.state = this.target ? 'target' : this.pressed ? 'pressed' : 'hand';}
}
