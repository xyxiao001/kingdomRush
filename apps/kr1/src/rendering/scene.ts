import {resourceUrl} from '../loading/resource-url';
import {loadTexture} from '../loading/textures';
import { Application, Assets, Container, Graphics, Rectangle, Sprite, Texture, Text } from 'pixi.js';
import type { AssetData, Bounds, Level, Point, Power, TowerKind } from '../content/types';
import type {LevelContent} from '../levels/index';
import type {HeroContent} from '../content/heroes';
import interactionData from '../content/generated/interactions.json';
import feedbackData from '../content/generated/feedback.json';
import {GameCamera} from './camera';
import {assetUrl} from './asset-url';
import {loadResolution,saveResolution,loadDisplayMode,saveDisplayMode,type Resolution,type DisplayMode} from '../storage/display';
import {renderQuality,screenLayout} from './display-layout';
import type { Pick } from '../interaction/picking';
import { GERALD } from '../content/gerald';
import { atlasTextures, setTextDensity } from './ui-tree';
import battleProgression from '../content/generated/battle-progression.json';
import { ENEMIES, REINFORCEMENT, SOLDIER, TOWERS } from '../content/balance';
import type { Battle, Soldier, Tower } from '../simulation/battle';

import {HEIGHT,WIDTH,OFFSET,displayBounds,referencePoint,simulationPoint,animationFrame,projectileDisplay} from './world-coordinates';
export {HEIGHT,WIDTH,OFFSET} from './world-coordinates';
const SCALE = 768 / 1080;
export interface Selection {
  pad: string | null; preview: TowerKind | null; power: Power | 'rally' | 'hero' | 'manual' | null; pointer: Point;
  unit: Pick | null; hoverPad: string | null;
}

export class Scene {
  readonly app = new Application();
  readonly world = new Container();
  readonly ui = new Container();
  private uiClip=new Graphics();
  readonly camera=new GameCamera(this.world,2,1080/HEIGHT);
  resolution=loadResolution();
  displayMode=loadDisplayMode();
  layout=screenLayout(1920,1080,this.displayMode);
  metrics=renderQuality(1920,1080,1,this.resolution);
  private layoutListeners=new Set<()=>void>();
  private resizeRenderer!:(framingChanged?:boolean)=>void;
  private density=0;
  private tauntText=new Text({text:'',style:{fontFamily:'Arial',fontSize:16,fill:0xe9bdff,wordWrap:true,wordWrapWidth:160,align:'center'}});
  private textures = new Map<string, Texture>();
  private sprites = new Map<string, Sprite>();
  private seen = new Set<string>();
  private units = new Container();
  private bars = new Container();
  private healthBars:{background:Sprite;fill:Sprite}[]=[];
  private healthBarCount=0;
  private trailTime=0;
  private trailId=0;
  private trails:{id:number;x:number;y:number;born:number;life:number;scaleX:number;scaleY:number}[]=[];
  private emitters=new Map<number,{x:number;y:number;time:number}>();
  private backgroundSprite!:Sprite;
  private packageLoads=new Map<string,Promise<void>>();
  private atlas!: Texture;

  private level!:Level;
  constructor(private data: AssetData) {}

  async init(host: HTMLElement) {
    await this.app.init({ width: 1920, height: 1080, preference: 'webgl', antialias: true, background: '#000000', resolution: 1, autoDensity: false, autoStart: false });
    this.app.stage.addChild(this.world,this.ui,this.uiClip);this.ui.mask=this.uiClip;this.uiClip.eventMode='none';
    host.prepend(this.app.canvas);
    const resize = (framingChanged=false) => {
      const rect = this.app.canvas.getBoundingClientRect();
      this.density=window.devicePixelRatio;
      const next=screenLayout(rect.width,rect.height,this.displayMode);
      const changed=JSON.stringify(next)!==JSON.stringify(this.layout);
      this.layout=next;this.metrics=renderQuality(rect.width,rect.height,this.density,this.resolution);
      const resolution=Math.min(this.metrics.finalBacking.width/next.width,this.metrics.finalBacking.height/next.height);
      this.app.renderer.resize(next.width,next.height,resolution);
      setTextDensity(Math.max(1,resolution));
      this.ui.position.set(next.viewport.x,next.viewport.y);
      this.uiClip.clear().rect(next.viewport.x,next.viewport.y,next.viewport.width,next.viewport.height).fill(0xffffff);
      this.app.stage.hitArea=new Rectangle(0,0,next.width,next.height);
      if(changed||framingChanged){this.configureCamera();for(const listener of this.layoutListeners)listener();}
    };
    new ResizeObserver(()=>resize()).observe(host);
    window.addEventListener('resize',()=>resize());
    resize();
    this.resizeRenderer=resize;
    this.configureCamera();
    // The DOM hand overlay owns the cursor; Pixi must not restore a native pointer.
    this.app.renderer.events.cursorStyles.default = () => {};
    this.app.renderer.events.cursorStyles.pointer = () => {};
    this.app.canvas.setAttribute('aria-label', '南港战场，点击空地建造防御塔');
  }

  async loadBattle() {
    this.atlas = await loadTexture(assetUrl('/assets/kr1/battle/atlas.png'));
    const background = this.backgroundSprite = new Sprite();
    background.width = WIDTH; background.height = HEIGHT;
    this.world.addChild(background);
    for (const [name, f] of Object.entries(this.data.frames)) {
      this.textures.set(name, new Texture({ source: this.atlas.source,
        frame: new Rectangle(...f.rect as [number, number, number, number]),
        orig: new Rectangle(0, 0, f.size[0], f.size[1]),
        trim: new Rectangle(f.trim[0], f.trim[1], f.rect[2], f.rect[3]),
      }));
    }
    const interactionTextures = await atlasTextures('/assets/kr1/ui/interactions.png', interactionData.frames);
    for (const [key, texture] of interactionTextures) this.textures.set(key, texture);
    for (const [key,texture] of await atlasTextures('/assets/kr1/ui/feedback.png',feedbackData.frames))this.textures.set(key,texture);
    for(const [key,texture] of await atlasTextures('/assets/kr1/battle/progression.png',battleProgression.frames))this.textures.set(key,texture);
    Object.assign(this.data.animations,battleProgression.animations);
    this.units.sortableChildren = true;
    for (const layer of [this.units, this.bars]) {
      layer.x = OFFSET; this.world.addChild(layer);
    }
  }

  async setHero(hero:HeroContent){
    if(!this.packageLoads.has(hero.url))this.packageLoads.set(hero.url,atlasTextures(hero.url,hero.frames).then(textures=>{for(const [name,texture] of textures)this.textures.set(name,texture);Object.assign(this.data.animations,hero.animations);}));
    await this.packageLoads.get(hero.url);
  }

  async setLevel(content:LevelContent,level:Level){
    for(const pack of content.packages){
      if(!this.packageLoads.has(pack.url))this.packageLoads.set(pack.url,atlasTextures(pack.url,pack.frames).then(textures=>{for(const [name,texture] of textures)this.textures.set(name,texture);Object.assign(this.data.animations,pack.animations);}));
      await this.packageLoads.get(pack.url);
    }
    this.backgroundSprite.texture=await loadTexture(assetUrl(content.background));
    this.backgroundSprite.width=WIDTH;this.backgroundSprite.height=HEIGHT;
    for(const bar of this.healthBars){bar.background.destroy();bar.fill.destroy();}
    this.healthBars=[];this.healthBarCount=0;
    this.level=level;this.trails=[];this.emitters.clear();this.configureCamera();
    this.app.canvas.setAttribute('aria-label',`${level.name}战场，点击空地建造防御塔`);
  }

