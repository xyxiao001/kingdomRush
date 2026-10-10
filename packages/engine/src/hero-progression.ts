/** Shared source hero level / point budget. Starting levels and persistence stay with each game. */
export function heroLevel(xp:number,thresholds:readonly number[]){return 1+thresholds.filter(value=>xp>=value).length;}
export interface SkillCost {id:string;hr_cost:readonly number[]}
export function remainingHeroPoints(level:number,points:readonly number[],skills:readonly SkillCost[],ranks:Record<string,number>){return points[level-1]-skills.reduce((sum,skill)=>sum+skill.hr_cost.slice(0,ranks[skill.id]).reduce((a,b)=>a+b,0),0);}
export function canBuyHeroSkill(rank:number,costs:readonly number[],remaining:number){return rank<costs.length&&remaining>=costs[rank];}
