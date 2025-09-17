let hostBroadcastingStarted = false
let hpUpdateQueue = []
function serializeParts(parts) {
	const out = {}
	for (const k in parts) {
		const p = parts[k]
		out[k] = { x: p.x, y: p.y, vx: p.vx, vy: p.vy }
	}
	return out
}
let peer, isHost=false, hostId="", connections=[], players=[], maxPlayers=4, pendingJoin=false;
function zeroPartsPhysics(stick){
  if(!stick || !stick.parts) return;
  Object.values(stick.parts).forEach(p=>{
    p.vx = 0;
    p.vy = 0;
    if(p.startVx !== undefined) p.startVx = 0;
    if(p.startVy !== undefined) p.startVy = 0;
  });
}
function serializeParts(parts){
  const out = {};
  for(const k in parts){
    const p = parts[k];
    out[k] = { x: p.x, y: p.y, vx: p.vx, vy: p.vy };
  }
  return out;
}
function generateRandomId(){ return Math.random().toString(36).substr(2,6); }
function updatePlayerStatus(){
  document.getElementById("status").innerText = "Players: "+players.length+"/"+maxPlayers + (isHost ? " | Host ID: "+hostId : "");
}
function disconnectOldHost(){
  connections.forEach(c=>{
    c.send({type:'host_refused'});
    c.close();
  });
  if(peer) peer.destroy();
  connections=[];
  players=[];
  isHost=false;
}
document.getElementById("hostBtn").addEventListener("click", ()=>{
 document.getElementById("joinInput").style.display = "none";
document.getElementById("joinConfirm").style.display = "none";
  if(isHost){
    document.getElementById("confirmScreen").style.display="block";
    return;
  }
  startNewHost();
});
document.getElementById("joinBtn").addEventListener("click", ()=>{
  if(isHost){
    pendingJoin=true;
    document.getElementById("confirmScreen").style.display="block";
    return;
  }
  document.getElementById("joinInput").style.display="block";
  document.getElementById("joinConfirm").style.display="block";
  document.getElementById("status").innerText =""
});
document.getElementById("confirmYes").addEventListener("click", ()=>{
  document.getElementById("confirmScreen").style.display="none";
  disconnectOldHost();
  if(pendingJoin){
    pendingJoin=false;
    document.getElementById("status").innerText =""
    document.getElementById("joinInput").style.display="block";
    document.getElementById("joinConfirm").style.display="block";
  } else {
    startNewHost();
  }
});
document.getElementById("confirmNo").addEventListener("click", ()=>{
  document.getElementById("confirmScreen").style.display="none";
  pendingJoin=false;
});
function startNewHost() {
 hostId = generateRandomId();
 if(!navigator.onLine){document.getElementById("startScreen").style.display="none"; return; }
 peer = new Peer(hostId, { /*host:'0.peerjs.com', */port:443, path:'/', secure:true, debug:2});
 isHost = true;
 players.push({id: hostId, stickman: me}); 
 updatePlayerStatus();
 document.getElementById("playBtn").style.display="block";
 peer.on('connection', conn => {
 	if (!isHost) {
	hostConn = peer.connect(hostId);
	hostConn.on('data', handleData);
}
  if(players.length >= maxPlayers){ conn.send({type:'full'}); conn.close(); return; }
  connections.push(conn);
  let placeholder = new Stickman(0, 0, "red"); 
players.push({id: conn.peer, stickman: placeholder});
  conn.send({type:'welcome', id:conn.peer, x:10+players.length*50, y:1450});
  updatePlayerStatus();
  conn.on('data', data => {
  if (data.type === 'update') {
    let p = players.find(p => p.id === conn.peer);
    if (p) {
      p.stickman.parts = data.parts;  
      p.stickman.color = data.color || p.stickman.color;
    }
  }
  	if (data.type === 'round_win') {
		showWinner(data.color);
	}
  if(data.type === 'attack'){
  let target = players.find(p => p.id === data.targetId);
  if(target){
  	target.stickman.hp = clamp(target.stickman.hp - data.damage , 0, 100);
    target.stickman.parts.pelvis.vx += data.vx;
    target.stickman.parts.pelvis.vy += data.vy;
    connections.forEach(c => {
      c.send({
        type:'hp_update',
        id: target.id,
        hp: target.stickman.hp,
        death: target.stickman.hp <= 0,
        vx: target.stickman.parts.pelvis.vx,
        vy: target.stickman.parts.pelvis.vy
      });
    });
    if(target.id === hostId){
      me.hp = target.stickman.hp;
      me.parts.pelvis.vx = target.stickman.parts.pelvis.vx;
      me.parts.pelvis.vy = target.stickman.parts.pelvis.vy;
    }
  }
}
if(data.type==='round_start'){
 roundWinColor=false; countdownText="";
 if(Array.isArray(data.players)){
  data.players.forEach(pd=>{
   let p=players.find(x=>x.id===pd.id);
   if(p){
   	p.stickman.deathTimer=0; p.stickman.deathDuration=0;
Object.keys(p.stickman.parts).forEach(part=>{
 let partObj = p.stickman.parts[part]
 partObj.x = pd.x
 partObj.y = pd.y
 partObj.vx = 0
 partObj.vy = 0
 partObj.startVx=0
 partObj.startVy=0;
})
    p.stickman.hp=100; p.stickman.dead=false; p.stickman.death=false; p.stickman.shattered=false; 
    p.stickman.invulnerable=true; p.stickman.invulnerableUntil=Date.now()+(data.invulnerableDuration||1000);
    setTimeout(()=>{ p.stickman.invulnerable=false; if(p.id===peer.id) me.invulnerable=false; }, data.invulnerableDuration||1000);
    if(p.id===peer.id) me=p.stickman;
   } else {
    let newStick=new Stickman(pd.x,pd.y,randomColor()); newStick.hp=100; newStick.invulnerable=true; newStick.invulnerableUntil=Date.now()+(data.invulnerableDuration||1000);
    setTimeout(()=>{ newStick.invulnerable=false; }, data.invulnerableDuration||1000);
    players.push({id:pd.id,stickman:newStick});
   }
  });
 }
 document.getElementById("startScreen").style.display="none";
 started=1;
 if(hostConn) sendMyUpdate(hostConn);
}
	if (data.type === 'countdown') {
		showCountdown(data.time);
	}
	if (data.type === 'hp_update') {
 let p = players.find(p => p.id === data.id);
 if (p) {
  p.stickman.hp = data.hp;
  p.stickman.dead = data.death;
  p.stickman.death = data.death;
  if (data.vx !== undefined) p.stickman.parts.pelvis.vx = data.vx;
  if (data.vy !== undefined) p.stickman.parts.pelvis.vy = data.vy;
  if (p.id === peer.id) {
   me.hp = data.hp;
   me.dead = data.death;
   me.death = data.death;
   me.parts.pelvis.vx = data.vx;
   me.parts.pelvis.vy = data.vy;
  }
 }
}
if(data.type==='hp_update_batch'){
/* if(Array.isArray(data.players)) data.players.forEach(pu=>{
  let p=players.find(x=>x.id===pu.id);
  if(p){
   p.stickman.hp=pu.hp;
   p.stickman.dead=pu.death;
   if(pu.vx!==undefined) p.stickman.parts.pelvis.vx=pu.vx;
   if(pu.vy!==undefined) p.stickman.parts.pelvis.vy=pu.vy;
   if(p.id===peer.id){ me.hp=pu.hp; me.dead=pu.death; me.parts.pelvis.vx=pu.vx; me.parts.pelvis.vy=pu.vy; }
  }
 });*/
}
if (data.type === 'hp_change') {
	let target = players.find(p => p.id === data.id);
	if (target) {
		target.stickman.hp = clamp(target.stickman.hp + data.delta, 0, 100);
		if (data.vx !== undefined) { target.stickman.parts.pelvis.vx = data.vx;
			target.stickman.parts.pelvis.vy = data.vy; }
		connections.forEach(c => c.send({
			type: 'hp_update',
			id: target.id,
			hp: target.stickman.hp,
			death: target.stickman.hp <= 0,
			vx: target.stickman.parts.pelvis.vx,
			vy: target.stickman.parts.pelvis.vy
		}));
		if (target.id === hostId) {
			me.hp = target.stickman.hp;
			me.parts.pelvis.vx = target.stickman.parts.pelvis.vx;
			me.parts.pelvis.vy = target.stickman.parts.pelvis.vy;
		}
	}
}
});
  conn.on('close', ()=>{
   players = players.filter(p=>p.id!==conn.peer);
   connections = connections.filter(c=>c.peer!==conn.peer);
   updatePlayerStatus();
  });
 });
}
function hostBroadcastLoop(){
 if(!isHost) return
 const interval=50
 const payload=players.map(p=>{
  if(!p.stickman||!p.stickman.parts) return {id:p.id,hp:p.stickman? p.stickman.hp:100,death:!!(p.stickman&&p.stickman.dead)}
  return {id:p.id,parts:serializeParts(p.stickman.parts),hp:p.stickman.hp,death:!!p.stickman.dead,color:p.stickman.color}
 })
 if(connections.length>0) connections.forEach(c=>c.send({type:'players',players:payload}))
 if(hpUpdateQueue.length>0){
  const batch=hpUpdateQueue.splice(0)
  connections.forEach(c=>c.send({type:'hp_update_batch',players:batch}))
 }
 setTimeout(hostBroadcastLoop,interval)
}
function sendMyUpdate(conn) {
 if (!peer || !started) return;
 conn.send({ type: 'update', parts: me.parts, color: me.color });
 setTimeout(() => sendMyUpdate(conn), 50);
}
if(!isHost) sendMyUpdate();
document.getElementById("playBtn").addEventListener("click", () => {
	document.getElementById("startScreen").style.display = "none"
	connections.forEach(c => {
		c.send({ type: 'start' })
		c.send({ type: 'map', blocks: blocks.map(b => ({ x: b.x, y: b.y, w: b.w, h: b.h, hpGive: b.hpGive, collision: b.collision, color: b.color, pushable: b.pushable })) })
	})
	if (isHost && !hostBroadcastingStarted) { hostBroadcastingStarted = true;
		hostBroadcastLoop() }
})
let started=0
let hostConn = null;
document.getElementById("joinConfirm").addEventListener("click", ()=>{
 let id = document.getElementById("joinInput").value.trim();
 if(!id) return;
 peer = new Peer(generateRandomId(), { /*host:'0.peerjs.com',*/port:443, path:'/',secure:true, debug:2});
peer.on('error', (err) => {
 console.error(err);
 document.getElementById("status").innerText = "Couldn't connect to server"+err
 if (peer) peer.destroy();
}); 
 peer.on('open', ()=>{
  hostConn = peer.connect(id); 
  hostConn.on('open', ()=>{ document.getElementById("status").innerText = "Waiting for host to start the game..."; });
  hostConn.on('data', data=>{
if(data.type === 'player_reset'){
  let p = players.find(x => x.id === data.id);
  if(!p) return;
  if(data.parts){
    for(const partName in data.parts){
      const src = data.parts[partName];
      if(!p.stickman.parts[partName]) p.stickman.parts[partName] = new BodyPart(src.x, src.y);
      p.stickman.parts[partName].x = src.x;
      p.stickman.parts[partName].y = src.y;
      p.stickman.parts[partName].vx = src.vx;
      p.stickman.parts[partName].vy = src.vy;
      delete p.stickman.parts[partName].startVx;
      delete p.stickman.parts[partName].startVy;
    }
  }
  p.stickman.hp = p.stickman.hp || 0;
  p.stickman.dead = p.stickman.dead || false;
  if(p.id === peer.id){
    me = p.stickman;
    me.dead = p.stickman.dead;
    Object.values(me.parts).forEach(pp=>{ pp.vx = pp.vx||0; pp.vy = pp.vy||0; delete pp.startVx; delete pp.startVy; });
  }
}
   if(data.type==='full'){ alert("Host full"); hostConn.close(); return; }
   if(data.type==='welcome'){
    me.parts.pelvis.x = data.x;
    me.parts.pelvis.y = data.y;
    let existing = players.find(p=>p.id===data.id);
    if(!existing) players.push({id:data.id, stickman:me});
    else existing.stickman = me;
   }
   if(data.type==='map') blocks = data.blocks.map(b=> new Block(b.x,b.y,b.w,b.h,b.hpGive,b.collision,b.color,b.pushable));
   if(data.type==='hp_update'){
    let p = players.find(p=>p.id===data.id);
    if(p){
     p.stickman.hp = data.hp;
     p.stickman.dead = data.death;
     p.stickman.death = data.death;
     if(data.vx!==undefined) p.stickman.parts.pelvis.vx = data.vx;
     if(data.vy!==undefined) p.stickman.parts.pelvis.vy = data.vy;
     if(p.id === peer.id){
      me.hp = data.hp;
      me.dead = data.death;
      me.death = data.death;
      me.parts.pelvis.vx = data.vx;
      me.parts.pelvis.vy = data.vy;
     }
    }
   }
   if(data.type === 'player_reset' && data.batch){
  data.batch.forEach(item=>{
    let p = players.find(x=>x.id===item.id);
    if(p){
      for(const partName in item.parts){
        const src = item.parts[partName];
        if(!p.stickman.parts[partName]) p.stickman.parts[partName] = new BodyPart(src.x, src.y);
        p.stickman.parts[partName].x = src.x;
        p.stickman.parts[partName].y = src.y;
        p.stickman.parts[partName].vx = src.vx;
        p.stickman.parts[partName].vy = src.vy;
        delete p.stickman.parts[partName].startVx;
        delete p.stickman.parts[partName].startVy;
      }
      if(item.hp !== undefined) p.stickman.hp = item.hp;
      p.stickman.dead = !!item.dead;
      if(p.id === peer.id) {
        me = p.stickman;
      }
    }
  });
}
   if(data.type==='hp_update_batch'){
 
}
if(data.type==='round_start'){
 roundWinColor=false; countdownText="";
 if(Array.isArray(data.players)){
  data.players.forEach(pd=>{
   let p=players.find(x=>x.id===pd.id);
   if(p){
p.stickman.deathTimer = 0;
p.stickman.deathDuration = 0;
Object.keys(p.stickman.parts).forEach(part => {
	let partObj = p.stickman.parts[part]
	partObj.x = pd.x
	partObj.y = pd.y
	partObj.vx = 0
	partObj.vy = 0
	partObj.startVx = 0
	partObj.startVy = 0;
})
    p.stickman.hp=100; p.stickman.dead=false; p.stickman.death=false; p.stickman.shattered=false;  
    p.stickman.invulnerable=true; p.stickman.invulnerableUntil=Date.now()+(data.invulnerableDuration||1000);
    setTimeout(()=>{ p.stickman.invulnerable=false; if(p.id===peer.id) me.invulnerable=false; }, data.invulnerableDuration||1000);
    if(p.id===peer.id) me=p.stickman;
   } else {
    let newStick=new Stickman(pd.x,pd.y,randomColor()); newStick.hp=100; newStick.invulnerable=true; newStick.invulnerableUntil=Date.now()+(data.invulnerableDuration||1000);
    setTimeout(()=>{ newStick.invulnerable=false; }, data.invulnerableDuration||1000);
    players.push({id:pd.id,stickman:newStick});
   }
  });
  
 }
 document.getElementById("startScreen").style.display="none";
 started=1;
 if(hostConn) sendMyUpdate(hostConn);
}
   if(data.type==='start'){
    document.getElementById("startScreen").style.display="none";
    started=1;
    sendMyUpdate(hostConn);
   }
   if(data.type==='round_win') showWinner(data.color);
   if(data.type==='players'){
    data.players.forEach(pData=>{
     let existing = players.find(p=>p.id===pData.id);
     if(existing){
      if(pData.parts) existing.stickman.parts = pData.parts;
      existing.stickman.hp = pData.hp;
      existing.stickman.dead = pData.death;
      existing.stickman.color = pData.color;
     } else {
      let newStick = new Stickman(0,0,pData.color||"red");
      if(pData.parts) newStick.parts = pData.parts;
      newStick.hp = pData.hp!==undefined? pData.hp:100;
      players.push({id:pData.id, stickman:newStick});
     }
    });
   }
   if(data.type==='countdown'){ countdown = data.time; showCountdown(data.time); }
   if(data.type==='host_refused'){ alert("Host refused to connect"); document.getElementById("startScreen").style.display="block"; }
   
   
  });
setTimeout(()=>{
  if(!hostConn.open) document.getElementById("status").innerText = "Could not connect to host";
  hostConn = peer.connect(id);
}, 5000);
 });
});
const canvas = document.getElementById("c"),
 ctx = canvas.getContext("2d");
