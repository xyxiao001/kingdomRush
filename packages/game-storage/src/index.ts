// Game IDs and schema versions are explicit; URL paths do not isolate localStorage.
export function createStorageKeys(gameId:string,schemaVersion:number){
  const prefix=`kingdom-rush:${gameId}:v${schemaVersion}:`;
  const slotPrefix=(slot:number)=>`${prefix}slot:${slot}:`;
  return {
    slotPrefix,
    slot:(slot:number,field:string)=>slotPrefix(slot)+field,
    settings:(field:string)=>`${prefix}settings:${field}`,
  };
}
