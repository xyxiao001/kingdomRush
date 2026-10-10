import {heroDamageKind,type HeroAttack,type HeroContent} from '../content/heroes';
import {STEP} from '../content/balance';
import type {DamageKind,Point} from '../content/types';
import {inRange,damageAfterArmor,type Battle,type Enemy,type Soldier,type Hero} from './battle';

export interface HeroVisual extends Point {id:number;born:number;life:number;animation?:string;frame?:string;anchor:Point;loop:boolean;alpha:number;end?:Point;ground:boolean}
export interface HeroShot extends Point {id:number;entity:string;start:Point;end:Point;target:number|null;born:number;flight:number;speed:number;arc:boolean;damage:[number,number];kind:DamageKind;xp:number;radius:number;bounces:number;hit:()=>void;done:boolean}
export interface HeroSummon {entity:string;name:string;portrait:string;anchor:Point;animation:string;animationAt:number;busyUntil:number;stats:{health:number;armor:number;damage:[number,number];speed:number;regen:number;range:number;cooldown:number;windup:number;respawn:number};rangedDamage:[number,number]}
interface TimedAction {at:number;cast:boolean;run:()=>void}
interface GroundArea extends Point {until:number;next:number;radius:number;slow:number;damage:[number,number];kind:DamageKind;mine:boolean;visual:number;cycle:number}
const dist=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.y-b.y);