  point(event: PointerEvent): Point {
    return this.worldPoint(this.screenPoint(event));
  }
  screenPoint(event:{clientX:number;clientY:number}):Point{const box=this.app.canvas.getBoundingClientRect();return {x:(event.clientX-box.left)/box.width*this.layout.width,y:(event.clientY-box.top)/box.height*this.layout.height};}
  private displayBounds(b:Bounds):Bounds{return displayBounds(b);}
  private configureCamera(){if(!this.level)return;this.camera.configure(this.layout.viewport,this.displayBounds(this.level.worldBounds),this.displayMode,this.displayBounds(this.level.safeGameplayBounds));}
  onLayout(listener:()=>void){this.layoutListeners.add(listener);listener();}
  worldPoint(p:Point):Point{return simulationPoint(this.camera.unproject(p));}
  uiPoint(p:Point):Point{return this.camera.project(referencePoint(p));}
  setResolution(value:Resolution){this.resolution=value;saveResolution(value);this.resizeRenderer();}
  setDisplayMode(value:DisplayMode){const changed=value!==this.displayMode;this.displayMode=value;saveDisplayMode(value);this.resizeRenderer(changed);}
  render(){
    // ADAPTATION: pixel density can change without a CSS resize or media-query event.
    if(this.density!==window.devicePixelRatio)this.resizeRenderer();
    this.app.render();
  }

  private frame(animation: string, age: number, loop = true) {
    return animationFrame(this.data.animations[animation],age,loop);
  }

  private sprite(key: string, name: string, x: number, y: number, ax: number, ay: number, flip = false, z = 3000 + HEIGHT - y, alpha = 1) {
    let sprite = this.sprites.get(key);
    if (!sprite) { sprite = new Sprite(); this.sprites.set(key, sprite); this.units.addChild(sprite); }
    sprite.texture = this.textures.get(name)!;
    sprite.position.set(x, HEIGHT - y); sprite.anchor.set(ax, 1 - ay);
    sprite.scale.set(flip ? -SCALE : SCALE, SCALE); sprite.zIndex = z; sprite.alpha = alpha;
    this.seen.add(key);
    return sprite;
  }

  private health(position: Point, ratio: number, friendly: boolean, offset: number, width=22) {
    
    const x = Math.floor(position.x) - width/2, y = HEIGHT - Math.ceil(position.y) - offset - 3;
    let bar=this.healthBars[this.healthBarCount++];
    if(!bar){
      const background=new Sprite(Texture.WHITE),fill=new Sprite(Texture.WHITE);
      background.tint=0x7e000c;fill.tint=0x44ae32;
      this.bars.addChild(background,fill);bar={background,fill};this.healthBars.push(bar);
    }
    bar.background.visible=bar.fill.visible=true;
    bar.background.position.set(x,y);bar.background.width=width;bar.background.height=3;
    bar.fill.position.set(x,y);bar.fill.width=width*ratio;bar.fill.height=3;
  }

  private drawEndless(battle:Battle){
    const endless=battle.endless;if(!endless)return;const c=endless.config.shaman,t=battle.time,age=t-endless.castAt;
    this.sprite('elder-shaman',this.frame(c.prefix+'_'+(age<c.castDuration?'cast':'idle'),age,age>=c.castDuration),c.position.x,c.position.y,c.anchor.x,c.anchor.y,false,3000+HEIGHT-c.position.y);
    const d=c.drummer;this.sprite('elder-drummer',this.frame(d.prefix+'_'+(t<endless.drumUntil?'play':'idle'),t-endless.drumAt,true),d.position.x,d.position.y,d.anchor.x,d.anchor.y,false,3000+HEIGHT-d.position.y);
    for(const totem of endless.totems){
      const a=c.totems[totem.kind],age=t-totem.born,ended=t>=totem.until,key='totem-'+totem.id;
      if(!ended){const phase=age%1,scale=phase<.5?.64+.72*phase:1+1.2*(phase-.5),alpha=phase<1/3?(50+205*phase*3)/255:phase<2/3?1:3*(1-phase);
        this.sprite(key+'-ring',a.ring,totem.x,totem.y,.5,.5,false,1400,alpha).scale.set(SCALE*scale);
        this.sprite(key+'-ground',a.ground,totem.x,totem.y,.5,.5,false,1400.1);
      }
      this.sprite(key,this.frame(a.prefix+'_'+(ended?'end':'start'),ended?t-totem.until:age,false),totem.x,totem.y,a.anchor.x,a.anchor.y,false,3000+HEIGHT-totem.y);
      if(!ended&&t>=totem.activeAt)this.sprite(key+'-fx',this.frame(a.fx,t-totem.activeAt,true),totem.x,totem.y,a.anchor.x,a.anchor.y,false,3001+HEIGHT-totem.y);
    }
    for(const coin of endless.coins){const age=t-coin.born;if(age<0)continue;this.sprite('coin-'+coin.id,this.frame(coin.config.animation,age,false),coin.position.x+coin.dx*Math.min(1,age/coin.travel),coin.position.y,.5,.5,coin.flip,3400,1);}
    if(endless.taunt){const p={x:c.position.x+c.tauntOffset.x,y:c.position.y+c.tauntOffset.y};this.sprite('elder-taunt',c.tauntFrame,p.x,p.y,.5,.5,false,4400);if(!this.tauntText.parent)this.world.addChild(this.tauntText);this.tauntText.text=endless.taunt.text;this.tauntText.anchor.set(.5);this.tauntText.position.set(p.x+OFFSET,HEIGHT-p.y);this.tauntText.zIndex=4401;}
  }

