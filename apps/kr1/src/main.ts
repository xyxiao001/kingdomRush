import {updateStarsBanner,positionLevelTip,updateCampaignBadges} from '@kingdom-rush/game-web/map-widgets';
import {settingsPanelData} from '@kingdom-rush/game-web/settings-typography';
import {gameCursor,loading} from './bootstrap';
import {resources} from './loading/progress';
import {loadTexture} from './loading/textures';
import {showPwa} from './pwa/client';
import ambientData from './content/generated/map-ambient.json';
import {MapAmbient} from './rendering/map-ambient';
import { Container, Graphics, Rectangle, Sprite, Texture } from 'pixi.js';
import battleProgression from './content/generated/battle-progression.json';
import progressionData from './content/generated/progression-ui.json';
import progressionMap from './content/generated/progression-map.json';
import {assetUrl} from './rendering/asset-url';
import {ProgressionMenus} from './interaction/progression';
import {loadUpgrades} from './storage/upgrades';
import {loadChallenges,recordChallenge,totalStars,type GameMode} from './storage/challenges';
import {Achievements} from './storage/achievements';
import {LEVELS,LEVEL_THUMBNAILS,loadLevel,levelContentUrl,type LevelContent} from './levels/index';
import endlessCatalog from './content/generated/endless-catalog.json';
import endlessMap from './content/generated/endless-map.json';
import {loadEndlessRecord,recordEndless} from './storage/endless';
import {MapLevelFlag} from './rendering/map-level-flag';
import heroUi from './content/generated/heroes-ui.json';
import {loadHero,heroContentUrl,type HeroContent} from './content/heroes';
import {loadSelectedHero} from './storage/hero';
import {HeroRoom,HEROES} from './interaction/hero-room';
import assetData from './content/generated/assets.json';
import interfaceData from './content/generated/interface.json';
import interactionData from './content/generated/interactions.json';
import feedbackData from './content/generated/feedback.json';
import { pickAt } from './interaction/picking';
import { Inspect } from './interaction/inspect';
import { Encyclopedia } from './interaction/encyclopedia';
import type { AssetData, Level, Power, TowerKind } from './content/types';
import { FIRE, LIGHTNING, REINFORCEMENT, TOWERS, STEP } from './content/balance';
import { Battle, type AdvancedPower } from './simulation/battle';
import { Scene, HEIGHT, OFFSET, WIDTH, type Selection } from './rendering/scene';
import { GameView, atlasTextures, loadFonts, fontUrls, type ViewData } from './rendering/ui-tree';
import { GameAudio } from './audio/audio';
import { CombatCues } from './audio/combat-cues';
import combatAudio from './content/generated/combat-audio.json';
import {Notifications} from './rendering/notifications';
import notificationData from './content/generated/notifications.json';
import {recordSeen,loadSeen} from './storage/encyclopedia';
import { loadLevelProgress, recordLevelVictory, allLevelsUnlocked, unlockAllLevels } from './storage/progress';
import { hasSavedDifficulty, loadDifficulty, nextDifficulty, saveDifficulty } from './storage/difficulty';
import { MapPopup } from './rendering/map-popup';
import { PerformanceHud } from './rendering/performance-hud';
import {loadPerformanceHud,savePerformanceHud} from './storage/performance';
import { loadVolumes, saveVolumes } from './storage/options';
import {VictoryAnimation} from './rendering/victory';
import {WaveRewards} from './rendering/wave-reward';
import {GameCamera} from './rendering/camera';
import {WORLD_MAP_BOUNDS} from './content/world-map';
import {TowerMenuMotion,PauseAnimation,DefeatAnimation} from './rendering/ui-motion';
import {powerButtonData,updatePowerButton} from './rendering/tower-power-button';
import {WavePresentation} from './rendering/wave-presentation';
import {RESOLUTIONS,RESOLUTION_LABELS,DISPLAY_MODES,DISPLAY_MODE_LABELS} from './storage/display';

