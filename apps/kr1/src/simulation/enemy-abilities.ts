import { inRange, type Battle, type Enemy, type Soldier, type Hero } from "./battle";
import type { AllyDot, SpawnBurst, WaveEntrance, FrogEffect } from "../content/abilities";
import { STEP } from "../content/balance";
export class EnemyAbilities {
    shake?:{born:number;phase:number;config:import('../content/abilities').ScreenShake};
    readonly dots: {
        unit: Soldier | Hero;
        config: AllyDot;
        born: number;
        until: number;
        next: number;
    }[] = [];
    readonly bursts: {
        config: SpawnBurst;
        lane: number;
        node: number;
        count: number;
        interval: number;
        next: number;
        owner: Enemy | null;
    }[] = [];
    readonly entrances: {
        enemy: Enemy;
        config: WaveEntrance;
        at: number | null;
        done: boolean;
    }[] = [];
    readonly deathSpawns:{kind:import('../content/types').EnemyKind;lane:number;node:number;position:{x:number;y:number};at:number;raise:boolean}[]=[];
    readonly frogs:{position:{x:number;y:number};born:number;config:FrogEffect;flip:boolean}[]=[];
    private ambientNext=0;
    outgoingDamage(unit:Soldier|Hero,amount:number){
        for(const dot of this.dots)if(dot.unit===unit&&this.b.time<dot.until&&dot.config.damageFactor!==undefined)amount*=dot.config.damageFactor;
        return amount;
    }
    transform(e:Enemy,damage:number){
        const b=this.b,c=b.baseEnemyStats(e).damageTransform!,max=b.effectiveEnemyStats(e).health;
        for(const u of this.allies())if(u.target===e.id)b.release(u);
        e.kind=c.kind;e.maxHp=max+c.extraHealth;e.hp=Math.max(1,e.hp-damage)+c.extraHealth;
        Object.assign(e,{poisonUntil:0,thornUntil:0,slowUntil:0,armorLoss:0,hitAt:null,rangedHitAt:null,curse:undefined,damageBoost:undefined,heroSlow:undefined,net:undefined,raiseAt:b.time,raiseDuration:b.enemyStats[c.kind].raiseDuration,regenAt:b.time+b.enemyStats[c.kind].regen!.interval});
        b.events.push({type:'sound',cue:c.sound});
    }
    infect(e:Enemy,u:Soldier|Hero){
        const b=this.b,c=b.baseEnemyStats(e).infect!;
        if(u===b.hero||u.hp<=0||b.tracks[e.lane].points.length-this.node(e)<c.minNodes||b.random()>=c.chance)return;
        const s=u as Soldier;if(c.excludedProfiles.includes(s.profile?.prefix??s.summon?.entity??''))return;
        let lane=e.lane,node=0,best=Infinity;for(let l=0;l<b.tracks.length;l++)for(let n=0;n<b.tracks[l].points.length;n++){const p=b.tracks[l].points[n],d=(p.x-u.x)**2+(p.y-u.y)**2;if(d<best&&this.valid(l,n)&&!b.content.rallyInvalidRanges?.some(r=>b.content.routes[r.route].includes(l)&&n>=r.from&&(r.to===undefined||n<=r.to))){best=d;lane=l;node=n;}}
        b.damageAlly(u,u.hp,'true');s.consumed=true;
        const child=b.spawnAt(c.kind,lane,node,{x:u.x,y:u.y});child.bounty=0;child.raiseAt=b.time;child.raiseDuration=b.enemyStats[c.kind].raiseDuration;
        b.events.push({type:'sound',cue:c.sound});
    }
    frog(u:Soldier|Hero,c:FrogEffect,damage:number){
        const b=this.b,s=u as Soldier;if(u===b.hero||c.excludedProfiles.includes(s.profile?.prefix??s.summon?.entity??'')){b.damageAlly(u,damage,'magic');return;}
        if(u.hp<=0)return;b.damageAlly(u,u.hp,'true');s.consumed=true;
        this.frogs.push({position:{x:u.x,y:u.y},born:b.time,config:c,flip:s.flip});
    }
    floorAlpha = 0;
    private floorNext = 0;
    constructor(private b: Battle) {
    }
    initialize() {
        const b = this.b;
        if(b.content.ambientSounds){const [a,z]=b.content.ambientSounds.delay;this.ambientNext=a+Math.random()*(z-a);}
        if (b.mode !== "campaign")
            return;
        for (const config of b.content.entrances ?? []) {
            const enemy = b.spawnAt(config.kind, b.content.routes[config.route][config.lane], config.node, config.position, false);
            enemy.dormant = true;
            enemy.heading.x = config.flip ? -1 : 1;
            enemy.scriptAnimation = { name: config.idle, at: 0, duration: Infinity, loop: true };
            this.entrances.push({ enemy, config, at: null, done: false });
        }
    }
    add(enemy: Enemy) {
        const b = this.b, c = b.baseEnemyStats(enemy);
        if(c.corpseAura)enemy.corpseAuraAt=b.time+c.corpseAura.interval;
        if(c.spawnSound)b.delayedSounds.push({at:b.time+c.spawnSound.delay,cue:c.spawnSound.cue});
        if(c.allyAura)enemy.auraAt=b.time+c.allyAura.delay;
        if (c.clone)
            enemy.clone = { generation: c.clone.generation, left: c.clone.generation, next: b.time + c.clone.cooldown, at: -100, hit: true };
        if (c.flight)
            enemy.flight = { phase: "ground", at: b.time, next: b.time + c.flight.cooldown };
        if (c.areaSkill)
            enemy.areaSkill = { at: -100, next: b.time + c.areaSkill.cooldown, hit: true };
        if (c.spore)
            enemy.spore = { at: -100, next: b.time + c.spore.cooldown, stage: 3, count: 0 };
    }
    applyDot(unit: Soldier | Hero, config: AllyDot) {
        if (unit.hp <= 0)
            return;
        const b = this.b, active = this.dots.find(d => d.unit === unit && d.config.id === config.id && b.time < d.until);
        if (active)
            active.until = b.time + config.duration;
        else
            this.dots.push({ unit, config, born: b.time, until: b.time + config.duration, next: b.time });
    }
    private allies() {
        return [this.b.hero, ...this.b.soldiers].filter(u => u.hp > 0 && u.deadAt === null);
    }
    private node(e: Enemy) {
        return this.b.tracks[e.lane].cumulative.findIndex(d => d >= e.distance);
    }
    private valid(lane: number, node: number) {
        const b = this.b;
        return node >= 0 && node < b.tracks[lane].points.length && !b.content.invalidRanges.some(r => b.content.routes[r.route].includes(lane) && node >= r.from && node <= r.to);
    }
    private queue(e: Enemy, config: SpawnBurst, count: number, delay: number, owner: Enemy | null) {
        this.bursts.push({ config, lane: e.lane, node: this.node(e), count, interval: 1 / count, next: this.b.time + delay, owner });
    }
    death(e: Enemy) {
        const b = this.b, c = b.baseEnemyStats(e);
        if(c.deathSpawn?.delay)for(let i=0;i<c.deathSpawn.count;i++)this.deathSpawns.push({kind:c.deathSpawn.kind,lane:e.lane,node:this.node(e),position:{x:e.x,y:e.y},at:b.time+c.deathSpawn.delay,raise:!!c.deathSpawn.raise});
        if (c.deathDot)
            for (const u of this.allies())
                if (inRange(e, u, c.deathDot.radius))
                    this.applyDot(u, c.deathDot.dot);
        if (c.deathSummon)
            this.queue(e, c.deathSummon, c.deathSummon.count, c.deathSummon.delay, null);
    }
    private portal(e: Enemy) {
        const b = this.b, node = this.node(e);
        if (!e.portalVisualDone) {
            e.portalVisualDone = true;
            for (const p of b.content.portalEffects ?? [])
                if (p.offsets[e.kind] && p.routes.some(r => b.content.routes[r.route].includes(e.lane) && r.node - node < 8)) {
                    const offset = p.offsets[e.kind]!;
                    b.sourceEffect({ x: e.x + offset.x, y: e.y + offset.y }, p.animation, p.duration);
                    break;
                }
        }
    }
    update(waveStarted: number, spawning: boolean) {
        const b = this.b;
        for(const e of b.enemies){
            const stats=b.baseEnemyStats(e),end=stats.boss?.clearSpawnsAfterDeath;
            if(e.deadAt!==null&&end!==undefined&&!e.deathCleared&&b.time-e.deadAt>=end){
                e.deathCleared=true;b.pointSpawner.stop();this.deathSpawns.length=0;this.bursts.length=0;
                for(const other of b.enemies)if(other!==e&&other.hp>0){other.hp=0;other.deadAt=b.time;for(const u of [b.hero,...b.soldiers].filter(u=>u.target===other.id))b.release(u);}
            }
            const aura=stats.corpseAura;
            if(!aura||e.hp<=0||e.escaped||b.time<e.corpseAuraAt!)continue;
            e.corpseAuraAt=b.time+aura.interval;
            const available=aura.limit-b.enemies.filter(s=>s.spawnGroup===aura.group&&s.hp>0&&!s.escaped).length;
            if(available<=0)continue;
            const corpses=b.soldiers.filter(s=>s.deadAt!==null&&!s.consumed&&b.time-s.deadAt>=aura.interval&&!aura.excludedProfiles.includes(s.profile?.prefix??s.summon?.entity??'')&&inRange(s,e,aura.radius)).slice(0,Math.max(0,available));
            const route=b.content.routes.find(r=>r.includes(e.lane))!;let lane=Math.floor(b.random()*route.length);
            for(const corpse of corpses){
                const track=b.tracks[route[0]];let node=0,best=Infinity;
                for(let n=0;n<track.points.length;n++){const p=track.points[n],d=(p.x-corpse.x)**2+(p.y-corpse.y)**2;if(d<best){node=n;best=d;}}
                if(!this.valid(route[0],node))continue;
                corpse.consumed=true;lane=(lane+1)%route.length;
                const child=b.spawnAt(aura.kind,route[lane],node,{x:corpse.x,y:corpse.y});child.bounty=0;child.spawnGroup=aura.group;child.raiseAt=b.time;child.raiseDuration=b.baseEnemyStats(child).raiseDuration;
            }
        }
        const ambient=b.content.ambientSounds;if(ambient&&b.time>=this.ambientNext){b.events.push({type:'sound',cue:ambient.cues[Math.floor(Math.random()*ambient.cues.length)]});const [a,z]=ambient.delay;this.ambientNext=b.time+a+Math.random()*(z-a);}
        for(let i=this.deathSpawns.length-1;i>=0;i--){const s=this.deathSpawns[i];if(b.time<s.at)continue;const e=b.spawnAt(s.kind,s.lane,s.node,s.position);if(s.raise){e.raiseAt=b.time;e.raiseDuration=b.baseEnemyStats(e).raiseDuration;}this.deathSpawns.splice(i,1);}
        for(let i=this.frogs.length-1;i>=0;i--){const f=this.frogs[i],c=f.config;if(b.time-f.born>=c.jumpAt+c.jumpDuration+c.rest+c.puffDuration)this.frogs.splice(i,1);}
        for(const e of b.enemies){const c=b.baseEnemyStats(e).allyAura;if(!c||e.hp<=0||e.escaped||e.raiseAt!==undefined&&b.time-e.raiseAt<e.raiseDuration!)continue;if(b.time>=e.auraAt!){e.auraAt=b.time+c.interval;for(const other of b.enemies)if(other.hp>0&&c.targets.includes(other.kind)&&inRange(e,other,c.radius))other.damageBoost={until:b.time+c.duration,born:b.time,config:c};}}
        for (const s of this.entrances) {
            if (s.done)
                continue;
            const { enemy: e, config: c } = s;
            if (s.at === null && b.wave >= c.wave) {
                s.at = b.time;
                if (c.notify)
                    b.events.push({ type: "seen", enemy: e.kind });
            }
            if (s.at === null)
                continue;
            const age = b.time - s.at;
            if (age < c.wait)
                continue;
            if (e.scriptAnimation!.name === c.idle) {
                e.scriptAnimation = { name: c.wake, at: b.time, duration: c.duration };
                if (c.sound)
                    b.events.push({ type: "sound", cue: c.sound });
                if (b.baseEnemyStats(e).boss)
                    b.events.push({ type: "bossIntro" });
            }
            if (age >= c.wait + c.duration) {
                s.done = true;
                e.dormant = false;
                e.scriptAnimation = undefined;
                if (e.areaSkill)
                    e.areaSkill.next = b.time + b.baseEnemyStats(e).areaSkill!.cooldown;
            }
        }
        if (b.content.portalEffects)
            for (const e of b.enemies)
                this.portal(e);
        const f = b.content.burningFloor;
        if (f) {
            const rule = f.waves[b.mode][b.wave], age = b.time - waveStarted, active = !!rule && age >= rule[0] && age < rule[0] + rule[1] && !(b.wave === b.level.waves.length && !spawning);
            this.floorAlpha = Math.max(0, Math.min(1, this.floorAlpha + (active ? 1 : -1) * STEP / f.fade));
            if (active && b.time >= this.floorNext) {
                this.floorNext = b.time + f.interval;
                for (const u of this.allies())
                    if (f.positions.some(p => inRange(p, u, f.radius)))
                        this.applyDot(u, f.dot);
            }
        }
        for (let i = this.dots.length - 1; i >= 0; i--) {
            const d = this.dots[i];
            if (d.unit.hp <= 0 || b.time >= d.until) {
                this.dots.splice(i, 1);
                continue;
            }
            if (b.time >= d.next) {
                d.next += d.config.interval;
                const amount = b.roll(d.config.damage);
                b.damageAlly(d.unit, d.config.lethal ? amount : Math.min(amount, d.unit.hp - 1), "true");
            }
        }
        for (let i = this.bursts.length - 1; i >= 0; i--) {
            const s = this.bursts[i];
            if (s.owner && s.owner.hp <= 0) {
                this.bursts.splice(i, 1);
                continue;
            }
            if (b.time < s.next)
                continue;
            const route = b.content.routes.find(r => r.includes(s.lane))!, lane = route[Math.floor(b.random() * route.length)], node = s.node + b.roll(s.config.nodeOffsets);
            if (this.valid(lane, node)) {
                const e = b.spawnAt(s.config.kind, lane, node);
                e.raiseAt = b.time;
                e.raiseDuration = s.config.raiseDuration;
                b.delayedSounds.push({ at: b.time + s.config.soundDelay, cue: s.config.sound });
            }
            if (--s.count === 0)
                this.bursts.splice(i, 1);
            else
                s.next = b.time + b.random() * s.interval;
        }
    }
    updateEnemy(e: Enemy) {
        const b = this.b, c = b.baseEnemyStats(e), node = this.node(e), remaining = b.tracks[e.lane].points.length - node;
        const clone = c.clone, s = e.clone;
        if (clone && s) {
            if (b.time >= s.next && s.left > 0 && remaining > clone.nodesLimit) {
                s.at = b.time;
                s.next = b.time + clone.duration + clone.cooldownAfter;
                s.hit = false;
                e.hitAt = null;
            }
            const age = b.time - s.at;
            if (age < clone.duration) {
                if (!s.hit && age >= clone.windup) {
                    s.hit = true;
                    s.left--;
                    const route = b.content.routes.find(r => r.includes(e.lane))!, lane = route[Math.floor(b.random() * route.length)];
                    let ni = node + b.roll(clone.offset);
                    if (!this.valid(lane, ni))
                        ni = node;
                    const child = b.spawnAt(e.kind, lane, ni);
                    child.hp = e.hp;
                    child.bounty = 0;
                    child.raiseAt = b.time;
                    child.raiseDuration = clone.raiseDuration;
                    child.clone!.generation = child.clone!.left = s.generation - 1;
                    child.clone!.next = b.time + clone.raiseDuration + clone.cooldown;
                }
                return true;
            }
        }
        const f = c.flight, flight = e.flight;
        if (f && flight) {
            if (flight.phase === "ground" && e.blockedBy !== null && b.time >= flight.next && remaining > f.nodesStart) {
                flight.phase = "takeoff";
                flight.at = b.time;
                for (const u of this.allies())
                    if (u.target === e.id)
                        b.release(u);
                e.slowUntil = 0;
                e.heroSlow = undefined;
                e.net = undefined;
                e.hitAt = null;
            }
            if (flight.phase === "takeoff") {
                if (b.time - flight.at < f.takeoffDuration)
                    return true;
                flight.phase = "flying";
                flight.at = b.time;
            }
            if (flight.phase === "flying" && (b.time - flight.at >= f.duration || remaining < f.nodesEnd)) {
                flight.phase = "land";
                flight.at = b.time;
            }
            if (flight.phase === "land") {
                if (b.time - flight.at < f.landDuration)
                    return true;
                flight.phase = "ground";
                flight.next = b.time + f.cooldown;
            }
        }
        const a = c.areaSkill, skill = e.areaSkill;
        if (a && skill) {
            const total=a.duration+(a.rest??0);
            const center = { x: e.x + (e.heading.x < 0 ? -a.offset : a.offset), y: e.y };
            if (b.time >= skill.next) {
                if (this.allies().filter(u => inRange(center, u, a.radius)).length < a.minTargets)
                    skill.next = b.time + 0.5;
                else {
                    skill.at = b.time;
                    skill.next = b.time + total + (a.cooldownAfter??a.cooldown);
                    skill.hit = false;
                    e.hitAt = null;
                    b.delayedSounds.push({ at: b.time + a.soundDelay, cue: a.sound! });
                }
            }
            if (b.time - skill.at < total) {
                if (!skill.hit && b.time - skill.at >= a.windup) {
                    skill.hit = true;
                    b.enemyAreaHit(e, { ...a, sound: undefined, effect: undefined });
                    for (const fx of a.effects){
                        const effect=b.sourceEffect({ x: e.x + fx.offset.x * (e.heading.x < 0 ? -1 : 1), y: e.y + fx.offset.y * (fx.mirrorOffsetY&&e.heading.x<0?-1:1) }, fx.animation, fx.duration,fx.anchor,e.heading.x<0);
                        effect.z=fx.z;effect.born+=fx.delay??0;
                    }
                    if(a.towerBlock)for(const tower of b.towers)if(inRange(e,tower.pad.position,a.towerBlock.range))tower.block={born:b.time,until:b.time+a.towerBlock.duration,config:a.towerBlock};
                    if(a.stun)for(const unit of this.allies())if(inRange(e,unit,a.radius)){
                        const hero=unit===b.hero;
                        const visual=hero?a.stun.heroes[b.heroContent?.id??'gerald']:a.stun.profiles[(unit as Soldier).profile?.prefix??(unit as Soldier).summon?.entity??'']??a.stun.unit;
                        unit.stun={born:b.time,until:b.time+(hero?a.stun.heroDuration:a.stun.duration),...visual};
                        b.release(unit);unit.hitAt=null;
                        if(hero){b.hero.courageHitAt=null;b.heroController?.cancel();}else {const s=unit as Soldier;s.rangedHitAt=null;s.healHitAt=null;s.moving=false;s.attackStarted=-100;s.rangedStarted=-100;s.healStarted=-100;}
                    }
                    if(a.shake)this.shake={born:b.time,phase:Math.random()*Math.PI*2,config:a.shake};
                }
                return true;
            }
        }
        const sp = c.spore, state = e.spore;
        if (sp && state) {
            const total = sp.waits.reduce((x, y) => x + y, 0) + sp.rest;
            if (b.time >= state.next && node > sp.minNodes) {
                state.at = b.time;
                state.next = b.time + total + sp.cooldown;
                state.stage = 0;
                e.hitAt = null;
                b.events.push({ type: "sound", cue: sp.sound });
            }
            const age = b.time - state.at;
            if (age < total) {
                if (state.stage === 0 && age >= sp.waits[0]) {
                    state.stage = 1;
                    b.sourceEffect({ x: e.x + sp.offset.x, y: e.y + sp.offset.y }, sp.effect, sp.effectDuration);
                }
                if (state.stage === 1 && age >= sp.waits[0] + sp.waits[1]) {
                    state.stage = 2;
                    for (const u of this.allies())
                        if (inRange(e, u, sp.radius))
                            this.applyDot(u, sp.dot);
                }
                if (state.stage === 2 && age >= sp.waits[0] + sp.waits[1] + sp.waits[2]) {
                    state.stage = 3;
                    this.queue(e, sp.spawn, sp.counts[Math.min(state.count, sp.counts.length - 1)], 0, e);
                    state.count++;
                }
                return true;
            }
        }
        return false;
    }
}
