// Completed animation-frame intervals per elapsed wall-clock second, not simulation ticks.
export class FrameRate {
  private elapsed = 0;
  private frames = 0;
  value: number | null = null;
  sample(milliseconds: number) {
    this.elapsed += milliseconds; this.frames++;
    if (this.elapsed < 1000) return false;
    this.value = Math.round(this.frames * 1000 / this.elapsed);
    this.elapsed = 0; this.frames = 0;
    return true;
  }
}
