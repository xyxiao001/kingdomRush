import { Container, Graphics, Rectangle, Sprite, Texture, type FederatedPointerEvent } from 'pixi.js';
import type {Point} from './types';

export interface ViewData {
  class: string; id: string; pos: Point; size: Point; anchor: Point; scale: Point; r: number; alpha: number; hidden: boolean;
  image_name?: string; default_image_name?: string; focus_image_name?: string; hover_image_name?: string; click_image_name?: string;
  children: ViewData[]; colors: { background?: number[]; text?: number[]; text_shadow?: number[]; tint?: number[] };
  text?: string | number; text_size?: Point; text_offset?: Point; text_align?: CanvasTextAlign; vertical_align?: string;
  line_height?: number; font_name?: string; font_size?: number; _fitted_font_size?: number; _font_scale?: number; font_adj?: Record<string, number>;
  source_lines?: string[];
  font_metrics?: { name: string; height: number; baseline: number; descent: number }; text_shadow?: boolean; text_shadow_offset?: Point;
  animation?: { prefix: string; from?: number; to: number; fps?: number; loop?: boolean }; unavailable?: boolean;
  item?: { action: string; action_arg?: string; preview?: string; image: string; halo: string };
}
function color(a: number[]) { return `rgba(${a[0]},${a[1]},${a[2]},${a.length === 4 ? a[3] / 255 : 1})`; }
let textDensity = 1;
const textViews = new Set<GameView>();
export function setTextDensity(density: number) {
  if (density === textDensity) return;
  textDensity = density;
  for (const view of textViews) view.refreshText();
}