// Hero scripts own their skills; targets, navigation, armor, kills and allies stay in Battle.
export class HeroController {
  visuals:HeroVisual[]=[];
  shots:HeroShot[]=[];
  areas:GroundArea[]=[];
  readonly lastAttack=new Map<string,number>();
  private actions:TimedAction[]=[];
  private serial=0;
  private prefix:string;
  private transformedUntil=0;
  private transformEndsAt=0;
  private surge:{goal:Point;hit:Set<number>}|null=null;
  private deathHandled=false;
  private regenAt=0;
  constructor(readonly battle:Battle,readonly data:HeroContent){
    this.prefix=data.prefix;
    for(const [group,list] of Object.entries({m:this.stats.melee,r:this.stats.ranged,t:this.stats.timed}))list.forEach((_,i)=>this.lastAttack.set(group+i,0));
    battle.hero.hp=this.stats.health;battle.hero.busyUntil=this.duration('levelup');
  }
  get stats(){return this.data.levels[this.battle.hero.level-1];}
  get transformed(){return this.transformedUntil>0;}
  get invulnerable(){return this.transformed||this.surge!==null;}
  get animation(){return this.prefix+'_'+this.battle.hero.animation;}
  get speed(){return this.transformed&&this.data.id==='10yr'?this.data.transform.speed!:this.data.speed;}
  get range(){return this.transformed&&this.data.id==='10yr'?this.data.transform.range!:this.data.range;}
  duration(name:string,prefix=this.prefix){const a=this.data.animations[prefix+'_'+name];return (a.sequence?a.sequence.length:a.to-a.from+1)/30;}
  private phase(name:string){const h=this.battle.hero;h.animation=name;h.animationAt=this.battle.time;}
  private play(name:string){this.phase(name);this.battle.hero.busyUntil=this.battle.time+this.duration(name);}
  sound(cue?:string){if(cue)this.battle.events.push({type:'heroSound',cue});}
  private later(delay:number,run:()=>void,cast=false){this.actions.push({at:this.battle.time+delay,cast,run});}
  cancel(){this.actions=this.actions.filter(a=>!a.cast);this.surge=null;}
  move(){
    const h=this.battle.hero,t=this.data.teleport;
    if(this.battle.time<this.transformEndsAt){h.animation=this.transformed?(this.data.id==='ingvar'?'toBear':'normal_to_buffed'):(this.data.id==='ingvar'?'toViking':'to_normal');h.busyUntil=this.transformEndsAt;return;}
    this.cancel();
    if(t&&!this.transformed&&dist(h,h.home)>t.min_distance){
      this.sound(t.sound);this.play(t.animations[0]);const end={...h.home};
      this.later(this.duration(t.animations[0]),()=>{Object.assign(h,end);h.waypoints=[];this.play(t.animations[1]);},true);
      h.waypoints=[];
    }
    if(this.data.id==='alleria')for(const s of this.battle.soldiers.filter(s=>s.summon&&s.deadAt===null)){this.battle.release(s);s.home=this.battle.nearestRoad(h.home);}
  }
  private ready(key:string,a:HeroAttack){return !a.disabled&&this.battle.time-this.lastAttack.get(key)!>=a.cooldown;}
  private used(key:string,a:HeroAttack){this.lastAttack.set(key,this.battle.time);if(a.shared_cooldown&&a.xp_from_skill)this.stats.melee.forEach((other,i)=>{if(other.xp_from_skill===a.xp_from_skill)this.lastAttack.set('m'+i,this.battle.time);});}
  private skill(name:string){return this.stats.skills[name];}
  private xp(name:string){this.battle.hero.queuedXp+=this.skill(name).xp;}
  targets(p:Point,radius:number,bans=0,min=0){return this.battle.enemies.filter(e=>e.hp>0&&!e.escaped&&this.battle.validTargetNode(e)&&(!(bans&128)||!this.battle.enemyFlying(e))&&(!(bans&32)||!this.battle.controlImmune(e))&&inRange(p,e,radius)&&(min===0||!inRange(p,e,min))).sort((a,b)=>dist(p,a)-dist(p,b));}
  private target(a:HeroAttack){return this.targets(this.battle.hero,a.max_range!,a.vis_bans,a.min_range)[0];}
  private hit(e:Enemy,damage:[number,number],kind:DamageKind,xp=0,melee=false,attacker:Soldier|Hero=this.battle.hero){
    const b=this.battle,amount=b.abilities.outgoingDamage(attacker,b.roll(damage));
    if(e.hp<=0||e.escaped)return;
    if(melee&&!b.meleeDamage(e,amount,kind))return;
    if(!melee)b.damage(e,amount,kind);
    b.hero.queuedXp+=damageAfterArmor(amount,b.baseEnemyStats(e).armor,kind,b.baseEnemyStats(e).magicArmor)*xp;
  }
  private area(p:Point,radius:number,damage:[number,number],kind:DamageKind,bans=128,stun=0,attacker:Soldier|Hero=this.battle.hero){for(const e of this.targets(p,radius,bans)){this.hit(e,damage,kind,0,false,attacker);if(stun&&!this.battle.controlImmune(e))this.stun(e,stun);}}
  private stun(e:Enemy,duration:number){e.heroStunUntil=this.battle.time+duration;e.hitAt=null;e.rangedHitAt=null;}
  private slow(e:Enemy,duration:number,factor:number){e.heroSlow={until:this.battle.time+duration,factor};}
  visual(p:Point,animation:string,life?:number,ground=false,anchor:Point={x:.5,y:.5},end?:Point){const a=this.data.animations[animation];const v:HeroVisual={id:++this.serial,x:p.x,y:p.y,animation,born:this.battle.time,life:life===undefined?(a.to-a.from+1)/30:life,anchor,loop:false,alpha:1,ground,end};this.visuals.push(v);return v.id;}
  private decal(p:Point,frame:string,life:number){const v:HeroVisual={id:++this.serial,x:p.x,y:p.y,frame,born:this.battle.time,life,anchor:{x:.5,y:.5},loop:false,alpha:1,ground:true};this.visuals.push(v);return v.id;}
  private cast(key:string,a:HeroAttack,name:string,delay:number,run:()=>void,skill?:string){
    this.used(key,a);this.play(name);this.sound(a.sound);this.later(delay,()=>{run();if(skill)this.xp(skill);},true);
  }
  private pathPoint(e:Enemy,offset:number){const t=this.battle.tracks[e.lane];const node=t.cumulative.findIndex(d=>d>=e.distance);return t.points[Math.max(0,Math.min(t.points.length-1,node+offset))];}
  private predictedPoint(e:Enemy,seconds:number){
    if(e.blockedBy!==null||this.battle.time<(e.heroStunUntil??0))return {x:e.x,y:e.y};
    const track=this.battle.tracks[e.lane],distance=Math.min(track.length,e.distance+this.battle.baseEnemyStats(e).speed*seconds);
    const index=Math.max(1,track.cumulative.findIndex(d=>d>=distance)),a=track.points[index-1],b=track.points[index],t=(distance-track.cumulative[index-1])/(track.cumulative[index]-track.cumulative[index-1]);
    return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};
  }
  private launch(entity:string,target:Enemy|null,from:Point,damage:[number,number],xp=0,end?:Point,impact?:()=>void,attacker:Soldier|Hero=this.battle.hero){
    const d=this.data.entities[entity],p=d.bullet,to=end?{...end}: {x:target!.x,y:target!.y+this.battle.enemyStats[target!.kind].hitOffset};
    const arc=typeof p.flight_time==='number',speed=arc?0:Number(p.min_speed);
    const shot:HeroShot={id:++this.serial,entity,x:from.x,y:from.y,start:{...from},end:to,target:target?.id??null,born:this.battle.time,flight:arc?Number(p.flight_time):0,speed,arc,damage,kind:heroDamageKind(Number(p.damage_type)),xp,radius:Number(p.damage_radius),bounces:entity==='hacksaw_sawblade'?this.skill('sawblade').values.bounces:0,hit:()=>{},done:false};
    shot.hit=()=>{
      this.sound(d.events.hit);
      if(impact){impact();return;}
      const e=this.battle.enemies.find(e=>e.id===shot.target&&e.hp>0&&!e.escaped);
      if(shot.radius>0)this.area(shot.end,shot.radius,damage,shot.kind,Number(p.damage_bans),0,attacker);else if(e)this.hit(e,damage,shot.kind,xp,false,attacker);
      if(entity==='bolt_elora_freeze'&&e){this.stun(e,Number(this.data.entities.mod_elora_bolt_freeze.modifier.duration));this.visual(e,'hero_elora_frostEffect',2);}
      if(entity==='bolt_elora_slow'&&e)this.slow(e,2,this.data.entities.mod_elora_bolt_slow.config.factor);
      if(entity==='hammer_hero_thor'&&e){const s=this.skill('thunderclap').values;this.hit(e,[s.damage_max/2,s.damage_max],'true');this.visual(e,'mod_hero_thor_thunderclap');this.sound('HeroThorThunder');this.later(.1,()=>{this.area(e,s.max_range,[s.secondary_damage_max/2,s.secondary_damage_max],'magic',0,s.stun_duration);this.visual(e,'mod_hero_thor_thunderclap_explosion');});}
      if(entity==='hacksaw_sawblade'){
        this.visual(shot.end,'fx_hacksaw_sawblade_hit');
        const targets=this.targets(shot.end,Number(d.values.bounce_range),Number(p.vis_bans)).filter(t=>t.id!==shot.target);
        if(shot.bounces>0&&targets.length){const next=targets[Math.floor(this.battle.random()*targets.length)];shot.bounces--;shot.target=next.id;shot.end={x:next.x,y:next.y+this.battle.baseEnemyStats(next).hitOffset};shot.done=false;this.sound(d.events.bounce);}
      }
      if(entity==='bolt_magnus'||entity==='bolt_magnus_illusion')this.visual(shot.end,'bolt_magnus_hit');
      if(entity.startsWith('bolt_elora'))this.visual(shot.end,'fx_bolt_elora_hit');
      if(entity==='denas_catapult_rock')this.battle.effect(shot.end,'explosion',.6);
      if(entity==='fireball_10yr'){
        this.visual(shot.end,'fireball_explosion',undefined,false,this.data.entities.fx_fireball_explosion.anchor);
        // Source power_scorched_earth: fixed hero damage, independent of player spell upgrades.
        if(this.skill('rain').level===3){const v=this.decal(shot.end,'decal_scorched_earth_base',5);this.decal(shot.end,'decal_scorched_earth_fire',5);this.ground(shot.end,65,5,1,v,[10,20],'physical',false,1);}
      }
    };
    this.shots.push(shot);this.sound(d.events.insert);
  }
  private shoot(a:HeroAttack,e:Enemy,from:Soldier|Hero=this.battle.hero,damage=this.stats.rangedDamage,xp?:number){
    const b=this.battle,h=b.hero;let entity=a.bullet!;let index=0;
    if(a.bullets){index=Math.floor(b.random()*a.bullets.length);entity=a.bullets[index];}
    const d=this.data.entities[entity],offset=Array.isArray(a.bullet_start_offset)?a.bullet_start_offset[0]:a.bullet_start_offset!;
    const point={x:from.x+offset.x*(h.flip?-1:1),y:from.y+offset.y};
    this.sound(a.sound_shoot);
    const factor=xp===undefined?Number(d.bullet.xp_gain_factor??0):xp;
    this.launch(entity,e,point,damage,factor,undefined,undefined,from);
    if(entity==='g1_arrow_multishot_hero_alleria'){
      const others=this.targets(e,Number(d.values.extra_arrows_range)).filter(t=>t!==e);
      for(let n=0;n<1+this.skill('multishot').level;n++)this.launch(entity,others[n]||e,point,damage,factor,undefined,undefined,from);
    }
  }
  private updateShots(){
    const b=this.battle;
    for(const p of [...this.shots]){
      if(p.arc){const t=Math.min(1,(b.time-p.born)/p.flight);p.x=p.start.x+(p.end.x-p.start.x)*t;p.y=p.start.y+(p.end.y-p.start.y)*t+450*p.flight*p.flight*t*(1-t);if(t===1)p.done=true;}
      else {const d=this.data.entities[p.entity].bullet,e=b.enemies.find(e=>e.id===p.target&&e.hp>0&&!e.escaped);if(e)p.end={x:e.x,y:e.y+b.baseEnemyStats(e).hitOffset};if(d.acceleration_factor)p.speed=Math.min(Number(d.max_speed),p.speed+30*Math.ceil(p.speed/30*Number(d.acceleration_factor)));p.done=!b.move(p,p.end,p.speed*STEP);}
      if(p.done)p.hit();
    }
    this.shots=this.shots.filter(p=>!p.done);
  }
  private spawn(entity:string,count:number,health:number,damage:[number,number],rangedDamage:[number,number]=[0,0]){
    const b=this.battle,d=this.data.entities[entity],attack=d.melee[0];
    for(let i=0;i<count;i++){
      const home=b.nearestRoad({x:b.hero.x+Math.cos(i*Math.PI*2/count)*30,y:b.hero.y+Math.sin(i*Math.PI*2/count)*30});
      b.addSoldier(home,home,home,null,0);const s=b.soldiers[b.soldiers.length-1];
      s.hp=health;s.expiresAt=entity==='soldier_alleria_wildcat'?Infinity:b.time+d.duration;
      s.summon={entity,name:d.name!,portrait:d.portrait!,anchor:d.anchor,animation:entity==='soldier_alleria_wildcat'?'spawn':'raise',animationAt:b.time,busyUntil:b.time+this.duration(entity==='soldier_alleria_wildcat'?'spawn':'raise',d.prefix),stats:{health,armor:d.armor,damage,speed:d.speed,regen:d.regen,range:d.range,cooldown:attack.cooldown,windup:attack.hit_time!,respawn:0},rangedDamage};
    }
  }
  updateSummon(s:Soldier){
    const b=this.battle,c=s.summon!,d=this.data.entities[c.entity],stats=c.stats;
    if(s.deadAt!==null)return;
    if(b.time>=s.expiresAt){s.hp=0;s.deadAt=b.time;b.release(s);return;}
    if(s.hitAt!==null&&b.time>=s.hitAt){const e=b.enemies.find(e=>e.id===s.target&&e.hp>0);if(e)this.hit(e,stats.damage,'physical',0,true,s);s.hitAt=null;}
    if(b.time<c.busyUntil)return;
    if(s.waypoints.length){const goal=s.waypoints[0];s.flip=goal.x<s.x;c.animation='running';if(!b.move(s,goal,stats.speed*STEP))s.waypoints.shift();return;}
    if(s.target===null)b.acquire(s,stats.range);
    if(s.target!==null){const e=b.enemies.find(e=>e.id===s.target)!,goal=b.meleePosition(s,e);s.flip=e.x<s.x;if(dist(s,goal)>3){b.move(s,goal,stats.speed*STEP);c.animation='running';}else if(b.time>=s.attackAt){s.attackAt=b.time+stats.cooldown;s.hitAt=b.time+stats.windup;c.animation='attack';c.animationAt=b.time;c.busyUntil=b.time+this.duration('attack',d.prefix);this.sound(d.melee[0].sound);}else c.animation='idle';return;}
    if(d.ranged.length&&b.time>=s.rangedAt){const a=d.ranged[0],e=this.targets(s,a.max_range!,a.vis_bans,a.min_range)[0];if(e){s.flip=e.x<s.x;s.rangedAt=b.time+a.cooldown;c.animation='shoot';c.animationAt=b.time;c.busyUntil=b.time+this.duration('shoot',d.prefix);this.later(a.shoot_time!,()=>{if(s.hp>0)this.shoot(a,e,s,c.rangedDamage,0);});return;}}
    s.flip=s.home.x<s.x;c.animation=b.move(s,s.home,stats.speed*STEP)?'running':'idle';
    if(c.animation==='idle'&&b.time>=s.regenAt){s.hp=Math.min(stats.health,s.hp+stats.regen);s.regenAt=b.time+1;}
  }
  private ground(p:Point,radius:number,duration:number,slow:number,visual:number,damage:[number,number]=[0,0],kind:DamageKind='physical',mine=false,cycle=.1){this.areas.push({x:p.x,y:p.y,radius,until:this.battle.time+duration,next:this.battle.time,slow,damage,kind,mine,visual,cycle});}
  private updateAreas(){
    const b=this.battle;
    for(const a of this.areas){if(b.time>=a.until||b.time<a.next)continue;a.next=b.time+a.cycle;const targets=this.targets(a,a.radius,128);
      if(a.mine&&targets.length){this.area(a,a.radius*3,a.damage,a.kind);b.effect(a,'explosion',.6);this.sound('BombExplosionSound');a.until=b.time;this.visuals=this.visuals.filter(v=>v.id!==a.visual);}
      else if(a.slow<1)for(const e of targets)this.slow(e,.3667,a.slow);
      else if(!a.mine&&a.damage[1]>0)for(const e of targets)this.hit(e,a.damage,a.kind);
    }
    this.areas=this.areas.filter(a=>b.time<a.until);
  }
  private transform(a:HeroAttack,key:string){
    const b=this.battle,id=this.data.id;this.used(key,a);this.transformedUntil=b.time+a.duration!;
    const name=id==='ingvar'?'toBear':'normal_to_buffed';this.play(name);this.transformEndsAt=b.hero.busyUntil;
    this.sound(a.sound);for(const cue of a.sounds_buffed??[])this.sound(cue);
    this.later(this.duration(name),()=>{this.prefix=id==='ingvar'?'hero_ingvar_bear':'hero_10yr_buffed';b.hero.animation='idle';this.transformedUntil=b.time+a.duration!;},true);
  }
  private timed(){
    const b=this.battle,h=b.hero,id=this.data.id,list=this.stats.timed;
    if(id==='alleria'){
      const a=list[0],s=this.skill('callofwild');if(s.level&&this.ready('t0',a)&&!b.soldiers.some(s=>s.summon&&s.deadAt===null)){this.cast('t0',a,a.animation,a.spawn_time!,()=>this.spawn(a.entity!,1,s.values.hp_inc*s.level,[s.values.damage_min_base+s.values.damage_inc*s.level,s.values.damage_max_base+s.values.damage_inc*s.level]),'callofwild');return true;}
    }
    if(id==='magnus'||id==='ingvar'){
      const a=list[0],key=id==='magnus'?'mirage':'ancestors_call',s=this.skill(key);
      if(!this.transformed&&s.level&&this.ready('t0',a)){this.cast('t0',a,a.animation,a.cast_time!,()=>{const v=s.values,mirage=this.data.levels[s.level-1];this.spawn(a.entity!,v.count,id==='magnus'?Math.floor(mirage.health*v.health_factor):v.hp_max,id==='magnus'?[Math.floor(mirage.melee[0].damage_min*v.damage_factor),Math.floor(mirage.melee[0].damage_max*v.damage_factor)]:[v.damage_min,v.damage_max],id==='magnus'?[Math.floor(mirage.rangedDamage[0]*v.damage_factor),Math.floor(mirage.rangedDamage[1]*v.damage_factor)]:[0,0]);},key);return true;}
    }
    if(id==='ingvar'||id==='10yr'){
      const a=list[1],key=id==='ingvar'?'bear':'buffed';
      const trigger=id==='ingvar'?h.hp<this.stats.health*a.transform_health_factor!:this.targets(h,a.range!,a.vis_bans).length>=a.min_count!;
      if(!this.transformed&&this.skill(key).level&&this.ready('t1',a)&&trigger){this.transform(a,'t1');this.xp(key);return true;}
    }
    if(id==='magnus'||id==='denas'){
      const index=id==='magnus'?1:2,a=list[index],skill=id==='magnus'?'arcane_rain':'catapult';
      if(this.skill(skill).level&&this.ready('t'+index,a)){const e=this.target(a);if(e){h.flip=e.x<h.x;const p={...e},s=this.skill(skill).values;this.cast('t'+index,a,a.animation,a.cast_time!,()=>{
        this.decal(p,id==='magnus'?'hero_magnus_mage_rain_decal':'hero_king_catapultDecal',3);
        for(let i=0;i<s.count;i++)this.later((id==='magnus'?.2:.25)+i*(id==='magnus'?.2:.16),()=>{const radius=15+b.random()*40,angle=i*(id==='magnus'?1.22173:Math.PI/3),to={x:p.x+Math.cos(angle)*radius,y:p.y+Math.sin(angle)*radius*.7};if(id==='magnus'){this.visual(to,'magnus_arcane_rain_drop');this.sound('HeroMageRainDrop');this.later(Number(this.data.entities.magnus_arcane_rain.values.hit_time),()=>this.area(to,Number(this.data.entities.magnus_arcane_rain.values.damage_radius),[s.damage,s.damage],'true'));}else this.launch('denas_catapult_rock',null,{x:to.x+90,y:to.y+100},[s.damage_min,s.damage_max],0,to);});
      },skill);return true;}}
    }
    if(id==='denas'){
      const a=list[1],s=this.skill('tower_buff'),towers=b.towers.filter(t=>b.time>=t.builtAt&&inRange(h,t.pad.position,a.max_range!));
      if(s.level&&this.ready('t1',a)&&towers.length){this.cast('t1',a,a.animation,a.cast_time!,()=>{for(const t of towers){t.heroBuffUntil=b.time+s.values.duration;this.visual(t.pad.position,'mod_denas_tower',s.values.duration);}this.decal(h,'hero_king_glowShadow',1.63);},'tower_buff');this.later(.06666666666667,()=>this.visual({x:h.x,y:h.y+25},'hero_denas_cursing',1.2),true);return true;}
    }
    if(id==='bolin'){
      for(const i of [1,2]){const a=list[i],skill=i===1?'tar':'mines',s=this.skill(skill);if(!s.level||!this.ready('t'+i,a))continue;const e=i===1?this.target(a):this.targets(h,180,128)[0];const p=e?this.pathPoint(e,i===1?5:0):b.nearestRoad(h);if(i===1&&!e)continue;
        this.cast('t'+i,a,i===1?'tar':'mine',a.shoot_time!,()=>this.launch(a.bullet!,null,{x:h.x,y:h.y+20},[0,0],0,p,()=>{const v=i===1?this.visual(p,'decal_bolin_tar_start',s.values.duration,true):this.visual(p,'decal_bolin_mine',50,true);this.ground(p,i===1?47.5:13,i===1?s.values.duration:50,i===1?s.values.slow:1,v,[s.values.damage_min,s.values.damage_max],'explosion',i===2);}),skill);return true;
      }
    }
    if(id==='elora'){
      for(const i of [0,1]){const a=list[i],key=i===0?'ice_storm':'chill',s=this.skill(key);if(!s.level||!this.ready('t'+i,a))continue;const e=this.target(a);if(!e)continue;
        this.cast('t'+i,a,a.animation,a.cast_time!,()=>{for(let n=0;n<a.count!;n++){const p=this.pathPoint(e,n*(i===0?2:a.step!)-(a.nodes_offset as number));this.later(n*.05,()=>{if(i===0){this.visual(p,'elora_ice_spike_'+(n%2+1)+'_start',2,false,{x:.5,y:.2});this.sound('HeroFrostIceRainDrop');this.later(.1,()=>this.area(p,51.2,[s.values.damage_min,s.values.damage_max],'magic',128));}else{const v=this.visual(p,'decal_elora_chill_'+(n%3+1)+'_start',3,true);this.ground(p,44.8,3,s.values.slow_factor,v);}});}},key);return true;
      }
    }
    if(id==='ignus'&&h.target!==null){
      const a=list[0];if(this.skill('flaming_frenzy').level&&this.ready('t0',a)&&b.random()<a.chance){this.cast('t0',a,a.animation,a.cast_time!,()=>{this.area(h,a.max_range!,[a.damage_min,a.damage_max],heroDamageKind(a.damage_type),a.vis_bans);h.hp=Math.min(this.stats.health,h.hp+this.stats.health*a.heal_factor!);this.visual(h,'decal_ignus_flaming');},'flaming_frenzy');return true;}
      const surge=list[1],e=this.target(surge);if(this.skill('surge_of_flame').level&&this.ready('t1',surge)&&e&&e.blockedBy===null){b.release(h);this.used('t1',surge);this.sound(surge.sound);this.play('surgeOfFlame');h.busyUntil=b.time;this.surge={goal:{x:e.x,y:e.y},hit:new Set()};this.xp('surge_of_flame');return true;}
    }
    if(id==='oni'){
      const a=list[0];if(this.skill('torment').level&&this.ready('t0',a)&&this.targets(h,a.max_range!,a.vis_bans).length>=a.min_count!){this.cast('t0',a,a.animation,a.hit_time!,()=>{this.sound(a.sound_hit);for(let ring=1;ring<=3;ring++)for(let i=0;i<8;i++){const r=[20,37.5,55][ring-1];this.visual({x:h.x+Math.cos(i*Math.PI/4)*r,y:h.y+Math.sin(i*Math.PI/4)*r*.7},`decal_oni_torment_sword_${ring}_in`);}this.later(a.damage_delay!,()=>this.area(h,a.damage_radius!,[a.damage_min,a.damage_max],heroDamageKind(a.damage_type),a.vis_bans));},'torment');return true;}
    }
    if(id==='10yr'){
      const a=list[0];if(!this.transformed&&this.skill('rain').level&&this.ready('t0',a)&&this.targets(h,a.trigger_range!,a.vis_bans).length>=a.min_count!){const s=this.skill('rain').values;this.used('t0',a);this.sound(a.sound_start);this.play('power_rain_start');const start=this.duration('power_rain_start'),loop=this.duration('power_rain_loop');h.busyUntil=b.time+start+loop+this.duration('power_rain_end');this.later(start,()=>{h.animation='power_rain_loop';h.animationAt=b.time;},true);this.later(start+loop,()=>{this.xp('rain');this.play('power_rain_end');this.sound(a.sound_end);for(let i=0;i<s.loops;i++)this.later(.5+i*.5,()=>{const e=this.targets(h,a.max_range!,a.vis_bans).sort((left,right)=>b.remainingDistance(left)-b.remainingDistance(right))[0];const top=b.level.worldBounds.y+b.level.worldBounds.height,to=e?this.predictedPoint(e,(top-h.y)/720):{x:h.x-20+b.random()*40,y:h.y-20+b.random()*40};this.launch('fireball_10yr',null,{x:to.x+(top-to.y)*.4,y:top},[s.damage_min,s.damage_max],0,to);});},true);return true;}
      const bomb=list[2];if(this.transformed&&this.ready('t2',bomb)){const e=this.target(bomb);if(e){this.cast('t2',bomb,'bomb',bomb.hit_time!,()=>{this.area(e,bomb.damage_radius!,[bomb.damage_min,bomb.damage_max],'true');const s=this.skill('buffed').values;for(let i=1;i<=s.bomb_steps;i++){const p=this.pathPoint(e,(i-1)*5);this.later(i/15,()=>{this.visual(p,'decal_10yr_bomb_spike');this.area(p,i===s.bomb_steps?60:40,[s.bomb_step_damage_min,s.bomb_step_damage_max],'physical',128,i===s.bomb_steps||b.random()<.25?1:0);});}},'buffed');return true;}}
    }
    return false;
  }
  private ranged(){
    const b=this.battle,h=b.hero;
    let list=this.stats.ranged.map((a,i)=>({a,key:'r'+i}));
    if(this.data.id==='bolin')list=[{a:this.stats.timed[0],key:'t0'}];
    if(this.data.id==='alleria')list.reverse();
    for(const {a,key} of list){if(!this.ready(key,a)||a.xp_from_skill&&!this.skill(a.xp_from_skill).level)continue;const e=this.target(a);if(!e||b.random()>a.chance)continue;
      h.flip=e.x<h.x;this.used(key,a);
      if(a.shared_cooldown)for(const {key:k} of list)this.lastAttack.set(k,b.time);
      if(this.data.id==='bolin'){
        this.play('shootAimRightLeft');let delay=0;for(const time of a.shoot_times!){delay+=time;const at=delay;this.later(at,()=>{this.phase('shootRightLeft');this.sound('ShotgunSound');this.shoot(a,e);},true);}this.later(delay+this.duration('shootRightLeft'),()=>this.phase('reload'),true);h.busyUntil=b.time+delay+this.duration('shootRightLeft')+this.duration('reload');this.lastAttack.set(key,h.busyUntil);
      }else{
        this.play(a.animation);this.sound(a.sound);this.later(a.shoot_time!,()=>{const damage=this.data.id==='hacksaw'?[45,45] as [number,number]:this.stats.rangedDamage;this.shoot(a,e,h,damage);if(a.xp_from_skill)this.xp(a.xp_from_skill);},true);
      }
      return true;
    }
    return false;
  }
  private melee(e:Enemy){
    const b=this.battle,h=b.hero;
    if(b.time<h.attackAt)return;
    if(this.data.id==='denas'){const a=this.stats.timed[0];if(!this.ready('t0',a))return;const index=Math.floor(b.random()*4);this.cast('t0',a,a.animations![index],a.shoot_time!,()=>this.shoot({...a,bullet:a.bullets![index],bullets:undefined},e));h.attackAt=b.time+a.cooldown;return;}
    const list=this.stats.melee;
    let order=list.map((_,i)=>i).reverse();if(this.data.id==='oni')order=[1,2,0];
    if(this.transformed)order=[2];else order=order.filter(i=>!list[i].disabled);
    for(const i of order){const a=list[i],key='m'+i;if(!this.transformed&&!this.ready(key,a)||this.transformed&&b.time-this.lastAttack.get(key)!<a.cooldown)continue;if(a.xp_from_skill&&!this.skill(a.xp_from_skill).level||a.vis_bans&32&&b.controlImmune(e)||b.random()>a.chance)continue;
      this.used(key,a);h.attackAt=b.time+list[0].cooldown;this.sound(a.sound);
      if(this.data.id==='10yr'&&this.transformed){const start=this.duration('spin_start'),loop=this.duration('spin_loop');this.play('spin_start');this.later(start,()=>this.phase('spin_loop'),true);for(let n=0;n<2;n++)for(const hit of a.hit_times!)this.later(start+n*loop+hit,()=>this.area(h,a.damage_radius!,[a.damage_min,a.damage_max],'physical'),true);this.later(start+loop*2,()=>this.phase('spin_end'),true);h.busyUntil=b.time+start+2*loop+this.duration('spin_end');}
      else{
        this.play(a.animation);
        for(const hit of a.hit_times??[a.hit_time!])this.later(hit,()=>{
          this.sound(a.sound_hit);if(a.xp_from_skill)this.xp(a.xp_from_skill);
          if(a.damage_type&1024){if(!b.controlImmune(e))b.damage(e,e.hp,'true');}
          else if(a.mod==='mod_hero_thor_chainlightning'){
            const s=this.skill('chainlightning').values;let start:Point=h;for(const t of [e,...this.targets(e,110).filter(t=>t!==e)].slice(0,s.count)){this.visual({x:start.x,y:start.y+20},'ray_hero_thor',undefined,false,{x:0,y:.5},{x:t.x,y:t.y+15});this.hit(t,[s.damage_max/2,s.damage_max],'true');start=t;}
          }else if(a.hit_aura==='aura_malik_fissure'){
            const s=this.skill('fissure');for(let n=-s.level;n<=s.level;n++){const p=this.pathPoint(e,n*4);this.later(Math.abs(n)*4/30,()=>{this.visual(p,'decal_malik_earthquake');this.area(p,40,[s.values.damage_min,s.values.damage_max],'true',0,Number(this.data.entities.mod_malik_stun.modifier.duration));});}
          }else if(a.type==='area'){
            const point={x:h.x+a.hit_offset!.x*(h.flip?-1:1),y:h.y+a.hit_offset!.y};this.area(point,a.damage_radius!,[a.damage_min,a.damage_max],heroDamageKind(a.damage_type));if(a.hit_fx)this.visual(point,a.hit_fx);
          }else this.hit(e,[a.damage_min,a.damage_max],heroDamageKind(a.damage_type),a.xp_gain_factor??0,true);
        },true);
      }
      return;
    }
  }
  update(){
    const b=this.battle,h=b.hero;
    if(h.deadAt!==null&&!this.deathHandled){this.cancel();this.prefix=this.data.prefix;this.transformedUntil=0;this.deathHandled=true;this.sound(this.data.events.death2);}
    const due=this.actions.filter(a=>a.at<=b.time);this.actions=this.actions.filter(a=>a.at>b.time);for(const a of due)a.run();
    this.updateShots();this.updateAreas();this.visuals=this.visuals.filter(v=>b.time-v.born<v.life);
    if(h.deadAt!==null){
      if(h.animation==='death'&&b.time-h.deadAt>=this.data.respawn){this.play('respawn');b.events.push({type:'heroIntro'});}
      if(h.animation==='respawn'&&b.time>=h.busyUntil){h.deadAt=null;h.hp=this.stats.health;h.lastHit=b.time;h.animation='idle';this.deathHandled=false;}
      return;
    }
    if(h.stun&&b.time<h.stun.until){h.animation='idle';return;}
    if(this.surge){const a=this.stats.timed[1],s=this.skill('surge_of_flame').values;for(const e of this.targets(h,Number(this.data.entities.aura_ignus_surge_of_flame.aura.damage_radius),128))if(!this.surge.hit.has(e.id)){this.hit(e,[s.damage_min,s.damage_max],'true');this.surge.hit.add(e.id);}if(!b.move(h,this.surge.goal,this.data.speed*a.speed_factor!*STEP)){h.home={x:h.x,y:h.y};this.surge=null;this.play('surgeOfFlame_end');this.sound(a.sound_end);}return;}
    if(this.transformed&&b.time>=this.transformedUntil&&b.time>=h.busyUntil){const a=this.stats.timed[1];this.play(this.data.id==='ingvar'?'toViking':'to_normal');this.transformedUntil=0;this.transformEndsAt=h.busyUntil;this.lastAttack.set('t1',b.time);for(const cue of a.sounds_normal??[])this.sound(cue);this.later(h.busyUntil-b.time,()=>{this.prefix=this.data.prefix;h.animation='idle';},true);return;}
    if(this.transformed&&this.data.id==='ingvar'&&b.time>=this.regenAt){h.hp=Math.min(this.stats.health,h.hp+2);this.regenAt=b.time+1;}
    if(b.time<this.transformEndsAt)return;
    if(h.waypoints.length){const goal=h.waypoints[0];h.flip=goal.x<h.x;if(!b.move(h,goal,this.speed*STEP))h.waypoints.shift();h.animation=h.waypoints.length?'running':'idle';return;}
    if(b.time<h.busyUntil)return;
    if(h.queuedXp>0){h.xp+=Math.floor(h.queuedXp*[0,2,1.1,1,1][b.difficulty]+.5);h.queuedXp=0;}
    if(h.level<10&&h.xp>=this.data.xp[h.level]){h.level++;h.hp=this.stats.health;b.events.push({type:'achievement',id:'HERO_MEDIUM',amount:h.level,maximum:true},{type:'achievement',id:'HERO_HARD',amount:h.level,maximum:true});if(!this.transformed){this.play('levelup');h.levelUpAt=b.time;b.events.push({type:'heroIntro'});}return;}
    if(this.timed())return;
    if((this.data.id==='hacksaw'||this.data.id==='thor')&&this.ranged())return;
    if(h.target!==null&&b.enemies.find(e=>e.id===h.target)!.blockedBy!==h.id&&this.targets(h.home,this.range,128).some(e=>e.blockedBy===null))b.release(h);
    if(h.target===null)b.acquire(h,this.range);
    if(h.target!==null){const e=b.enemies.find(e=>e.id===h.target)!,goal=b.meleePosition(h,e);h.flip=e.x<h.x;if(dist(h,goal)>3){b.move(h,goal,this.speed*STEP);h.animation='running';}else{h.animation='idle';this.melee(e);}return;}
    if(!this.transformed&&this.ranged())return;
    h.flip=h.home.x<h.x;const moving=b.move(h,h.home,this.speed*STEP);h.animation=moving?'running':'idle';
    if(!moving&&b.time-h.lastHit>this.data.regenStandoff){h.regenElapsed+=STEP;if(h.regenElapsed>this.data.regenCooldown){const healed=Math.min(this.stats.health-h.hp,this.stats.regen);h.hp+=healed;h.regenElapsed=0;if(healed)b.events.push({type:'achievement',id:'DIE_HARD',amount:healed});}}
  }
}
