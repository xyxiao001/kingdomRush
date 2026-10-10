import type { Container, Texture } from 'pixi.js';
import {ELF} from '../content/balance';
import data from '../content/generated/interactions.json';
import { GameView, type ViewData } from '../rendering/ui-tree';
import type { Battle } from '../simulation/battle';
import type { Pick } from './picking';
import { towerNames } from './picking';
import { GERALD } from '../content/gerald';
import { outQuad, progress } from '../rendering/ui-motion';

export class Inspect {
  private views = new Map<string, GameView>();
  private current: GameView | null = null;
  private selected = false;
  private started = 0;
  private offset = 64;
  private fromOffset = 64;
  constructor(private parent: Container, private textures: Map<string, Texture>, private hero: GameView) {
    for (const name of Object.keys(data.hitAreas)) {
      const view = new GameView(data.screens[name as keyof typeof data.screens] as unknown as ViewData, textures, 768 / 1080);
      view.visible = false; view.eventMode = 'none'; parent.addChild(view); this.views.set(name, view);
    }
  }
  addViews(sources:Record<string,ViewData>){
    for(const [name,source] of Object.entries(sources)){
      if(this.views.has(name))continue;
      const view=new GameView(source,this.textures,768/1080);view.visible=false;view.eventMode='none';this.parent.addChild(view);this.views.set(name,view);
    }
  }
  update(battle: Battle, selected: Pick | null, now: number) {
    this.animate(now);
    const previous = this.current;
    const next = this.resolve(battle, selected);
    if (Boolean(next) !== this.selected) {
      this.fromOffset = this.offset; this.started = now; this.selected = Boolean(next);
    }
    if (next) {
      if (previous !== next && previous) previous.visible = false;
      this.current = next;
    }
    this.animate(now);
  }
  private resolve(battle: Battle, selected: Pick | null): GameView | null {
    if (!selected || selected.type==='prop') return null;
    if (selected.type === 'hero') {
      const h = battle.hero;
      if (h.deadAt !== null) return null;
      if(battle.heroContent){this.hero.views[0].setImage(battle.heroContent.infoPortrait);this.hero.views[1].setText(battle.heroContent.name);}
      const stats = this.hero.views[2].views;
      stats[0].views[0].scale.x = h.hp / battle.heroHealth;
      stats[1].setText(`${Math.ceil(h.hp)}/${battle.heroHealth}`);
      const level=battle.heroContent?.levels[h.level-1];
      const melee=level?.melee[battle.heroController?.transformed?2:0];
      stats[2].setText(melee?`${melee.damage_min}-${melee.damage_max}`:`${GERALD.minDamage[h.level-1]}-${GERALD.maxDamage[h.level-1]}`);
      stats[3].setText(level?(!battle.heroController?.transformed&&level.rangedDamage[1]?level.rangedDamage.join('-'):'无'):stats[2].text!);
      stats[7].setText(`${battle.heroContent?.respawn??GERALD.respawn} 秒。`);
      const armor = battle.heroArmor;
      stats[4].setText(`${Math.round(armor*100)}%${armor<.31?'低':armor<.61?'中':'高'}`);
      return this.hero;
    }
    let view: GameView;
    if (selected.type === 'pad') {
      const tower = battle.towers.find(t => t.pad.id === selected.id);
      const camp=battle.campFor(battle.level.pads.find(p=>p.id===selected.id)!);
      if(!tower&&camp){const view=this.views.get(towerNames.barrack)!,fields=view.views[2].views,stats=camp.unit.stats;view.views[0].setImage(camp.portrait);view.views[1].setText(camp.name);fields[0].setText(stats.health);fields[1].setText(stats.damage.join('-'));fields[2].setText('无');fields[3].setText(`${Math.round(stats.armor*100)}%无`);fields[6].setText('无');return view;}
      if (!tower) return battle.level.pads.find(p=>p.id===selected.id)?.special==='elf'?this.views.get('tower_elf')!:null;
      view = this.views.get(tower.special==='elf'?'tower_elf':towerNames[tower.kind])!;
      if(tower.manual)view.views[0].setImage(tower.manual.portrait);else if(tower.extension||tower.camp)view.views[0].setImage((tower.extension??tower.camp)!.portrait);else if(tower.special==='musketeer')view.views[0].setImage('info_portraits_towers_0104');else if(tower.tier===4&&tower.kind!=='archer')view.views[0].setImage(tower.kind==='mage'?'info_portraits_towers_0108':'info_portraits_towers_0105');else if(!tower.special)view.views[0].setImage(view.views[0].data.image_name!);
      const fields=view.views[2].views,stats={...battle.statsForTier(tower.tier)};
      view.views[1].setText(tower.special==='elf'?'森林精灵':battle.towerStats(tower).name);
      if(tower.kind==='barrack'){
        if(tower.special==='elf')stats.soldier={...ELF};else if(tower.camp||tower.extension)stats.soldier=battle.towerSoldierStats(tower);
        fields[0].setText(stats.soldier.health);fields[1].setText(stats.soldier.damage.join('-'));
        fields[3].setText(`${Math.round(stats.soldier.armor*100)}%${stats.soldier.armor===0?'无':'低'}`);fields[6].setText(tower.camp||tower.special==='elf'?'无':`${stats.soldier.respawn} 秒。`);fields[2].setText(tower.special==='elf'?ELF.damage.join('-'):'无');
        const ranged=tower.extension?.unit?.rangedPower;if(ranged){const rank=tower.powerLevels![ranged.power];fields[2].setText(rank?ranged.damage.map(d=>d+ranged.damageInc*rank).join('-'):'无');}
      }else{
        fields[0].setText(battle.towerStats(tower).damage.join('-'));
        const cd=battle.towerStats(tower).cooldown;fields[2].setText(`${cd} 秒 / ${cd<.8?'快':cd<=1.5?'中':'慢'}`);
        const range=battle.towerStats(tower).range;fields[1].setText(`${Math.round(range*2)} / ${range<150?'短':'中'}`);
      }
    } else {
      const unit = selected.type === 'enemy' ? battle.enemies.find(e => e.id === selected.id) : battle.soldiers.find(s => s.id === selected.id);
      if (!unit || ('finisher' in unit&&unit.finisher)||unit.deadAt !== null || ('escaped' in unit && unit.escaped)) return null;
      if('summon' in unit&&unit.summon){const c=unit.summon,stats=this.hero.views[2].views;this.hero.views[0].setImage(c.portrait);this.hero.views[1].setText(c.name);stats[0].views[0].scale.x=unit.hp/c.stats.health;stats[1].setText(`${Math.ceil(unit.hp)}/${c.stats.health}`);stats[2].setText(c.stats.damage.join('-'));stats[3].setText(c.rangedDamage[1]?c.rangedDamage.join('-'):'无');stats[4].setText(`${Math.round(c.stats.armor*100)}%`);stats[7].setText('无');return this.hero;}
      const name = 'kind' in unit ? unit.kind : unit.profile?unit.profile.prefix: unit.role==='guard'?'soldier_s6_imperial_guard':unit.towerId === null ? `re1_farmer_${unit.variant + 1}` : unit.role==='elf'?'soldier_elf':['','g1_soldier_militia','g1_soldier_footmen','g1_soldier_knight','soldier_paladin'][unit.tier];
      view = this.views.get(name)!;
      const health = 'kind' in unit ? battle.effectiveEnemyStats(unit).health : battle.soldierStats(unit).health;
      const stats = view.views[2].views;
      stats[0].views[0].scale.x = unit.hp / health;
      stats[1].setText(`${Math.floor(unit.hp)}/${health}`);
      if('kind' in unit){const values=battle.effectiveEnemyStats(unit);stats[2].setText(values.damage.join('-'));stats[7].setText(values.livesCost);stats[6].setText(values.dodge?`${Math.round(values.dodge*100)}%`:'-');stats[4].setText(`${Math.round(values.armor*100)}%${values.armor===0?'无':values.armor<.31?'低':'中'}`);stats[5].setText(`${Math.round(values.magicArmor*100)}%${values.magicArmor===0?'无':values.magicArmor<.61?'中':'高'}`);}
      else {
        if(unit.towerId===null&&!unit.role){const portrait=view.all().find(v=>v.data.image_name?.startsWith('info_portraits_sc_'))!;portrait.setImage(battle.stats.reinforcement.level>=2?'info_portraits_sc_00'+[[41,38,35],[42,39,36],[43,40,37],[43,40,37]][battle.stats.reinforcement.level-2][unit.variant]:portrait.data.image_name!);}
        const names=data.soldierNames[(unit.towerId!==null?'g1_soldier_militia':name) as keyof typeof data.soldierNames];view.views[1].setText(unit.profile?(unit.profile.names.length?unit.profile.names[unit.nameIndex]:unit.profile.name):unit.role==='elf'?battle.content.elfNames[unit.nameIndex]:unit.role==='guard'||unit.tier===4?battle.content.paladinNames[unit.nameIndex]:names[unit.nameIndex]);
        const buffed = battle.time < unit.courageUntil;
        const damage = battle.soldierStats(unit).damage;
        stats[2].setText(`${damage[0] + (buffed ? 2 * unit.courageLevel : 0)}-${damage[1] + (buffed ? 2 * unit.courageLevel : 0)}`);
        if(unit.role==='guard'||unit.profile&&battle.towers.find(t=>t.pad.id===unit.towerId)!.camp)stats[7].setText('无');
        if(unit.profile?.rangedPower){const a=unit.profile.rangedPower,rank=battle.towers.find(t=>t.pad.id===unit.towerId)!.powerLevels![a.power];stats[3].setText(rank?a.damage.map(d=>d+a.damageInc*rank).join('-'):'无');}
        if(unit.role==='elf'){stats[3].setText(ELF.damage.join('-'));stats[7].setText('无');}
        const armor=(battle.soldierStats(unit).armor)+(buffed?.05*unit.courageLevel:0);
        stats[4].setText(`${Math.round(armor*100)}%${armor===0?'无':armor<.31?'低':'中'}`);
      }
    }
    return view;
  }
  private animate(now: number) {
    const t = progress(now, this.started, .25), e = this.selected ? outQuad(t) : t * t;
    this.offset = this.fromOffset + ((this.selected ? 0 : 64) - this.fromOffset) * e;
    if (this.current) {
      this.current.y = this.current.data.pos.y + this.offset;
      this.current.visible = this.selected || t < 1;
    }
  }
  get state() { return this.selected && this.current ? { name: this.current.views[1].text, stats: this.current.views[2].views.map(v => v.text) } : null; }
  get motion() { return {selected:this.selected,visible:this.current?.visible ?? false,y:this.current?.y ?? 833,offset:this.offset}; }
}