async function boot() {
const allSounds={...assetData.sounds,...feedbackData.sounds,...notificationData.sounds,...combatAudio.files};
const mapSoundKeys=['button','mapHover','mapMusic','winStar','transitionOpen','transitionClose'];
const mapSounds=Object.fromEntries(mapSoundKeys.map(key=>[key,allSounds[key as keyof typeof allSounds]]));
loading.phase('加载战役地图与界面',[...fontUrls,...['ui/interface','map/atlas','map/endless','progression/map','map/ambient','map/background','ui/interactions','map/level-thumbs','ui/feedback','heroes/shared/atlas'].map(path=>assetUrl(`/assets/kr1/${path}.png`)),...Object.values(mapSounds)]);
let selectedLevel=LEVELS[1],content:LevelContent,level:Level;
const assets = assetData as AssetData;
const host = document.querySelector<HTMLDivElement>('#app')!;
const scene = new Scene(assets);
// Map images do not depend on fonts or WebGL initialization; views below need all three.
const [,,[uiTextures,mapTextures,progressionMapTextures,ambientTextures,mapBackground,interactionTextures,thumbnails,feedbackTextures,heroTextures,endlessTextures]] = await Promise.all([scene.init(host),loadFonts(),Promise.all([
  atlasTextures('/assets/kr1/ui/interface.png', interfaceData.uiFrames),
  atlasTextures('/assets/kr1/map/atlas.png', interfaceData.mapFrames),
  atlasTextures('/assets/kr1/progression/map.png',progressionMap.frames),
  atlasTextures('/assets/kr1/map/ambient.png',ambientData.frames),
  loadTexture(assetUrl('/assets/kr1/map/background.png')),
  atlasTextures('/assets/kr1/ui/interactions.png',interactionData.frames),
  atlasTextures('/assets/kr1/map/level-thumbs.png',LEVEL_THUMBNAILS),
  atlasTextures('/assets/kr1/ui/feedback.png',feedbackData.frames),
  atlasTextures('/assets/kr1/heroes/shared/atlas.png',heroUi.frames),
  atlasTextures('/assets/kr1/map/endless.png',endlessMap.frames),
])]);
for(const [name,texture] of progressionMapTextures){mapTextures.set(name,texture);uiTextures.set(name,texture);}
for(const [name,texture] of endlessTextures)mapTextures.set(name,texture);
for(const [name,texture] of ambientTextures)mapTextures.set(name,texture);
mapTextures.set('map_background1',mapBackground);
for(const [key,texture] of thumbnails)mapTextures.set(key,texture);
const notificationTextures=new Map<string,Texture>();
for(const [name,texture] of feedbackTextures){uiTextures.set(name,texture);mapTextures.set(name,texture);}
const interactionScreens = interactionData.screens as unknown as Record<string, ViewData>;
const source = interfaceData.screens as unknown as Record<string, ViewData>;
source.mapOptions=settingsPanelData(source.mapOptions);source.pause=settingsPanelData(source.pause);
const mapLayer = new Container(), hud = new Container(), modal = new Container();
hud.scale.set(1080 / HEIGHT); modal.scale.set(1080 / HEIGHT);
scene.ui.addChild(mapLayer, hud, modal);
scene.world.eventMode = "none";
const make = (key: string) => new GameView(source[key], uiTextures, HEIGHT / 1080);
const rangeLayer = new Container(), pointerLayer = new Container();
rangeLayer.eventMode = pointerLayer.eventMode = 'none';
hud.addChild(rangeLayer);
const quarterSprites = Array.from({length:4}, () => { const sprite = new Sprite(); rangeLayer.addChild(sprite); return sprite; });
const cursorBase = new Sprite(), cursorIcon = new Sprite(); pointerLayer.addChild(cursorBase,cursorIcon);
function showRange(x:number,y:number,radius:number,rally:boolean) {
  const texture = uiTextures.get(rally ? 'rally_circle' : 'range_circle')!;
  quarterSprites.forEach((sprite,i) => {
    sprite.texture=texture; sprite.anchor.set(1 - .15 / (texture.orig.width * HEIGHT / 1080), 1 - .15 / (texture.orig.height * HEIGHT / 1080));
    sprite.position.set(x,y); sprite.scale.set((i%2 ? -1:1)*radius/texture.orig.width,(i>=2 ? -1:1)*radius*.7/texture.orig.height);
  }); rangeLayer.visible = true;
}
const map = new GameView(source.map, mapTextures, 1), book = new GameView(progressionData.book as unknown as ViewData, mapTextures, 1), mapOptions = new GameView(source.mapOptions, mapTextures, 1);
const mapWorld=map.views.find(v=>v.data.class==='class MapView')!;
scene.app.stage.addChildAt(mapWorld,1);
const mapCamera=new GameCamera(mapWorld,2.5);
mapLayer.addChild(map, book, mapOptions); book.visible = mapOptions.visible = false;
const bookPopup = new MapPopup(book);
const endlessBook=new GameView(endlessMap.book as unknown as ViewData,mapTextures,1),endlessPopup=new MapPopup(endlessBook);
mapLayer.addChild(endlessBook);endlessBook.visible=false;
endlessBook.eventMode='static';endlessBook.hitArea=new Rectangle(0,0,1920,1080);endlessBook.on('pointertap',e=>e.stopPropagation());
const mapOptionsPopup = new MapPopup(mapOptions,.5,.25);
const difficultyView = new GameView(interactionScreens.difficulty, interactionTextures, 1);
mapLayer.addChild(difficultyView);
const difficultyPopup = new MapPopup(difficultyView);
difficultyView.eventMode='static';difficultyView.hitArea=new Rectangle(0,0,1920,1080);difficultyView.on('pointertap',e=>e.stopPropagation());
const levelTip = new GameView(interactionScreens.levelTip, interactionTextures, 1);
levelTip.visible=false;levelTip.eventMode='none';mapLayer.addChild(levelTip);
const tipData=structuredClone(source.bookLockedTooltip);tipData.size={x:480,y:100};tipData.anchor={x:0,y:0};tipData.alpha=1;
tipData.children=tipData.children.slice(0,2);
tipData.children.forEach((v,i)=>{v.pos={x:18,y:12+i*34};v.size=v.text_size={x:444,y:32};v.source_lines=[String(v.text)];});
const bookTooltip = new GameView(tipData,mapTextures,1);
bookTooltip.visible=false;bookTooltip.eventMode='none';
const counters = make('counters'), pauseButton = make('pauseButton'), bottom = make('bottom'), flag = make('waveFlag');
// ENHANCEMENT: the existing HUD frame and text renderer also own the speed control.
const speedData=structuredClone(source.pauseButton);
speedData.pos.x-=58;
const speedLabel=structuredClone(counters.views[2].data);
Object.assign(speedLabel,{pos:speedData.children[0].pos,anchor:speedData.children[0].anchor,size:speedData.children[0].size,text_size:speedData.children[0].size,text:'1×',text_align:'center',font_size:18});
speedData.children=[speedLabel];
const speedButton=new GameView(speedData,uiTextures,HEIGHT/1080);
const scoreData=structuredClone(counters.views[2].data);
Object.assign(scoreData,{pos:{x:24,y:80},size:{x:240,y:28},text_size:{x:240,y:28},text:'得分 0',font_size:15,text_align:'left'});delete scoreData.source_lines;delete scoreData._fitted_font_size;
const scoreLabel=new GameView(scoreData,uiTextures,HEIGHT/1080);counters.addChild(scoreLabel);
const performanceHud=new PerformanceHud(counters.views[2].data,uiTextures);
performanceHud.position.set(counters.data.size.x+8,28);performanceHud.visible=loadPerformanceHud();counters.addChild(performanceHud);
const heroBar=new GameView(heroUi.hud as unknown as ViewData,heroTextures,HEIGHT/1080);
const heroPortrait=heroBar.views[0];
bottom.addChild(heroBar);
const heroes=new HeroRoom(async id=>{refreshHeroPortraits();const data=await loadHero(id),cue=data.events.hero_room_select;await audio!.load(Object.fromEntries(data.cues[cue].files.map(file=>[file,data.sounds[file]])));new CombatCues((key,gain,group,limit)=>audio!.play(key,gain,group,limit),Math.random,data.cues).request(cue,presentationTime);},()=>heroRoomPopup.hide(presentationTime),()=>mapSound('button'));
const heroRoom=heroes.view;
mapLayer.addChild(heroRoom);heroRoom.visible=false;
const heroRoomPopup=new MapPopup(heroRoom);
heroRoom.eventMode='static';heroRoom.hitArea=new Rectangle(0,0,1920,1080);heroRoom.on('pointertap',e=>e.stopPropagation());
const moveConfirm=new Sprite();moveConfirm.anchor.set(.5);moveConfirm.scale.set(HEIGHT/1080);moveConfirm.eventMode='none';moveConfirm.visible=false;hud.addChild(moveConfirm);
let moveConfirmedAt=-100, invalidTargetAt=-100,moveConfirmWorld={x:0,y:0};
const rallyFlag=new Sprite();rallyFlag.anchor.set(.5);rallyFlag.scale.set(HEIGHT/1080);rallyFlag.eventMode='none';rallyFlag.visible=false;hud.addChild(rallyFlag);
let rallyConfirmedAt=-100,rallyConfirmWorld={x:0,y:0};
const heroInfo=new GameView(heroUi.info as unknown as ViewData,heroTextures,HEIGHT/1080);
bottom.addChild(heroInfo);heroInfo.visible=false;
const inspect = new Inspect(bottom, interactionTextures, heroInfo);
const incoming = new GameView(interactionScreens.incoming, interactionTextures, HEIGHT/1080);
incoming.visible=false;incoming.eventMode='none';
incoming.views[0].background!.clear().poly([0,24,18,12,9,12,9,0]).fill(0x15110d);
hud.addChild(counters, speedButton, pauseButton, bottom, flag, incoming, pointerLayer);
const shade = new Graphics().rect(0, 0, WIDTH, HEIGHT).fill({color: 0x000000, alpha: 120 / 255});
shade.eventMode = 'static'; shade.on('pointertap', e => e.stopPropagation());
const pause = make('pause'), victory = make('victory'), defeat = make('defeat');
const pauseAnimation=new PauseAnimation(pause,shade),defeatAnimation=new DefeatAnimation(defeat,WIDTH);
const victoryAnimation=new VictoryAnimation(victory,uiTextures,()=>audio!.play('winStar'),()=>audio!.startMusic('prepare'));
modal.addChild(shade, pause, victory, defeat); modal.visible = false;
let selectedMode:GameMode='campaign';
const tutorialShown=new Set<string>();
let battle:Battle, screen: 'map' | 'battle' = 'map';
const volumes = loadVolumes();
let audio: GameAudio | null = null, completed = false, menu: GameView | null = null;
let menuMotion:TowerMenuMotion|null=null;const closingMenus:TowerMenuMotion[]=[];
audio = new GameAudio(); await audio.load(mapSounds);
loading.stage('正在准备战役地图…');await loading.paint();
audio.setVolume('sfx',volumes.sfx);audio.setVolume('music',volumes.music);
window.addEventListener('pointerdown',()=>void audio!.resume(),{once:true});
let difficulty = loadDifficulty();
const mapSoundEvents: {name:string;time:number}[] = [];
let tooltip: GameView | null = null;
let accumulator = 0, last = 0, presentationTime = 0, manualClock = false, manualPresentation = false;
// Authorized accelerated development verification; every simulation tick remains 1/60 s.
const testSpeed=import.meta.env.DEV&&new URLSearchParams(location.search).get('testSpeed')==='4'?4:1;
let gameSpeed:number=testSpeed;
if(testSpeed===4){const badge=document.createElement('div');badge.textContent='测试速度 4×';badge.style.cssText='position:fixed;right:100px;top:12px;padding:4px 10px;background:#292b1d;color:#e3bd65;border:1px solid #857148;pointer-events:none;z-index:2';document.body.append(badge);}
const performanceSamples:{interval:number;update:number;render:number;enemies:number}[]=[];
const performanceBenchmark=import.meta.env.MODE==='test'&&new URLSearchParams(location.search).has('benchmark');
const selection: Selection = { pad: null, preview: null, power: null, pointer: { x: 512, y: 384 }, unit:null, hoverPad:null };
let heroContent:HeroContent,heroCues:CombatCues;
let sheepVoiceAt=-100,reinforcementVoice=0;
const combatCues=new CombatCues((key,gain,group,limit)=>audio!.play(key,gain,group,limit));
const notificationEntries={...notificationData.entries} as unknown as ConstructorParameters<typeof Notifications>[0];
const notifications=new Notifications(notificationEntries,notificationTextures,()=>presentationTime,value=>{closeSelection();cancelDrag();battle.paused=value;accumulator=0;},(key,gain)=>audio!.play(key,gain),id=>{if(id.startsWith('enemy_'))achievementTracker.increment('WHATS_THAT');});
hud.addChild(notifications.queue,notifications.overlay);
let encyclopedia: Encyclopedia | null=null;
let battleLoad:Promise<void>|undefined;
const levelUiLoads=new Map<string,Promise<void>>();
const battleSounds=Object.fromEntries(Object.entries(allSounds).filter(([key])=>!mapSoundKeys.includes(key)&&!combatAudio.lazyFiles.includes(key)));
const battleResourceUrls=[...['battle/atlas','ui/interactions','ui/feedback','ui/notifications','battle/progression','progression/atlas'].map(path=>assetUrl(`/assets/kr1/${path}.png`)),...Object.values(battleSounds),'/assets/kr1/progression/upgrade.ogg','/assets/kr1/progression/achievement.ogg'];
function loadBattle(){
  return battleLoad ??= Promise.all([scene.loadBattle(),ensureProgression(),audio!.load(battleSounds),
    atlasTextures('/assets/kr1/ui/notifications.png',notificationData.frames).then(textures=>{for(const [key,value] of textures)notificationTextures.set(key,value);}),
    atlasTextures('/assets/kr1/battle/progression.png',battleProgression.frames).then(textures=>{for(const [key,value] of textures)interactionTextures.set(key,value);}),
  ]).then(()=>{});
}
const actions = new Map<string, GameView>();
function mapSound(name:'button'|'mapHover') {
  if(import.meta.env.MODE==='test') mapSoundEvents.push({name,time:presentationTime});
  audio!.setVolume('sfx',volumes.sfx);void audio!.resume();audio!.play(name);
}
function bind(name: string, view: GameView, action: () => void, hover?: (inside: boolean) => void) {
  actions.set(name, view); view.button(action, hover);
}
function bindTowerPurchase(name:string,button:GameView,purchase:()=>boolean,hover:(inside:boolean)=>void,keepOpen=true){
  bind(name,button,()=>{if(purchase()){if(keepOpen){updateMenu();hover(button.hovered);}else closeSelection();}},hover);
}
function closeTooltip() { if (tooltip) { tooltip.destroy(); tooltip = null; } }
function closeSelection() {
  closeTooltip();
  selection.pad = null; selection.power = null; selection.preview = null; selection.unit = null;invalidTargetAt=-100;
  if (menu) { for (const [id, view] of actions) if (menu.all().includes(view)) actions.delete(id); menuMotion!.hide(presentationTime);closingMenus.push(menuMotion!);menuMotion=null;menu = null; }
}
function showMap() {
  notifications.reset();closeSelection(); screen = 'map'; mapWorld.visible=true;mapLayer.visible = true; scene.world.visible = false; hud.visible = false; modal.visible = false; book.visible = false;endlessBook.visible=false;
  audio!.startMusic('mapMusic');
  updateStars();mapAmbient.reset(presentationTime);
}
async function returnToMap(){saveVolumes(volumes);await audio!.resume();audio!.play('transitionClose');await loading.transition('正在返回战役地图…',async()=>{showMap();});audio!.play('transitionOpen');}
async function startBattle() {
  saveVolumes(volumes);
  audio!.play('transitionClose');
  await loading.transition(`正在前往${selectedLevel.name}…`,async()=>{
  const heroId=loadSelectedHero();
  loading.phase('读取关卡与英雄配置',[levelContentUrl(selectedLevel.id),heroContentUrl(heroId)]);
  [content,heroContent]=await Promise.all([loadLevel(selectedLevel.id),loadHero(heroId)]);
  loading.phase(`加载${selectedLevel.name}资源`,[...battleResourceUrls,assetUrl(content.background),...content.packages.map(pack=>assetUrl(pack.url)),...content.ui.map(pack=>assetUrl(pack.url)),assetUrl(heroContent.url),...Object.values(content.sounds),...Object.values(heroContent.sounds),...(content.bossMusic?[content.bossMusic]:[])]);
  level=selectedMode==='campaign'?content.level:{...content.level,...content.modes[selectedMode]};
  await Promise.all([loadBattle().then(()=>scene.setLevel(content,level)),scene.setHero(heroContent),audio!.load({...content.sounds,...heroContent.sounds,...(content.bossMusic?{bossMusic:content.bossMusic}:{})})]);
  heroCues=new CombatCues((key,gain,group,limit)=>audio!.play(key,gain,group,limit),Math.random,heroContent.cues);
  for(const pack of content.ui){if(!levelUiLoads.has(pack.url))levelUiLoads.set(pack.url,atlasTextures(pack.url,pack.frames).then(textures=>{for(const [key,texture] of textures){interactionTextures.set(key,texture);notificationTextures.set(key,texture);uiTextures.set(key,texture);}inspect.addViews(pack.views);Object.assign(notificationEntries,pack.notifications);}));await levelUiLoads.get(pack.url);}
  loading.stage('正在准备战场…');await loading.paint();
  notifications.reset();closeSelection();pause.visible=false;victory.visible=false;defeat.visible=false;configureWaveFlags();tutorialShown.clear(); battle = new Battle({...content,level},12345,difficulty,selectedMode,loadUpgrades(),heroContent);achievementTracker.startLevel();gameSpeed=testSpeed;speedButton.views[0].setText(gameSpeed+'×');earlyCalls=0; completed = false; accumulator = 0;sheepVoiceAt=-100;rallyConfirmedAt=-100;moveConfirmedAt=-100;powerStates.forEach(v=>{v.mode='locked';v.at=presentationTime;v.previous=0;});
  audio!.setVolume('sfx',volumes.sfx);audio!.setVolume('music',volumes.music);
  await audio!.resume(); audio!.startMusic('prepare');
  scene.camera.reset();
  screen = 'battle'; scene.world.visible = true; mapWorld.visible=false;mapLayer.visible = false; hud.visible = true; modal.visible = false;
  book.visible=false;endlessBook.visible=false;bookTooltip.visible=false;levelTip.visible=false;
  // ORIGINAL: systems.lua common notifications + NotificationView:show mark seen on arrival.
  if(selectedMode!=='campaign'&&!loadSeen().includes('TIP_UPGRADES')){
    recordSeen('TIP_UPGRADES');notifications.show('TIP_UPGRADES',notificationData.tipUpgrades as unknown as ViewData);
  }
  update();scene.render();
  });
  audio!.play('transitionOpen');
}
function togglePause() {
  if (screen !== 'battle' || battle.finished || notifications.visible) return;
  battle.paused = !battle.paused; closeSelection();cancelDrag();
  modal.visible = true; victory.visible = defeat.visible = false;
  if(battle.paused)pauseAnimation.show(presentationTime);else pauseAnimation.hide(presentationTime);
  accumulator = 0;
  if (battle.paused) void audio!.pause(); else {saveVolumes(volumes);void audio!.resume();}
}
function selectPad(id: string) {
  if (battle.paused || battle.finished) return;
  const same = selection.pad === id; closeSelection(); if(same)return;
  const tower = battle.towers.find(t => t.pad.id === id);
  if (tower && (battle.time < tower.builtAt||battle.isTowerBlocked(tower))) return;
  selection.pad = id; selection.unit={type:'pad',id};
  const pad = level.pads.find(p => p.id === id)!;
  const camp=battle.campFor(pad);
  if(camp||pad.special==='elf'||tower?.manual||(tower&&tower.tier===4)){
    const data=structuredClone(source[camp||pad.special==='elf'||tower?.kind==='barrack'||tower?.extension?.guardian||tower?.manual?'barrackMenu':'builtMenu']);
    const priced=(image:string,action:string,arg:string,position:'top'|'left'|'right')=>{const b=structuredClone(source.menu.children[position==='right'?1:0]);const lock=data.children[0];if(position==='top')b.pos={x:lock.pos.x+(lock.size.x-b.size.x)/2,y:lock.pos.y+(lock.size.y-b.size.y)/2};b.children.find(v=>v.image_name==='g1_main_icons_0001'||v.image_name==='g1_main_icons_0002')!.image_name=image;b.item={...b.item!,image,action,action_arg:arg};return b;};
    const power=(image:string,action:string,arg:string,position:'top'|'left'|'right',ranks=3)=>{
      const b=powerButtonData(interfaceData.powerButton as unknown as ViewData,image,action,arg,ranks);
      const old=position==='top'?data.children[0]:source.menu.children[position==='right'?1:0];
      b.pos={x:old.pos.x+(old.size.x-b.size.x)/2,y:old.pos.y+(old.size.y-b.size.y)/2};
      return b;
    };
    if(tower?.manual){const fire=structuredClone(data.children.find(v=>v.item?.action==='tw_rally')!);fire.item={...fire.item!,action:'manual-target',image:'sub_icons_0002'};for(const child of fire.children)if(child.image_name==='sub_icons_0001')child.image_name='sub_icons_0002';const button=priced(tower.manual.power.icon,'manual-upgrade','','top');data.children=[button,fire];}
    else if(camp)data.children=[priced(camp.icon,'hire-camp','', 'top'),...(tower?[data.children[1]]:[])];
    else if(tower?.extension)data.children=[...Object.entries(tower.extension.powers).map(([key,p])=>{const button=power(p.icon,'extension-power',key,'top',p.max);button.pos=p.position;return button;}),...data.children.slice(1)];
    else if(pad.special==='elf')data.children=[priced(tower?'main_icons_0016':'main_icons_0015',tower?'hire-elf':'repair-elf','', 'top'),...(tower?[data.children[1]]:[])];
    else if(tower!.special==='musketeer')data.children=[power('special_icons_0003','advanced-power','sniper','left'),power('special_icons_0004','advanced-power','shrapnel','right'),data.children[1]];
    else if(tower!.kind==='mage')data.children=[power('special_icons_0015','advanced-power','disintegrate','left'),power('special_icons_0016','advanced-power','teleport','right'),data.children[1]];
    else if(tower!.kind==='barrack'){const healing=power('special_icons_0007','advanced-power','healing','left'),holy=power('special_icons_0006','advanced-power','holystrike','right');healing.pos={x:-24,y:34};holy.pos={x:113,y:34};data.children=[healing,power('special_icons_0009','advanced-power','shield','top',1),holy,...data.children.slice(1)];}
    else data.children=[power('special_icons_0008','ranger-power','poison','left'),power('special_icons_0002','ranger-power','thorn','right'),data.children[1]];
    menu=new GameView(data,uiTextures,HEIGHT/1080);
  }else if(tower&&(tower.tier<content.maxTowerLevel||(tower.tier===3&&content.advancedTowers.includes(tower.kind)))){
    const data=structuredClone(source[tower.kind==='barrack'?'barrackMenu':'builtMenu']);
    const index=data.children.findIndex(v=>v.image_name==='main_icons_0014');
    const locked=data.children[index],button=structuredClone(source.menu.children[0]);
    button.pos={x:locked.pos.x+(locked.size.x-button.size.x)/2,y:locked.pos.y+(locked.size.y-button.size.y)/2};
    const image=tower.tier===3?({archer:'main_icons_0011',mage:'main_icons_0006',barrack:'main_icons_0008',artillery:'main_icons_0013'} as const)[tower.kind]:'main_icons_0005';
    button.children.find(v=>v.image_name==='g1_main_icons_0001')!.image_name=image;
    button.item!.image=image;button.item!.action_arg=tower.kind;
    const extension=tower.tier===3?content.extensions?.find(e=>e.kind===tower.kind):undefined;
    if(extension){
      const extra=structuredClone(button);extra.item!.image=extension.icon;extra.item!.action_arg=extension.id;extra.children.find(v=>v.image_name===image)!.image_name=extension.icon;
      if(extension.unit||extension.spell){button.pos={...source.menu.children[0].pos};extra.pos={...source.menu.children[1].pos};data.children.splice(index+1,0,extra);}
      else {button.item=extra.item;button.children=extra.children;}
    }
    const second=tower.tier===3?content.extensions?.filter(e=>e.kind===tower.kind)[1]:undefined;
    if(second){button.pos={...source.menu.children[0].pos};const extra=structuredClone(button);extra.pos={...source.menu.children[1].pos};extra.children.find(v=>v.image_name===button.item!.image)!.image_name=second.icon;extra.item!.image=second.icon;extra.item!.action_arg=second.id;data.children.splice(index+1,0,extra);}
    data.children[index]=button;
    if(tower.kind==='archer'&&tower.tier===3&&content.musketeer){
      button.pos={...source.menu.children[0].pos};
      const musketeer=structuredClone(button);musketeer.pos={...source.menu.children[1].pos};musketeer.item!.image='main_icons_0010';musketeer.item!.action_arg='musketeer';musketeer.children.find(v=>v.image_name===image)!.image_name='main_icons_0010';data.children.splice(index+1,0,musketeer);
    }
    menu=new GameView(data,uiTextures,HEIGHT/1080);
  }else menu = make(tower ? tower.kind === 'barrack' ? 'barrackMenu' : 'builtMenu' : 'menu');
  menu.position.set(Math.round(pad.position.x + OFFSET), Math.round(HEIGHT - pad.position.y - 14));
  menuMotion=new TowerMenuMotion(menu,presentationTime); hud.addChild(menu);audio!.play('menuOpen');
  const kinds: TowerKind[] = ['archer','barrack','mage','artillery'];
  menu.views.forEach((button, i) => {
    if(button.data.item?.action==='manual-upgrade')bind('manual-upgrade',button,()=>{if(battle.buyManualPower(tower!))closeSelection();},inside=>{button.views[0].visible=inside;closeTooltip();if(!inside)return;tooltip=make('tooltipArcher');tooltip.views[0].setText(tower!.manual!.power.name);tooltip.views[1].setText(tower!.manual!.description+' '+tower!.manual!.power.descriptions[Math.min(3,tower!.manualState!.rank)]);tooltip.views.slice(2).forEach(v=>v.visible=false);const p=hudPoint(pad.position);tooltip.position.set(p.x-tooltip.data.size.x/2,p.y-tooltip.data.size.y-126);if(tooltip.y<tooltip.data.size.y/3)tooltip.y=p.y+76;tooltip.eventMode='none';hud.addChild(tooltip);audio!.play('mapHover');});
    else if(button.data.item?.action==='manual-target')bind('manual-target',button,()=>{if(battle.manualReady(tower!)){closeSelection();selection.pad=id;selection.power='manual';}},inside=>{button.views[0].visible=inside;});
    else if(button.data.item?.action==='extension-power'||button.data.item?.action==='hire-camp'){
      const action=button.data.item.action,power=button.data.item.action_arg!;
      bindTowerPurchase(action==='extension-power'?'extension-'+power:'hire-camp',button,()=>action==='extension-power'?battle.buyExtensionPower(id,power):!!tower&&battle.hireElf(id),inside=>{
        button.views.find(v=>v.data.image_name===button.data.item!.halo)!.visible=inside;closeTooltip();if(!inside)return;
        const ability=tower?.extension?.powers[power],rank=ability?Math.min(ability.max,tower!.powerLevels![power]+1):0;
        tooltip=make('tooltipArcher');tooltip.views[0].setText(ability?ability.name+' '+rank:camp!.name);tooltip.views[1].setText(ability?ability.descriptions[rank-1]:tower?camp!.description:camp!.frozenDescription);tooltip.views.slice(2).forEach(v=>v.visible=false);const p=hudPoint(pad.position);tooltip.position.set(p.x-tooltip.data.size.x/2,p.y-tooltip.data.size.y-126);if(tooltip.y<tooltip.data.size.y/3)tooltip.y=p.y+76;tooltip.eventMode='none';hud.addChild(tooltip);audio!.play('mapHover');
      },action==='extension-power');
    }else if(button.data.item?.action==='advanced-power'){
      const power=button.data.item.action_arg as AdvancedPower;
      bindTowerPurchase('advanced-'+power,button,()=>battle.buyAdvancedPower(id,power),inside=>{button.views.find(v=>v.data.image_name===button.data.item!.halo)!.visible=inside;closeTooltip();if(!inside)return;
       const names={sniper:'狙击',shrapnel:'霰弹射击',disintegrate:'死亡射线',teleport:'传送',healing:'治愈之光',shield:'勇气之盾',holystrike:'神圣打击'},rank=Math.min(power==='shield'?1:3,tower![power]+1);
       const descriptions={sniper:`每14秒狙击，有${20*rank}%几率秒杀普通敌人，否则额外造成目标生命上限${20*rank}%的伤害。`,shrapnel:`每9秒向附近地面敌人发射6枚霰弹，每枚造成${10*rank}–${40*rank}点范围伤害。`,disintegrate:`每${22-2*rank}秒分解一名普通敌人，无法分解头目。`,teleport:`将最多${3+rank}名敌人传送回路径前方，每个敌人最多3次。`,healing:`圣骑士生命低于70%时恢复${40*rank}–${60*rank}点生命，冷却10秒。`,shield:'圣骑士的物理护甲提高15%。',holystrike:`近战有10%几率造成${25*rank}–${45*rank}点范围物理伤害。`};
       tooltip=make('tooltipArcher');tooltip.views[0].setText(names[power]+' '+rank);tooltip.views[1].setText(descriptions[power]);tooltip.views.slice(2).forEach(v=>v.visible=false);const p=hudPoint(pad.position);tooltip.position.set(p.x-tooltip.data.size.x/2,p.y-tooltip.data.size.y-126);if(tooltip.y<tooltip.data.size.y/3)tooltip.y=p.y+76;tooltip.eventMode='none';hud.addChild(tooltip);audio!.play('mapHover');});
    }else if(['repair-elf','hire-elf','ranger-power'].includes(button.data.item?.action??'')){
      const action=button.data.item!.action,power=button.data.item!.action_arg as 'poison'|'thorn';
      bindTowerPurchase(action==='ranger-power'?'ranger-'+power:action,button,()=>action==='repair-elf'?battle.repairElf(id):action==='hire-elf'?battle.hireElf(id):battle.buyRangerPower(id,power),inside=>{
        button.views.find(v=>v.data.image_name===button.data.item!.halo)!.visible=inside;closeTooltip();if(!inside)return;
        tooltip=make('tooltipArcher');const rank=tower&&action==='ranger-power'?Math.min(3,tower[power]+1):1;
        const title=action==='repair-elf'?'修复精灵小屋':action==='hire-elf'?'森林精灵':power==='poison'?`剧毒箭矢 ${rank}`:`森林之怒 ${rank}`;
        const desc=action==='repair-elf'?'修复废弃的小屋，招募森林精灵。':action==='hire-elf'?'招募一名森林精灵。最多4名，可近战和远程攻击。':power==='poison'?`使敌人中毒，在3秒内造成${15*rank}点伤害。`:`困住敌人并造成每秒40点伤害，持续${rank}秒。`;
        tooltip.views[0].setText(title);tooltip.views[1].setText(desc);tooltip.views.slice(2).forEach(v=>v.visible=false);
        const p=hudPoint(pad.position);tooltip.position.set(p.x-tooltip.data.size.x/2,p.y-tooltip.data.size.y-126);if(tooltip.y<tooltip.data.size.y/3)tooltip.y=p.y+76;tooltip.eventMode='none';hud.addChild(tooltip);audio!.play('mapHover');
      },action==='ranger-power');
    }else if (!tower) {
      const kind = kinds[i];
      bind('build-' + kind, button, () => { if (battle.build(id, kind)) closeSelection(); }, inside => {
        selection.preview = inside ? kind : null; button.views[0].visible = inside;
        closeTooltip();
        if (inside) {
          audio!.play('mapHover');tooltip = make('tooltip' + kind[0].toUpperCase() + kind.slice(1));
          tooltip.views[2].setText((kind==='barrack'?battle.stats.soldier.damage:battle.stats.towers[kind].damage).join('-'));
          if(kind==='barrack'){tooltip.views[3].setText(battle.stats.soldier.health);tooltip.views[4].setText(`${Math.round(battle.stats.soldier.armor*100)}%${battle.stats.soldier.armor===0?'无':'低'}`);}
          const p=hudPoint(pad.position),ex=Math.round(p.x),ey=Math.round(p.y);
          tooltip.position.set(ex-Math.floor(tooltip.data.size.x/2),ey-tooltip.data.size.y-126);
          if(tooltip.y<tooltip.data.size.y/3) tooltip.y=ey+76;
          tooltip.eventMode='none';hud.addChild(tooltip);
        }
      });
    } else if (button.data.item?.action === 'tw_sell') bind('sell', button, () => { battle.sell(id); closeSelection(); }, inside => {
      button.views[0].visible = inside;closeTooltip();
      if(inside){tooltip=new GameView(interactionScreens.sell,interactionTextures,HEIGHT/1080);tooltip.views[1].setText(`出售该防御塔并获得${battle.sellValue(tower)}金币。`);const p=hudPoint(pad.position);tooltip.position.set(Math.round(p.x-tooltip.data.size.x/2),Math.round(p.y+76));tooltip.eventMode='none';hud.addChild(tooltip);}
    });
    else if(button.data.item?.action==='tw_upgrade')bind(button.data.item.action_arg==='musketeer'?'upgrade-musketeer':content.extensions?.some(e=>e.id===button.data.item!.action_arg)?'upgrade-'+button.data.item.action_arg:'upgrade-tower',button,()=>{if(battle.upgrade(id,button.data.item!.action_arg===tower.kind?undefined:button.data.item!.action_arg))closeSelection();},inside=>{
      button.views[0].visible=inside;closeTooltip();
      if(inside){const kind=tower.kind;tooltip=make('tooltip'+kind[0].toUpperCase()+kind.slice(1));
        const next=battle.upgradeStats(tower,button.data.item!.action_arg),towerStats=button.data.item!.action_arg==='musketeer'?battle.musketeerStats:next.towers[kind];tooltip.views[0].setText(towerStats.name);tooltip.views[2].setText((kind==='barrack'?next.soldier.damage:towerStats.damage).join('-'));
        if(kind==='barrack'){tooltip.views[3].setText(next.soldier.health);tooltip.views[4].setText(`${Math.round(next.soldier.armor*100)}%低`);}
        const p=hudPoint(pad.position);tooltip.position.set(p.x-tooltip.data.size.x/2,p.y-tooltip.data.size.y-126);if(tooltip.y<tooltip.data.size.y/3)tooltip.y=p.y+76;
        tooltip.eventMode='none';hud.addChild(tooltip);audio!.play('mapHover');}
    });
    else if (button.data.item?.action === 'tw_rally') bind('rally', button, () => { closeSelection(); selection.pad = id; selection.power = 'rally'; }, inside => { button.views[0].visible = inside; });
  });
  updateMenu();
}
function selectedMenuPad(){return level.pads.find(p=>p.id===selection.pad)!.position;}
function updateMenu() {
  if (!menu) return;
  menuMotion!.update(presentationTime);
  const tower=battle.towers.find(t=>t.pad.id===selection.pad);
  const camp=battle.campFor(level.pads.find(p=>p.id===selection.pad)!);
  if(tower&&battle.isTowerBlocked(tower)){closeSelection();return;}
  if(camp||tower?.manual||level.pads.find(p=>p.id===selection.pad)!.special==='elf'||tower?.tier===4){
    for(const button of menu.views){const action=button.data.item?.action;
      if(action==='manual-upgrade'){const c=tower!.manual!,rank=tower!.manualState!.rank,disabled=!battle.canBuyManualPower(tower!);button.clickDisabled=disabled;button.views.find(v=>v.data.image_name===c.power.icon)!.setImage(disabled?c.power.disabledIcon:c.power.icon);const price=button.views.find(v=>v.data.image_name==='price_tag')!;price.setText(rank===c.power.max?'MAX':c.power.price[rank===0?0:1]);price.setImage(disabled?'price_tag_disabled':'price_tag');price.setTextColor(disabled?[156,146,132]:[255,224,0]);continue;}
      if(action==='manual-target'){button.clickDisabled=!battle.manualReady(tower!);button.alpha=button.clickDisabled?.5:1;continue;}
      if(action==='tw_rally'&&tower?.extension?.guardian){button.clickDisabled=tower.powerLevels![tower.extension.guardian.power]===0;continue;}
      if(action==='extension-power'){const power=button.data.item!.action_arg!,ability=tower!.extension!.powers[power];updatePowerButton(button,tower!.powerLevels![power],ability.max,battle.extensionPowerCost(tower!,power),battle.canBuyExtensionPower(tower!,power),ability.disabledIcon,presentationTime);continue;}
      if(action==='hire-camp'){
        const disabled=!tower||!battle.canHire(tower),image=button.data.item!.image;
        button.clickDisabled=disabled;button.views.find(v=>v.data.image_name===image)!.setImage(disabled?image+'_disabled':image);
        const price=button.views.find(v=>v.data.image_name==='price_tag')!;price.setText(tower?camp!.price:'');price.setImage(disabled?'price_tag_disabled':'price_tag');price.setTextColor(disabled?[156,146,132]:[255,224,0]);continue;
      }
      if(action==='advanced-power'){const power=button.data.item!.action_arg as AdvancedPower;updatePowerButton(button,tower![power],power==='shield'?1:3,battle.advancedPowerCost(tower!,power),battle.canBuyAdvancedPower(tower!,power),button.data.item!.image+'_disabled',presentationTime);continue;}
      if(action==='ranger-power'){const power=button.data.item!.action_arg as 'poison'|'thorn';updatePowerButton(button,tower![power],3,battle.rangerPowerCost(tower!,power),battle.canBuyRangerPower(tower!,power),button.data.item!.image+'_disabled',presentationTime);continue;}
      if(!['repair-elf','hire-elf'].includes(action??''))continue;
      const disabled=action==='repair-elf'?battle.gold<100:!battle.canHire(tower!);
      button.clickDisabled=disabled;const image=button.data.item!.image;button.views.find(v=>v.data.image_name===image)!.setImage(image+(disabled?'_disabled':''));
      const price=button.views.find(v=>v.data.image_name==='price_tag')!;price.setText(100);price.setImage(disabled?'price_tag_disabled':'price_tag');price.setTextColor(disabled?[156,146,132]:[255,224,0]);
    }return;
  }
  if(tower){
    for(const button of menu.views.filter(v=>v.data.item?.action==='tw_upgrade')){const disabled=!battle.canUpgrade(tower,button.data.item!.action_arg===tower.kind?undefined:button.data.item!.action_arg);button.clickDisabled=disabled;
      const image=button.data.item!.image;button.views.find(v=>v.data.image_name===image)!.setImage(image+(disabled?'_disabled':''));
      const price=button.views.find(v=>v.data.image_name==='price_tag')!;price.setText(battle.upgradeStats(tower,button.data.item!.action_arg).towers[tower.kind].cost);price.setImage(disabled?'price_tag_disabled':'price_tag');price.setTextColor(disabled?[156,146,132]:[255,224,0]);
    }return;
  }
  const kinds: TowerKind[] = ['archer','barrack','mage','artillery'];
  menu.views.forEach((button, i) => {
    const disabled = !battle.allowsTower(kinds[i]) || battle.gold < battle.stats.towers[kinds[i]].cost;
    button.clickDisabled = disabled;
    const image = button.views.find(v => v.data.image_name?.startsWith('g1_main_icons'))!;
    image.setImage(`g1_main_icons_000${i + 1}${disabled ? '_disabled' : ''}`);
    const price = button.views.find(v => v.data.image_name === 'price_tag')!;
    price.setImage(disabled ? 'price_tag_disabled' : 'price_tag');
    price.setText(battle.stats.towers[kinds[i]].cost);
    price.setTextColor(disabled ? [156,146,132] : [255,224,0]);
    button.views[0].visible = button.hovered;
  });
}
function showInvalidTarget(){if(presentationTime-invalidTargetAt>=.1)invalidTargetAt=presentationTime;}
function selectPower(power: Power) {
  if (battle.wave === 0 || battle.paused || battle.finished || battle.time < battle.powers[power]) return;
  const previous = selection.power; closeSelection(); selection.power = previous === power ? null : power;if(selection.power)audio!.play('spellSelect');
}
function selectHero() {
  if(!battle.heroEnabled||battle.paused||battle.finished||battle.hero.deadAt!==null)return;
  const selected=selection.power==='hero';closeSelection();if(!selected)selection.power='hero';
}
bind('hero',heroPortrait,selectHero);
const powerViews = bottom.all().filter(v => ['class Power1Button','class Power2Button'].includes(v.data.class));
const powerStates=Array.from({length:3},()=>({mode:'locked',at:0,previous:0}));
const power3=new GameView(feedbackData.power3 as unknown as ViewData,uiTextures,HEIGHT/1080);
powerViews[0].parent!.addChild(power3);powerViews.push(power3);
const key3Data=structuredClone(bottom.all().find(v=>v.data.image_name==='power_nbrs_0002')!.data);key3Data.image_name='power_nbrs_0003';key3Data.pos.x+=63;
power3.parent!.addChild(new GameView(key3Data,uiTextures,HEIGHT/1080));
for (const [i, power] of (['fire','reinforcements','lightning'] as Power[]).entries()) bind('power-' + power, powerViews[i], () => selectPower(power));
const rewards=new WaveRewards(feedbackTextures);hud.addChild(rewards.view);
function sendWave(){const cooldowns=Object.values(battle.powers).map(t=>t>battle.time),reward=battle.earlyReward,point=hudPoint(selection.pointer);closeSelection();if(battle.sendWave()&&reward>0){rewards.show(reward,point,presentationTime);audio!.play('coins');if(reward>1)powerViews.forEach((v,i)=>{if(cooldowns[[1,0,2][i]]){const p=hud.toLocal(v.toGlobal({x:v.data.size.x/2,y:0}));rewards.showTime(reward,p,presentationTime);}});}}
bind('wave', bottom.all().find(v => v.data.class === 'class NextWaveButton')!, sendWave);
bind('wave-flag', flag, sendWave, inside => wavePresentation.hover(inside,presentationTime));
const wavePresentation=new WavePresentation(flag,incoming,scene.world,feedbackTextures.get('waveflag_path_arrow')!);
const waveUis=[{flag,tip:incoming,presentation:wavePresentation}];
function configureWaveFlags(){
  while(waveUis.length>1){const entry=waveUis.pop()!;actions.delete('wave-flag-'+waveUis.length);entry.presentation.destroy();entry.flag.destroy();entry.tip.destroy();}
  content.waveFlags.forEach((entry,i)=>{
    if(i>0){const flag=make('waveFlag'),tip=new GameView(interactionScreens.incoming,interactionTextures,HEIGHT/1080);tip.visible=false;tip.eventMode='none';hud.addChild(flag,tip);const presentation=new WavePresentation(flag,tip,scene.world,feedbackTextures.get('waveflag_path_arrow')!);waveUis.push({flag,tip,presentation});bind('wave-flag-'+i,flag,sendWave,inside=>presentation.hover(inside,presentationTime));}
    waveUis[i].presentation.route=entry.path;waveUis[i].presentation.reset();
  });
}
function showLevelTutorial(){
 if(selectedMode!=='campaign'||notifications.visible)return;
 const tutorial=content.tutorials.find(t=>t.wave===battle.wave&&!tutorialShown.has(t.id));
 if(tutorial){tutorialShown.add(tutorial.id);recordSeen(tutorial.id);if(tutorial.icon)notifications.add(tutorial.id);else notifications.show(tutorial.id,tutorial.view,tutorial.pages);}
}
bind('speed',speedButton.views[0],()=>{
  gameSpeed=gameSpeed===4?1:gameSpeed*2;
  speedButton.views[0].setText(gameSpeed+'×');
  audio!.play('button');
},inside=>speedButton.views[0].setTextColor(inside?[255,224,115]:[255,255,255]));
bind('pause', pauseButton.views[0], togglePause);
const pauseButtons = pause.views.filter(v => v.data.class === 'class GGOptionsButton' && v.visible);
bind('home', pauseButtons[0], ()=>void returnToMap()); bind('restart', pauseButtons[1], () => void startBattle()); bind('resume', pauseButtons[2], togglePause);
const sliders = [...pause.views.filter(v => v.data.class === 'class VolumeSlider'), ...mapOptions.all().filter(v=>v.data.class === 'class VolumeSlider')];
sliders.forEach((slider, index) => {
  const initial=volumes[index%2===0?'sfx':'music'];slider.views[0].scale.x=initial;slider.views[1].x=slider.views[0].x+slider.views[0].data.size.x*initial;
  slider.eventMode = 'static';
  const set = (global: {x:number;y:number}) => {
    const value = Math.max(0, Math.min(1, (slider.toLocal(global).x - slider.views[0].x) / slider.views[0].data.size.x));
    const kind=index%2===0?'sfx':'music'; volumes[kind]=value;
    sliders.forEach((v,j)=>{if(j%2===index%2){v.views[0].scale.x=value;v.views[1].x=v.views[0].x+v.views[0].data.size.x*value;}});
    if (audio) audio.setVolume(kind, value);
  };
  let dragging = false;
  const knob=slider.views[1];
  bind(`${index<2?'pause':'settings'}-${index%2===0?'sfx':'music'}-volume`,knob,()=>{});
  knob.on('pointerdown', e => { dragging = true; set(e.global); });
  slider.on('globalpointermove', e => { if (dragging) set(e.global); });
  slider.on('pointerup', () => { dragging = false; }); slider.on('pointerupoutside', () => { dragging = false; });
});
for (const view of victory.all().filter(v => v.data.class === 'class GGBorderButton')) {
  const restart = view.views[0].data.text === '重新开始';
  bind(restart ? 'victory-restart' : 'continue', view, restart ? () => void startBattle() : ()=>void returnToMap());
}
for (const view of defeat.views.filter(v => v.data.class === 'class GGOptionsButton')) {
  const restart = view.views[0].data.text === '重新开始';
  bind(restart ? 'retry' : 'defeat-home', view, restart ? () => void startBattle() : ()=>void returnToMap());
}
const flagTemplate=map.all().find(v=>v.data.class==='class LevelFlagView')!;
const flagData=structuredClone(flagTemplate.data);
mapTextures.set('map_flag_0181',interactionTextures.get('map_flag_0181')!);
const flags=Object.values(LEVELS).map((entry,index)=>{
 const view=index===0?flagTemplate:new GameView({...structuredClone(flagData),pos:entry.mapPosition},mapTextures,1);
 if(index>0)flagTemplate.parent!.addChild(view);
 const animation=new MapLevelFlag(entry.id,view,mapTextures,()=>audio!.play('winStar'));
 view.views[0].hitArea=new Rectangle(20,34,44,74);
 bind(index===0?'southport':`level-${entry.id}`,view.views[0],()=>{
  selectedLevel=entry;mapSound('button');levelTip.visible=false;bookTooltip.visible=false;
  updateBook();selectMode('campaign');bookPopup.show(presentationTime);
 },inside=>{levelTip.visible=inside;hoverFlag=view;animation.hover(inside,presentationTime);if(inside){levelTip.views[0].setText(`${entry.id}. ${entry.name}`);mapSound('mapHover');}});
 return animation;
});
const endlessFlag=new GameView(endlessMap.flag as unknown as ViewData,mapTextures,1);flagTemplate.parent!.addChild(endlessFlag);
bind('endless-level',endlessFlag,()=>{selectedLevel=endlessCatalog;selectedMode='campaign';mapSound('button');levelTip.visible=false;bookTooltip.visible=false;updateEndlessBook();endlessPopup.show(presentationTime);},inside=>{levelTip.visible=inside;hoverFlag=endlessFlag;if(inside){levelTip.views[0].setText('无尽 · '+endlessCatalog.name);mapSound('mapHover');}});
function updateEndlessBook(){const record=loadEndlessRecord(endlessCatalog.id,difficulty);for(const [id,value]of [['99262',record.wave],['99265',record.score]] as const){const v=endlessBook.all().find(v=>v.data.id===id)!;delete v.data.source_lines;v.setText(String(value));}}
bind('endless-close',endlessBook.all().find(v=>v.data.id==='99254')!,()=>{mapSound('button');endlessPopup.hide(presentationTime);});
bind('endless-start',endlessBook.all().find(v=>v.data.id==='99285')!,()=>{mapSound('button');void startBattle();});
bind('endless-difficulty',endlessBook.all().find(v=>v.data.id==='99283')!,()=>{difficulty=nextDifficulty(difficulty);saveDifficulty(difficulty);updateDifficulty();mapSound('button');});
let hoverFlag=flagTemplate;
const originalBookText=new Map(book.all().filter(v=>Boolean(v.data.text)).map(v=>[v.data.id,{text:v.data.text,lines:v.data.source_lines}]));
function updateBook(){
 for(const view of book.all()){
  const original=originalBookText.get(view.data.id);
  if(original){view.data.source_lines=original.lines;view.setText(original.text!);}
 }
 const text=(id:string,value:string)=>{const v=book.all().find(v=>v.data.id===id)!;delete v.data.source_lines;v.setText(value);};
 text('99880',`1-${selectedLevel.id}`);text('99883',selectedLevel.name);
 book.all().find(v=>v.data.image_name?.startsWith('stage_thumbs'))!.setImage(selectedLevel.thumbnail);
 if(selectedLevel.history){
  const chars=[...selectedLevel.history.replaceAll('\n','')];
  text('99898',chars[0]);text('99899',chars.slice(1,34).join(''));text('99900',chars.slice(34).join(''));
 }
 for(const id of ['99922','99947'])text(id,`提升等级\n${selectedLevel.upgradeCap.heroic}`);
 for(const [mode,label,icon] of [['heroic','99924','99923'],['iron','99949','99948']] as const){const enabled=!!selectedLevel.heroModes?.[mode];text(label,enabled?'英雄':'无英雄');book.all().find(v=>v.data.id===icon)!.setImage(enabled?'levelSelect_modeRules_0011':'levelSelect_modeRules_00009');}
 selectedLevel.ironRuleIcons.forEach((icon,i)=>book.all().find(v=>v.data.id===String(99950+i))!.setImage('levelSelect_modeRules_'+icon));
 updateBookBadges();
}
bind('map-settings',map.all().find(v=>v.data.image_name==='map_configBtn_0001')!,()=>{mapSound('button');mapOptionsPopup.show(presentationTime);});
bind('map-settings-close',mapOptions.all().find(v=>v.data.class==='class GGOptionsButton')!,()=>{mapSound('button');mapOptionsPopup.hide(presentationTime);saveVolumes(volumes);});
mapOptions.eventMode='static';mapOptions.hitArea=new Rectangle(0,0,1920,1080);mapOptions.on('pointertap',e=>e.stopPropagation());
bind('book-close', book.all().find(v => v.data.image_name === 'levelSelect_closeBtn_0001')!, () => { mapSound('button');bookTooltip.visible=false;bookPopup.hide(presentationTime); });
const bookPages=book.views[0].views.filter(v=>v.data.class==='class KView');
const modeNames:GameMode[]=['campaign','heroic','iron'];
bookPages.forEach((page,i)=>bind(i===0?'start':'start-'+modeNames[i],page.all().find(v=>v.data.default_image_name?.startsWith('levelSelect_startMode_notxt'))!,()=>{mapSound('button');void startBattle();}));
const difficultyButton = book.all().find(v=>v.data.class==='class LevelSelectDifficultyButton')!;
function updateDifficulty() {
  const base=`levelSelect_difficulty_${String(difficulty*2-1).padStart(4,'0')}`,over=`levelSelect_difficulty_${String(difficulty*2).padStart(4,'0')}`;
  for(const button of [...book.all(),...endlessBook.all()].filter(v=>v.data.class==='class LevelSelectDifficultyButton')){button.data.default_image_name=base;button.data.hover_image_name=over;button.data.click_image_name=over;button.setImage(button.hovered?over:base);}
  updateEndlessBook();
  mapOptions.all().find(v=>v.data.class==='class GGLabel'&&v.data.pos.y===347)!.setText(['','休闲','普通','老兵','不可能'][difficulty]);
}
book.all().filter(v=>v.data.class==='class LevelSelectDifficultyButton').forEach((button,i)=>bind(i===0?'difficulty':'difficulty-'+modeNames[i],button,()=>{difficulty=nextDifficulty(difficulty);saveDifficulty(difficulty);updateDifficulty();mapSound('button');}));
const optionsDifficulty = mapOptions.all().find(v=>v.data.class==='class GGLabel'&&v.data.pos.y===347)!;
bind('settings-difficulty', optionsDifficulty,()=>{mapOptionsPopup.hide(presentationTime);saveVolumes(volumes);difficultyPopup.show(presentationTime);},inside=>optionsDifficulty.setTextColor(inside?[255,223,0]:[214,189,131]));
difficultyView.all().filter(v=>v.data.class==='class DifficultyButton').forEach((v,i)=>{
  bind('difficulty-choice-'+(i+1),v,()=>{difficulty=(i+1) as typeof difficulty;saveDifficulty(difficulty);updateDifficulty();difficultyPopup.hide(presentationTime);mapSound('button');},inside=>{v.views[1].visible=inside;});
  v.on('pointerdown',()=>v.scale.set(.98));
  for(const event of ['pointerup','pointerupoutside','pointerout'])v.on(event,()=>v.scale.set(1));
});
updateDifficulty();
function positionBookTip(point:{x:number;y:number}){const p=scene.ui.toLocal(point),v=scene.layout.viewport;bookTooltip.position.set(Math.max(12,Math.min(v.width-tipData.size.x-12,p.x-tipData.size.x-22)),Math.max(12,Math.min(v.height-tipData.size.y-12,p.y-tipData.size.y-16)));}
function selectMode(mode:GameMode){
  selectedMode=mode;bookTooltip.visible=false;const unlocked=loadLevelProgress(selectedLevel.id).stars>=3;
  bookPages.forEach((page,i)=>page.visible=modeNames[i]===mode);
  for(let i=0;i<3;i++){
    const tab=modeTabs[i],selected=modeNames[i]===mode;
    tab.visible=!selected;modeSelectedTabs[i].visible=selected;
    if(i>0){const base=unlocked?1+i*4:i*4;tab.data.default_image_name=`levelSelect_Mode_notxt_${String(base).padStart(4,'0')}`;tab.data.hover_image_name=`levelSelect_Mode_notxt_${String(unlocked?base+1:base).padStart(4,'0')}`;tab.clickDisabled=!unlocked;tab.setImage(tab.data.default_image_name);}
  }
}
const modeTabs=book.views[0].views.filter(v=>v.data.class==='class KImageButton'&&v.data.image_name?.startsWith('levelSelect_Mode'));
const modeSelectedTabs=book.views[0].views.filter(v=>v.data.class==='class KImageView'&&v.data.image_name?.startsWith('levelSelect_Mode'));
modeTabs.forEach((tab,i)=>{
  bind('mode-'+modeNames[i],tab,()=>{mapSound('button');selectMode(modeNames[i]);},inside=>{
    bookTooltip.visible=inside&&i>0&&loadLevelProgress(selectedLevel.id).stars<3;
    if(bookTooltip.visible){const title=i===1?'英雄挑战':'钢铁挑战';bookTooltip.views[0].data.source_lines=[title];bookTooltip.views[0].setText(title);positionBookTip(tab.toGlobal({x:0,y:0}));}
  });tab.on('pointermove',e=>{if(bookTooltip.visible)positionBookTip(e.global);});
});
selectMode('campaign');
book.eventMode = 'static'; book.hitArea = new Rectangle(0, 0, 1920, 1080); book.on('pointertap', e => e.stopPropagation());
const heroRoomButton=map.all().find(v=>v.data.image_name==='mapButtons-notxt_0001')!;
heroRoomButton.disabled=false;
const mapHeroPortrait=heroRoomButton.all().find(v=>v.data.image_name==='mapButtons_portrait_hero_0001')!;
for(const [key,value] of heroTextures)if(key.startsWith('mapButtons_portrait_hero_'))mapTextures.set(key,value);
function refreshHeroPortraits(){
  const hero=HEROES.find(h=>h.id===loadSelectedHero())!;
  mapHeroPortrait.setImage('mapButtons_portrait_hero_'+String(hero.portrait).padStart(4,'0'));
  heroPortrait.views[0].setImage(hero.hudPortrait);
  heroInfo.views[0].setImage(hero.infoPortrait);delete heroInfo.views[1].data.source_lines;heroInfo.views[1].setText(hero.name);
}
refreshHeroPortraits();
bind('hero-room',heroRoomButton,async()=>{mapSound('button');await heroes.load();heroes.show();heroRoomPopup.show(presentationTime);});
let progression:ProgressionMenus|null=null,progressionLoad:Promise<void>|undefined;
function ensureProgression(){return progressionLoad ??= (async()=>{
  const [textures]=await Promise.all([atlasTextures('/assets/kr1/progression/atlas.png',progressionData.frames),audio!.load({upgrade:'/assets/kr1/progression/upgrade.ogg',achievement:'/assets/kr1/progression/achievement.ogg'})]);
  for(const [name,texture] of textures)uiTextures.set(name,texture);
  progression=new ProgressionMenus(textures,()=>presentationTime,key=>audio!.play(key),bind);
  mapLayer.addChild(progression.upgrades,progression.achievements);scene.ui.addChild(progression.banner);
  layoutMapPanel(progression.upgrades);layoutMapPanel(progression.achievements);layoutBanner();
})();}
const achievementTracker=new Achievements(id=>progression!.notify(id));let earlyCalls=0;
for(const [name,image,show] of [['upgrades','mapButtons-notxt_0010',()=>progression!.showUpgrades()],['achievements','mapButtons-notxt_0004',()=>progression!.showAchievements()]] as const){
 const button=map.all().find(v=>v.data.image_name===image)!;button.disabled=false;
 bind(name,button,()=>{mapSound('button');if(progression){show();return;}void loading.transition('正在加载'+(name==='upgrades'?'升级':'成就')+'…',ensureProgression).then(show);});
}
let encyclopediaLoad:Promise<void>|undefined;
function ensureEncyclopedia(){return encyclopediaLoad ??= (async()=>{
 const catalogData=await resources.json<ConstructorParameters<typeof Encyclopedia>[0]&{frames:Parameters<typeof atlasTextures>[1]}>('/assets/kr1/encyclopedia/content.json');
 const [catalogTextures]=await Promise.all([atlasTextures('/assets/kr1/encyclopedia/atlas.png',catalogData.frames),audio!.load({paper:'/assets/kr1/encyclopedia/page.ogg'})]);
 encyclopedia=new Encyclopedia(catalogData,catalogTextures,name=>{if(name==='button')mapSound('button');else audio!.play('paper');},()=>presentationTime,bind);
 mapLayer.addChild(encyclopedia.view);
 layoutMapPanel(encyclopedia.view);
})();}
mapLayer.addChild(bookTooltip);
const encyclopediaButton=map.all().find(v=>v.data.image_name==='mapButtons-notxt_0007')!;
encyclopediaButton.disabled=false;
bind('encyclopedia',encyclopediaButton,()=>{mapSound('button');if(encyclopedia){encyclopedia.show();return;}void loading.transition('正在加载百科全书…',ensureEncyclopedia).then(()=>encyclopedia!.show());});
const mapAmbient=new MapAmbient(map);
function updateBookBadges(){
 const stars=loadLevelProgress(selectedLevel.id).stars,challenges=loadChallenges(selectedLevel.id);
 updateCampaignBadges(book,stars);
 book.all().find(v=>v.data.image_name==='levelSelect_badges_0004')!.setImage(challenges.heroic?'levelSelect_badges_0003':'levelSelect_badges_0004');
 book.all().find(v=>v.data.image_name==='levelSelect_badges_0006')!.setImage(challenges.iron?'levelSelect_badges_0005':'levelSelect_badges_0006');
}
function updateStars(){
 endlessFlag.visible=allLevelsUnlocked()||loadLevelProgress(endlessCatalog.unlockAfter).stars>0;updateEndlessBook();
 for(const flag of flags)flag.refresh(presentationTime);updateBookBadges();
 const banner=map.all().find(v=>v.data.class==='class StarsBanner')!;
 updateStarsBanner(banner,totalStars(),Object.keys(LEVELS).length*5);
}
const displayData=structuredClone(source.mapOptions);
const displayBack=displayData.children[0],displayButtonData=structuredClone(displayBack.children.find(v=>v.class==='class GGOptionsButton')!);
displayBack.children=[displayBack.children[0]];displayBack.children[0].text='显示设置';delete displayBack.children[0].source_lines;
const displayView=new GameView(displayData,mapTextures,1),displayPopup=new MapPopup(displayView);
scene.ui.addChild(displayView);displayView.eventMode='static';displayView.hitArea=new Rectangle(0,0,1920,1080);displayView.on('pointertap',e=>e.stopPropagation());
for(const [x,title] of [[200,'渲染分辨率'],[520,'显示模式']] as const){
  const data=structuredClone(displayBack.children[0]);data.pos={x,y:87};data.size=data.text_size={x:280,y:32};data.anchor={x:140,y:0};data.text=title;data.font_size=22;data.colors.text=[214,189,131];delete data._fitted_font_size;
  displayView.views[0].addChild(new GameView(data,mapTextures,1));
}
const resolutionButtons:GameView[]=[];
RESOLUTIONS.forEach((value,index)=>{
  const data=structuredClone(displayButtonData);data.pos={x:200,y:164+index*58};data.anchor.x=data.size.x/2;
  data.children[0].text=RESOLUTION_LABELS[value];delete data.children[0].source_lines;
  const view=new GameView(data,mapTextures,1);displayView.views[0].addChild(view);resolutionButtons.push(view);
  bind('resolution-'+value,view,()=>{scene.setResolution(value);updateResolution();mapSound('button');});
});
const modeButtons:GameView[]=[];
DISPLAY_MODES.forEach((value,index)=>{
  const data=structuredClone(displayButtonData);data.pos={x:520,y:164+index*58};data.anchor.x=data.size.x/2;
  data.children[0].text=DISPLAY_MODE_LABELS[value];delete data.children[0].source_lines;
  const view=new GameView(data,mapTextures,1);displayView.views[0].addChild(view);modeButtons.push(view);
  bind('display-mode-'+value,view,()=>{scene.setDisplayMode(value);updateResolution();mapSound('button');});
});
function updateResolution(){resolutionButtons.forEach((v,i)=>v.views[0].setTextColor(RESOLUTIONS[i]===scene.resolution?[255,223,0]:[255,255,204]));modeButtons.forEach((v,i)=>v.views[0].setTextColor(DISPLAY_MODES[i]===scene.displayMode?[255,223,0]:[255,255,204]));}
const displayReturnData=structuredClone(displayButtonData);displayReturnData.pos={x:360,y:482};displayReturnData.anchor.x=displayReturnData.size.x/2;
const displayReturn=new GameView(displayReturnData,mapTextures,1);displayView.views[0].addChild(displayReturn);
bind('display-close',displayReturn,()=>{mapSound('button');displayPopup.hide(presentationTime);});
const performanceToggleData=structuredClone(displayButtonData);performanceToggleData.pos={x:520,y:365};performanceToggleData.anchor.x=performanceToggleData.size.x/2;
delete performanceToggleData.children[0].source_lines;
const performanceToggle=new GameView(performanceToggleData,mapTextures,1);displayView.views[0].addChild(performanceToggle);
function updatePerformanceToggle(){performanceToggle.views[0].setText(`性能栏：${performanceHud.visible?'开':'关'}`);}
function togglePerformanceHud(){performanceHud.visible=!performanceHud.visible;savePerformanceHud(performanceHud.visible);updatePerformanceToggle();}
bind('performance-toggle',performanceToggle,()=>{togglePerformanceHud();mapSound('button');});updatePerformanceToggle();
function returnToTitle(){saveVolumes(volumes);location.reload();}
for(const view of mapOptions.all())if(view.data.pos.y===309||view.data.pos.y===347)view.y-=28;
const mapDisplayData=structuredClone(displayButtonData);mapDisplayData.pos={x:458,y:408};mapDisplayData.children[0].text='显示';
const mapDisplay=new GameView(mapDisplayData,mapTextures,1);mapOptions.views[0].addChild(mapDisplay);
bind('settings-display',mapDisplay,()=>{updateResolution();displayPopup.show(presentationTime);mapSound('button');});
const mapPwaData=structuredClone(displayButtonData);mapPwaData.pos={x:678,y:408};mapPwaData.children[0].text='安装 / 离线';
const mapPwa=new GameView(mapPwaData,mapTextures,1);mapOptions.views[0].addChild(mapPwa);
mapOptions.all().find(v=>v.data.class==='class GGOptionsButton')!.position.set(570,490);
bind('settings-pwa',mapPwa,()=>{showPwa();mapSound('button');});
const mapTitleData=structuredClone(displayButtonData);mapTitleData.pos={x:344,y:490};mapTitleData.children[0].text='返回存档';
const mapTitle=new GameView(mapTitleData,mapTextures,1);mapOptions.views[0].addChild(mapTitle);
bind('settings-title',mapTitle,returnToTitle);
const unlockData=structuredClone(displayButtonData);unlockData.pos={x:238,y:408};
const unlockButton=new GameView(unlockData,mapTextures,1);mapOptions.views[0].addChild(unlockButton);
function updateUnlockButton(){unlockButton.views[0].setText(allLevelsUnlocked()?'已全部解锁':'解锁全部关卡');}
bind('settings-unlock-levels',unlockButton,()=>{unlockAllLevels();updateUnlockButton();updateStars();mapSound('button');});updateUnlockButton();

const pauseDisplayData=structuredClone(pauseButtons[0].data);pauseDisplayData.pos={x:181,y:282};pauseDisplayData.children[0].text='显示';
const pauseDisplay=new GameView(pauseDisplayData,uiTextures,HEIGHT/1080);pause.addChild(pauseDisplay);
bind('pause-display',pauseDisplay,()=>{updateResolution();displayPopup.show(presentationTime);});
const pauseTitleData=structuredClone(pauseDisplayData);pauseTitleData.pos.x=331;pauseTitleData.children[0].text='返回存档';
const pauseTitle=new GameView(pauseTitleData,uiTextures,HEIGHT/1080);pause.addChild(pauseTitle);
bind('pause-title',pauseTitle,returnToTitle);
updateResolution();

// Screen-space layout: anchors and popup centering never use camera zoom or render quality.
function layoutMapPanel(view:GameView){
  const {width,height}=scene.layout.viewport,dx=(width-1920)/2,dy=(height-1080)/2;
  view.position.set(dx,dy);view.hitArea=new Rectangle(-dx,-dy,width,height);
  const c=view.data.colors.background!;
  view.background!.clear().rect(-dx,-dy,width,height).fill(c[0]*65536+c[1]*256+c[2]);
}
function layoutBanner(){if(progression)progression.banner.x=scene.layout.viewport.width/2;}
function layoutHud(){
  const {width,height}=scene.layout.viewport,dx=width-1920,dy=height-1080;
  mapCamera.configure(scene.layout.viewport,WORLD_MAP_BOUNDS,scene.displayMode);
  for(const view of map.views){
    if(view===mapWorld)continue;
    if(view.data.class==='class GGButton')view.position.set(view.data.pos.x+dx,view.data.pos.y+dy);
    if(view.data.class==='class StarsBanner')view.x=view.data.pos.x+dx;
    if(view.data.image_name==='map_vignette_small')view.scale.set(view.data.scale.x*width/1920,view.data.scale.y*height/1080);
  }
  for(const view of [book,endlessBook,mapOptions,difficultyView,heroRoom,displayView])layoutMapPanel(view);
  if(encyclopedia)layoutMapPanel(encyclopedia.view);
  if(progression){layoutMapPanel(progression.upgrades);layoutMapPanel(progression.achievements);layoutBanner();}
  pauseButton.x=pauseButton.data.pos.x+dx*HEIGHT/1080;
  speedButton.x=speedButton.data.pos.x+dx*HEIGHT/1080;
  bottom.y=dy*HEIGHT/1080;
  bottom.views[0].scale.x=width/1920;
  bottom.views[1].x=bottom.views[1].data.pos.x+dx*HEIGHT/1080;
  for(const view of bottom.children)if(view instanceof GameView&&!bottom.views.includes(view)&&view!==heroBar)view.x=view.data.pos.x+dx/2*HEIGHT/1080;
  modal.position.set(dx/2,dy/2);
  shade.clear().rect(-dx/2*HEIGHT/1080,-dy/2*HEIGHT/1080,width*HEIGHT/1080,height*HEIGHT/1080).fill({color:0,alpha:120/255});
  notifications.setViewport(width*HEIGHT/1080,height*HEIGHT/1080);
}

function hudPoint(point:{x:number;y:number}){return hud.toLocal(scene.uiPoint(point));}
function moveHud(view:Container,point:{x:number;y:number}){const p=hudPoint(point);view.position.set(p.x,p.y);}
const canvas=scene.app.canvas;
const eventPoint=(e:PointerEvent|WheelEvent)=>scene.screenPoint(e);
const pointers=new Map<number,{x:number;y:number}>();
let drag:{start:{x:number;y:number};previous:{x:number;y:number};moved:boolean;unit:ReturnType<typeof pickAt>;towerId:string|null}|null=null;
let pinch:{distance:number;center:{x:number;y:number}}|null=null;
const dragLine=new Container();dragLine.eventMode='none';hud.addChild(dragLine);
const dragMarkers:Sprite[]=[];
function clearDragLine(){dragLine.visible=false;}
function cancelDrag(){drag=null;pointers.clear();pinch=null;clearDragLine();}
function draggedUnit(){return drag?.unit?.type==='hero'?battle.hero:battle.soldiers.find(s=>s.id===drag?.unit?.id);}
function updateDragLine(){
 if(!drag?.moved||!drag.unit)return;
 if(drag.towerId){
   // ORIGINAL: the tower owns the rally even if the grabbed soldier dies.
   const squad=battle.soldiers.filter(s=>s.towerId===drag!.towerId&&s.deadAt===null);
   if(squad.length){const from=hudPoint({x:squad.reduce((n,s)=>n+s.x,0)/squad.length,y:squad.reduce((n,s)=>n+s.y,0)/squad.length});drawDragLine(from,hudPoint(scene.worldPoint(drag.previous)));}else clearDragLine();
 }else{const unit=draggedUnit();if(!unit||unit.deadAt!==null){cancelDrag();return;}drawDragLine(hudPoint(unit),hudPoint(scene.worldPoint(drag.previous)));}
}
function drawDragLine(from:{x:number;y:number},to:{x:number;y:number}){
 const distance=Math.hypot(to.x-from.x,to.y-from.y),count=Math.floor(distance/(15*scene.camera.scale));dragLine.visible=true;
 for(let i=0;i<count;i++){if(!dragMarkers[i]){const sprite=new Sprite(feedbackTextures.get('unit_drag_discontinue_line')!);sprite.anchor.set(.5);dragLine.addChild(sprite);dragMarkers.push(sprite);}const s=dragMarkers[i],t=(i+1)*15*scene.camera.scale/distance;s.position.set(from.x+(to.x-from.x)*t,from.y+(to.y-from.y)*t);s.rotation=Math.atan2(to.y-from.y,to.x-from.x);s.scale.set(HEIGHT/1080*scene.camera.scale);s.visible=true;}
 for(let i=count;i<dragMarkers.length;i++)dragMarkers[i].visible=false;
}
function activeCamera(){return screen==='map'?mapCamera:scene.camera;}
function cameraAllowed(point:{x:number;y:number}){
  if(!activeCamera().contains(point)||displayView.visible||!document.querySelector<HTMLElement>('#loading')!.hidden)return false;
  if(screen==='map')return !book.visible&&!endlessBook.visible&&!mapOptions.visible&&!heroRoom.visible&&!difficultyView.visible&&!encyclopedia?.view.visible&&!progression?.upgrades.visible&&!progression?.achievements.visible;
  return !battle.paused&&!battle.finished&&!selection.power&&!menu&&point.y>scene.layout.viewport.y+90&&point.y<scene.layout.viewport.y+scene.layout.viewport.height-140;
}
function pinchState(){const [a,b]=[...pointers.values()];return {distance:Math.hypot(a.x-b.x,a.y-b.y),center:{x:(a.x+b.x)/2,y:(a.y+b.y)/2}};}
scene.app.stage.on('pointerdown',e=>{
  if(e.button!==0||!cameraAllowed(e.global))return;
  const point={x:e.global.x,y:e.global.y};pointers.set(e.pointerId,point);
  if(pointers.size===2){pinch=pinchState();drag=null;closeSelection();return;}
  const hit=screen==='battle'?pickAt(battle,scene.worldPoint(point)):null;
  drag={start:point,previous:point,moved:false,unit:hit?.type==='hero'||hit?.type==='soldier'?hit:null,towerId:hit?.type==='soldier'?battle.soldiers.find(s=>s.id===hit.id)!.towerId:null};
});
canvas.addEventListener('pointerdown',e=>{if(screen==='battle')selection.pointer=scene.point(e);},{capture:true});
canvas.addEventListener('wheel',e=>{
  const point=eventPoint(e);if(!cameraAllowed(point))return;e.preventDefault();closeSelection();levelTip.visible=false;
  activeCamera().zoomAt(Math.exp(-e.deltaY*.0015),point);selection.pointer=scene.worldPoint(point);
},{passive:false});
canvas.addEventListener('pointermove',e=>{
  const point=eventPoint(e);if(pointers.has(e.pointerId))pointers.set(e.pointerId,point);
  if(pinch&&pointers.size===2){const next=pinchState();activeCamera().zoomAt(next.distance/pinch.distance,pinch.center,next.center);pinch=next;return;}
  if(!drag)return;
  if(!drag.moved&&Math.hypot(point.x-drag.start.x,point.y-drag.start.y)>(drag.unit?25*1080/HEIGHT*scene.camera.scale:10)){drag.moved=true;closeSelection();}
  if(drag.moved){
    if(!drag.unit)activeCamera().pan(point.x-drag.previous.x,point.y-drag.previous.y);
  }
  drag.previous=point;selection.pointer=scene.worldPoint(point);
  updateDragLine();
});
window.addEventListener('pointerup',e=>{
  if(drag?.moved&&drag.unit&&(drag.towerId||draggedUnit()?.deadAt===null)){
    const point=scene.worldPoint(eventPoint(e)),isHero=drag.unit.type==='hero';
    const success=drag.towerId?battle.rally(drag.towerId,point):isHero?battle.moveHero(point):battle.moveSoldier(drag.unit.id as number,point);
    if(success){
      const soldier=isHero?null:battle.soldiers.find(s=>s.id===drag!.unit!.id)!;
      if(drag.towerId){rallyConfirmedAt=presentationTime;rallyConfirmWorld={...battle.towers.find(t=>t.pad.id===drag!.towerId)!.rallyPoint};}
      else {moveConfirmedAt=presentationTime;moveConfirmWorld={...(isHero?battle.hero.home:soldier!.center)};}
    }else showInvalidTarget();
  }
  pointers.delete(e.pointerId);pinch=null;drag=null;clearDragLine();
},{capture:true});
canvas.addEventListener('pointercancel',()=>{pointers.clear();pinch=null;drag=null;clearDragLine();});
scene.app.stage.eventMode = 'static';
scene.app.stage.on('pointerdown', e => {
  if (e.button!==0||pointers.size>1|| screen !== 'battle' || battle.paused || battle.finished || modal.visible||!scene.camera.contains(e.global)) return;
  const point = scene.worldPoint(e.global);
  if (selection.power) {
    const hit=selection.power==='manual'?pickAt(battle,point,'enemy'):null;
    const done = selection.power==='manual'?(hit?.type==='enemy'&&battle.fireManual(battle.towers.find(t=>t.pad.id===selection.pad)!,battle.enemies.find(e=>e.id===hit.id)!)):selection.power === 'hero' ? battle.moveHero(point) : selection.power === 'rally' ? battle.rally(selection.pad!, point) : battle.cast(selection.power, point);
    if(done&&selection.power==='hero'){moveConfirmedAt=presentationTime;moveConfirmWorld={...battle.hero.home};moveHud(moveConfirm,moveConfirmWorld);}
    if(done&&selection.power==='rally'){rallyConfirmedAt=presentationTime;rallyConfirmWorld={...battle.towers.find(t=>t.pad.id===selection.pad)!.rallyPoint};}
    if (done) closeSelection(); else showInvalidTarget();
  } else {
    const hit=pickAt(battle,point);
    if(hit?.type==='hero'){selectHero();return;}
    if(hit?.type==='pad'){const tower=battle.towers.find(t=>t.pad.id===hit.id);if(tower&&battle.clickFrozenTower(tower)){closeSelection();return;}selectPad(hit.id);return;}
    if(hit?.type==='enemy'&&battle.clickEnemy(battle.enemies.find(e=>e.id===hit.id)!)){closeSelection();return;}
    if(hit?.type==='prop'){closeSelection();battle.clickProp(hit.id);return;}
    const previous=selection.unit;closeSelection();
    if(hit && (hit.type==='enemy'||previous?.type!==hit.type||previous.id!==hit.id))selection.unit=hit;
  }
});
scene.app.canvas.addEventListener('pointermove', e => { selection.pointer = scene.point(e); });
scene.app.canvas.addEventListener('contextmenu',e=>{e.preventDefault();if(screen==='battle'&&!(drag?.moved&&drag.unit)){closeSelection();cancelDrag();}});
window.addEventListener('keydown', e => {
  if (e.repeat) return;
  if((e.ctrlKey||e.metaKey)&&e.code==='KeyF'){e.preventDefault();togglePerformanceHud();return;}
  if(displayView.visible){if(e.code==='Escape')displayPopup.hide(presentationTime);return;}
  if (screen === 'map') { if(e.code==='Escape') {
    if(progression?.upgrades.visible){progression.upgradePopup.hide(presentationTime);}
    else if(progression?.achievements.visible){progression.achievementPopup.hide(presentationTime);}
    else if(encyclopedia?.view.visible){encyclopedia.hide();}
    else if(difficultyView.visible){difficultyPopup.hide(presentationTime);}
    else if(heroRoom.visible){heroRoomPopup.hide(presentationTime);}
    else if(endlessBook.visible) {endlessPopup.hide(presentationTime);}
    else if(book.visible) {bookTooltip.visible=false;bookPopup.hide(presentationTime);}
    else if(mapOptions.visible){saveVolumes(volumes);mapOptionsPopup.hide(presentationTime);}else mapOptionsPopup.show(presentationTime);
  } return; }
  if(notifications.visible){if(e.code==='Escape')notifications.close();return;}
  // ORIGINAL: game_gui:keypressed ignores keys during a unit drag. Release still commits the rally.
  if(drag?.moved&&drag.unit)return;
  if (e.code === 'Escape') { if (selection.pad || selection.power || selection.unit) closeSelection(); else togglePause(); }
  if (e.code === 'Space') { e.preventDefault(); togglePause(); }
  if (e.code === 'Digit1') selectPower('fire');
  if (e.code === 'Digit2') selectPower('reinforcements');
  if (e.code === 'Digit3') selectPower('lightning');
  if (e.code === 'Digit4') selectHero();
});
function update() {
  notifications.update(presentationTime);progression?.update();
  displayPopup.update(presentationTime);pauseAnimation.update(presentationTime);
  if(screen==='battle'){hud.visible=!battle.story?.hidesHud;if(!battle.finished)modal.visible=pause.visible;}
  if(defeat.visible&&modal.visible)defeatAnimation.update(presentationTime);
  for(let i=closingMenus.length-1;i>=0;i--)if(closingMenus[i].update(presentationTime)){closingMenus[i].view.destroy();closingMenus.splice(i,1);}
  if(screen==='map')gameCursor.setTarget(false);
  rewards.update(presentationTime);
  if(victory.visible&&modal.visible)victoryAnimation.update(presentationTime);
  if (screen === 'map') {
    endlessPopup.update(presentationTime);mapOptionsPopup.update(presentationTime);bookPopup.update(presentationTime);heroRoomPopup.update(presentationTime);difficultyPopup.update(presentationTime);encyclopedia?.popup.update(presentationTime);map.animate(presentationTime);mapAmbient.update(presentationTime);
    for(const flag of flags)flag.update(presentationTime);
    if(levelTip.visible)positionLevelTip(levelTip,hoverFlag,scene.ui,scene.layout.viewport);
    return;
  }
  const hovered=pickAt(battle,selection.pointer);
  const hoverPad = !battle.paused&&!battle.finished&&!selection.power ? selection.pad ?? (hovered?.type==='pad'?hovered.id:null) : null;
  if(hoverPad!==selection.hoverPad&&hoverPad!==null)audio!.play('mapHover');
  selection.hoverPad=hoverPad;
  if(selection.unit?.type==='enemy'&&!battle.enemies.some(e=>e.id===selection.unit!.id&&e.deadAt===null&&!e.escaped))closeSelection();
  if(selection.unit?.type==='soldier'&&!battle.soldiers.some(e=>e.id===selection.unit!.id&&e.deadAt===null))closeSelection();
  inspect.update(battle,selection.power==='hero'?{type:'hero',id:battle.hero.id}:selection.unit,presentationTime);
  for(const entry of waveUis)entry.presentation.update(battle,presentationTime,!selection.unit&&!selection.pad&&!selection.power);
  showLevelTutorial();

  scoreLabel.visible=!!battle.endless;if(battle.endless)scoreLabel.setText(`得分 ${battle.endless.score}`);
  counters.views[0].setText(String(battle.lives)); counters.views[1].setText(String(battle.gold)); counters.views[2].setText(`${battle.wave}/${battle.endless?'∞':battle.level.waves.length} 波`);
  const wave = actions.get('wave')!;
  if (!battle.paused) { wave.disabled = !battle.canSendWave; wave.alpha = battle.canSendWave ? 1 : .5; }
  powerViews.forEach((view, index) => {
    const power:Power = (['fire','reinforcements','lightning'] as const)[index], cooldown = [battle.stats.fire.cooldown,battle.stats.reinforcement.cooldown,LIGHTNING.cooldown][index];
    const remaining = Math.max(0, battle.powers[power] - battle.time);
    view.disabled = battle.wave === 0 || remaining > 0;
    const state=powerStates[index];
    if(battle.wave>0&&state.mode==='locked'){state.mode='unlocked';state.at=presentationTime;}
    if(remaining>0)state.mode='cooldown';
    else if(state.previous>0){state.mode='ready';state.at=presentationTime;audio!.play('spellReady');}
    state.previous=remaining;
    const phase=Math.floor((presentationTime-state.at)*30);
    const frame = battle.wave===0?30:selection.power===power?29:!view.disabled&&view.hovered?45:state.mode==='unlocked'&&phase<15?30+phase:state.mode==='ready'&&phase<28?1+phase:1;
    view.views[1].setImage(`power_button_mask_${String(frame).padStart(4,'0')}`);
    view.views[0].visible = remaining > 0; view.views[0].scale.y = -remaining / cooldown;
  });
  const moveAge=presentationTime-moveConfirmedAt;moveConfirm.visible=moveAge>=0&&moveAge<11/30;
  if(moveConfirm.visible)moveHud(moveConfirm,moveConfirmWorld);
  if(moveConfirm.visible)moveConfirm.texture=heroTextures.get(`confirm_feedback_${String(1+Math.floor(moveAge*30)).padStart(4,'0')}`)!;
  const rallyAge=presentationTime-rallyConfirmedAt;rallyFlag.visible=rallyAge>=0&&rallyAge<1.5;
  if(rallyFlag.visible){moveHud(rallyFlag,rallyConfirmWorld);rallyFlag.texture=feedbackTextures.get(`rally_feedback_${String(1+Math.floor(rallyAge*30)%30).padStart(4,'0')}`)!;rallyFlag.alpha=(1-rallyAge/1.5)**2;}
  heroBar.visible=battle.heroEnabled;
  const h=battle.hero;
  if(h.deadAt!==null&&selection.power==='hero')closeSelection();
  heroPortrait.disabled=h.deadAt!==null;
  heroPortrait.views[1].visible=h.deadAt!==null;
  if(h.deadAt!==null)heroPortrait.views[1].scale.y=-Math.max(0,1-(battle.time-h.deadAt)/heroContent.respawn);
  heroPortrait.views[3].setText(h.level);
  heroPortrait.views[4].scale.x=h.hp/battle.heroHealth;
  heroPortrait.views[5].scale.x=battle.heroXpRatio;
  heroPortrait.views[6].visible=selection.power==='hero';
  heroPortrait.views[7].visible=heroPortrait.hovered&&!heroPortrait.disabled;
  const levelAge=battle.time-h.levelUpAt;
  heroPortrait.views[8].visible=levelAge>=0&&levelAge<28/30;
  if(heroPortrait.views[8].visible)heroPortrait.views[8].setImage(`heroPortrait_${String(2+Math.floor(levelAge*30)).padStart(4,'0')}`);
  updateMenu();
  if(menu&&selection.pad)moveHud(menu,{x:selectedMenuPad().x,y:selectedMenuPad().y+14});
  waveUis.forEach(({flag,tip},i)=>{const entry=content.waveFlags[i];flag.views[4].rotation=entry.rotation;const p=hudPoint(entry.position);flag.position.set(Math.max(35,Math.min(scene.layout.viewport.width*HEIGHT/1080-35,p.x)),Math.max(45,Math.min(scene.layout.viewport.height*HEIGHT/1080-50,p.y)));tip.position.set(flag.x>1.5*tip.data.size.x?flag.x-tip.data.size.x-24:flag.x+24,Math.min(flag.y+20,scene.layout.viewport.height*HEIGHT/1080-tip.data.size.y));});
  rangeLayer.visible = false; pointerLayer.visible = (!!selection.power||(presentationTime-invalidTargetAt>=0&&presentationTime-invalidTargetAt<14/30))&&!battle.paused&&!battle.finished;
  const selectedPad = level.pads.find(p=>p.id===selection.pad), selectedTower = battle.towers.find(t=>t.pad.id===selection.pad);
  const rangeKind = selection.preview || selectedTower?.kind;
  if(selectedPad&&rangeKind){const p=hudPoint({x:selectedPad.position.x,y:selectedPad.position.y+12});showRange(p.x,p.y,(selectedTower?battle.towerStats(selectedTower):battle.stats.towers[rangeKind]).range*scene.camera.scale,rangeKind==='barrack');}
  if(drag?.moved&&drag.towerId){const tower=battle.towers.find(t=>t.pad.id===drag!.towerId);if(tower){const p=hudPoint({x:tower.pad.position.x,y:tower.pad.position.y+12});showRange(p.x,p.y,battle.stats.towers.barrack.range*scene.camera.scale,true);}}
  updateDragLine();
  if (pointerLayer.visible) {
    const phase=String(Math.floor(presentationTime*30)%10+1).padStart(4,'0');
    const name=(selection.power==='rally'||selection.power==='hero')?'pointer_set_rally':selection.power==='fire'?'pointer_area_orange':'pointer_point_orange';
    cursorBase.texture=uiTextures.get(`${name}_${phase}`)!;cursorBase.anchor.set(.5);cursorBase.scale.set(HEIGHT/1080);
    moveHud(pointerLayer,selection.pointer);
    const invalidAge=presentationTime-invalidTargetAt;
    if(invalidAge>=0&&invalidAge<14/30){cursorBase.texture=interactionTextures.get(`error_feedback_${String(1+Math.floor(invalidAge*30)).padStart(4,'0')}`)!;}
    cursorIcon.visible=!!selection.power&&!(invalidAge>=0&&invalidAge<14/30)&&selection.power!=='rally'&&selection.power!=='hero'&&selection.power!=='manual';
    if(cursorIcon.visible){cursorIcon.texture=uiTextures.get(selection.power==='fire'?'pointer_user_power_0001':selection.power==='lightning'?'pointer_user_power_0003':'pointer_user_power_0002')!;cursorIcon.anchor.set(.5,1);cursorIcon.scale.set(HEIGHT/1080);}
  }
  gameCursor.setTarget(pointerLayer.visible);
  for (const event of battle.events.splice(0)) {
    if(event.type==='bossFinish')audio!.stopAll();
    else if(event.type==='achievement'){if(event.award)achievementTracker.award(event.id);else if(event.maximum)achievementTracker.maximum(event.id,event.amount);else achievementTracker.increment(event.id,event.amount);}
    else if(event.type==='early'){earlyCalls++;if(!battle.endless&&earlyCalls===battle.level.waves.length-1)achievementTracker.award('FEARLESS');if(event.elapsed<=3)achievementTracker.award('IMPATIENT');}
    else if(event.type==='seen'){if(!loadSeen().includes(event.enemy)){recordSeen(event.enemy);if(!battle.enemyStats[event.enemy].boss&&battle.enemyStats[event.enemy].notify!==false)notifications.add(event.enemy);}}
    else if(event.type==='bossIntro')audio!.startMusic('bossMusic');
    else if(event.type==='sound')combatCues.request(event.cue,presentationTime);
    else if (event.type === 'wave') { audio!.play('wave'); if (battle.wave === 1) audio!.startMusic('music'); }
    else if(event.type==='heroSound')heroCues.request(event.cue,presentationTime);
    else if(event.type==='heroMove')heroCues.request(battle.heroController?.transformed?heroContent.events[heroContent.id==='10yr'?'change_rally_point_buffed':'change_rally_point_bear']:heroContent.events.change_rally_point,presentationTime);
    else if(event.type==='heroIntro')heroCues.request(battle.hero.animation==='respawn'?heroContent.events.respawn:heroContent.events.insert,presentationTime);
    else if(event.type==='heroDeath')heroCues.request(heroContent.events.death,presentationTime);
    else if(event.type==='heroCourage')heroCues.request('HeroPaladinValor',presentationTime);
    else if(event.type==='heroCounter')heroCues.request('HeroPaladinDeflect',presentationTime);
    else if(event.type==='fireRelease'||event.type==='fireHit')audio!.play(event.type,.5);
    else if(event.type==='lightning')audio!.play('lightning',.8);
    else if(event.type==='reinforcements')audio!.play(`reinforcement${reinforcementVoice++%4}`,.6);
    else if(event.type==='doorOpen')audio!.play('doorOpen');
    else if(event.type==='rally')audio!.play('rally',.8);
    else if(event.type==='sheep'){if(battle.time-sheepVoiceAt>=1.5){audio!.play('sheep',.6);sheepVoiceAt=battle.time;}}
    else if(event.type==='sheepExplode')audio!.play('sheepExplode',.4);
    else if(event.type==='sheepBomb')audio!.play('sheepBomb',.8);
    else if(event.type==='defeat'){audio!.stopAll();audio!.play('defeat');}
    else if (event.type === 'build' || event.type === 'leak' || event.type === 'victory') audio!.play(event.type);
  }
  if (battle.finished && !completed) {
    completed = true; closeSelection(); modal.visible = true;shade.alpha=1; pause.visible = false;
    victory.visible = battle.outcome === 'victory'; defeat.visible = !victory.visible;
    if (victory.visible) { if(battle.mode==='campaign')recordLevelVictory(selectedLevel.id,battle.stars);else recordChallenge(battle.mode,difficulty,selectedLevel.id);audio!.stopMusic();victoryAnimation.show(presentationTime,battle.stars,battle.mode); }else {
      const tip=defeat.all().find(v=>v.data.class==='class GGLabel'&&v.data.pos.y===155)!;
      delete tip.data.source_lines;
      if(battle.endless){recordEndless(selectedLevel.id,difficulty,battle.endless.score,battle.wave);tip.setText(`无尽挑战结束\n得分 ${battle.endless.score} · 存活 ${battle.wave} 波`);}else tip.setText(feedbackData.defeatTips[Math.floor(Math.random()*feedbackData.defeatTips.length)].text);
      defeatAnimation.show(presentationTime);
    }
  }
  scene.draw(battle, selection);
}
function loop(now: number) {
  const elapsed = last === 0 ? 0 : (now - last) / 1000; last = now;if(!manualPresentation) presentationTime += elapsed;
  const started=performance.now();
  if(elapsed>0)performanceHud.sample(elapsed*1000);
  if (screen === 'battle' && !manualClock && !battle.paused && !battle.finished) {
    accumulator += elapsed*gameSpeed; while (accumulator >= STEP) { battle.step(); accumulator -= STEP; }
  }
  update();const updated=performance.now();scene.render();
  if(import.meta.env.MODE==='test'||testSpeed===4) {
    performanceSamples.push({interval:elapsed*1000,update:updated-started,render:performance.now()-updated,enemies:screen==='battle'?battle.enemies.length:0});
    if(performanceSamples.length>600)performanceSamples.shift();
    // Read-only DOM diagnostics for visible-browser display tests; omitted from production.
    if(!performanceBenchmark){
    const gl=canvas.getContext('webgl2') as WebGL2RenderingContext;
    canvas.dataset.panelsReady=String([bookPopup,endlessPopup,mapOptionsPopup,difficultyPopup,heroRoomPopup,displayPopup].every(p=>!p.view.visible||p.ready)&&(!pause.visible||pauseAnimation.state.ready));
    canvas.dataset.display=JSON.stringify({screen,mode:scene.displayMode,resolution:scene.resolution,layout:scene.layout,metrics:scene.metrics,glViewport:Array.from(gl.getParameter(gl.VIEWPORT)),
      map:{zoom:mapCamera.zoom,scale:mapCamera.scale,viewport:mapCamera.viewport,visibleBounds:mapCamera.visibleBounds},
      battle:{zoom:scene.camera.zoom,scale:scene.camera.scale,viewport:scene.camera.viewport,visibleBounds:scene.camera.visibleBounds},
      selection:{pad:selection.pad,power:selection.power},level:selectedLevel.id,...(screen==='battle'?{time:battle.time,gold:battle.gold,lives:battle.lives,outcome:battle.outcome,towers:battle.towers.map(t=>({id:t.pad.id,kind:t.kind,tier:t.tier})),
      wave:battle.wave,endlessScore:battle.endless?.score,paused:battle.paused,powers:battle.powers,soldiers:battle.soldiers.length,
      enemies:battle.enemies.filter(e=>e.hp>0&&!e.escaped).map(e=>({id:e.id,kind:e.kind,hp:e.hp,position:scene.uiPoint(e)})).filter(e=>e.position.x>=0&&e.position.x<=scene.layout.width&&e.position.y>=0&&e.position.y<=scene.layout.height)}:{}),
      actions:Object.fromEntries([...actions].map(([name,v])=>{const a=v.toGlobal({x:0,y:0}),b=v.toGlobal(v.data.size);return [name,{x:a.x,y:a.y,width:b.x-a.x,height:b.y-a.y}];}))});
    }
  }
  requestAnimationFrame(loop);
}
// Test-only time control and measured canvas hitboxes; player commands still use real pointer events.
if (import.meta.env.MODE === 'test') {
  (window as unknown as {__KR1__:unknown}).__KR1__ = {
    holdClock() { manualClock=true; },
    holdPresentation() { manualPresentation=true;presentationTime=0; },
    resetPerformanceBattle(){
      manualClock=true;manualPresentation=true;presentationTime=0;closeSelection();notifications.reset();
      battle=new Battle({...content,level},12345,difficulty,selectedMode,loadUpgrades(),heroContent);completed=false;
    },
    measureFrames(count:number,steps:number){
      const samples=[];
      for(let frame=0;frame<count;frame++){
        const start=performance.now();
        if(screen==='battle')for(let i=0;i<steps;i++)battle.step();
        const simulated=performance.now();presentationTime+=STEP*(steps||1);update();
        const presented=performance.now();scene.render();const rendered=performance.now();
        samples.push({simulation:simulated-start,presentation:presented-simulated,render:rendered-presented,total:rendered-start,enemies:screen==='battle'?battle.enemies.length:0});
      }
      return samples;
    },
    advancePresentation(seconds:number) {presentationTime+=seconds;update();scene.render();},
    get feedback(){return {notifications:notifications.state,motion:{pause:pauseAnimation.state,defeat:defeatAnimation.state,info:inspect.motion,menu:menuMotion?.state,closingMenus:closingMenus.map(m=>m.state),wave:wavePresentation.state,settings:mapOptionsPopup.state},audio:audio!.state,rewards:rewards.count,victory:victoryAnimation.state,stars:flags[0].stars.map(s=>s.visible),flag:flags[0].view.imageName,bookBadges:book.all().filter(v=>v.data.image_name==='levelSelect_badges_0001').map(v=>v.imageName),loading:!document.querySelector<HTMLElement>('#loading')!.hidden,cursor:document.querySelector<HTMLElement>('#game-cursor')!.dataset.state,display:displayPopup.state,resolution:scene.resolution,displayMode:scene.displayMode,viewport:scene.layout,renderMetrics:scene.metrics,camera:{map:{zoom:mapCamera.zoom,x:mapCamera.x,y:mapCamera.y},battle:{zoom:scene.camera.zoom,scale:scene.camera.scale,x:scene.camera.x,y:scene.camera.y}},tooltip:{visible:bookTooltip.visible,bounds:bookTooltip.getBounds(),lines:bookTooltip.views.map(v=>v.data.source_lines)}};},
    worldToScreen(p:{x:number;y:number}){return scene.uiPoint(p);},
    get mapState() {return {ambient:mapAmbient.state,mode:selectedMode,progression:progression?.state,difficulty,volumes,encyclopedia:encyclopedia?.state,difficultyPanel:difficultyPopup.state,levelTip:levelTip.visible,book:bookPopup.state,heroRoom:heroRoomPopup.state,tooltip:bookTooltip.visible,options:mapOptions.visible,sounds:mapSoundEvents};},
    mapSnapshot() {return [map,book].flatMap(root=>root.all().map(v=>({class:v.data.class,visible:v.visible,image:v.imageName,position:{x:v.x,y:v.y},scale:{x:v.scale.x,y:v.scale.y},anchor:v.data.anchor,size:v.data.size,bounds:v.getBounds(),alpha:v.alpha,font:v.data.font_metrics,text:v.data.text})));},
    viewState(name:string) {const v=actions.get(name)!;return {image:v.imageName,text:v.text,hovered:v.hovered,disabled:v.disabled,clickDisabled:v.clickDisabled,visible:v.visible,pos:{x:v.x,y:v.y},size:v.data.size,anchor:v.data.anchor,scale:{x:v.scale.x,y:v.scale.y},layers:v.all().map(layer=>({image:layer.imageName,visible:layer.visible,text:layer.text}))};},
    get interaction() {return {selection,info:inspect.state,incoming:incoming.visible,cursorTexture:[...interactionTextures].find(([,texture])=>texture===cursorBase.texture)?.[0]};},
    volumeBounds(index:number) {const slider=sliders[index],bar=slider.views[0],a=slider.toGlobal(bar.position),b=slider.toGlobal({x:bar.x+bar.data.size.x,y:bar.y+bar.data.size.y});return {x:a.x,y:a.y,width:b.x-a.x,height:b.y-a.y};},
    get battle() { return battle; }, get screen() { return screen; },
    get displayState(){return {mode:scene.displayMode,resolution:scene.resolution,layout:scene.layout,metrics:scene.metrics,map:{zoom:mapCamera.zoom,scale:mapCamera.scale,viewport:mapCamera.viewport,visibleBounds:mapCamera.visibleBounds},battle:{zoom:scene.camera.zoom,scale:scene.camera.scale,viewport:scene.camera.viewport,visibleBounds:scene.camera.visibleBounds}};},
    get performance() {return {fps:performanceHud.value,visible:performanceHud.visible,samples:performanceSamples};},
    advance(seconds:number) { for(let i=0;i<seconds/STEP;i++) battle.step(); presentationTime += seconds; update(); scene.render(); },
    bounds(name:string) { const v=actions.get(name)!, a=v.toGlobal({x:0,y:0}), b=v.toGlobal(v.data.size); return {x:a.x,y:a.y,width:b.x-a.x,height:b.y-a.y}; },
  };
}
scene.onLayout(layoutHud);
showMap();if(!hasSavedDifficulty())difficultyPopup.show(presentationTime);update();scene.render();loading.hide();requestAnimationFrame(loop);

}
export const ready=boot();