  draw(battle: Battle, selected: Selection) {
    const shake=battle.abilities.shake,elapsed=shake?battle.time-shake.born:0;
    if(shake&&elapsed<shake.config.duration){const c=shake.config,fade=(1-elapsed/c.duration)*c.amplitude*1080/HEIGHT*this.camera.scale;this.camera.setShake({x:Math.sin(elapsed*10*c.frequency+shake.phase)*12*fade,y:-(Math.sin(elapsed*8*c.frequency+shake.phase)*9+Math.cos(elapsed*20*c.frequency)*9)*fade});}else this.camera.setShake({x:0,y:0});
    this.seen.clear(); this.healthBarCount=0;
    if(battle.time<this.trailTime){this.trails=[];this.emitters.clear();}this.trailTime=battle.time;
    this.trails=this.trails.filter(p=>battle.time-p.born<p.life);
    for(const pad of this.level.pads)if(!battle.towers.some(t=>t.pad.id===pad.id)){
      const camp=battle.campFor(pad);
      if(camp)this.sprite('pad-'+pad.id,camp.frozenFrame,pad.position.x+camp.offset.x,pad.position.y+camp.offset.y,.5,.5,false,1298);
      else if(pad.special==='elf')this.sprite('pad-'+pad.id,'elfTower_layer1_0026',pad.position.x,pad.position.y+20,.5,.5,false,3000+HEIGHT-pad.position.y);
      else this.sprite('pad-'+pad.id,`build_terrain_00${String(pad.terrain??12)}${selected.hoverPad===pad.id?'_over':''}`,pad.position.x,pad.position.y+13,.5,.5,false,1400);
    }
    const pad = this.level.pads.find(p => p.id === selected.pad);
    if (pad) {
      const tower = battle.towers.find(t => t.pad.id === pad.id);
      if (selected.preview && !tower) this.sprite('preview', 'g1_tower_preview_' + selected.preview, pad.position.x, pad.position.y + ({archer:37,barrack:38,mage:30,artillery:41})[selected.preview], .5, .5, false, 3000 + HEIGHT - pad.position.y, 180 / 255);
    }
    battle.props.forEach((prop, i) => {
      if(prop.removed)return;
      const d=prop.decoration;
      let name: string, anchor = .5;
      if(d.presentation){
        const c=d.presentation,release=d.clickRelease,cp=d.clickPlay;let anim=c.idle,age=prop.phase,loop=true,position={...prop.position};
        if(cp){const visual=prop.clickVisual!;if(visual.hidden)return;anim=visual.prefix+'_idle';loop=false;if(prop.clickAt!==null){age=battle.time-prop.clickAt;anim=visual.prefix+'_'+cp.animation;if(cp.leave&&age>=cp.duration){const t=age-cp.duration;anim=visual.prefix+'_'+cp.leave.animation;age=t;loop=true;position.x+=cp.leave.offset.x*Math.min(1,t/cp.leave.duration);position.y+=cp.leave.offset.y*Math.min(1,t/cp.leave.duration);}}else if(cp.appear){age=battle.time-prop.appearanceAt!;anim=visual.prefix+'_'+(age<cp.appear.enterDuration?cp.appear.enter:cp.appear.idle);loop=age>=cp.appear.enterDuration;}}
        if(c.motion){const elapsed=battle.time-prop.ambientAt,keys=c.motion;for(let k=1;k<keys.length;k++)if(elapsed<=keys[k][0]){const [at,a]=keys[k-1],[end,z]=keys[k],t=(elapsed-at)/(end-at);position.x+=a.x+(z.x-a.x)*t;position.y+=a.y+(z.y-a.y)*t;break;}}
        if(release){if(prop.releaseAt!==null){anim=c.prefix+'_'+release.release;age=battle.time-prop.releaseAt;loop=false;}else if(battle.time-prop.bumpAt<release.clickDuration){anim=c.prefix+'_'+release.clicked;age=battle.time-prop.bumpAt;loop=false;}}
        else if(c.trigger&&prop.triggerAt!==null){anim=c.prefix+'_'+c.trigger.animation;age=battle.time-prop.triggerAt;loop=false;}
        else if(c.play){if(battle.time-prop.ambientAt>=c.duration!){if(!c.idleBetween)return;anim=c.idle;age=0;loop=false;}else{anim=c.prefix+'_'+c.play;age=battle.time-prop.ambientAt;loop=false;}}
        if(!prop.releaseComplete){const sprite=this.sprite(`decor-${i}`,this.frame(anim,age,loop),position.x,position.y,c.anchor.x,c.anchor.y,prop.flip,c.z+HEIGHT-position.y,c.activeRoutes?prop.ambientAlpha:1);if(c.scale)sprite.scale.set(SCALE*c.scale.x,SCALE*c.scale.y);}
        for(const [j,layer]of (c.layers??[]).entries())this.sprite(`decor-${i}-layer-${j}`,this.frame(prop.releaseComplete?layer.afterRelease:prop.releaseAt!==null?layer.release!:layer.idle,age,false),d.position.x,d.position.y,layer.anchor.x,layer.anchor.y,false,c.z+HEIGHT-d.position.y+j+1);
        return;
      }
      if(d.frame){this.sprite(`decor-${i}`,d.frame,d.position.x,d.position.y,d.anchor?d.anchor.x:.5,d.anchor?d.anchor.y:.5,d.flip,d.anchor?d.z!+HEIGHT-(d.sortY??d.position.y):3000+HEIGHT-d.sortY!).scale.set(SCALE*(d.scale?.x??1),SCALE*(d.scale?.y??1));return;}
      if(d.kind==='decal_tunnel_light'){
        if(battle.tunnelPassengers.some(p=>d.tracks!.includes(p.name))){const t=battle.time%.7,keys=[[0,255],[.15,200],[.3,255],[.4,220],[.7,255]],k=keys.findIndex(v=>v[0]>t),a=keys[k-1],b=keys[k],alpha=(a[1]+(b[1]-a[1])*(t-a[0])/(b[0]-a[0]))/255;this.sprite(`decor-${i}`,'cave_light_0001',d.position.x,d.position.y,.5,.5,d.flip,2999+HEIGHT-d.position.y,alpha);}return;
      }
      if (d.kind === 'decal_s01_trees') { name = 'stage1_trees'; anchor = .234375; }
      else if (prop.sheep) { const age=battle.time-prop.playAt;name = this.frame(d.kind + (age<26/30?'_play':'_idle'), age, false); anchor = .1; }
      else if(prop.fish){if(battle.time-prop.playAt>=prop.playDuration)return;name=this.frame('decal_fish1_jump',battle.time-prop.playAt,false);}
      else name=this.frame(d.kind+(d.kind.startsWith('decal_boat')?'_idle':d.kind.startsWith('decal_water')?'_play':''),prop.phase);
      this.sprite(`decor-${i}`, name, d.position.x, d.position.y, .5, anchor,prop.flip).scale.set(SCALE*prop.scale(battle.time)*(prop.flip?-1:1),SCALE*prop.scale(battle.time));
    });
    if(battle.content.snow){
      // Deterministic presentation-only particles; never consume combat RNG.
      const clock=battle.time+20,hash=(n:number)=>((Math.imul(n+1,1103515245)+12345)>>>0)/4294967296;
      for(let i=Math.max(0,Math.floor((clock-30)*8));i<=Math.floor(clock*8);i++){
        const age=clock-i/8,life=20+hash(i*5)*10;if(age>life)continue;
        const speed=30+hash(i*5+1)*10,angle=Math.PI*1.5+(hash(i*5+2)-.5)*Math.PI/8,scale=.4+hash(i*5+3)*.3;
        this.sprite('snow-'+i,'Copo',512+(hash(i*5+4)-.5)*1200+Math.cos(angle)*speed*age,768+Math.sin(angle)*speed*age,.5,.5,false,5000,Math.min(1,(life-age)/(life*.25))).scale.set(SCALE*scale);
      }
    }
    const story=battle.story;this.tauntText.visible=!!story?.taunt||!!battle.endless?.taunt;
    this.tauntText.style.fill=battle.endless?0xff7272:0xe9bdff;this.tauntText.style.fontSize=battle.endless?14:16;this.tauntText.style.wordWrapWidth=battle.endless?140:160;this.tauntText.style.breakWords=!!battle.endless;
    this.drawEndless(battle);
    if(story){const c=story.config;for(const p of story.portals)this.sprite('portal-'+p.config.id,this.frame('veznan_portal_'+p.phase,battle.time-p.at,p.phase==='active'),p.config.position.x,p.config.position.y,.5,.5,false,1400);
      if(['welcome','castle','descend'].includes(story.phase))this.sprite('castle-boss',this.frame(c.prefix+'_'+story.animation,battle.time-story.animationAt,story.animation==='idleDown'),c.position.x,c.position.y,c.anchor.x,c.anchor.y,false,3000+HEIGHT-c.position.y);
      if(story.taunt){const p=c.tauntPosition;this.sprite('castle-taunt','boss_veznan_taunts_love_0001',p.x,p.y,.5,.5,false,4400);if(!this.tauntText.parent)this.world.addChild(this.tauntText);this.tauntText.text=story.taunt.text;this.tauntText.anchor.set(.5);this.tauntText.position.set(p.x+OFFSET-3,HEIGHT-p.y-6);this.tauntText.zIndex=4401;}
    }
    for(const s of story?.endingSprites(battle.time)??[]){const image=this.sprite('ending-'+s.key,this.frame(s.animation,s.age,s.loop),s.x,s.y,.5,.5,false,s.z);image.scale.set(SCALE*s.scale);image.rotation=s.rotation;}
    for (const tower of battle.towers) this.tower(tower, battle.time, selected.hoverPad===tower.pad.id);
    for(const tower of battle.towers)if(tower.seal){const s=tower.seal,c=s.config,p=tower.pad.position,age=battle.time-s.born,anim=s.endAt!==null?'remove':age<c.startDuration?'start':s.trapped?'hold':'preHold',at=s.endAt!==null?battle.time-s.endAt:age;this.sprite('seal-'+tower.pad.id,this.frame(c.prefix+'_'+anim,at,anim==='preHold'||anim==='hold'),p.x+c.offset.x,p.y+c.offset.y,.5,.5,false,3001+HEIGHT-p.y);if(s.endAt===null&&!s.trapped&&age>=c.startDuration)this.sprite('seal-tap-'+tower.pad.id,this.frame(c.tap,age,true),p.x+c.tapOffset.x,p.y+c.tapOffset.y,.5,.5,false,3002+HEIGHT-p.y);}
    for(const tower of battle.towers)if(tower.frozen){const f=tower.frozen,c=f.config,p=tower.pad.position,age=battle.time-f.born,end=f.endAt===null?null:battle.time-f.endAt,z=3001+HEIGHT-p.y;
      const alpha=end===null?1:Math.max(0,1-(end-c.endDuration)/c.fade);this.sprite('ice-'+p.x,this.frame(c.prefix+'_'+(end===null?'start':'end'),end??age,false),p.x+c.offset.x,p.y+c.offset.y,.5,.5,false,z,alpha);
      if(end===null&&age>=c.startDuration)this.sprite('ice-tap-'+tower.pad.id,this.frame(c.tap,age,true),p.x+c.tapOffset.x,p.y+c.tapOffset.y,.5,.5,false,z+.1);
    }
    for(const tower of battle.towers)if(tower.block){const s=tower.block,c=s.config,age=battle.time-s.born,p=tower.pad.position;if(battle.time<s.until+c.fade)this.sprite('block-'+tower.pad.id,this.frame(c.animation,age,true),p.x+c.offset.x,p.y+c.offset.y,.5,.5,false,3002+HEIGHT-p.y,Math.min(1,age/c.fade,(s.until+c.fade-battle.time)/c.fade));}
    for(const unit of [battle.hero,...battle.soldiers])if(unit.hp>0&&unit.stun&&battle.time<unit.stun.until){const s=unit.stun;this.sprite('stun-'+unit.id,this.frame(s.animation,battle.time-s.born,true),unit.x+s.offset.x,unit.y+s.offset.y,.5,.5,false,3005+HEIGHT-unit.y);}
    const floor=battle.content.burningFloor;if(floor)for(const [i,p] of floor.positions.entries()){this.sprite('floor-base-'+i,floor.frames[0],p.x,p.y,.5,.5,false,1400);this.sprite('floor-active-'+i,floor.frames[1],p.x,p.y,.5,.5,false,1400.1,battle.abilities.floorAlpha);}
    for(const d of battle.abilities.dots)if(d.unit.hp>0)this.sprite('ally-dot-'+d.unit.id+'-'+d.config.id,this.frame(d.config.animation,battle.time-d.born,true),d.unit.x,d.unit.y+12,.5,.5,false,3003+HEIGHT-d.unit.y);
    for (const enemy of battle.enemies) {
      const current=battle.effectiveEnemyStats(enemy);
      const prefix = current.prefix??(enemy.kind === 'enemy_goblin' ? 'goblin' : enemy.kind==='enemy_spider_big'?'enemy_spider':enemy.kind);
      let animation: string, age: number;
      let flip = enemy.heading.x < 0;
      if(enemy.scriptAnimation&&battle.time-enemy.scriptAnimation.at<enemy.scriptAnimation.duration){animation=enemy.scriptAnimation.name;age=battle.time-enemy.scriptAnimation.at;}
      else if(enemy.deadAt===null&&enemy.flight&&(enemy.flight.phase==='takeoff'||enemy.flight.phase==='land')){const f=current.flight!,direction=Math.abs(enemy.heading.y)>Math.abs(enemy.heading.x)*1.5?(enemy.heading.y>0?1:2):0;animation=f[enemy.flight.phase][direction];age=battle.time-enemy.flight.at;}
      else if(enemy.deadAt===null&&enemy.clone&&battle.time-enemy.clone.at<current.clone!.duration){animation='summon';age=battle.time-enemy.clone.at;}
      else if(enemy.deadAt===null&&enemy.areaSkill&&battle.time-enemy.areaSkill.at<current.areaSkill!.duration+(current.areaSkill!.rest??0)){animation=current.areaSkill!.animation;age=battle.time-enemy.areaSkill.at;}
      else if(enemy.deadAt===null&&enemy.spore&&battle.time-enemy.spore.at<current.spore!.waits.reduce((a,b)=>a+b,0)+current.spore!.rest){animation=current.spore!.animation;age=battle.time-enemy.spore.at;}
      else if(enemy.transformAt!==undefined){animation='demonTransform';age=battle.time-enemy.transformAt;}
      else if(enemy.deadAt===null&&enemy.restHeal&&battle.time-enemy.restHeal.at<ENEMIES[enemy.kind].restHeal!.duration){const c=ENEMIES[enemy.kind].restHeal!.choices[enemy.restHeal.choice],elapsed=battle.time-enemy.restHeal.at;animation=elapsed<2*c.animationDuration?c.animation:'idle';age=elapsed%c.animationDuration;}
      else if(enemy.barrage&&battle.time-enemy.barrage.at<ENEMIES[enemy.kind].barrage!.duration){animation='shoot';age=battle.time-enemy.barrage.at;}
      else if(enemy.finisher){animation=enemy.finisher.phase==='death'?'death':'death_end';age=battle.time-enemy.finisher.at;}
      else if (enemy.deadAt !== null) { animation = 'death'; age = battle.time - enemy.deadAt;const end=current.boss?.deathEnd;if(end&&age>=end.after){animation=end.animation;age-=end.after;} }
      else if(enemy.raiseAt!==undefined&&battle.time-enemy.raiseAt<(enemy.raiseDuration??ENEMIES[enemy.kind].raiseDuration!)){animation='raise';age=battle.time-enemy.raiseAt;}
      else if(enemy.shieldCast&&battle.time-enemy.shieldCast.at<ENEMIES[enemy.kind].shield!.duration){animation='special';age=battle.time-enemy.shieldCast.at;}
      else if(enemy.summonCast&&battle.time-enemy.summonCast.at<ENEMIES[enemy.kind].summon!.duration){animation='summon';age=battle.time-enemy.summonCast.at;}
      else if(enemy.freezeCast&&battle.time-enemy.freezeCast.at<ENEMIES[enemy.kind].boss!.freeze!.duration+ENEMIES[enemy.kind].boss!.freeze!.rest){const f=ENEMIES[enemy.kind].boss!.freeze!;age=battle.time-enemy.freezeCast.at;animation=age<f.duration?'freeze':'breath';if(animation==='breath')age-=f.duration;}
      else if(enemy.buffCast?.loop){animation='special';age=battle.time-enemy.buffCast.started;}
      else if(battle.time<enemy.thornUntil){animation=enemy.polymorph?enemy.polymorph.stunAnimation:ENEMIES[enemy.kind].stunAnimation??'thorn';age=battle.time-enemy.thornAt;}
      else if(battle.time-enemy.rangedStarted<(ENEMIES[enemy.kind].boss?.siege?48/30:ENEMIES[enemy.kind].ranged?.duration??12/30)){animation='shoot';age=battle.time-enemy.rangedStarted;}
      else if(battle.time-enemy.healStarted<(ENEMIES[enemy.kind].heal?.duration??24/30)){animation='heal';age=battle.time-enemy.healStarted;}
      else if(ENEMIES[enemy.kind].area?.hitTimes&&battle.time-enemy.attackStarted<ENEMIES[enemy.kind].area!.duration){animation='attack';age=battle.time-enemy.attackStarted;}
      else if (enemy.blockedBy !== null) {
        animation = battle.time - enemy.attackStarted < (ENEMIES[enemy.kind].boss?.siege?1:ENEMIES[enemy.kind].attackDuration??.5) ? 'attack' : 'idle'; age = battle.time - enemy.attackStarted;
        const opponent = enemy.blockedBy === battle.hero.id ? battle.hero : battle.soldiers.find(s => s.id === enemy.blockedBy)!;
        flip = opponent.x < enemy.x;
      }
      else {
        animation = Math.abs(enemy.heading.y) > Math.abs(enemy.heading.x) * 1.5 ? (enemy.heading.y > 0 ? 'walkingUp' : 'walkingDown') : 'walkingRightLeft';
        age = battle.time + enemy.id * .11;
      }
      if(animation.startsWith('walking')&&battle.onMoveTerrain(enemy))animation=ENEMIES[enemy.kind].terrainMove!.walk[animation==='walkingRightLeft'?0:animation==='walkingUp'?1:2];
      if(animation.startsWith('walking')&&enemy.boostUntil&&battle.time<enemy.boostUntil)animation+=ENEMIES[enemy.kind].speedOnHit!.animationSuffix;
      const alpha = enemy.deadAt === null ? 1 : current.boss?.fade?Math.max(0,1-(age-current.boss.winDelay)/current.boss.fade):Math.min(1, ((ENEMIES[enemy.kind].boss?.deathLifetime??1.2) - age) * 3);
      if(battle.enemyFlying(enemy)&&enemy.deadAt===null){const s=current.flight?.shadow;if(s)this.sprite('shadow-'+enemy.id,s.frame,enemy.x+s.offset.x,enemy.y+s.offset.y,s.anchor.x,s.anchor.y,false,1400);else this.sprite('shadow-'+enemy.id,'decal_flying_shadow',enemy.x,enemy.y,.5,.5,false,1400);}
      this.sprite(`enemy-${enemy.id}`, this.frame(prefix + '_' + animation, age, animation.startsWith('walking')||animation.startsWith('skate')||animation==='breath'||animation===current.boss?.deathEnd?.animation||!!enemy.scriptAnimation?.loop), enemy.x, enemy.y, .5, ENEMIES[enemy.kind].anchor, flip, 3000 + HEIGHT - enemy.y, alpha);
      if(battle.time<enemy.thornUntil){const age=battle.time-enemy.thornAt,remaining=enemy.thornUntil-battle.time;const size=ENEMIES[enemy.kind].healthOffset>40?'big':'small';this.sprite('thorn-'+enemy.id,this.frame(`mod_thorn_${size}_${remaining<6/30?'end':age<18/30?'start':'loop'}`,remaining<6/30?6/30-remaining:age,false),enemy.x,enemy.y,.5,.22,false,3001+HEIGHT-enemy.y).scale.set(SCALE*(size==='big'?.8:.7));}
      if(current.allyAura&&enemy.hp>0&&battle.time-enemy.born>=current.allyAura.delay){const a=current.allyAura;this.sprite('aura-base-'+enemy.id,a.ground,enemy.x+a.groundOffset.x,enemy.y+a.groundOffset.y,a.groundAnchor.x,a.groundAnchor.y,false,1400);this.sprite('aura-'+enemy.id,this.frame(a.groundAnimation,battle.time,true),enemy.x+a.groundOffset.x,enemy.y+a.groundOffset.y,a.groundAnchor.x,a.groundAnchor.y,false,1401);}
      if(enemy.damageBoost&&battle.time<enemy.damageBoost.until&&enemy.hp>0){const a=enemy.damageBoost.config;this.sprite('boost-'+enemy.id,this.frame(a.animation,battle.time,true),enemy.x+a.offset.x,enemy.y+a.offset.y,.5,.5,false,3002+HEIGHT-enemy.y);this.sprite('boost-sign-'+enemy.id,a.frame,enemy.x,enemy.y,.5,.5,false,3003+HEIGHT-enemy.y);}
      if(enemy.hp>0&&enemy.totemSpeed&&battle.time<enemy.totemSpeed.until)this.sprite('totem-speed-'+enemy.id,this.frame('mod_elder_shaman_speed',battle.time-enemy.totemSpeed.born,true),enemy.x,enemy.y,.5,.5,false,3002+HEIGHT-enemy.y);
      if(enemy.rage&&battle.time<enemy.rage.until)this.sprite('rage-'+enemy.id,this.frame(enemy.rage.animation,battle.time-enemy.rage.born,true),enemy.x,enemy.y,.5,.2,false,3002+HEIGHT-enemy.y);
      if(enemy.net&&battle.time<enemy.net.until)this.sprite('net-'+enemy.id,enemy.net.effect,enemy.x,enemy.y+current.hitOffset,.5,.5,false,3002+HEIGHT-enemy.y);
      if(selected.unit?.type==='enemy'&&selected.unit.id===enemy.id)this.sprite('marker-enemy','selected_small',enemy.x,enemy.y,.5,.5,false,1400);
      if(enemy.shield){const offset=current.modOffset!;this.sprite('shield-'+enemy.id,this.frame(enemy.shield.animation,battle.time-enemy.shield.born,true),enemy.x+offset.x,enemy.y+offset.y,.5,.5,false,3004+HEIGHT-enemy.y);}
      if(enemy.curse&&battle.time<enemy.curse.until){const size=ENEMIES[enemy.kind].boss?'large':ENEMIES[enemy.kind].healthOffset>40?'medium':'small';this.sprite('curse-'+enemy.id,this.frame(enemy.curse.config.animation+'_'+size,battle.time-enemy.curse.born,true),enemy.x,enemy.y+current.hitOffset/2,.5,.5,false,3003+HEIGHT-enemy.y);}
      if(enemy.finisher?.phase==='death'&&battle.time-enemy.finisher.at>=ENEMIES[enemy.kind].boss!.finisher!.deathDuration)this.sprite('finish-'+enemy.id,this.frame(ENEMIES[enemy.kind].boss!.finisher!.tap,battle.time,true),enemy.x,enemy.y,.5,.5,false,3100+HEIGHT-enemy.y);
      if (enemy.hp > 0&&!enemy.finisher&&enemy.transformAt===undefined&&!enemy.dormant&&(!enemy.flight||enemy.flight.phase==='ground'||enemy.flight.phase==='flying')&&!(enemy.clone&&enemy.raiseAt!==undefined&&battle.time-enemy.raiseAt<enemy.raiseDuration!)) this.health(enemy, enemy.hp / current.health, false, current.healthOffset,ENEMIES[enemy.kind].boss?80:22);
    }
    for(const egg of battle.eggs){const age=battle.time-egg.born;this.sprite('egg-'+egg.id,this.frame(egg.config.prefix+'_start',age,false),egg.x,egg.y,.5,.22,false,2999+HEIGHT-egg.y,Math.min(1,(egg.config.hatch+egg.config.interval*egg.config.count+4-age)/4));}
    for(const spawner of battle.bombSpawners)this.sprite('boss-spawner-'+spawner.id,this.frame('bomb_juggernaut_spawner_open',battle.time-spawner.born,false),spawner.position.x,spawner.position.y,.5,.22,false,2999+HEIGHT-spawner.position.y,Math.min(1,(5.4-(battle.time-spawner.born))/4));
    for(const [i,f]of battle.abilities.frogs.entries()){const c=f.config,age=battle.time-f.born;if(age<c.delay)continue;let animation='idle',at=age,shift=0;if(age>=c.jumpAt+c.jumpDuration+c.rest){animation='puff';at=age-c.jumpAt-c.jumpDuration-c.rest;shift=1;}else if(age>=c.jumpAt){animation=age<c.jumpAt+c.jumpDuration?'jump':'idle';at=age-c.jumpAt;shift=Math.min(1,at/c.jumpDuration);}this.sprite('frog-'+i,this.frame(c.prefix+'_'+animation,at,animation!=='puff'),f.position.x+c.jumpOffset.x*shift*(f.flip?-1:1),f.position.y+c.jumpOffset.y*shift,c.anchor.x,c.anchor.y,f.flip,3001+HEIGHT-f.position.y);}
    for (const soldier of battle.soldiers) {
      if(soldier.consumed)continue;
      if(soldier.deadAt===null&&((selected.unit?.type==='soldier'&&selected.unit.id===soldier.id)||(selected.pad===soldier.towerId&&soldier.towerId!==null)))this.sprite('marker-soldier-'+soldier.id,'selected_soldier_small',soldier.x,soldier.y,.5,.5,false,1400);
      this.soldier(soldier,battle);
    }
    if(battle.heroEnabled){
    const hero=battle.hero,age=battle.time-hero.animationAt;
    if(hero.deadAt!==null && hero.animation==='death' && battle.time-hero.deadAt>=(battle.heroContent?.tombstone??GERALD.tombstone)) {
      this.sprite('hero','hero_death_0039',hero.x,hero.y,.5,.16);
    } else {
      if(selected.power==='hero'&&hero.deadAt===null)this.sprite('hero-selected','selected_soldier_small',hero.x,hero.y,.5,.5,false,1000);
      this.sprite('hero',this.frame(battle.heroController?battle.heroController.animation:'hero_gerald_'+hero.animation,age,hero.animation==='running'),hero.x,hero.y,battle.heroContent!.anchor.x,battle.heroContent!.anchor.y,hero.flip);
      if(hero.deadAt===null&&!(hero.animation==='levelup'&&battle.time<24/30))this.health(hero,hero.hp/battle.heroHealth,true,battle.heroController?.transformed&&battle.heroContent!.id==='10yr'?battle.heroContent!.transform.healthOffset!:battle.heroContent!.healthBar.offset,34);
    }
    }
    const heroes=battle.heroController;
    if(heroes){
      for(const v of heroes.visuals){const image=this.sprite('hero-fx-'+v.id,v.animation?this.frame(v.animation,battle.time-v.born,v.loop):v.frame!,v.x,v.y,v.anchor.x,v.anchor.y,false,v.ground?1401:3001+HEIGHT-v.y,v.alpha);if(v.end){image.width=Math.hypot(v.end.x-v.x,v.end.y-v.y);image.rotation=Math.atan2(-(v.end.y-v.y),v.end.x-v.x);}}
      for(const p of heroes.shots){const e=heroes.data.entities[p.entity],name=e.prefix?this.frame(e.prefix+'_flying',battle.time-p.born):e.animated?this.frame(e.frame,battle.time-p.born):e.frame;const image=this.sprite('hero-shot-'+p.id,name,p.x,p.y,e.anchor.x,e.anchor.y,false,4400);image.rotation=Number(e.bullet.rotation_speed)?(battle.time-p.born)*Number(e.bullet.rotation_speed):Math.atan2(-(p.end.y-p.y),p.end.x-p.x);}
    }
    for(const p of battle.chainParticles){const age=battle.time-p.born;if(age<0)continue;const progress=age/p.life,s=this.sprite('chain-particle-'+p.id,this.frame(p.animation,age,true),p.position.x+Math.cos(p.angle)*p.speed*age,p.position.y+Math.sin(p.angle)*p.speed*age,.5,.5,false,3000+HEIGHT-p.position.y,Math.min(1,progress*3,(1-progress)*3));s.scale.set(SCALE*p.scale*(1-.55*progress));}
    for(const ray of battle.chainRays){const beam=this.sprite('chain-'+ray.id,this.frame(ray.config.animation,battle.time-ray.born,false),ray.from.x,ray.from.y,0,.5,false,4400),length=Math.hypot(ray.end.x-ray.from.x,ray.end.y-ray.from.y);beam.width=length;beam.scale.y*=ray.scale*(.4+Math.min(.6,length/106*.6));beam.rotation=Math.atan2(-(ray.end.y-ray.from.y),ray.end.x-ray.from.x);}
    for(const ray of battle.abilityRays){const enemy=battle.enemies.find(e=>e.id===ray.target);if(!enemy)continue;const end={x:enemy.x,y:enemy.y+battle.effectiveEnemyStats(enemy).hitOffset},beam=this.sprite('ability-ray-'+ray.id,this.frame(ray.animation,battle.time-ray.born,false),ray.from.x,ray.from.y,0,.5,false,4400);beam.width=Math.hypot(end.x-ray.from.x,end.y-ray.from.y);beam.scale.y*=ray.scale;beam.rotation=Math.atan2(-(end.y-ray.from.y),end.x-ray.from.x);}
    for(const ray of battle.rays){const enemy=battle.enemies.find(e=>e.id===ray.target);if(!enemy)continue;const end={x:enemy.x,y:enemy.y+battle.effectiveEnemyStats(enemy).hitOffset},beam=this.sprite('ray-'+ray.id,this.frame(ray.disintegrate?'ray_arcane_disintegrate':'ray_arcane',battle.time-ray.born,!ray.disintegrate),ray.from.x,ray.from.y,0,.5,false,4400);beam.width=Math.hypot(end.x-ray.from.x,end.y-ray.from.y);beam.rotation=Math.atan2(-(end.y-ray.from.y),end.x-ray.from.x);}
    for (const projectile of battle.projectiles) {
      if (battle.time < projectile.born) continue;
      if(projectile.kind==='enemyArrow'&&projectile.animation&&projectile.position){const p=projectile.position!,sprite=this.sprite('projectile-'+projectile.id,this.frame(projectile.animation,battle.time-projectile.born,true),p.x,p.y,.5,.5,false,4400);sprite.rotation=Math.atan2(-(projectile.end.y-p.y),projectile.end.x-p.x);continue;}
      if(projectile.kind==='net'){const p=projectile.position!;this.sprite('projectile-'+projectile.id,this.frame(projectile.animation!,battle.time-projectile.born),p.x,p.y,.5,.5,false,4400);continue;}
      if(projectile.kind==='musket'){
        const p=projectile.position!;if(Math.hypot(p.x-projectile.start.x,p.y-projectile.start.y)>25&&Math.hypot(p.x-projectile.end.x,p.y-projectile.end.y)>25)this.sprite('projectile-'+projectile.id,'bullet',p.x,p.y,.5,.5,false,4400).rotation=Math.atan2(-(projectile.end.y-p.y),projectile.end.x-p.x);continue;
      }
      if(projectile.kind==='missile'){const p=projectile.position!,image=this.sprite('projectile-'+projectile.id,this.frame('missile_bfg_flying',battle.time-projectile.born),p.x,p.y,.5,.5,false,4400);image.rotation=Math.atan2(-projectile.velocity!.y,projectile.velocity!.x);continue;}
      const {x,y,rotation}=projectileDisplay(projectile,battle.time);
      if (projectile.kind === 'arrow' || projectile.kind === 'bomb'||projectile.kind==='enemyArrow'||projectile.kind==='bossBomb'||projectile.kind==='shrapnel'||projectile.kind==='cluster') {
        const s = this.sprite(`projectile-${projectile.id}`, projectile.animation?this.frame(projectile.animation,battle.time-projectile.born,true):projectile.texture?projectile.texture:projectile.kind==='shrapnel'?'bombs_0007':projectile.kind==='bossBomb'?'bossJuggernaut_bomb_':projectile.kind==='arrow'||projectile.kind==='enemyArrow'?'arrow':`g1_bombs_000${projectile.tier}`, x, y, .5, .5, false, 4400);
        s.rotation = rotation;
      } else if (projectile.kind === 'bolt') {
        this.sprite(`projectile-${projectile.id}`, this.frame(projectile.animation??'bolt_flying', battle.time - projectile.born), x, y, .4875, .44230769, false, 4400);
      } else {
        const last=this.emitters.get(projectile.id),from=last?.time??projectile.born;
        const elapsed=battle.time-from,count=Math.floor(elapsed*60);
        if(count>0){
          // Keep fractional emission time: display refresh may exceed 60 Hz.
          for(let i=Math.max(1,count-20);i<=count;i++){
            const t=i/60/elapsed;
            // ps_power_fireball.scale_same_aspect=false: each axis has its own scale_var.
            this.trails.push({id:++this.trailId,x:last?last.x+(x-last.x)*t:x,y:last?last.y+(y-last.y)*t:y,born:from+i/60,life:.25+Math.random()*.1,scaleX:.4+Math.random()*.5,scaleY:.4+Math.random()*.5});
          }
          const t=count/60/elapsed;
          this.emitters.set(projectile.id,{x:last?last.x+(x-last.x)*t:x,y:last?last.y+(y-last.y)*t:y,time:from+count/60});
        }
        this.sprite(`projectile-${projectile.id}`, this.frame('fireball_proyectile' , battle.time - projectile.born), x, y, .5, .5, false, 4400).rotation = Math.PI / 2;
        this.sprite(`shadow-${projectile.id}`, this.frame('fireball_shadow', battle.time - projectile.born, false), projectile.end.x, projectile.end.y, .5, .5, false, 1000);
      }
    }
    for(const id of this.emitters.keys())if(!battle.projectiles.some(p=>p.id===id))this.emitters.delete(id);
    for(const p of this.trails){const age=battle.time-p.born,t=age/p.life;if(t>=1)continue;this.sprite('fire-tail-'+p.id,this.frame('fireball_particle',age,false),p.x,p.y,.5,.5,false,3200,1-t).scale.set(SCALE*p.scaleX*(1+1.5*t),SCALE*p.scaleY*(1+1.5*t));}
    for(let i=0;i<battle.scorches.length;i++){const c=battle.scorches[i],age=battle.time-c.born;const alpha=Math.min(1,age/(10/30),(c.duration-age)/.5);this.sprite('scorch-base-'+i,'decal_scorched_earth_base',c.x,c.y,.5,.5,false,1001,alpha);this.sprite('scorch-fire-'+i,'decal_scorched_earth_fire',c.x,c.y,.5,.5,false,1002,alpha*(1-Math.abs((age%1)*2-1)));}
    for (const effect of battle.effects) {
      const age = battle.time - effect.born;if(age<0)continue;
      if(effect.kind==='source')this.sprite('fx-'+effect.id,effect.ground?effect.animation!:this.frame(effect.animation!,age,false),effect.x,effect.y,.5,effect.anchor!,effect.flip,effect.z??(effect.ground?1400:4450),effect.ground?Math.min(1,(effect.life-age)/(effect.life-effect.ground.fadeAfter)):1);
      if(effect.kind==='crosshair'){const target=battle.enemies.find(e=>e.id===effect.target);if(target)this.sprite('fx-'+effect.id,this.frame('musketeer_crosshair',age,false),target.x,target.y+ENEMIES[target.kind].hitOffset,.5,.5,false,4450);}
      if(effect.kind==='rifleSmoke'||effect.kind==='shotHit'||effect.kind==='shrapnel')this.sprite('fx-'+effect.id,this.frame(({rifleSmoke:'fx_rifle_smoke',shotHit:'smoke_bullet',shrapnel:'explosion_shrapnel'} as const)[effect.kind],age,false),effect.x,effect.y,.5,effect.kind==='shrapnel'?.2:.5,false,4450);
      if(effect.kind==='holy')this.sprite('fx-'+effect.id,this.frame('decal_paladin_holystrike',age,false),effect.x,effect.y,.5,.5,false,1401);
      if(effect.kind==='teleport')this.sprite('fx-'+effect.id,this.frame('aura_teleport_arcane',age,false),effect.x,effect.y,.5,.375,false,1401);
      if(effect.kind==='heal')this.sprite('fx-'+effect.id,this.frame('healing_small',age,false),effect.x,effect.y,.5,.2,false,3001+HEIGHT-effect.y);
      if (effect.kind === 'magic') this.sprite('fx-' + effect.id, this.frame('bolt_hit', age, false), effect.x, effect.y, .4875, .44230769, false, 4450);
      if (effect.kind === 'explosion') this.sprite('fx-' + effect.id, this.frame('explosion_big', age, false), effect.x, effect.y, .5, .13, false, 4450).scale.set(SCALE * .9);
      if (effect.kind === 'fire') this.sprite('fx-' + effect.id, this.frame('fireball_explosion', age, false), effect.x, effect.y, .5, .15, false, 3000 + HEIGHT - effect.y);
      if (effect.kind === 'crater') this.sprite('fx-' + effect.id, 'decal_bomb_crater', effect.x, effect.y, .5, .5, false, 1000, Math.min(1,(2.5-age)/1.5));
      if(effect.kind==='lightning')this.sprite('fx-'+effect.id,`power_lightning_${String(1+Math.min(9,Math.floor(age*30))).padStart(4,'0')}`,effect.x+5,effect.y+405,.5,.5,false,4450).scale.set(2*SCALE);
      if(effect.kind==='sheepExplode')this.sprite('fx-'+effect.id,this.frame('explode_small',age,false),effect.x,effect.y,.5,.22,false,3001+HEIGHT-effect.y);
      if(effect.kind==='sheepBomb')this.sprite('fx-'+effect.id,this.frame('explosion_big',age,false),effect.x,effect.y,.5,.13,false,3002+HEIGHT-effect.y).scale.set(.9*SCALE);
    }
    for(let i=this.healthBarCount;i<this.healthBars.length;i++)this.healthBars[i].background.visible=this.healthBars[i].fill.visible=false;
    for (const [key, sprite] of this.sprites) if (!this.seen.has(key)) { sprite.destroy(); this.sprites.delete(key); }
    
  }

