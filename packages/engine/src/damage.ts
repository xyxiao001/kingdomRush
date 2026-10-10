// Source armor/resistance reduction; callers own damage kind and incoming rounding.
export const damageAfterResistance=(rolled:number,resistance:number)=>Math.floor(rolled*(1-resistance));
