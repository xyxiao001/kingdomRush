import {saveStorage} from './slots';
import content from '../content/generated/progression-ui.json';
export interface AchievementState {counters:Record<string,number>;earned:string[]}
const KEY='achievements';
export function loadAchievements():AchievementState{const value=saveStorage.getItem(KEY);return value===null?{counters:{},earned:[]}:JSON.parse(value);}
// All counters are event-driven. Historical saves are not awarded unobserved events.
export class Achievements {
  state=loadAchievements();private level:Record<string,number>={};
  constructor(private notify:(id:string)=>void){}
  startLevel(){this.level={};}
  increment(id:string,amount=1){const a=content.achievementList.find(a=>a.id===id)!;if(this.state.earned.includes(id))return;
    const counts=a.period===2?this.level:this.state.counters;
    counts[id]=(counts[id]??0)+amount;
    if(a.goal!==null&&counts[id]>=a.goal)this.award(id);else this.save();
  }
  maximum(id:string,amount:number){const a=content.achievementList.find(a=>a.id===id)!;if(a.goal!==null&&amount>=a.goal)this.award(id);}
  award(id:string){if(this.state.earned.includes(id))return;this.state.earned.push(id);this.save();this.notify(id);}
  private save(){saveStorage.setItem(KEY,JSON.stringify(this.state));}
}
