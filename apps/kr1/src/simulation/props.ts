import type { Decoration } from '../content/types';

// ORIGINAL: scripts_123.delayed_play / click_pause and game_templates-1 sheep/mills.
// Cosmetic randomness is separate from combat rolls.
export class SceneProp {
  clicks = 0;
  clickAt:number|null=null;
  clickPrefix:string|null=null;
  appearanceAt:number|null=null;
  appearanceUntil=0;
  appearanceNext=0;
  position:{x:number;y:number};
  pendingAchievement:string|null=null;
  pendingSounds:import('../audio/combat-cues').CombatCue[]=[];
  private repeatedSound=false;
  get clickable(){const c=this.decoration.clickPlay;if(!c)return true;return this.clickAt===null&&(!c.appear||this.appearanceAt!==null);}
  get clickVisual(){const c=this.decoration.clickPlay;if(!c)return null;const prefix=this.clickPrefix??this.decoration.presentation!.prefix;return {prefix,hidden:!!c.appear&&this.appearanceAt===null&&this.clickAt===null};}
  releaseAt:number|null=null;
  ambientAlpha=0;
  ambientAt=-100;
  ambientNext=0;
  removed = false;
  releaseComplete=false;
  triggerAt:number|null=null;
  paused = false;
  phase = 0;
  bumpAt = -100;
  playAt = -100;
  flip: boolean;
  readonly sheep: boolean;
  readonly mill: boolean;
  readonly fish:boolean;
  readonly playDuration=22/30;
  readonly alternative: boolean;
  private readonly delay: number;
  private nextPlay: number;
  constructor(readonly decoration: Decoration, random = Math.random) {
    this.position={...decoration.position};
    const appear=decoration.clickPlay?.appear;if(appear)this.appearanceNext=appear.pause[0]+random()*(appear.pause[1]-appear.pause[0]);
    if(decoration.presentation?.delay)this.ambientNext=decoration.presentation.delay[0]+random()*(decoration.presentation.delay[1]-decoration.presentation.delay[0]);
    this.sheep = decoration.kind.startsWith('decal_sheep')||decoration.kind==='decal_goat';
    this.fish=decoration.kind==='decal_fish';
    this.mill = decoration.kind.startsWith('decal_mill');
    this.alternative = this.sheep && random() < .1;
    this.flip = this.sheep && random() < .5;
    if(decoration.presentation?.flipChance!==undefined)this.flip=random()<decoration.presentation.flipChance;
    this.delay = 1 + random() * 4;
    this.nextPlay = this.fish?5+Math.floor(random()*6):this.delay;
  }
  update(time: number, dt: number, random = Math.random) {
    if (this.removed) return;
    const cp=this.decoration.clickPlay;
    if(cp){
      if(this.clickAt!==null){const age=time-this.clickAt;if(cp.soundAgainAt!==undefined&&!this.repeatedSound&&age>=cp.soundAgainAt){this.repeatedSound=true;this.pendingSounds.push(cp.sound!);}
        if(age>=(this.clickPrefix?cp.afterDuration!:cp.duration)+(cp.leave?.duration??0)){if(cp.achievement&&!this.clickPrefix)this.pendingAchievement=cp.achievement;if(cp.leave)this.removed=true;if(cp.afterPrefix)this.clickPrefix=cp.afterPrefix;this.clickAt=null;if(cp.appear){this.appearanceAt=null;this.appearanceNext=time+cp.appear.pause[0]+random()*(cp.appear.pause[1]-cp.appear.pause[0]);}}
      }else if(cp.appear){const c=cp.appear;if(this.appearanceAt!==null&&time>=this.appearanceUntil){this.appearanceAt=null;this.appearanceNext=time+c.pause[0]+random()*(c.pause[1]-c.pause[0]);}if(this.appearanceAt===null&&time>=this.appearanceNext){this.appearanceAt=time;this.position={...c.positions[Math.floor(random()*c.positions.length)]};this.appearanceUntil=time+c.enterDuration+c.visible[0]+random()*(c.visible[1]-c.visible[0]);}}
    }
    if(this.releaseAt!==null&&time-this.releaseAt>=this.decoration.clickRelease!.releaseDuration){this.releaseComplete=true;if(!this.decoration.clickRelease!.keepAfterRelease)this.removed=true;}
    const a=this.decoration.presentation;if(a?.delay&&time>=this.ambientNext){this.ambientAt=time;if(a.flipChance!==undefined&&random()<a.flipChance)this.flip=!this.flip;this.ambientNext=time+a.duration!+a.delay[0]+random()*(a.delay[1]-a.delay[0]);}
    if (!this.sheep && !this.fish && !this.paused) this.phase += dt;
    if(this.fish&&time>=this.nextPlay){this.playAt=time;this.nextPlay=time+this.playDuration+5+Math.floor(random()*6);}
    if (this.sheep && time >= this.nextPlay) {
      this.playAt = time;
      if (random() < .5) this.flip = !this.flip;
      this.nextPlay = time + 26 / 30 + this.delay;
    }
  }
  click(time: number): 'sheep' | 'sheepExplode' | 'sheepBomb' | null {
    if (this.removed) return null;
    const cp=this.decoration.clickPlay;if(cp){if(!this.clickable)return null;this.clickAt=time;this.repeatedSound=false;if(cp.sound)this.pendingSounds.push(cp.sound);return null;}
    if(this.decoration.clickRelease){if(this.releaseAt!==null)return null;this.bumpAt=time;this.clicks++;if(this.clicks===this.decoration.clickRelease.clicks)this.releaseAt=time;return null;}
    if (this.mill) { this.paused = !this.paused; return null; }
    if (!this.sheep) return null;
    this.bumpAt = time;
    // Clicking interrupts the idle play coroutine and restarts its wait.
    this.playAt = -100; this.nextPlay = time + this.delay;
    this.clicks++;
    if (this.clicks < 8) return 'sheep';
    this.removed = true;
    return this.alternative ? 'sheepBomb' : 'sheepExplode';
  }
  scale(time: number) {
    const t = time - this.bumpAt;
    return t < 0 || t >= .16 ? 1 : t <= .12 ? 1 + .2 * t / .12 : 1.2 - .2 * (t - .12) / .04;
  }
}
