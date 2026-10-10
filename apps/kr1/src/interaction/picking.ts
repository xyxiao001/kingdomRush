import data from '../content/generated/interactions.json';
import type { Point } from '../content/types';
import type { Battle } from '../simulation/battle';

export type Pick = { type: 'hero'; id: number } | { type: 'enemy' | 'soldier' | 'prop'; id: number } | { type: 'pad'; id: string };
const towerNames = { archer: 'g1_tower_archer_1', barrack: 'g1_tower_barrack_1', mage: 'g1_tower_mage_1', artillery: 'g1_tower_engineer_1' } as const;
export { towerNames };

// all/utils.lua U.find_entity_at_pos: ui.z descending, then world y ascending.
// No cycling or aggregation exists in the reference picker.
export function pickAt(battle: Battle, point: Point, type?:Pick['type']): Pick | null {
  const hits: { pick: Pick; y: number; z: number }[] = [];
  const add = (pick: Pick, pos: Point, rect: { pos: Point; size: Point }, z: number) => {
    if(type&&pick.type!==type)return;
    if (point.x > pos.x + rect.pos.x && point.x < pos.x + rect.pos.x + rect.size.x && point.y > pos.y + rect.pos.y && point.y < pos.y + rect.pos.y + rect.size.y) hits.push({ pick, y: pos.y, z });
  };
  if (battle.heroEnabled && battle.hero.deadAt === null) add({ type: 'hero', id: battle.hero.id }, battle.hero, battle.heroContent?battle.heroContent.hitArea:{ pos: { x: -20, y: -5 }, size: { x: 40, y: 40 } }, 2);
  for (const enemy of battle.enemies) if (enemy.deadAt === null && !enemy.escaped&&!enemy.dormant) {
    const stats=battle.effectiveEnemyStats(enemy),[w,h]=stats.hitSize;add({type:'enemy',id:enemy.id},enemy,{pos:{x:-w/2,y:stats.hitY??-5},size:{x:w,y:h}},0);
  }
  for (const soldier of battle.soldiers) if (soldier.deadAt === null) {
    const ui = data.hitAreas.g1_soldier_militia; add({ type: 'soldier', id: soldier.id }, soldier, soldier.profile?.hitArea??ui.click_rect, ui.z);
  }
  for (const pad of battle.level.pads) {
    const tower = battle.towers.find(t => t.pad.id === pad.id);
    if (tower && battle.time < tower.builtAt) continue;
    if(tower?.seal){add({type:"pad",id:pad.id},pad.position,tower.seal.config.hitArea,1);continue;}
    if(tower?.frozen&&battle.isTowerBlocked(tower)){add({type:"pad",id:pad.id},pad.position,tower.frozen.config.hitArea,1);continue;}
    const rect = tower?.manual?tower.manual.hitArea:battle.campFor(pad)?{pos:{x:-40,y:-30},size:{x:80,y:90}}:pad.special==='elf'?{pos:{x:-40,y:-10},size:{x:80,y:90}}:tower ? data.hitAreas[towerNames[tower.kind]].click_rect : { pos: { x: -40, y: -12 }, size: { x: 80, y: 50 } };
    add({ type: 'pad', id: pad.id }, pad.position, rect, 0);
  }
  battle.props.forEach((p,id)=>{
    if(p.removed||(!p.sheep&&!p.mill&&!p.fish&&!p.decoration.clickRelease&&!p.decoration.clickPlay))return;
    if(!p.clickable)return;
    const small=p.decoration.kind.endsWith('small');
    if(p.fish&&battle.time-p.playAt>=p.playDuration)return;
    const rect=p.decoration.clickPlay?p.decoration.clickPlay.hitArea:p.decoration.clickRelease?p.decoration.clickRelease.hitArea:p.fish?{pos:{x:-24,y:-17},size:{x:48,y:34}}:p.sheep?{pos:{x:-10,y:-5},size:{x:20,y:20}}:{pos:{x:-10,y:small?-25:-30},size:{x:small?35:40,y:small?55:65}};
    add({type:'prop',id},p.position,rect,0);
  });
  hits.sort((a, b) => b.z - a.z || a.y - b.y);
  return hits.length ? hits[0].pick : null;
}