  private tower(tower: Tower, time: number, hover: boolean) {
    const p = tower.pad.position, key = 'tower-' + tower.pad.id, z = 3000 + HEIGHT - p.y;
    if(tower.camp){const c=tower.camp;this.sprite(key,c.frame,p.x+c.offset.x,p.y+c.offset.y,.5,.5,false,1298);return;}
    if(tower.special==='elf'){
      this.sprite(key,'elfTower_layer1_0001',p.x,p.y+20,.5,.5,false,z);
      const open=tower.door==='opening'||tower.door==='open',age=tower.door==='closed'||tower.door==='open'?1:time-tower.doorAt;
      this.sprite(key+'-door',this.frame('tower_elf_door_'+(open?'open':'close'),age,false),p.x,p.y+20,.5,.5,false,z+.1);return;
    }
    if(tower.manual){const c=tower.manual,v=c.presentation,state=tower.manualState!,age=time-tower.shotAt,remaining=state.readyAt-time,mode=state.rank===0?'disabled':age<c.shootDuration?'shoot':remaining>c.readyDuration?'charging':remaining>0?'ready_start':'ready_idle',clock=mode==='shoot'?age:mode==='ready_start'?c.readyDuration-remaining:time;
      this.sprite(key,v.base,p.x+v.offset.x,p.y+v.offset.y,.5,.5,false,z);if(hover)this.sprite(key+'-hover',v.hover,p.x-6,p.y+51,.5,.5,false,1300);
      for(const layer of v.layers)this.sprite(key+'-layer'+layer,this.frame(v.prefix+'_layer'+layer+'_'+mode,clock,mode==='charging'||mode==='ready_idle'),p.x+v.offset.x,p.y+v.offset.y,.5,.5,false,z+layer*.01);
      for(let i=0;i<state.rank;i++){const caster=v.casters[i];this.sprite(key+'-caster'+i,this.frame(caster.prefix+'_'+(mode==='charging'?'charge':'idle'),time,true),p.x+caster.offset.x,p.y+caster.offset.y,.5,2/17,false,z+.1+i*.01);}return;
    }
    const baseOffset = { archer: 12, barrack: 13, mage: 15, artillery: 15 }[tower.kind];
    this.sprite(key + '-terrain', `terrains_00${String(tower.pad.terrain??12)}${hover?'_over':''}`, p.x, p.y + baseOffset, .5, .5, false, 1300);
    if (time < tower.builtAt) {
      const frame = { archer: 4, barrack: 2, mage: 3, artillery: 1 }[tower.kind];
      const offset = { archer: 39, barrack: 40, mage: 31, artillery: 41 }[tower.kind];
      this.sprite(key, `tower_constructing_000${frame}`, p.x, p.y + offset, .5, .5, false, z);
      this.sprite(key + '-bar-bg', 'buildbar_bg', p.x, p.y + 50, .5, .5, false, z + .1);
      this.sprite(key + '-bar', 'buildbar', p.x - 21, p.y + 50, 0, .5, false, z + .2).scale.x = SCALE * (time - tower.createdAt) / .8;
      return;
    }
    const age = time - tower.shotAt;
    if(tower.extension){
      const view=tower.extension.presentation;
      if(view.frame)this.sprite(key,view.frame,p.x,p.y+view.offset,.5,.5,false,z);
      if(view.prefix){const active=age<(tower.artillery?.mode==='missile'?tower.extension.artillery!.missile.duration:view.shootDuration);this.sprite(key,this.frame(view.prefix+'_'+(active?(tower.artillery?.mode==='missile'?'missile':'shoot'):'idle'),age,false),p.x,p.y+view.offset,.5,.5,false,z);}
      if(view.shooter){const v=view.shooter,poly=tower.spellState!.mode==='polymorph',active=age<view.shootDuration;this.sprite(key+'-shooter',this.frame(v.prefix+'_'+(active?(poly?'polymorph':'shooting'):'idle')+(tower.aimUp?'Up':'Down'),age,false),p.x+v.offset.x,p.y+v.offset.y,.5,.5,false,z+.1);if(active&&poly)this.sprite(key+'-poly',this.frame(v.polymorphEffect,age,false),p.x+v.effectOffset.x,p.y+v.effectOffset.y,.5,.5,false,z+.2);}
      if(view.door){const open=tower.door==='opening'||tower.door==='open',t=tower.door==='closed'||tower.door==='open'?1:time-tower.doorAt;this.sprite(key+'-door',this.frame(view.door+'_'+(open?'open':'close'),t,false),p.x,p.y+view.offset,.5,.5,false,z+.1);}
    }else if(tower.special==='musketeer'){
      this.sprite(key,'archer_tower_0004',p.x,p.y+37,.5,.5,false,z);
      for(let i=0;i<2;i++){
        const primary=tower.shooter===i,active=age<({shot:26,sniper:39,shrapnel:33}[tower.musketMode])/30;
        const mode=!active?'idle':tower.musketMode==='sniper'?(primary?'sniperShoot':'sniperSeek'):tower.musketMode==='shrapnel'?(primary?'cannonShoot':'cannonFuse'):primary?'shooting':'idle';
        this.sprite(key+'-'+i,this.frame('tower_musketeer_shooter_'+mode+(tower.aimUp?'Up':'Down'),age,false),p.x+(i?8:-8),p.y+56,.5,.5,false,z+.1+i*.01);
      }
    }else if (tower.kind === 'archer') {
      this.sprite(key, tower.tier===4?'archer_tower_0005':`g1_archer_tower_000${tower.tier}`, p.x, p.y + (tower.tier===4?40:37), .5, .5, false, z);
      for (let i = 0; i < 2; i++) {
        const shooting = age < 8 / 30 && tower.shooter % 2 === i;
        const anim = `${tower.tier===4?'tower_ranger_shooter':`g1_shooterarcherlvl${tower.tier}`}_${shooting ? 'shooting' : 'idle'}${tower.aimUp ? 'Up' : 'Down'}`;
        this.sprite(key + '-' + i, this.frame(anim, age, false), p.x + (i ? 9 : -9), p.y + ([0,51,52,57,65][tower.tier]), .5, .5, false, z + .1 + i * .01);
      }
      if(tower.thorn>0)this.sprite(key+'-druid',this.frame('tower_ranger_druid_'+(time-tower.thornStarted<41/30?'shoot':'idle'),time-tower.thornStarted,false),p.x+31,p.y+15,.5,.5,false,z+.15);
    } else if(tower.kind==='mage'&&tower.tier===4){
      const active=age<(tower.arcaneMode==='teleport'?34:28)/30,mode=active?(tower.arcaneMode==='teleport'?'teleport':'shoot'):'idle';
      this.sprite(key,this.frame('tower_arcane_wizard_'+mode,age,false),p.x,p.y+40,.5,.5,false,z);
      this.sprite(key+'-mage',this.frame('tower_arcane_wizard_shooter_'+(active?(mode==='teleport'?'teleport':'shooting'):'idle')+(tower.aimUp?'Up':'Down'),age,false),p.x,p.y+58,.5,.5,false,z+.1);
    } else if (tower.kind === 'mage') {
      this.sprite(key, this.frame(`g1_towermagelvl${tower.tier}_` + (age < .4 ? 'shoot' : 'idle'), age, false), p.x, p.y + 30, .5, .5, false, z);
      this.sprite(key + '-mage', this.frame(`shootermage_${age < 14 / 30 ? 'shooting' : 'idle'}${tower.aimUp ? 'Up' : 'Down'}`, age, false), p.x + 1, p.y + (tower.tier===3?62:57), .5, .5, false, z + .1);
    } else if (tower.kind === 'artillery') {
      for (let i = 1; i <= 7; i++) this.sprite(key + '-' + i, this.frame(`g1_towerengineerlvl${tower.tier}_layer${i}_${age < 35 / 30 ? 'shoot' : 'idle'}`, age, false), p.x, p.y + (40+tower.tier), .5, .5, false, z + i * .01);
    } else {
      this.sprite(key, tower.tier===4?'tower_barracks_lvl4_Paladins_layer1_0001':`g1_tower_barracks_lvl${tower.tier}_layer1_0001`, p.x, p.y + 38, .5, .5, false, z);
      if(tower.tier===4)this.sprite(key+'-flag',this.frame('tower_paladin_flag',time),p.x+7,p.y+72,.5,.5,false,z+.15);
      const open=tower.door==='opening'||tower.door==='open';
      const doorAge=tower.door==='closed'||tower.door==='open'?1:time-tower.doorAt;
      this.sprite(key + '-door', this.frame((tower.tier===4?'towerbarracklvl4_paladin_door_':`g1_towerbarracklvl${tower.tier}_door_`)+(open?'open':'close'), doorAge, false), p.x, p.y + 38, .5, .5, false, z + .1);
    }
  }