// KUI transforms: position, rotation, scale, then pixel anchor; children inherit all four.
export class GameView extends Container {
  readonly views: GameView[] = [];
  readonly data: ViewData;
  image?: Sprite;
  imageName?: string;
  background?: Graphics;
  private textSprite?: Sprite;
  private textValue: string | undefined;
  hovered = false;
  disabled = false;
  clickDisabled = false;
  get text() { return this.textValue; }
  constructor(data: ViewData, readonly textures: Map<string, Texture>, readonly imageScale: number) {
    super(); this.data = structuredClone(data);this.imageName=data.image_name;
    this.position.set(data.pos.x, data.pos.y); this.pivot.set(data.anchor.x, data.anchor.y);
    this.scale.set(data.scale.x, data.scale.y); this.rotation = data.r; this.alpha = data.alpha; this.visible = !data.hidden;
    if (data.colors.background) {
      const c = data.colors.background;
      this.background = new Graphics().rect(0, 0, data.size.x, data.size.y).fill({ color: c[0] * 65536 + c[1] * 256 + c[2] });
      this.background.alpha = c.length === 4 ? c[3] / 255 : 1;
      this.addChild(this.background);
    }
    if (data.image_name) { this.image = new Sprite(textures.get(data.image_name)!); this.image.scale.set(imageScale); this.image.eventMode = "none"; this.addChild(this.image); }
    if (data.text && data.class !== 'class GGEllipseText') this.setText(data.text);
    for (const child of data.children) { const view = new GameView(child, textures, imageScale); this.views.push(view); this.addChild(view); }
    for (const child of this.children) if (!(child instanceof GameView)) child.eventMode = "none";
    this.disabled = data.unavailable === true;
  }
  setImage(name: string) { this.image!.texture = this.textures.get(name)!;this.imageName=name; }
  setTextColor(color:number[]) {
    if(this.data.colors.text!.join(',')===color.join(',')) return;
    const value=this.textValue!;
    this.data.colors.text=color;this.textValue=undefined;this.setText(value);
  }
  setText(value: string | number) {
    const text = String(value);
    if (text === this.textValue) return;
    this.textValue = text;
    const d = this.data, m = d.font_metrics!, s = d._font_scale!;
    const aliasFactor: Record<string, number> = { hud: 1.4, body: 1.2, body_slides: 1.1, body_bold: 1.2, button: 1.2, h: 1.2, h_popup: 1.2, h_book: 1, sans: 1.2, h_noti: 1.2, capitals: 1, TOONISH: 1, 'Comic Book Italic':1, hero_name_label:1, infobar_name:1.2, infobar_stats:1.1, numbers_bold:1, numbers:1 };
    const px = Math.round((d._fitted_font_size ?? d.font_size!) * s * aliasFactor[d.font_name!]);
    const canvas = document.createElement('canvas');
    const pad = 4, width = d.text_size!.x * s;
    canvas.width = Math.ceil((width + pad * 2) * textDensity); canvas.height = Math.ceil((Math.max(d.text_size!.y * s, m.height) + pad * 2 + m.height) * textDensity);
    const ctx = canvas.getContext('2d')!; ctx.scale(textDensity,textDensity);ctx.font = `${px}px "${m.name}"`; ctx.textBaseline = 'alphabetic';
    // LÖVE wraps at whitespace for Latin text and at codepoints for CJK text.
    const lines: string[] = d.source_lines ? [...d.source_lines] : [];
    for (const paragraph of d.source_lines ? [] : text.split('\n')) {
      let line = '';
      for (const part of paragraph.match(/[\u2e80-\uffff]|[^\u2e80-\uffff\s]+\s*|\s+/gu) ?? []) {
        if (line && ctx.measureText(line + part).width > width) { lines.push(line.trimEnd()); line = part.trimStart(); } else line += part;
      }
      lines.push(line.trimEnd());
    }
    const lineHeight = d.line_height ?? 1;
    const textHeight = m.height + (lines.length - 1) * m.height * lineHeight, va = d.vertical_align;
    let off = (d.font_adj?.top ?? 0) / s;
    if (va && va !== 'top') {
      if (va === 'middle') off = Math.floor((d.text_size!.y - textHeight / s) / 2);
      if (va === 'middle-caps') off = Math.floor((d.text_size!.y - (textHeight + m.descent) / s) / 2);
      if (va === 'bottom') off = d.text_size!.y - textHeight / s;
      if (va === 'bottom-caps') off = d.text_size!.y - (textHeight + m.descent) / s;
      if (va === 'base') off = -m.baseline / s;
      off += (d.font_adj?.[va] ?? 0) / s;
    }
    ctx.textAlign = d.text_align!;
    const x = pad + (d.text_align === 'center' ? width / 2 : d.text_align === 'right' ? width : 0);
    const draw = (dx: number, dy: number, c: number[]) => {
      ctx.fillStyle = color(c); lines.forEach((line, i) => ctx.fillText(line, x + dx, pad + m.baseline + i * m.height * lineHeight + dy));
    };
    if (d.text_shadow) draw(d.text_shadow_offset!.x * s, d.text_shadow_offset!.y * s, d.colors.text_shadow!);
    draw(0, 0, d.colors.text!);
    const texture = Texture.from(canvas);
    if (this.textSprite) { this.textSprite.texture.destroy(true); this.textSprite.texture = texture; }
    else { this.textSprite = new Sprite(texture); this.textSprite.eventMode = "none"; this.addChild(this.textSprite); }
    this.textSprite.scale.set(1 / (s * textDensity));
    this.textSprite.position.set(d.text_offset!.x - pad / s, d.text_offset!.y + off - pad / s);
    textViews.add(this);
  }
  refreshText() { const value=this.textValue!;this.textValue=undefined;this.setText(value); }
  button(action: () => void, hover?: (inside: boolean) => void) {
    this.eventMode = 'static'; this.cursor = 'pointer'; this.hitArea = new Rectangle(0, 0, this.data.size.x, this.data.size.y);
    const over = () => { if (this.data.hover_image_name) this.setImage(this.data.hover_image_name); else if (this.data.focus_image_name) this.setImage(this.data.focus_image_name); };
    this.on('pointerover', () => { this.hovered = true; if (!this.disabled) { over(); hover?.(true); } });
    this.on('pointerout', () => { this.hovered = false; if (this.data.default_image_name) this.setImage(this.data.default_image_name); hover?.(false); });
    this.on('pointerdown', (e: FederatedPointerEvent) => { e.stopPropagation(); if (!this.disabled && this.data.click_image_name) this.setImage(this.data.click_image_name); });
    this.on('pointerup', () => { if (!this.disabled) over(); });
    this.on('pointerupoutside', () => { if (!this.disabled && this.data.default_image_name) this.setImage(this.data.default_image_name); });
    this.on('pointertap', (e: FederatedPointerEvent) => { e.stopPropagation(); if (!this.disabled && !this.clickDisabled) action(); });
  }
  all(): GameView[] { return [this, ...this.views.flatMap(v => v.all())]; }
  animate(time: number) {
    if (this.visible && this.data.animation && this.image) {
      const a = this.data.animation, start = a.from ?? 1, count = a.to - start + 1;
      const tick = Math.floor(time * (a.fps ?? 30));
      const frame = start + (a.loop === false ? Math.min(count - 1, tick) : tick % count);
      this.setImage(`${a.prefix}_${String(frame).padStart(4, '0')}`);
    }
    for(const child of this.views)child.animate(time);
  }
  override destroy() { textViews.delete(this);this.textSprite?.texture.destroy(true); for (const v of this.views) v.destroy(); super.destroy({ children: true }); }
}
