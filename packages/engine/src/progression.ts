import type {ProgressionRule} from '@kingdom-rush/game-types';
/** Shared Fusion prog_value formula. First insertion and stat rounding remain app-owned. */
export function progressionValue(rule:ProgressionRule,raw:number,wave:number,firstWave:number){
  if(rule.activeAfterWave!==undefined&&wave<rule.activeAfterWave)return raw;
  const age=wave-(rule.activeAfterWave??firstWave);
  if(rule.factor_steps?.length)return raw*rule.factor_steps[Math.max(0,Math.min(rule.factor_steps.length-1,Math.ceil(age/(rule.cicle??1))-1))];
  const factor=rule.factor??1;let mult=(rule.base??1)*factor**Math.floor(age/(rule.cicle??1));
  if(factor>1)mult=Math.min(mult,rule.limit??99999);else if(factor<1)mult=Math.max(mult,rule.limit??-99999);
  let value=mult*raw;if(rule.limit_value!==undefined)value=factor<1?Math.max(value,rule.limit_value):Math.min(value,rule.limit_value);return value;
}
