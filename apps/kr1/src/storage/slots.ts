import {storageKeys} from './namespace';
export type SaveSlot=1|2|3;
let activeSlot:SaveSlot=1;

export const saveStorage={
  getItem:(field:string)=>localStorage.getItem(storageKeys.slot(activeSlot,field)),
  setItem:(field:string,value:string)=>localStorage.setItem(storageKeys.slot(activeSlot,field),value),
};
export function selectSaveSlot(slot:SaveSlot){
  activeSlot=slot;
  saveStorage.setItem('created','true');
}
export function deleteSaveSlot(slot:SaveSlot){
  const prefix=storageKeys.slotPrefix(slot);
  for(let i=localStorage.length-1;i>=0;i--){
    const key=localStorage.key(i)!;
    if(key.startsWith(prefix))localStorage.removeItem(key);
  }
}
export function saveSlotSummary(slot:SaveSlot){
  const prefix=storageKeys.slotPrefix(slot);
  let exists=false,stars=0,heroic=0,iron=0;
  for(let i=0;i<localStorage.length;i++){
    const key=localStorage.key(i)!;
    if(!key.startsWith(prefix))continue;
    exists=true;
    const name=key.slice(prefix.length);
    if(/^level:\d+:progress$/.test(name))stars+=JSON.parse(localStorage.getItem(key)!).stars;
    else if(/^level:\d+:challenges$/.test(name)){
      const value=JSON.parse(localStorage.getItem(key)!);
      heroic+=Number(value.heroic>0);iron+=Number(value.iron>0);
    }
  }
  return {slot,exists,stars:stars+heroic+iron,heroic,iron};
}