let zoom = 0.5; 
function resize() { canvas.width = innerWidth * 2;
 canvas.height = innerHeight * 2 }
resize();
function sendAttack(targetId, damage, vx=0, vy=0){
 if(!started) return;
 if(isHost){
  let target = players.find(p=>p.id===targetId);
  if(!target) return;
  target.stickman.hp = Math.max(0, target.stickman.hp - damage);
  if(vx!==undefined) target.stickman.parts.pelvis.vx += vx;
  if(vy!==undefined) target.stickman.parts.pelvis.vy += vy;
  connections.forEach(c=>c.send({
   type:'hp_update',
   id: target.id,
   hp: target.stickman.hp,
   death: target.stickman.hp <= 0,
   vx: target.stickman.parts.pelvis.vx,
   vy: target.stickman.parts.pelvis.vy
  }));
  if(target.id === hostId){
   me.hp = target.stickman.hp;
   me.parts.pelvis.vx = target.stickman.parts.pelvis.vx;
   me.parts.pelvis.vy = target.stickman.parts.pelvis.vy;
  }
 } else {
  if(!hostConn) return;
  hostConn.send({type:'attack', targetId, damage, vx, vy});
 }
}
addEventListener("resize", resize);
class BodyPart {
 constructor(x, y) { this.x = x;
  this.y = y;
  this.vx = 0;
  this.vy = 0; }
}
function clamp(value, min, max) {
	return Math.min(Math.max(value, min), max);
}
class Stickman {
 constructor(x, y, color) {
  this.color = color; this.hp = 100;
  this.parts = {
    head: new BodyPart(x, y + 40),
    chest: new BodyPart(x, y - 20),
    pelvis: new BodyPart(x, y),
    lThigh: new BodyPart(x - 8, y),
    lShin: new BodyPart(x - 8, y + 20),
    rThigh: new BodyPart(x + 8, y),
    rShin: new BodyPart(x + 8, y + 20),
    lShoulder: new BodyPart(x - 10, y - 10),
    lHand: new BodyPart(x - 30, y - 10),
    rShoulder: new BodyPart(x + 10, y - 10),
    rHand: new BodyPart(x + 30, y - 10)
};
this.invulnerable = false;
this.invulnerableUntil = 0;
this.parts.lHand.attacking = false
this.parts.rHand.attacking = false
this.dead = false
  this.joints = [
   ["chest", "pelvis", 15],
   ["pelvis", "lThigh", 20],
   ["lThigh", "lShin", 20],
   ["pelvis", "rThigh", 20],
   ["rThigh", "rShin", 20],
   ["chest", "head", 0]
  ];
  this.joints.push(["chest", "lShoulder", 10]);
this.joints.push(["lShoulder", "lHand", 20]); 
this.joints.push(["chest", "rShoulder", 10]);
this.joints.push(["rShoulder", "rHand", 20]);
this.activeArm = [];
this.armStartTime = 0;
this.armDuration = 200; 
this.armClickQueue = []; 
this.nextArm = "l"; 
this.armUs=0;
  this.onGround = false;
  this.armCooldown = 200; 
this.lastArmTime = 0; 
  this.stepPhase = 0; 
  this.stepSpeed = 0.1; 
  this.stepHeight = 5; 
  this.stepPelvisLift = 3; 
  this.footOnGround = { l: true, r: false }; 
 }
 step(blocks) {
  this.onGround = false;
  let pelvis = this.parts.pelvis;
  let maxV = Math.max(Math.abs(pelvis.vx), Math.abs(pelvis.vy));
  let stepIter = Math.ceil(maxV > 5 ? maxV : 1);
  for (let s = 0; s < stepIter; s++) {
   for (let k in this.parts) {
    let p = this.parts[k];
    p.vy += 0.09 / stepIter;
    p.x += p.vx / stepIter;
    p.y += p.vy / stepIter;
   }
   for (let b of blocks) {
    if (!b.collision) continue;
	if (b.pushable) {
	const pushParts = Object.keys(this.parts);
	const margin = 10;
	const force = 1.2;
	for (let partName of pushParts) {
		let p = this.parts[partName];
		if (p.x + margin > b.x && p.x - margin < b.x + b.w &&
			p.y + margin > b.y && p.y - margin < b.y + b.h) {
			b.vx += p.vx * force;
		}
	}
}
    for (let k in this.parts) {
     let p = this.parts[k];
     if (p.x > b.x && p.x < b.x + b.w && p.y > b.y && p.y < b.y + b.h) {
      let overlapX1 = b.x - p.x;
      let overlapX2 = b.x + b.w - p.x;
      let overlapY1 = b.y - p.y;
      let overlapY2 = b.y + b.h - p.y;
      let dx = Math.abs(overlapX1) < Math.abs(overlapX2) ? overlapX1 : overlapX2;
      let dy = Math.abs(overlapY1) < Math.abs(overlapY2) ? overlapY1 : overlapY2;
if(b.hpGive){
 if(!this.invulnerable){
   if(isHost){
this.hp += b.hpGive;
this.hp = clamp(this.hp, 0, 100)
   }
  if(this===me) me.hp=this.hp;
  if(this===me){
   if(isHost){
    connections.forEach(c=>c.send({type:'hp_update',id:hostId,hp:me.hp,death:me.hp<=0,vx:me.parts.pelvis.vx,vy:me.parts.pelvis.vy}));
   } else {
    sendAttack(peer.id,-b.hpGive);
   }
  }
 }
}
 if (Math.abs(dx) < Math.abs(dy)) {
 for (let kk in this.parts) {
  this.parts[kk].x += dx;
  this.parts[kk].vx = 0;
 }
} else {
 for (let kk in this.parts) {
  this.parts[kk].y += dy;
  this.parts[kk].vy = 0;
 }
 if (dy < 0) { 
  pelvis.vy = 0;
  this.parts.chest.vy = 0;
  this.parts.head.vy = 0;
 }
  if (dy < 1 && dy>0)  me.parts.pelvis.y+=15;
 if (dy < 0) this.onGround = true;
}
     }
    }
   }
  }
  if (this.footOnGround.l && pelvis.vx !== 0) pelvis.x += this.parts.lThigh.vx / stepIter;
  if (this.footOnGround.r && pelvis.vx !== 0) pelvis.x += this.parts.rThigh.vx / stepIter;
  for (let i = 0; i < 3; i++) {
   for (let j of this.joints) {
    let a = this.parts[j[0]],
     b = this.parts[j[1]],
     len = j[2];
    let dx = b.x - a.x,
     dy = b.y - a.y,
     dist = Math.hypot(dx, dy);
    if (dist === 0) continue;
    let diff = (dist - len) / 2;
    let nx = dx / dist,
     ny = dy / dist;
    if (len === 0) { b.x = a.x;
     b.y = a.y; }
    else { a.x += nx * diff;
     a.y += ny * diff;
     b.x -= nx * diff;
     b.y -= ny * diff; }
   }
  }
if (this.hp <= 0 && !this.dead) {
 if(Math.random()<0.5){
  if (this.hp <= 0 && !this.dead) {
 this.dead = true
 this.shattered = true
 this.deathTimer = 0
 this.deathDuration = 2000 
 Object.values(this.parts).forEach((p, i) => {
  let angle = (Math.PI * 2 / 10) * i + Math.random() * 0.5
  let speed = 10 + Math.random() * 5
  p.vx = Math.cos(angle) * speed
  p.vy = Math.sin(angle) * speed - 5
  p.startVx = p.vx
  p.startVy = p.vy
 })
}
 }else{
 this.dead = true
 this.shattered = true
 this.deathTimer = 0
 this.deathDuration = 2000
 Object.values(this.parts).forEach((p,i)=>{
  let angle = Math.random() * Math.PI*2 
  let speed = 10 + Math.random()*5
  p.vx = Math.cos(angle) * speed
  p.vy = Math.sin(angle) * speed - 5
  p.startVx = p.vx
  p.startVy = p.vy
 })
 }
}
if (this.dead && this.shattered) {
  this.deathTimer += 10
  let t = Math.min(this.deathTimer / this.deathDuration, 1)
  Object.values(this.parts).forEach(p => {
    p.vx = p.startVx * (1 - t)
    p.vy = p.startVy * (1 - t)
    p.y += 1
  })
}
 }
 draw() {
    ctx.lineWidth = 6;
    for (let j of this.joints) {
        let a = this.parts[j[0]],
            b = this.parts[j[1]];
        ctx.beginPath();
        ctx.strokeStyle = (j[0] === 'lThigh' || j[1] === 'lThigh') ? this.color : this.color;
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
    }
    let h = this.parts.head;
    let r = 12;
    ctx.beginPath();
    ctx.arc(h.x, h.y - r / 1.3, r / 1.3, 0, Math.PI * 2);
    ctx.stroke();
    let barWidth = 50;
let barHeight = 2;
let barX = this.parts.pelvis.x - barWidth / 2;
let barY = this.parts.head.y - 40;
ctx.fillStyle = "red";
ctx.fillRect(barX, barY, barWidth, barHeight);
ctx.strokeStyle = "#444";
ctx.strokeRect(barX, barY, barWidth, barHeight);
ctx.fillStyle = "lime";
ctx.fillRect(barX, barY, barWidth * (this.hp / 100), barHeight+2);
}
 move(x, y) {
  if (!this.dead) {
    let pelvis = this.parts.pelvis;
    let maxSpeed = 3;
if (x === 0) {
    pelvis.vx = 0;
    this.stepPhase = 0;
    this.lastDirection = 0;
} else {
    pelvis.vx += (x * maxSpeed - pelvis.vx) * 0.4;
    if (!this.lastDirection) {
        this.lastDirection = Math.sign(x); 
        this.stepPhase = (x < 0) ? 0 : Math.PI; 
    }
    if (Math.sign(x) !== this.lastDirection) {
        this.stepPhase = (x < 0) ? 0 : Math.PI; 
        this.lastDirection = Math.sign(x);
    }
}
    if (Math.abs(pelvis.vx) == 0) { 
        this.parts.lThigh.vx = pelvis.vx;
        this.parts.rThigh.vx = pelvis.vx;
    }
    if (this.onGround && y < 0) pelvis.vy = -30;
    if (this.onGround && y > 0.8 && !Math.abs(pelvis.vx) > 0) pelvis.y += 2;
    else if ( y > 0.8 && !Math.abs(pelvis.vx) > 0) pelvis.y += 2;
    else if ( !Math.abs(pelvis.vx) > 0) pelvis.y += 1.5;
    let chest = this.parts.chest;
    let head = this.parts.head;
    if (this.onGround) {
        if (Math.abs(pelvis.vx) > 0) {
            if (!this.lastDirection) this.lastDirection = Math.sign(pelvis.vx);
            if (Math.sign(pelvis.vx) !== this.lastDirection) {
                this.stepPhase = (pelvis.vx > 0) ? 0 : Math.PI;
                this.lastDirection = Math.sign(pelvis.vx);
            }
            this.stepPhase += (Math.abs(pelvis.vx) / 1) * this.stepSpeed*2;
            let lLift = Math.sin(this.stepPhase) * 7;
            let rLift = Math.sin(this.stepPhase) * -7 
            this.parts.lThigh.vy = -lLift;
            this.parts.lShin.vy = -lLift / 2;
            this.parts.rThigh.vy = -rLift;
            this.parts.rShin.vy = -rLift / 2;
            this.parts.lThigh.vx = pelvis.vx-1;
            this.parts.rThigh.vx = pelvis.vx;
        } else {
            let spread = 25;
            this.parts.lThigh.x += ((pelvis.x - spread) - this.parts.lThigh.x) * 0.2;
            this.parts.rThigh.x += ((pelvis.x + spread) - this.parts.rThigh.x) * 0.2;
            this.parts.lThigh.y += ((pelvis.y + 20) - this.parts.lThigh.y) * 0.2;
            this.parts.rThigh.y += ((pelvis.y + 20) - this.parts.rThigh.y) * 0.2;
            this.parts.lShin.x += (this.parts.lThigh.x - this.parts.lShin.x) * 0.2;
            this.parts.rShin.x += (this.parts.rThigh.x - this.parts.rShin.x) * 0.2;
            this.parts.lShin.y += ((this.parts.lThigh.y + 20) - this.parts.lShin.y) * 0.2;
            this.parts.rShin.y += ((this.parts.rThigh.y + 20) - this.parts.rShin.y) * 0.2;
        }
        chest.x += (pelvis.x - chest.x) * 1;
        chest.y += ((pelvis.y - 20) - chest.y) * 1;
        head.x += (chest.x - head.x) * 1;
        head.y += ((chest.y - 20) - head.y) * 1;
    } else {
        let spread = 25;
        this.parts.lThigh.x += ((pelvis.x - spread) - this.parts.lThigh.x) * 0.02;
        this.parts.rThigh.x += ((pelvis.x + spread) - this.parts.rThigh.x) * 0.02;
        this.parts.lShin.x += (this.parts.lThigh.x - this.parts.lShin.x) * 0.2;
        this.parts.rShin.x += (this.parts.rThigh.x - this.parts.rShin.x) * 0.2;
        this.parts.lShin.y += ((this.parts.lThigh.y + 20) - this.parts.lShin.y) * 0.2;
        this.parts.rShin.y += ((this.parts.rThigh.y + 20) - this.parts.rShin.y) * 0.2; 
        chest.x += (pelvis.x - chest.x) * 1;
        chest.y += ((pelvis.y - 20) - chest.y) * 1;
        head.x += (chest.x - head.x) * 1;
        head.y += ((chest.y - 20) - head.y) * 1;
    }
    let followSpeed = this.onGround ? 0.02 : 0.5;
    let liftSpeed = 0.1;
    let fallThreshold = 1;
if (!this.onGround && pelvis.vy < 0) {
 let spread = 10;
 this.parts.lThigh.x += ((pelvis.x - spread) - this.parts.lThigh.x) * 0.1;
 this.parts.rThigh.x += ((pelvis.x + spread) - this.parts.rThigh.x) * 0.1;
 this.parts.lThigh.y += ((pelvis.y + 10) - this.parts.lThigh.y) * 0.1;
 this.parts.rThigh.y += ((pelvis.y + 10) - this.parts.rThigh.y) * 0.1;
 this.parts.lShin.x += (this.parts.lThigh.x - this.parts.lShin.x) * 0.2;
 this.parts.rShin.x += (this.parts.rThigh.x - this.parts.rShin.x) * 0.2;
 this.parts.lShin.y += ((this.parts.lThigh.y + 20) - this.parts.lShin.y) * 0.2;
 this.parts.rShin.y += ((this.parts.rThigh.y + 20) - this.parts.rShin.y) * 0.2;
}
if (  this.armClickQueue.length > 0) followSpeed = 0.02;
if (x == 0 &&  this.armClickQueue.length == 0) {
 this.parts.lShoulder.x += (chest.x - 10 - this.parts.lShoulder.x) * followSpeed;
 this.parts.lShoulder.y += (chest.y + 0 - this.parts.lShoulder.y) * followSpeed;
 this.parts.lHand.x += (this.parts.lShoulder.x - 20 - this.parts.lHand.x) * followSpeed;
 this.parts.lHand.y += (this.parts.lShoulder.y + 10 - this.parts.lHand.y) * followSpeed;
 if (!this.onGround && pelvis.vy > fallThreshold) {
  this.parts.lShoulder.y -= liftSpeed * pelvis.vy;
  this.parts.lHand.y -= liftSpeed * pelvis.vy;
 }
}else{
this.parts.lShoulder.x += (chest.x - 10 - this.parts.lShoulder.x) * followSpeed;
this.parts.lShoulder.y += (chest.y + 10 - this.parts.lShoulder.y) * followSpeed;
this.parts.lHand.x += (this.parts.lShoulder.x - 20 - this.parts.lHand.x) * followSpeed;
this.parts.lHand.y += (this.parts.lShoulder.y + 15 - this.parts.lHand.y) * followSpeed;
this.parts.rShoulder.x += (chest.x + 10 - this.parts.rShoulder.x) * followSpeed;
this.parts.rShoulder.y += (chest.y + 10 - this.parts.rShoulder.y) * followSpeed;
this.parts.rHand.x += (this.parts.rShoulder.x + 20 - this.parts.rHand.x) * followSpeed;
this.parts.rHand.y += (this.parts.rShoulder.y + 15 - this.parts.rHand.y) * followSpeed;
}if (this.onGround && Math.abs(pelvis.vx) > 0) {
    let armSwing = 0;
    this.parts.lShoulder.y = chest.y + 10 - armSwing;
    this.parts.lHand.y = this.parts.lShoulder.y + 15 - armSwing / 2;
    this.parts.rShoulder.y = chest.y + 10 + armSwing;
    this.parts.rHand.y = this.parts.rShoulder.y + 15 + armSwing / 2;
    this.parts.lShoulder.x = chest.x - 10 - armSwing / 2;
    this.parts.lHand.x = this.parts.lShoulder.x - 20 - armSwing / 2;
    this.parts.rShoulder.x = chest.x + 10 + armSwing / 2;
    this.parts.rHand.x = this.parts.rShoulder.x + 20 + armSwing / 2;
}
    this.parts.rShoulder.x += (chest.x + 10 - this.parts.rShoulder.x) * followSpeed;
    this.parts.rShoulder.y += (chest.y + 0 - this.parts.rShoulder.y) * followSpeed;
    this.parts.rHand.x += (this.parts.rShoulder.x + 20 - this.parts.rHand.x) * followSpeed;
    this.parts.rHand.y += (this.parts.rShoulder.y +10 - this.parts.rHand.y) * followSpeed;
    if (!this.onGround && pelvis.vy > fallThreshold) {
        this.parts.rShoulder.y -= liftSpeed * pelvis.vy;
        this.parts.rHand.y -= liftSpeed * pelvis.vy;
    }
    chest.vx = 0;
    chest.vy = 0;
    head.vx = 0;
    head.vy = 0;
}else{
}
 }
 moveArms() {
 if (!this.dead) {
  if (this.armClickQueue.length === 0 && this.activeArm.length === 0) {
   this.parts.lHand.attacking = false
   this.parts.rHand.attacking = false
   return;
  }
  if (this.activeArm.length === 0 && this.armClickQueue.length > 0) {
   if (this.nextArm === "l") {
    this.activeArm.push("l");
    this.nextArm = "r";
   } else {
    this.activeArm.push("r");
    this.nextArm = "l";
   }
   this.armStartTime = Date.now();
  }
  let arm = this.activeArm[0];
  this.parts.lHand.attacking = arm === "l";
  this.parts.rHand.attacking = arm === "r";
  let shoulder = arm === "l" ? this.parts.lShoulder : this.parts.rShoulder;
  let hand = arm === "l" ? this.parts.lHand : this.parts.rHand;
  let target = this.armClickQueue[0];
  let dx = target.x - shoulder.x;
  let dy = target.y - shoulder.y;
  let dist = Math.hypot(dx, dy);
  let maxLen = 30;
  if (dist > maxLen) {
   let ratio = maxLen / dist;
   hand.x = shoulder.x + dx * ratio;
   hand.y = shoulder.y + dy * ratio;
  } else {
   hand.x = target.x;
   hand.y = target.y;
  }
  if (Date.now() - this.armStartTime >= this.armDuration) {
   this.activeArm.shift();
   this.armClickQueue.shift();
   this.parts.lHand.attacking = false;
   this.parts.rHand.attacking = false;
  }
 }
}
}
canvas.addEventListener("click", (e) => {
 const now = Date.now();
 if (now - me.lastArmTime < me.armCooldown) return; 
 const rect = canvas.getBoundingClientRect();
 const scale = 0.5;
 const camX = canvas.width / (zoom * 1) / 4 - me.parts.pelvis.x;
 const camY = canvas.width / (zoom * 1) / 4 - me.parts.pelvis.x
 const x = (e.clientX - rect.left - (canvas.width / (zoom * 1) / 4 - me.parts.pelvis.x) * (zoom)) / (zoom);
const y = (e.clientY - rect.top - (canvas.height / (zoom * 1) / 4  - me.parts.pelvis.y) * (zoom)) / (zoom);
 me.armClickQueue.push({ x, y });
 me.lastArmTime = now; 
});
class Block{
 constructor(x,y,w,h,hpGive,collision,color,pushable){
  this.x=x;this.y=y;this.w=w;this.h=h;this.hpGive=hpGive;this.collision=collision;this.color=color;this.pushable=pushable;this.vx=0;this.vy=0;
 }
 step(blocks){
  if(this.pushable){
   this.vy+=0.4;this.x+=this.vx;this.y+=this.vy;
   const maxSpeed=5;this.vx=Math.max(-maxSpeed,Math.min(this.vx,maxSpeed));this.vy=Math.max(-maxSpeed,Math.min(this.vy,maxSpeed));
   for(let b of blocks){
    if(b===this||!b.collision||b.pushable) continue;
    let overlapX=Math.min(this.x+this.w-b.x,b.x+b.w-this.x);
    let overlapY=Math.min(this.y+this.h-b.y,b.y+b.h-this.y);
    if(overlapX>0&&overlapY>0){
     if(overlapX<overlapY){ if(this.x<b.x) this.x-=overlapX; else this.x+=overlapX; this.vx=0; } else { if(this.y<b.y) this.y-=overlapY; else this.y+=overlapY; this.vy=0; }
    }
   }
   this.vx*=0.85;this.vy*=0.85;
  }
 }
 draw(){ ctx.fillStyle=this.color;ctx.fillRect(this.x,this.y,this.w,this.h); }
}
class Block2 extends Block {
 constructor(x1, y1, x2, y2, hpGive, collision, color, pushable) {
  super(Math.min(x1,x2), Math.min(y1,y2), Math.abs(x2-x1), Math.abs(y2-y1), hpGive, collision, color, pushable);
 }
}
function randomColor() {
	let colors = ["lime", "red", "blue", "orange", "yellow", "cyan", "magenta", "white"];
	return colors[Math.floor(Math.random() * colors.length)];
}
let me = new Stickman(10, 1450, randomColor());
let blocks = []; 
let map1 = [
 new Block(-200,   1300, 200, 20, 0, true, "#777"),  new Block(-5000, 1600, 8000, 20000, -5, true, "#700"), new Block(-500, 1500, 800, 200, 0, true, "#777"), 
];
let map2 = [
	new Block2(-4500, 4500, 4500, 1570, 0, true, "#777"), 
	new Block2(-4500, 90, -200, 4500, 0, true, "#777"), 
	new Block2(800, 90, 4500, 4500, 0, true, "#777"), 
	new Block2(-4500, -4500, 4500, 1000, 0, true, "#777") 
];
let map3 = [
	new Block2(-4500, 90, -200, 4500, -5, true, "#700"), 
	new Block2(800, 90, 4500, 4500, -5, true, "#700"), 
	new Block2(-4500, -4500, 4500, 1000, 0, true, "#777"), 
	new Block2(250, 1250, 350, 1270, 0.05, true, "#575"), 
	new Block2(260, 1250+50, 340, 1270+140, 0, true, "#553",true), 
	new Block2(-4500, 4500, 4500, 1570, 0, true, "#777"), 
];
let allMaps = [  map1];
function UpdMap() {
 let idx = Math.floor(Math.random() * allMaps.length);
 blocks = allMaps[idx];
}
UpdMap(); 
const joy = document.getElementById("joystick"),
 stick = document.getElementById("stick");