  private soldier(soldier: Soldier, battle:Battle) {
    const time=battle.time;
    if(soldier.summon){
      const c=soldier.summon,d=battle.heroContent!.entities[c.entity],dead=soldier.deadAt!==null;
      const name=dead?(c.entity==='soldier_magnus_illusion'?'idle':'death'):soldier.stun&&time<soldier.stun.until?'idle':c.animation,age=dead?time-soldier.deadAt!:time-c.animationAt;
      this.sprite('soldier-'+soldier.id,this.frame(d.prefix+'_'+name,age,name==='running'),soldier.x,soldier.y,c.anchor.x,c.anchor.y,soldier.flip,3000+HEIGHT-soldier.y,(c.entity==='soldier_magnus_illusion'?.7:1)*(dead?Math.max(0,1-age):1));
      if(!dead)this.health(soldier,soldier.hp/c.stats.health,true,35);return;
    }
    const reinforcement = soldier.towerId === null&&!soldier.role;
    const profile=soldier.profile,tower=profile?battle.towers.find(t=>t.pad.id===soldier.towerId):undefined,suffix=profile?.meleePower&&tower!.powerLevels![profile.meleePower.power]>0?profile.meleePower.animationSuffix:'';
    const prefix = profile?profile.prefix:soldier.role==='guard'?'soldier_s6_imperial_guard':soldier.role==='elf'?'soldier_elf':reinforcement ? `${['re1_farmer','re1_farmer_well_fed','re1_conscript','re1_warrior','re1_legionnaire','re1_legionnaire_ranged'][battle.stats.reinforcement.level]}_${soldier.variant + 1}` : ['','g1_soldiermilitia','g1_soldierfootmen','g1_soldierknight','soldier_paladin'][soldier.tier];
    if (soldier.deadAt !== null && time - soldier.deadAt > (tower?.extension?.guardian?profile!.deathLifetime:1)) return;
    let animation = soldier.deadAt !== null ? (reinforcement?'running':'death') : soldier.moving ? 'running' : time-soldier.healStarted<1?'healing':time-soldier.attackStarted<25/30&&soldier.holy?'holystrike':time-soldier.rangedStarted<12/30?'shoot':time - soldier.attackStarted < 11 / 30 ? 'attack' : 'idle';
    if(profile&&soldier.deadAt===null){const area=profile.areaPower??profile.area;if(!soldier.moving&&time-soldier.attackStarted<(suffix?profile.meleePower!.duration:profile.attackDuration))animation='attack';if(time-soldier.rangedStarted<(profile.rangedPower?.duration??12/30))animation=soldier.rangedMode==='net'?'net':'shoot';else if(soldier.areaActive&&area&&time-soldier.attackStarted<area.duration)animation=area.animation;}
    const guardian=tower?.extension?.guardian;if(guardian&&soldier.deadAt===null&&time-soldier.born<guardian.raiseDuration)animation=guardian.raiseAnimation;
    const age = animation===guardian?.raiseAnimation?time-soldier.born:soldier.deadAt !== null ? time - soldier.deadAt : animation==='net'?time-soldier.rangedStarted:animation==='twister'?time-soldier.attackStarted:animation==='healing'?time-soldier.healStarted:animation==='holystrike'?time-soldier.attackStarted:animation==='shoot'?time-soldier.rangedStarted:animation === 'attack' ? time - soldier.attackStarted : time;
    const alpha=reinforcement?(soldier.deadAt!==null?Math.max(0,1-(time-soldier.deadAt)/(10/30)):Math.min(1,(time-soldier.born)/(10/30))):1;
    this.sprite(`soldier-${soldier.id}`, this.frame(prefix + '_' + animation+(animation!=='death'?suffix:''), age, animation === 'running'), soldier.x, soldier.y, .5, profile?profile.anchor:soldier.role==='elf'?.19:reinforcement ? .1591 : .17, soldier.flip, 3000 + HEIGHT - soldier.y,alpha);
    if(time<soldier.courageUntil&&soldier.hp>0)this.sprite(`courage-${soldier.id}`,this.frame('mod_gerald_courage',time-(soldier.courageUntil-GERALD.courageDuration)),soldier.x,soldier.y,.51,.173076923,false,3001+HEIGHT-soldier.y);
    if (soldier.hp > 0) this.health(soldier, soldier.hp / battle.soldierStats(soldier).health, true, profile?profile.healthOffset:reinforcement ? 25 : 25.16);
  }

  async destroy() {
    this.app.destroy({ removeView: true }, { children: true, texture: false, textureSource: false });
    for (const texture of this.textures.values()) texture.destroy();
    await Assets.unload(['/assets/kr1/battle/southport.png', '/assets/kr1/battle/atlas.png'].map(resourceUrl));
  }
}