let joyCenter = { x: 60, y: 60 },
 dir = 0,
 joyY = 0;
joy.addEventListener("touchend", () => { stick.style.left = "30px";
 stick.style.top = "30px";
 dir = 0;
 joyY = 0 }, false);
joy.addEventListener("touchmove", e => {
 e.preventDefault();
 let t = e.touches[0],
  r = joy.getBoundingClientRect();
 let dx = t.clientX - r.left - joyCenter.x;
 let dy = t.clientY - r.top - joyCenter.y;
 dir = (dx > 15) ? 1 : (dx < -15 ? -1 : 0);
 joyY = (dy > 20) ? 1 : (dy < -20 ? -1 : 0);
 stick.style.left = (joyCenter.x + Math.max(-40, Math.min(40, dx)) - 30) + "px";
 stick.style.top = (joyCenter.y + Math.max(-40, Math.min(40, dy)) - 30) + "px";
}, false);
let roundEnding = false;
let countdown = 8;
function checkWin() {
  if(!isHost || roundEnding) return;
  let alivePlayers = players.filter(p => p.stickman.hp > 0);
  if(alivePlayers.length === 1 && players.length > 1 && !roundEnding){
    roundEnding = true;
    let winner = alivePlayers[0];
    showWinner(winner.stickman.color); 
    startCountdown(winner);
    connections.forEach(c => c.send({
      type:'round_win',
      winnerId: winner.id,
      color: winner.stickman.color
    }));
  }
}
function startCountdown(winner){
  countdown = 8;
  let interval = setInterval(()=>{
    connections.forEach(c => c.send({type:'countdown', time: countdown}));
    countdown--;
    if(countdown < 0){
      clearInterval(interval);
      newRound();
      roundEnding = false;
    }
  }, 1000);
}
function newRound(){
 UpdMap();
 const startX=10,startY=1450;
 const invDur=3000,healDelay=500;
 players.forEach((p,index)=>{
  let s=p.stickman;
  let sx=startX+index*80,sy=startY-60;
  Object.keys(s.parts).forEach(part=>{ s.parts[part].x=sx; s.parts[part].y=sy; s.parts[part].vx=0; s.parts[part].vy=0; });
  s.parts.chest.y-=20; s.parts.head.y-=40; s.parts.lThigh.x-=8; s.parts.rThigh.x+=8;
  s.parts.lShin.y+=20; s.parts.rShin.y+=20; s.parts.lShoulder.x-=10; s.parts.rShoulder.x+=10;
  s.parts.lHand.x-=30; s.parts.rHand.x+=30;
  s.hp=100; s.dead=false; s.death=false; s.shattered=false; s.deathTimer=0; s.deathDuration=0;
  s.invulnerable=true; s.invulnerableUntil=Date.now()+invDur;
  if(p.id===hostId) me.invulnerable=true;
 });
 connections.forEach(c=>{
  c.send({
   type:'round_start',
   players:players.map((p,i)=>({id:p.id,x:startX+i*80,y:startY-60})),
   blocks:blocks.map(b=>({x:b.x,y:b.y,w:b.w,h:b.h,hpGive:b.hpGive,collision:b.collision,color:b.color,pushable:b.pushable})),
   invulnerableDuration:invDur,
   healDelay:healDelay
  });
 });
connections.forEach(c=>{
  c.send({
    type: 'player_reset',
    id: null, 
    parts: null,
    batch: players.map(p => ({ id: p.id, parts: serializeParts(p.stickman.parts), hp: p.stickman.hp }))
  });
});
 setTimeout(()=>{
  if(!isHost) return;
  players.forEach(p=>{
   p.stickman.hp=100;
   connections.forEach(c=>c.send({type:'hp_update',id:p.id,hp:p.stickman.hp,death:false,vx:p.stickman.parts.pelvis.vx,vy:p.stickman.parts.pelvis.vy}));
   if(p.id===hostId) me.hp=100;
  });
 },healDelay);
 setTimeout(()=>{
  players.forEach(p=>{ p.stickman.invulnerable=false; if(p.id===hostId) me.invulnerable=false; });
  connections.forEach(c=>c.send({type:'hp_update_batch',players:players.map(p=>({id:p.id,hp:p.stickman.hp,death:p.stickman.hp<=0,vx:p.stickman.parts.pelvis.vx,vy:p.stickman.parts.pelvis.vy}))}));
 },invDur);
 roundWinColor=false; countdownText="";
}
let roundWinColor = false;
let countdownText = "";
function showWinner(color) {
 roundWinColor = color;
 countdownText = "";
}
function showCountdown(time){
  countdown = time;
}
function loop() {
 ctx.clearRect(0, 0, canvas.width, canvas.height);
 ctx.save();
ctx.scale(zoom, zoom)
ctx.translate(canvas.width / (zoom*1) /4- me.parts.pelvis.x, canvas.height / (zoom*1) /4- me.parts.pelvis.y);
 if (!Array.isArray(blocks)) return;
for (let b of blocks) {
	b.step(blocks);
	b.draw();
}
me.move(dir, joyY);
me.step(blocks);
me.moveArms();
me.draw();
for (let i = 0; i < players.length; i++){
 let p = players[i];
 if(p.id === peer.id) continue;
 if(!p.stickman||!p.stickman.parts) continue;
 p.stickman.draw();
}
if(isHost){
 for(let i=0;i<players.length;i++){
  let attacker=players[i].stickman;
  if(!attacker) continue;
  ['lHand','rHand'].forEach(hand=>{
   if(!attacker.parts[hand].attacking) return;
   for(let j=0;j<players.length;j++){
    if(i===j) continue;
    let target=players[j].stickman;
    let dx=attacker.parts[hand].x-target.parts.pelvis.x;
    let dy=attacker.parts[hand].y-target.parts.pelvis.y;
    if(Math.hypot(dx,dy)<20){
     target.hp=Math.max(0,target.hp-1);
     let mag=Math.max(1,Math.hypot(dx,dy));
     let dxn=dx/mag, dyn=dy/mag;
     target.parts.pelvis.vx+=dxn*5; target.parts.pelvis.vy+=dyn*3;
     if(players[j].id===peer.id){ me.hp=target.hp; me.parts.pelvis.vx=target.parts.pelvis.vx; me.parts.pelvis.vy=target.parts.pelvis.vy; }
     let conn=connections.find(c=>c.peer===players[j].id);
     if(conn) conn.send({type:'hp_update',id:players[j].id,hp:target.hp,death:target.hp<=0,vx:target.parts.pelvis.vx,vy:target.parts.pelvis.vy});
    }
   }
  });
 }
}
if(me.attackCooldown>0) me.attackCooldown--;
 ctx.fillStyle = "#fff";
 ctx.font = "20px sans-serif";
 if (me.hp <= 0) { ctx.fillStyle = "#fff";
  ctx.font = "40px sans-serif";
  ctx.fillText("GAME OVER", me.parts.pelvis.x - 100, me.parts.head.y -50 ); } 
 ctx.restore();
if (roundWinColor) {
 ctx.fillStyle = roundWinColor;
 ctx.font = "30px sans-serif";
 ctx.fillText("PLAYER " + roundWinColor.toUpperCase() + " WIN",
   canvas.width/2*zoom - 150, canvas.height/2*zoom - 20);
 ctx.fillStyle = "#fff";
 ctx.font = "25px sans-serif";
 if(isHost){
 	ctx.fillText("Starting new game in: " + countdown + "s",
	canvas.width / 2 * zoom - 150, canvas.height / 2 * zoom + 30);
 }else{
 	ctx.fillText("Starting new game in: " + (parseFloat(countdown )-1) + "s",
	canvas.width / 2 * zoom - 150, canvas.height / 2 * zoom + 30);
 }
}
 if(isHost) checkWin();
 setTimeout(loop, 10)
}
loop();
