/* LIMITLESS OFFROAD — original procedural artwork, no external libraries or assets. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const canvas = $('game'), ctx = canvas.getContext('2d');
  const W = 1200, H = 760, TAU = Math.PI * 2, ROAD = 47, TOTAL_LAPS = 3;
  const controls = new Set(['Space', 'KeyA', 'KeyD', 'KeyW']);
  const keys = new Set();
  // Smooth, clockwise circuit. Every sample is a race-progress checkpoint.
  const anchors = [[590,657],[340,657],[170,604],[134,464],[154,282],[230,154],[410,139],[498,215],[669,236],[804,153],[1014,168],[1061,291],[927,354],[752,345],[602,359],[573,452],[749,500],[964,478],[1040,552],[976,639],[788,658]];
  const track = [];
  for (let i=0;i<anchors.length;i++) {
    const p0=anchors[(i+anchors.length-1)%anchors.length],p1=anchors[i],p2=anchors[(i+1)%anchors.length],p3=anchors[(i+2)%anchors.length];
    for(let j=0;j<18;j++) { const t=j/18,t2=t*t,t3=t2*t;
      track.push({x:.5*(2*p1[0]+(-p0[0]+p2[0])*t+(2*p0[0]-5*p1[0]+4*p2[0]-p3[0])*t2+(-p0[0]+3*p1[0]-3*p2[0]+p3[0])*t3),y:.5*(2*p1[1]+(-p0[1]+p2[1])*t+(2*p0[1]-5*p1[1]+4*p2[1]-p3[1])*t2+(-p0[1]+3*p1[1]-3*p2[1]+p3[1])*t3)});
    }
  }
  const N=track.length, lengths=[0];
  for(let i=1;i<=N;i++){const a=track[i-1],b=track[i%N];lengths.push(lengths[i-1]+Math.hypot(b.x-a.x,b.y-a.y));}
  const circuitLength=lengths[N];
  function nearest(x,y){let best={distance:Infinity,index:0,progress:0,x:0,y:0};for(let i=0;i<N;i++){const a=track[i],b=track[(i+1)%N],dx=b.x-a.x,dy=b.y-a.y;const t=Math.max(0,Math.min(1,((x-a.x)*dx+(y-a.y)*dy)/(dx*dx+dy*dy)));const px=a.x+dx*t,py=a.y+dy*t,d=Math.hypot(x-px,y-py);if(d<best.distance)best={distance:d,index:i,progress:lengths[i]+t*(lengths[i+1]-lengths[i]),x:px,y:py};}return best;}
  function angleAt(i){const a=track[(i+N)%N],b=track[(i+1+N)%N];return Math.atan2(b.y-a.y,b.x-a.x);}
  // Arc-length following keeps rivals on the circuit, with separate racing lines.
  function pointAt(distance, lane=0) {
    const d=(distance%circuitLength+circuitLength)%circuitLength;
    let low=0,high=N-1;
    while(low<high){const mid=Math.floor((low+high)/2);if(lengths[mid+1]<d)low=mid+1;else high=mid;}
    const i=low,a=track[i],b=track[(i+1)%N],t=(d-lengths[i])/(lengths[i+1]-lengths[i]),angle=angleAt(i);
    return {x:a.x+(b.x-a.x)*t-Math.sin(angle)*lane,y:a.y+(b.y-a.y)*t+Math.cos(angle)*lane,angle,index:i};
  }
  const rivals=[];
  function resetRivals(){
    rivals.splice(0,rivals.length,...[
      {name:'ROOK',color:'#54b8e3',trim:'#bbebff',lane:-25,pace:205},
      {name:'VALE',color:'#ba91e5',trim:'#e3d1ff',lane:25,pace:188}
    ].map(r=>({...r,...pointAt(0,r.lane),progress:0,speed:0,wheelPhase:0,wheelie:0,air:0,finishTime:null})));
  }
  function updateRivals(dt, raceTime=elapsed){
    for(const r of rivals){
      if(r.finishTime!==null)continue;
      const ahead=pointAt(r.progress+65).angle,here=pointAt(r.progress).angle;
      const bend=Math.abs(Math.atan2(Math.sin(ahead-here),Math.cos(ahead-here)));
      const target=r.pace*(1-Math.min(.42,bend*.38));
      r.speed+=Math.max(-230*dt,Math.min(125*dt,target-r.speed));
      r.wheelie+=(r.progress>circuitLength*TOTAL_LAPS-150?1-r.wheelie:-r.wheelie)*Math.min(1,dt*6);
      r.wheelPhase=(r.wheelPhase+r.speed*dt/10)%TAU;
      r.progress+=r.speed*dt;
      if(r.progress>=circuitLength*TOTAL_LAPS){r.finishTime=raceTime-(r.progress-circuitLength*TOTAL_LAPS)/r.speed;r.progress=circuitLength*TOTAL_LAPS;captureWinner(r,r.finishTime);r.speed=0;}
      Object.assign(r,pointAt(r.progress,r.lane));
      r.air=0;for(const i of [92,292,...humpIndices]){const d=((r.progress%circuitLength)-lengths[i]+circuitLength)%circuitLength;if(d<70&&r.speed>130)r.air=.65*(1-d/70);}
    }
  }
  function raceOrder(){
    return [{name:rider,color:'#96d83d',progress,finishTime:state==='finished'?elapsed:null,player:true},...rivals].sort((a,b)=>{
      if(a.finishTime!==null&&b.finishTime!==null)return a.finishTime-b.finishTime;
      if(a.finishTime!==null)return -1;if(b.finishTime!==null)return 1;
      return b.progress-a.progress;
    });
  }
  const bales=[],fans=[];
  const shirts=['#ed7043','#f3df9b','#72bace','#d5c7e6','#e9eee0'];
  function drawBale(c,b){c.save();c.translate(b.x,b.y);c.rotate(b.angle);c.fillStyle='#4e4b2e45';c.fillRect(-13,-6,30,19);c.fillStyle='#8b642d';c.fillRect(-15,-7,30,25);c.fillStyle='#b88b36';c.fillRect(-15,-10,30,20);c.fillStyle='#dfb75a';c.fillRect(-15,-10,29,16);c.strokeStyle='#f4d785';c.lineWidth=1;for(let k=-10;k<14;k+=5){c.beginPath();c.moveTo(k,-7);c.lineTo(k+3,3);c.stroke();}c.fillStyle='#876a37';c.fillRect(-9,-10,2,19);c.fillRect(7,-10,2,19);c.restore();}
  function addCrowdAndBarriers(){
    // Selected stretches leave access gaps and keep every bale outside the road.
    for(const [from,to,side] of [[12,65,-1],[83,111,-1],[139,180,-1],[213,236,1],[285,310,1],[328,361,-1],[10,33,1]]){
      for(let d=lengths[from];d<lengths[to];d+=34){const p=pointAt(d,side*65);if(nearest(p.x,p.y).distance<60||p.x<36||p.x>1164||p.y<40||p.y>720)continue;bales.push(p);}
    }
    // Standing supporters behind the hay on three open stretches.
    for(const [from,to,side] of [[16,34,-1],[144,166,-1],[43,60,-1]]){
      for(let d=lengths[from];d<lengths[to];d+=23){const p=pointAt(d,side*94);if(nearest(p.x,p.y).distance<80||p.x<30||p.x>1170||p.y<45||p.y>730)continue;fans.push({...p,angle:p.angle+(side>0?-Math.PI/2:Math.PI/2),phase:fans.length*.9,seated:false,color:shirts[fans.length%shirts.length]});}
    }
    // A dedicated infield spectator terrace, with two wooden benches.
    g.fillStyle='#c5ba8e';g.fillRect(288,269,202,91);g.strokeStyle='#a49e73';g.lineWidth=3;g.strokeRect(288,269,202,91);
    for(const y of [289,323]){g.fillStyle='#514b32';for(const x of [309,467])g.fillRect(x,y-5,5,23);g.fillStyle='#997049';g.fillRect(300,y,178,12);g.fillStyle='#c69b63';g.fillRect(300,y,178,4);g.fillRect(300,y+7,178,4);g.fillStyle='#805b3f';g.fillRect(300,y+16,178,4);
      for(let i=0;i<7;i++)fans.push({x:313+i*25,y:y+3,angle:-Math.PI/2,phase:i*.8+y,seated:true,color:shirts[(i+(y===289?0:2))%shirts.length]});
    }
    g.fillStyle='#e8e8c9';g.fillRect(325,365,129,18);g.fillStyle='#42513b';g.font='bold 9px monospace';g.fillText('PERRIS FAN ZONE',331,377);
    // Hay guards the track-facing side of the seating area.
    for(let x=303;x<=473;x+=34){const b={x,y:253,angle:0};if(nearest(x,253).distance>60){bales.push(b);}}
  }
  function drawFans(){
    const t=state==='menu'?0:elapsed;
    for(const f of fans){ctx.save();ctx.translate(f.x,f.y);ctx.rotate(f.angle);const wave=Math.sin(t*(cheerTime>0?14:7)+f.phase)*(cheerTime>0?1.5:1);ctx.fillStyle='#25332635';ctx.beginPath();ctx.ellipse(3,4,9,7,0,0,TAU);ctx.fill();ctx.strokeStyle='#283f3c';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-2,-3);ctx.lineTo(f.seated?5:-7,-4);ctx.moveTo(-2,3);ctx.lineTo(f.seated?5:-7,4);ctx.stroke();ctx.fillStyle=f.color;ctx.fillRect(-4,-5,9,10);if(cheerTime>0){ctx.fillStyle=cheerColor;ctx.fillRect(8+wave*3,-16,8,5);}ctx.strokeStyle=f.color;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(1,-4);ctx.lineTo(5+wave*2,-9);ctx.lineTo(9+wave*3,-10);ctx.moveTo(1,4);ctx.lineTo(5-wave*2,9);ctx.lineTo(9-wave*3,11);ctx.stroke();ctx.fillStyle=f.phase%3<1?'#915e42':'#e4b68a';ctx.beginPath();ctx.arc(3,0,4,0,TAU);ctx.fill();ctx.fillStyle='#473e30';ctx.beginPath();ctx.arc(1.5,0,3,Math.PI/2,Math.PI*1.5);ctx.fill();ctx.restore();}
  }
  function collideBales(dt=1/120){
    let touched=false;
    for(const b of bales){const dx=bike.x-b.x,dy=bike.y-b.y,c=Math.cos(b.angle),s=Math.sin(b.angle),x=dx*c+dy*s,y=-dx*s+dy*c;
      const qx=Math.max(-15,Math.min(15,x)),qy=Math.max(-10,Math.min(10,y));let nx=x-qx,ny=y-qy,d=Math.hypot(nx,ny);
      if(d>=10)continue;
      let depth=10.5-d;if(d<.001){if(15-Math.abs(x)<10-Math.abs(y)){nx=x<0?-1:1;ny=0;depth=10.5+15-Math.abs(x);}else{nx=0;ny=y<0?-1:1;depth=10.5+10-Math.abs(y);}d=1;}
      nx/=d;ny/=d;bike.x+=(nx*c-ny*s)*depth;bike.y+=(nx*s+ny*c)*depth;touched=true;
    }
    if(!touched)return;
    // One mild loss per impact, never a per-frame braking multiplier.
    if(bike.bumpCooldown<=0){bike.speed*=.9;bike.bumpCooldown=.9;if(toastTime<=0)notify('GLANCE & GO · HOLD GAS');}
    const road=nearest(bike.x,bike.y),dx=road.x-bike.x,dy=road.y-bike.y,d=Math.hypot(dx,dy)||1;
    bike.slideX=dx/d*100;bike.slideY=dy/d*100;bike.glide=.8;
    // Turn away from the barrier and along the circuit instead of trapping the front wheel.
    const a=angleAt(road.index),target=Math.atan2(Math.sin(a)+dy/d*.8,Math.cos(a)+dx/d*.8);
    const turn=Math.atan2(Math.sin(target-bike.angle),Math.cos(target-bike.angle));bike.angle+=turn*Math.min(1,dt*16);
  }
  let leaderId=null,pendingLeader=null,leaderHold=0,cheerTime=0,cheerName='',cheerColor='#b7e760';
  let audioCtx=null,cheerGain=null,soundEnabled=true;
  try{soundEnabled=localStorage.getItem('limitless-sound')!=='off';}catch{}
  function soundLabel(){$('soundButton').textContent=soundEnabled?'Crowd sound: ON':'Crowd sound: OFF';$('soundButton').setAttribute('aria-pressed',String(soundEnabled));}
  function unlockAudio(){if(!soundEnabled)return;try{const A=window.AudioContext||window.webkitAudioContext;if(!A)return;if(!audioCtx)audioCtx=new A();if(audioCtx.state==='suspended')audioCtx.resume().catch(()=>{});}catch{}}
  function stopCheer(){if(cheerGain&&audioCtx){cheerGain.gain.cancelScheduledValues(audioCtx.currentTime);cheerGain.gain.setTargetAtTime(0,audioCtx.currentTime,.035);}}
  function crowdSound(){
    if(!soundEnabled||!audioCtx||audioCtx.state!=='running')return;
    stopCheer();const now=audioCtx.currentTime,duration=1.9,mix=audioCtx.createGain();cheerGain=mix;mix.connect(audioCtx.destination);mix.gain.setValueAtTime(0,now);mix.gain.linearRampToValueAtTime(.12,now+.18);mix.gain.exponentialRampToValueAtTime(.001,now+duration);
    const buffer=audioCtx.createBuffer(1,Math.ceil(audioCtx.sampleRate*duration),audioCtx.sampleRate),data=buffer.getChannelData(0);let smooth=0;for(let i=0;i<data.length;i++){smooth=.65*smooth+.35*(Math.random()*2-1);data[i]=smooth;}
    const noise=audioCtx.createBufferSource(),filter=audioCtx.createBiquadFilter();noise.buffer=buffer;filter.type='bandpass';filter.frequency.value=950;filter.Q.value=.55;noise.connect(filter);filter.connect(mix);noise.start(now);noise.stop(now+duration);
    // Overlapping rising voices give the crowd a short, original cheer.
    for(let i=0;i<7;i++){const voice=audioCtx.createOscillator(),gain=audioCtx.createGain();voice.type='triangle';voice.frequency.setValueAtTime(190+i*37,now);voice.frequency.linearRampToValueAtTime(290+i*43,now+.35);voice.frequency.linearRampToValueAtTime(210+i*30,now+1.5);gain.gain.value=.055;voice.connect(gain);gain.connect(mix);voice.start(now+i*.035);voice.stop(now+duration);}
    noise.onended=()=>{mix.disconnect();filter.disconnect();if(cheerGain===mix)cheerGain=null;};
  }
  function updateLeader(dt){
    cheerTime=Math.max(0,cheerTime-dt);$('crowdCall').hidden=cheerTime===0;
    const first=raceOrder()[0],id=first.player?'player':first.name;
    if(first.progress<35)return;
    if(id===leaderId){pendingLeader=null;leaderHold=0;return;}
    if(pendingLeader!==id){pendingLeader=id;leaderHold=0;}
    leaderHold+=dt;if(leaderHold<.35)return;
    leaderId=id;leaderHold=0;cheerTime=3;cheerName=first.name;cheerColor=first.color;
    $('crowdCall').textContent=`${cheerName} TAKES THE LEAD! · THE CROWD GOES WILD`;$('crowdCall').style.borderColor=cheerColor;$('crowdCall').hidden=false;crowdSound();
  }
  function throwDirt(r,turn,dt){
    if(r.speed<65||r.air>0)return;
    const sharp=Math.abs(turn)>.35&&r.speed>100,rate=sharp?95:18;
    if(random()>rate*dt)return;
    for(let i=0;i<(sharp?3:1);i++){
      const spread=(random()-.5)*(sharp?1.3:.6),a=r.angle+Math.PI+spread+(sharp?Math.sign(turn)*.35:0),v=sharp?65+random()*100:25+random()*25,life=sharp?.45+random()*.5:.65;
      particles.push({x:r.x-Math.cos(r.angle)*24,y:r.y-Math.sin(r.angle)*24,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life,max:life,r:sharp?1+random()*2:3+random()*3,clod:sharp&&i>0});
    }
  }
  const humpIndices=[26,38,104,273,312,344];
  function humpHeight(x,y){
    let height=0;
    for(const i of humpIndices){const p=track[i],a=angleAt(i),dx=x-p.x,dy=y-p.y,u=dx*Math.cos(a)+dy*Math.sin(a),v=-dx*Math.sin(a)+dy*Math.cos(a);const radius=u*u/(37*37)+v*v/(39*39);if(radius<1)height=Math.max(height,16*Math.pow(1-radius,.65));}
    return height;
  }
  function drawDirtHumps(){
    for(const i of humpIndices){const p=track[i],a=angleAt(i);g.save();g.translate(p.x,p.y);g.rotate(a);
      function face(points,color){g.fillStyle=color;g.beginPath();points.forEach((p,i)=>i?g.lineTo(...p):g.moveTo(...p));g.closePath();g.fill();}
      // Broad earthen ramps with an uneven crest, not round dome obstacles.
      face([[-32,-33],[19,-35],[46,-15],[46,32],[11,44],[-35,30]],'#73472f55');
      face([[-38,-30],[-13,-34],[5,-20],[2,22],[-16,34],[-39,29]],'#c58c53');
      face([[-13,-34],[9,-32],[21,-17],[19,19],[2,22],[5,-20]],'#e1ad70');
      face([[9,-32],[36,-25],[39,27],[19,33],[19,19],[21,-17]],'#86502d');
      face([[-16,34],[2,22],[19,19],[19,33],[4,38]],'#a56536');
      g.strokeStyle='#efc18a';g.lineWidth=2;g.beginPath();g.moveTo(-13,-33);g.lineTo(5,-20);g.lineTo(2,21);g.stroke();
      // Stipple and short tire ruts echo the rough dirt of classic arcade tracks.
      for(let j=0;j<110;j++){const x=Math.sin(j*13.7+i)*32,y=Math.cos(j*9.3+i)*28;g.fillStyle=j%3?'#70422255':'#efbf8466';g.fillRect(x,y,2+(j%2),2);}
      for(const y of [-18,-9,9,18]){g.strokeStyle='#754c3255';g.lineWidth=1.5;g.beginPath();g.moveTo(-36,y);g.lineTo(-19,y-2);g.lineTo(-7,y-5);g.stroke();}g.restore();
    }
  }
  let seed=1707;function random(){seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}
  const scenery=document.createElement('canvas');scenery.width=W;scenery.height=H;const g=scenery.getContext('2d');
  function path(c){c.beginPath();track.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.closePath();}
  function strokeRoad(color,width,dash=[]){path(g);g.strokeStyle=color;g.lineWidth=width;g.lineJoin='round';g.setLineDash(dash);g.stroke();g.setLineDash([]);}
  function buildScenery(){
    g.fillStyle='#7e8a68';g.fillRect(0,0,W,H);
    for(let i=0;i<5600;i++){g.fillStyle=random()>.5?'#93a07a40':'#52674d30';const x=random()*W,y=random()*H;g.fillRect(x,y,1+random()*4,1+random()*3);}
    strokeRoad('#657653',119);strokeRoad('#ded6ac',104);strokeRoad('#b56c49',96);strokeRoad('#c5895d',86);strokeRoad('#cc9569',64);strokeRoad('#b2795330',27,[8,15]);
    for(let i=0;i<2700;i++){const x=random()*W,y=random()*H;if(nearest(x,y).distance<42){g.fillStyle=random()>.4?'#e8b98545':'#915b4630';g.fillRect(x,y,random()*3+1,random()*2+1);}}
    // Alternating painted kerbs on the outside of corners.
    for(let i=0;i<N;i+=3){if(i%54>30)continue;const p=track[i],a=angleAt(i);g.save();g.translate(p.x-Math.sin(a)*50,p.y+Math.cos(a)*50);g.rotate(a);g.fillStyle=i%6?'#e9e7cc':'#b44e36';g.fillRect(-7,-3,14,6);g.restore();}
    for(let i=0;i<100;i++){const x=30+random()*(W-60),y=80+random()*(H-110);if(nearest(x,y).distance<76|| (x>315&&x<545&&y>340&&y<510))continue;g.fillStyle='#354f3d25';g.beginPath();g.ellipse(x+5,y+5,13,8,0,0,TAU);g.fill();g.fillStyle=random()>.4?'#596f49':'#a2a583';g.beginPath();g.arc(x,y,5+random()*8,0,TAU);g.fill();g.fillStyle='#c1c89a35';g.beginPath();g.arc(x-2,y-3,3,0,TAU);g.fill();}
    // Direction arrows are intentionally placed away from the starting grid.
    for(let i=34;i<N;i+=43){const p=track[i],a=angleAt(i);g.save();g.translate(p.x,p.y);g.rotate(a);g.strokeStyle='#f6d8a889';g.lineWidth=3;g.beginPath();g.moveTo(-7,-7);g.lineTo(1,0);g.lineTo(-7,7);g.stroke();g.restore();}
    for(const i of [92,292]){const p=track[i],a=angleAt(i);g.save();g.translate(p.x,p.y);g.rotate(a);g.fillStyle='#85563b';g.fillRect(-15,-34,30,68);for(let k=-12;k<=12;k+=6){g.fillStyle='#d7a772';g.fillRect(k,-34,2,68);}g.restore();}
    g.save();g.translate(track[0].x,track[0].y);g.rotate(angleAt(0));for(let a=0;a<2;a++)for(let b=0;b<10;b++){g.fillStyle=(a+b)%2?'#f1edda':'#334333';g.fillRect(a*7-7,b*9-45,7,9);}g.restore();
    g.fillStyle='#394c36';g.font='bold 10px monospace';g.fillText('START / FINISH',546,723);
    g.save();g.translate(385,413);g.rotate(-.07);g.fillStyle='#e4e4c6';g.font='italic 900 27px Arial';g.fillText('LIMITLESS',-60,0);g.fillText('OFFROAD',-55,30);g.fillStyle='#d2d9b1';g.font='9px monospace';g.fillText('PERRIS, CA • 01',-46,58);g.restore();
    g.strokeStyle='#536447';g.lineWidth=2;g.strokeRect(17,17,W-34,H-34);
    g.fillStyle='#dfe1bd';g.font='10px monospace';g.fillText('↑ NORTH RIDGE',825,72);
  }
  buildScenery();
  drawDirtHumps();
  addCrowdAndBarriers();
  let state='splash',bike,elapsed=0,lapStart=0,lap=1,splits=[],progress=0,previousProgress=0,lastSafe=0,count=3,particles=[],toastTime=0,clockLast=0,accumulator=0,wheelieSeconds=0;
  let records={};try{records=JSON.parse(localStorage.getItem('dustline-records-v1')||'{}')||{};if(typeof records!=='object')records={};$('playerName').value=localStorage.getItem('dustline-rider')||'';}catch{records={};}
  let rider='RIDER';
  const format=t=>{const cs=Math.floor(Math.max(0,t)*100);return `${String(Math.floor(cs/6000)).padStart(2,'0')}:${String(Math.floor(cs/100)%60).padStart(2,'0')}.${String(cs%100).padStart(2,'0')}`;};
  function record(){const v=records[rider];return typeof v==='number'&&isFinite(v)&&v>0?v:null;}
  function notify(message){$('toast').textContent=message;$('toast').classList.add('show');toastTime=2.5;}
  function resetBike(index=0){const p=track[index];bike={x:p.x,y:p.y,angle:angleAt(index),speed:0,wheelPhase:0,wheelie:0,air:0,rampCooldown:0,bumpCooldown:0,glide:0,slideX:0,slideY:0};previousProgress=nearest(bike.x,bike.y).progress;}
  let introTime=0;
  function resetCamera(){canvas.style.transform='';$('introImage').style.transform='';$('introImage').style.opacity='';$('intro').style.opacity='';}
  function showIntro(){stopCheer();state='splash';keys.clear();resetCamera();$('intro').hidden=false;$('intro').classList.remove('flying');$('flyoverCaption').hidden=true;$('menu').hidden=true;$('finishMenu').hidden=true;$('pauseMenu').hidden=true;$('countdown').hidden=true;$('pauseButton').disabled=true;$('resetButton').disabled=true;$('enterCircuit').focus();}
  function enterCircuit(){
    if(state!=='splash')return;
    if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){home();return;}
    state='flyover';introTime=0;keys.clear();$('intro').classList.add('flying');$('flyoverCaption').hidden=false;
  }
  function animateIntro(dt){
    introTime+=dt;const t=Math.min(1,introTime/4.6),ease=t*t*(3-2*t);
    // Approach the valley circuit, then dissolve into its overhead racing view.
    $('introImage').style.transform=`scale(${1+ease*3.8}) translateY(${-ease*3}%)`;
    const fade=Math.max(0,Math.min(1,(t-.60)/.4));$('intro').style.opacity=String(1-fade);
    canvas.style.transform=`scale(${1+(1-ease)*1.5}) rotate(${(1-ease)*-9}deg)`;
    if(t>=1)home();
  }
  function start(){winnerMoment=null;$('winnerPhoto').hidden=true;$('winnerImage').removeAttribute('src');unlockAudio();stopCheer();leaderId=null;pendingLeader=null;leaderHold=0;cheerTime=0;$('crowdCall').hidden=true;resetCamera();$('intro').hidden=true;rider=($('playerName').value.trim().slice(0,8)||'RIDER').toUpperCase();$('playerName').value=rider;try{localStorage.setItem('dustline-rider',rider);}catch{}$('riderName').textContent=rider;$('best').textContent=record()?format(record()):'—';elapsed=0;lapStart=0;lap=1;splits=[];progress=0;lastSafe=0;wheelieSeconds=0;particles=[];resetBike();resetRivals();keys.clear();state='countdown';count=3;$('menu').hidden=true;$('finishMenu').hidden=true;$('pauseMenu').hidden=true;$('countdown').hidden=false;$('countdown').textContent='3';$('pauseButton').disabled=false;$('resetButton').disabled=true;canvas.focus();updateHUD();}
  function home(){stopCheer();resetCamera();$('intro').hidden=true;state='menu';keys.clear();$('menu').hidden=false;$('pauseMenu').hidden=true;$('finishMenu').hidden=true;$('countdown').hidden=true;$('pauseButton').disabled=true;$('resetButton').disabled=true;$('playerName').focus();}
  let resumeState='race';
  function pause(){if(state==='race'||state==='countdown'){resumeState=state;stopCheer();state='paused';keys.clear();$('pauseMenu').hidden=false;$('countdown').hidden=true;$('resumeButton').focus();}else if(state==='paused'){unlockAudio();state=resumeState;$('pauseMenu').hidden=true;$('countdown').hidden=state!=='countdown';canvas.focus();}}
  function recover(){if(state!=='race')return;resetBike(lastSafe);notify('BIKE RECOVERED · NO PENALTY');}
  let winnerMoment=null;
  function captureWinner(r,time){
    if(winnerMoment&&winnerMoment.time<=time)return;
    winnerMoment={name:r.name,time,color:r.color,photo:null};
    const photo=document.createElement('canvas');photo.width=960;photo.height=540;const c=photo.getContext('2d');
    // A frozen side-on finish camera, using the actual winning rider and finish time.
    const sky=c.createLinearGradient(0,0,0,400);sky.addColorStop(0,'#687f82');sky.addColorStop(.65,'#e6b273');sky.addColorStop(1,'#f0cb8c');c.fillStyle=sky;c.fillRect(0,0,960,540);
    c.fillStyle='#fff0ad';c.beginPath();c.arc(790,100,43,0,TAU);c.fill();
    for(let layer=0;layer<3;layer++){c.fillStyle=['#8f8b78','#7d8069','#66735b'][layer];c.beginPath();c.moveTo(0,330);for(let x=0;x<=960;x+=60)c.lineTo(x,230+layer*35-Math.sin(x*.012+layer)*30-Math.cos(x*.021)*18);c.lineTo(960,420);c.lineTo(0,420);c.fill();}
    c.fillStyle='#b48155';c.fillRect(0,345,960,195);c.fillStyle='#c99b68';c.fillRect(0,390,960,150);
    for(let i=0;i<20;i++){const x=i*51;c.fillStyle='#d9b653';c.fillRect(x,330,45,27);c.fillStyle='#826337';c.fillRect(x+10,330,3,27);c.fillRect(x+32,330,3,27);}
    for(let i=0;i<18;i++){const x=22+i*53,y=310+(i%3)*4;c.strokeStyle=['#f1e4be',r.color,'#e98550'][i%3];c.lineWidth=5;c.beginPath();c.moveTo(x,y+20);c.lineTo(x,y);c.moveTo(x,y+7);c.lineTo(x-12,y-11);c.moveTo(x,y+7);c.lineTo(x+12,y-14);c.stroke();c.fillStyle='#d4a079';c.beginPath();c.arc(x,y-5,6,0,TAU);c.fill();}
    for(let y=390;y<540;y+=15)for(let x=438;x<483;x+=15){c.fillStyle=((x-438)/15+(y-390)/15)%2?'#f2eedc':'#26392e';c.fillRect(x,y,15,15);}
    for(let j=0;j<1800;j++){const x=(j*157)%960,y=365+(j*73)%175;c.fillStyle=j%3?'#6e4b2c22':'#f3cc9144';c.fillRect(x,y,2+j%3,1+j%2);}c.save();c.filter='blur(8px)';c.fillStyle='#533f2b88';c.beginPath();c.ellipse(505,468,160,17,0,0,TAU);c.fill();c.restore();
    c.save();c.translate(458,408);c.rotate(-.57);
    function line(points,color,width){c.lineCap='round';c.lineJoin='round';c.beginPath();points.forEach((p,i)=>i?c.lineTo(...p):c.moveTo(...p));c.strokeStyle='#18291f';c.lineWidth=width+3;c.stroke();c.strokeStyle=color;c.lineWidth=width;c.stroke();if(width>6){c.save();c.translate(-1,-2);c.strokeStyle='#ffffff40';c.lineWidth=width*.26;c.stroke();c.restore();}}
    function wheel(x,y){c.fillStyle='#101a16';c.beginPath();c.ellipse(x+6,y+3,55,53,0,0,TAU);c.fill();const tire=c.createRadialGradient(x-19,y-23,4,x,y,55);tire.addColorStop(0,'#69736a');tire.addColorStop(.65,'#303d34');tire.addColorStop(1,'#101b15');c.fillStyle=tire;c.beginPath();c.arc(x,y,53,0,TAU);c.fill();c.strokeStyle='#737a71';c.lineWidth=2;for(let j=0;j<20;j++){const a=j*TAU/20;c.beginPath();c.moveTo(x,y);c.lineTo(x+Math.cos(a)*42,y+Math.sin(a)*42);c.stroke();}c.strokeStyle='#b6bcb0';c.lineWidth=4;c.beginPath();c.arc(x,y,40,0,TAU);c.stroke();c.fillStyle='#a9afa2';c.beginPath();c.arc(x,y,9,0,TAU);c.fill();for(let j=0;j<24;j++){c.save();c.translate(x,y);c.rotate(j*TAU/24);c.fillStyle='#18231d';c.fillRect(48,-4,9,8);c.restore();}}
    wheel(0,0);wheel(212,0);line([[0,0],[76,-65],[143,-64],[96,0],[0,0]],'#a4aaa0',8);line([[143,-64],[190,-99],[212,0]],'#b8bcb0',8);line([[185,-95],[192,-120],[171,-127]],'#27382d',7);
    const metal=c.createLinearGradient(80,-47,123,-7);metal.addColorStop(0,'#e0dfc9');metal.addColorStop(.3,'#89958a');metal.addColorStop(.65,'#3b4a40');metal.addColorStop(1,'#bac2ad');c.fillStyle=metal;c.fillRect(80,-47,43,40);c.strokeStyle='#24372b';c.lineWidth=2;c.strokeRect(80,-47,43,40);for(let i=0;i<5;i++)line([[84,-40+i*7],[118,-40+i*7]],'#b8bdb0',2);
    line([[-22,-57],[42,-73],[107,-66],[140,-82],[163,-72]],r.color,18);line([[173,-61],[209,-70],[242,-51]],r.color,10);line([[18,-78],[81,-78]],'#22332a',13);
    c.fillStyle='#f2efdd';c.fillRect(15,-64,43,24);c.fillStyle='#24382c';c.font='bold 22px monospace';c.fillText(r.player?'07':r.name==='ROOK'?'27':'19',22,-44);
    // Rider leans back with bent knees and arms while the front wheel is raised.
    line([[62,-94],[97,-62],[83,-21],[112,-17]],'#27372c',17);line([[59,-96],[49,-139],[65,-161]],r.color,28);line([[57,-139],[116,-133],[174,-126]],r.color,12);line([[162,-126],[175,-126]],'#202e27',10);
    const helmet=c.createRadialGradient(58,-184,2,68,-173,28);helmet.addColorStop(0,'#f0ffd7');helmet.addColorStop(.3,r.color);helmet.addColorStop(1,'#243d22');c.fillStyle=helmet;c.beginPath();c.ellipse(68,-173,24,23,0,0,TAU);c.fill();line([[80,-184],[96,-180]],'#e6edd4',6);line([[83,-176],[95,-172]],'#26382e',9);c.fillStyle='#f3efda';c.font='bold 8px Arial';c.fillText(r.player?'PEREZ':r.name,49,-166);c.restore();
    c.fillStyle='#e6bc7b99';for(let i=0;i<22;i++){c.beginPath();c.arc(410-i*10,450+Math.sin(i)*9,3+i*.35,0,TAU);c.fill();}
    c.fillStyle='#20372ded';c.fillRect(0,0,960,66);c.fillStyle='#b7e760';c.font='italic bold 25px Arial';c.fillText('LIMITLESS OFFROAD',25,30);c.fillStyle='#f1efd9';c.font='12px monospace';c.fillText('PERRIS, CALIFORNIA / FINISH CAMERA',26,51);c.textAlign='right';c.font='bold 24px monospace';c.fillText('PHOTO FINISH',933,40);c.textAlign='left';
    c.fillStyle='#20372ded';c.fillRect(24,477,390,43);c.fillStyle='#f5efd9';c.font='bold 21px monospace';c.fillText(`${r.name}  /  ${format(time)}`,39,505);
    winnerMoment.photo=photo.toDataURL('image/png');
    if(!r.player)notify(`${r.name} WINS · FINISH PHOTO SAVED`);
  }
  function showWinnerPhoto(){
    const has=!!winnerMoment?.photo;$('winnerPhoto').hidden=!has;if(!has)return;
    $('winnerImage').src=winnerMoment.photo;$('winnerImage').alt=`${winnerMoment.name} crossing the finish line on a wheelie in Perris, California`;
    $('winnerCaption').textContent=`WINNER’S WHEELIE · ${winnerMoment.name} · ${format(winnerMoment.time)}`;$('saveWinner').href=winnerMoment.photo;
  }
  function finish(){captureWinner({...bike,name:rider,color:'#84c932',player:true},elapsed);state='finished';keys.clear();showWinnerPhoto();const old=record(),pb=!old||elapsed<old;if(pb){records[rider]=elapsed;try{localStorage.setItem('dustline-records-v1',JSON.stringify(records));}catch{}}$('best').textContent=format(record());$('resultLabel').textContent=pb?'NEW PERSONAL BEST':'THREE LAPS IN THE DUST';$('finishName').textContent=rider;$('finishTime').textContent=format(elapsed);const order=raceOrder(),place=order.findIndex(r=>r.player)+1;$('finishPosition').textContent=`${['','1ST · RACE WINNER','2ND · ON THE PODIUM','3RD · KEEP CHASING'][place]}`;$('raceResults').replaceChildren(...order.map((r,i)=>{const row=document.createElement('div'),name=document.createElement('span'),result=document.createElement('span');name.textContent=`${i+1}. ${r.name}${r.player?' (YOU)':''}`;result.textContent=r.finishTime!==null?format(r.finishTime):'BEHIND AT YOUR FINISH';row.append(name,result);return row;}));$('splits').replaceChildren(...splits.map((t,i)=>{const node=document.createElement('div');node.textContent=`LAP ${i+1} · ${format(t)}`;return node;}));$('finishMenu').hidden=false;$('pauseButton').disabled=true;$('resetButton').disabled=true;$('againButton').focus();}
  function updateHUD(){const order=raceOrder();$('position').textContent=`${order.findIndex(r=>r.player)+1} / 3`;$('standings').replaceChildren(...order.map((r,i)=>{const row=document.createElement('li'),dot=document.createElement('em'),name=document.createElement('span'),status=document.createElement('small');dot.style.background=r.color;name.textContent=`${i+1} ${r.player?'YOU':r.name}`;status.textContent=r.finishTime!==null?'FIN':`L${Math.min(3,Math.max(1,Math.floor(r.progress/circuitLength)+1))}`;row.append(dot,name,status);return row;}));$('lap').textContent=String(Math.min(lap,TOTAL_LAPS)).padStart(2,'0');$('time').textContent=format(elapsed);$('speed').textContent=Math.round(bike.speed*.35*.621371);$('speedBar').style.width=`${Math.min(100,bike.speed/300*100)}%`;$('bikeStatus').textContent=state==='menu'?'READY TO RIDE':bike.air>0?'AIR TIME':bike.wheelie>.4?'WHEELIE':nearest(bike.x,bike.y).distance>ROAD?'LOOSE GROUND':'ON THE LINE';}
  function step(dt){
    if(toastTime>0){toastTime-=dt;if(toastTime<=0)$('toast').classList.remove('show');}
    if(state==='flyover'){animateIntro(dt);return;}
    if(state==='countdown'){count-=dt;$('countdown').textContent=Math.max(1,Math.ceil(count));if(count<=0){state='race';$('countdown').hidden=true;$('resetButton').disabled=false;notify('GO! FOLLOW THE ARROWS');}return;}
    if(state!=='race')return;
    elapsed+=dt;bike.bumpCooldown=Math.max(0,bike.bumpCooldown-dt);bike.glide=Math.max(0,bike.glide-dt);updateRivals(dt);const near=nearest(bike.x,bike.y),off=near.distance>ROAD;
    const targetWheelie=keys.has('KeyW')&&bike.speed>60?1:0;bike.wheelie+=(targetWheelie-bike.wheelie)*Math.min(1,dt*6);
    const maxSpeed=off?115:300,gas=keys.has('Space');bike.speed+=((gas?155:0)-(off?1.65:.38)*bike.speed-(gas?0:34))*dt;bike.speed=Math.max(0,Math.min(maxSpeed,bike.speed));
    bike.wheelPhase=(bike.wheelPhase+bike.speed*dt/10)%TAU;
    const steer=(keys.has('KeyD')?1:0)-(keys.has('KeyA')?1:0);bike.angle+=steer*2.65*Math.min(1,bike.speed/85)*(1-bike.wheelie*.57)*(bike.air>0?.4:1)*dt;
    bike.x+=(Math.cos(bike.angle)*bike.speed+bike.slideX)*dt;bike.y+=(Math.sin(bike.angle)*bike.speed+bike.slideY)*dt;bike.slideX*=Math.exp(-3*dt);bike.slideY*=Math.exp(-3*dt);
    if(bike.x<25||bike.x>W-25||bike.y<25||bike.y>H-25){bike.speed*=.8;bike.x=Math.max(25,Math.min(W-25,bike.x));bike.y=Math.max(25,Math.min(H-25,bike.y));}
    collideBales(dt);
    bike.air=Math.max(0,bike.air-dt);bike.rampCooldown=Math.max(0,bike.rampCooldown-dt);
    const now=nearest(bike.x,bike.y);for(const i of [92,292]){if(Math.hypot(bike.x-track[i].x,bike.y-track[i].y)<29&&bike.speed>150&&bike.rampCooldown===0){bike.air=.65;bike.rampCooldown=2;notify('AIR TIME!');}}
    if(bike.air===0&&bike.rampCooldown===0&&bike.speed>135){for(const i of humpIndices){const p=track[i],a=angleAt(i),dx=bike.x-p.x,dy=bike.y-p.y,u=dx*Math.cos(a)+dy*Math.sin(a),v=-dx*Math.sin(a)+dy*Math.cos(a);if(Math.abs(u)<8&&Math.abs(v)<32){bike.air=.65;bike.rampCooldown=.85;notify('DIRT HUMP · AIR TIME!');break;}}}
    // Track progress continuously on dirt and grass. Rejoining never leaves a
    // checkpoint debt; only implausible jumps between distant track sections are ignored.
    let delta=now.progress-previousProgress;if(delta>circuitLength/2)delta-=circuitLength;if(delta<-circuitLength/2)delta+=circuitLength;
    if(Math.abs(delta)<bike.speed*dt*3+30)progress+=delta;
    previousProgress=now.progress;if(now.distance<ROAD+10)lastSafe=now.index;
    if(progress>=circuitLength*lap-8&&now.distance<ROAD+10){splits.push(elapsed-lapStart);lapStart=elapsed;if(lap===TOTAL_LAPS){finish();}else{lap++;notify(`LAP ${lap} / ${TOTAL_LAPS} · ${format(splits[splits.length-1])}`);}}
    if(delta<-1&&now.distance<ROAD&&Math.cos(bike.angle-angleAt(now.index))<-.6&&toastTime<=0)notify('WRONG WAY · FOLLOW THE ARROWS');
    if(bike.wheelie>.7)wheelieSeconds+=dt;
    updateLeader(dt);throwDirt(bike,steer,dt);
    for(const r of rivals){const bend=pointAt(r.progress+50).angle-r.angle;throwDirt(r,Math.atan2(Math.sin(bend),Math.cos(bend))*3,dt);}
    particles.forEach(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=Math.exp(-2*dt);p.vy*=Math.exp(-2*dt);p.life-=dt;if(!p.clod)p.r+=dt*8;});particles=particles.filter(p=>p.life>0).slice(-350);
  }
  const railSegments=[];
  for(const side of [-1,1])for(let d=0;d<circuitLength;d+=24){
    const a=pointAt(d,side*54),b=pointAt(d+24,side*54);
    if(nearest(a.x,a.y).distance<48||nearest(b.x,b.y).distance<48)continue;
    railSegments.push({a,b,red:Math.floor(d/24)%2===0});
  }
  function drawRail(rail){
    const a=project(rail.a.x,rail.a.y),b=project(rail.b.x,rail.b.y),height=11;
    function face(points,color){ctx.fillStyle=color;ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.closePath();ctx.fill();}
    face([[a.x+3,a.y+4],[b.x+3,b.y+4],[b.x+7,b.y+6],[a.x+7,a.y+6]],'#283a2940');
    face([[a.x,a.y],[b.x,b.y],[b.x,b.y-height],[a.x,a.y-height]],rail.red?'#bd372b':'#b9c6ca');
    face([[a.x,a.y-height],[b.x,b.y-height],[b.x-3,b.y-height-3],[a.x-3,a.y-height-3]],rail.red?'#ee5941':'#e8ece3');
    ctx.strokeStyle='#4c514743';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
  }
  // Oblique 2.5D camera: physics stays in world space; riders stay upright.
  const project=(x,y)=>({x:20+.84*x+.20*y,y:175-.11*x+.75*y});
  function solidBox(x,y,w,d,height,angle,colors){
    const ca=Math.cos(angle),sa=Math.sin(angle);
    const pts=[[-w/2,-d/2],[w/2,-d/2],[w/2,d/2],[-w/2,d/2]].map(([u,v])=>project(x+u*ca-v*sa,y+u*sa+v*ca));
    function poly(points,color){ctx.fillStyle=color;ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.fill();ctx.strokeStyle='#403c2844';ctx.lineWidth=.7;ctx.stroke();}
    const faces=pts.map((p,i)=>({p,q:pts[(i+1)%4],i})).sort((a,b)=>(a.p.y+a.q.y)-(b.p.y+b.q.y));
    for(const f of faces)poly([f.p,f.q,{x:f.q.x,y:f.q.y-height},{x:f.p.x,y:f.p.y-height}],colors[1+f.i%2]);
    const top=pts.map(p=>({x:p.x,y:p.y-height}));poly(top,colors[0]);return top;
  }
  function drawHay(b){
    const p=project(b.x,b.y);ctx.fillStyle='#24362944';ctx.beginPath();ctx.ellipse(p.x+7,p.y+5,19,8,-.1,0,TAU);ctx.fill();
    const top=solidBox(b.x,b.y,30,20,13,b.angle,['#e8c46b','#a27635','#bd934a']);
    const mix=(a,b,t)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});
    for(let i=1;i<11;i++){const a=mix(top[0],top[1],i/12),b=mix(top[3],top[2],i/12);ctx.strokeStyle=i%2?'#f6da8b':'#c59b4e';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(a.x,a.y+1);ctx.lineTo(b.x,b.y-1);ctx.stroke();}
    for(const t of [.24,.76]){const a=mix(top[0],top[1],t),b=mix(top[3],top[2],t);ctx.strokeStyle='#76633b';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.lineTo(b.x,b.y+12);ctx.stroke();ctx.strokeStyle='#b3a375';ctx.lineWidth=.6;ctx.beginPath();ctx.moveTo(a.x-1,a.y);ctx.lineTo(b.x-1,b.y);ctx.stroke();}
  }
  function drawFan(f){
    const p=project(f.x,f.y),wave=Math.sin(elapsed*(cheerTime>0?13:5)+f.phase),seat=f.seated,base=seat?8:0,skin=f.phase%3<1?'#ac7955':'#e4b78b';
    ctx.save();ctx.translate(p.x,p.y);ctx.fillStyle='#22362a40';ctx.beginPath();ctx.ellipse(3,2,7,3,0,0,TAU);ctx.fill();
    function limb(points,color,width){ctx.lineCap='square';ctx.lineJoin='miter';ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(...p):ctx.moveTo(...p));ctx.strokeStyle='#263c30';ctx.lineWidth=width+1.5;ctx.stroke();ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();}
    const hip=-10-base,shoulder=hip-10,head=shoulder-6;
    limb([[-2,hip],[-4,seat?-8:-5],[-4,0]],'#4e6668',3);limb([[2,hip],[4,seat?-8:-5],[4,0]],'#344b51',3);
    ctx.fillStyle='#202e28';ctx.fillRect(-6,-1,5,3);ctx.fillRect(2,-1,5,3);
    ctx.fillStyle='#263c30';ctx.fillRect(-5,shoulder,10,12);ctx.fillStyle=f.color;ctx.fillRect(-4,shoulder,8,10);ctx.fillStyle='#ffffff45';ctx.fillRect(-3,shoulder+1,2,8);ctx.fillStyle='#24372d33';ctx.fillRect(2,shoulder+2,2,9);
    const raise=cheerTime>0?5:0;
    limb([[-4,shoulder+2],[-8,shoulder-2-wave*2],[-9,shoulder-7-wave*3-raise]],f.color,2.5);limb([[4,shoulder+2],[8,shoulder-1+wave*2],[10,shoulder-6+wave*3-raise]],f.color,2.5);
    ctx.fillStyle=skin;ctx.fillRect(-11,shoulder-9-wave*3-raise,3,3);ctx.fillRect(9,shoulder-8+wave*3-raise,3,3);
    ctx.fillStyle='#29382c';ctx.fillRect(-4,head-4,8,8);ctx.fillStyle=skin;ctx.fillRect(-3,head-3,6,6);ctx.fillStyle='#f6d1a166';ctx.fillRect(-3,head-2,2,4);ctx.fillStyle='#513d2e';ctx.fillRect(-3,head-4,6,2);ctx.fillStyle='#263a2c';ctx.fillRect(0,head,1,1);
    if(Math.floor(f.phase)%2===0){ctx.fillStyle=f.color;ctx.fillRect(-4,head-5,8,2);ctx.fillRect(2,head-3,4,1);}
    if(cheerTime>0){ctx.fillStyle='#e4d5ac';ctx.fillRect(11,shoulder-20+wave*3,1,15);ctx.fillStyle=cheerColor;ctx.fillRect(12,shoulder-20+wave*3,9,6);ctx.fillStyle='#ffffff55';ctx.fillRect(12,shoulder-20+wave*3,9,1);}ctx.restore();
  }
  function drawBench(y){
    for(const x of [309,467])solidBox(x,y+3,6,12,8,0,['#aa8450','#644b31','#80613c']);
    solidBox(389,y+3,178,11,10,0,['#d5ad72','#8d623d','#aa7c48']);
    solidBox(389,y+16,178,4,19,0,['#d9b279','#916a40','#ae8756']);
  }
  function drawBike(b,color,trim,label){
    const p=project(b.x,b.y),vx=.84*Math.cos(b.angle)+.20*Math.sin(b.angle),vy=-.11*Math.cos(b.angle)+.75*Math.sin(b.angle);
    const air=(b.air>0?Math.sin(b.air/.65*Math.PI)*25:0)+humpHeight(b.x,b.y),lift=b.wheelie*17;
    ctx.fillStyle='#192b2860';ctx.beginPath();ctx.ellipse(p.x+9,p.y+7,25,8,-.12,0,TAU);ctx.fill();
    ctx.save();ctx.translate(p.x,p.y-air);
    const rear={x:-19*vx,y:-19*vy-5},front={x:21*vx,y:21*vy-5-lift};
    const stroke=(points,color,width)=>{ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();points.forEach((v,i)=>i?ctx.lineTo(v[0],v[1]):ctx.moveTo(v[0],v[1]));ctx.strokeStyle='#172b25';ctx.lineWidth=width+2;ctx.stroke();ctx.strokeStyle=color;ctx.lineWidth=width;ctx.stroke();};
    for(const w of [rear,front]){ctx.fillStyle='#172723';ctx.beginPath();ctx.ellipse(w.x,w.y,3+Math.abs(vx)*5,10,0,0,TAU);ctx.fill();for(let j=0;j<10;j++){const a=j*TAU/10+b.wheelPhase;stroke([[w.x+Math.cos(a)*(3+Math.abs(vx)*5),w.y+Math.sin(a)*9],[w.x+Math.cos(a)*(4+Math.abs(vx)*5),w.y+Math.sin(a)*11]],'#26372e',1);}ctx.strokeStyle='#a3aea0';ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(w.x,w.y,2+Math.abs(vx)*3,6,0,0,TAU);ctx.stroke();for(let j=0;j<4;j++){const a=b.wheelPhase+j*Math.PI/2;stroke([[w.x,w.y],[w.x+Math.cos(a)*(2+Math.abs(vx)*3),w.y+Math.sin(a)*6]],'#c4cdba',1);}}
    stroke([[rear.x,rear.y],[0,-17],[front.x-4*vx,front.y-18],[front.x,front.y]],'#bcc4ae',3);
    stroke([[rear.x,rear.y],[2*vx,-7],[front.x-4*vx,front.y-18]],'#657e60',3);
    stroke([[rear.x-5*vx,rear.y-14],[-4*vx,-23],[10*vx,-22-lift*.5]],color,7);
    stroke([[-11*vx,-24],[2*vx,-25]],'#1e3229',5);
    stroke([[front.x-6*vx,front.y-15],[front.x+8*vx,front.y-13]],trim,4);
    ctx.fillStyle='#66776b';ctx.fillRect(-4,-16,8,8);ctx.fillStyle='#edeed7';ctx.fillRect(rear.x-4,rear.y-16,8,6);
    const hx=3*vx-b.wheelie*7*vx,hy=-42-lift*.25;
    stroke([[hx-3*vx,hy+18],[7*vx,-17],[-2*vx,-9]],'#233a31',5);
    stroke([[hx-3*vx,hy+16],[hx,hy+7]],color,9);
    stroke([[hx+2*vx,hy+10],[12*vx,-28-lift*.5],[front.x-3*vx,front.y-23]],trim,3);
    stroke([[front.x-3*vx-5,front.y-23],[front.x-3*vx+5,front.y-23]],'#1c3028',3);
    ctx.fillStyle=color;ctx.beginPath();ctx.arc(hx,hy,7,0,TAU);ctx.fill();ctx.fillStyle='#ffffff77';ctx.beginPath();ctx.ellipse(hx-2,hy-3,4,2,-.3,0,TAU);ctx.fill();ctx.fillStyle='#172c2733';ctx.beginPath();ctx.ellipse(hx+3,hy+2,3,4,0,0,TAU);ctx.fill();stroke([[hx+vx*3-3,hy],[hx+vx*3+3,hy]],'#243b31',3);stroke([[hx+vx*4,hy-3],[hx+vx*9,hy-3]],trim,2);
    ctx.fillStyle='#20372dd9';ctx.fillRect(-19,16,38,13);ctx.fillStyle=trim;ctx.textAlign='center';ctx.font='bold 9px monospace';ctx.fillText(label,0,26);if(b.wheelie>.6){ctx.fillStyle='#fff0bf';ctx.fillText('WHEELIE',hx,hy-13);}ctx.textAlign='left';ctx.restore();
  }
  function render(){
    const sky=ctx.createLinearGradient(0,0,0,H);sky.addColorStop(0,'#b9c6aa');sky.addColorStop(.5,'#778b68');sky.addColorStop(1,'#455e49');ctx.fillStyle=sky;ctx.fillRect(0,0,W,H);
    // Exposed lower edge makes the course read as raised terrain.
    ctx.save();ctx.transform(.84,-.11,.20,.75,20,189);ctx.fillStyle='#3b503a';ctx.fillRect(0,0,W,H);ctx.restore();
    ctx.save();ctx.transform(.84,-.11,.20,.75,20,175);ctx.drawImage(scenery,0,0);
    for(const p of particles){ctx.fillStyle=p.clod?`rgba(113,67,38,${p.life/p.max*.85})`:`rgba(223,175,113,${p.life/p.max*.38})`;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,TAU);ctx.fill();}ctx.restore();
    const racers=rivals.map(r=>({b:r,color:r.color,trim:r.trim,label:r.name}));racers.push({b:bike,color:'#84c932',trim:'#c5f47a',label:'YOU'});const objects=racers.map(r=>({y:project(r.b.x,r.b.y).y,draw:()=>drawBike(r.b,r.color,r.trim,r.label)}));for(const rail of railSegments)objects.push({y:(project(rail.a.x,rail.a.y).y+project(rail.b.x,rail.b.y).y)/2,draw:()=>drawRail(rail)});for(const bale of bales)objects.push({y:project(bale.x,bale.y).y,draw:()=>drawHay(bale)});for(const y of [289,323])objects.push({y:project(389,y).y,draw:()=>drawBench(y)});for(const fan of fans)objects.push({y:project(fan.x,fan.y).y+1,draw:()=>drawFan(fan)});objects.sort((a,b)=>a.y-b.y);for(const obj of objects)obj.draw();
  }
  function frame(now){const delta=Math.min((now-clockLast)/1000||0,.1);clockLast=now;accumulator+=delta;while(accumulator>=1/120){step(1/120);accumulator-=1/120;}render();updateHUD();requestAnimationFrame(frame);}
  document.addEventListener('keydown',e=>{if(controls.has(e.code)||e.code==='Escape'||e.code==='KeyR'){
    if(e.target===$('playerName')&&e.code!=='Space'&&e.code!=='Escape')return;
    if(controls.has(e.code))e.preventDefault();if(e.repeat)return;
    if(state==='splash'||state==='flyover'){if(e.code==='Escape')home();else if(e.code==='Space'&&state==='splash')enterCircuit();return;}
    if(e.code==='Space'&&(state==='menu'||state==='finished')){start();keys.add('Space');return;}
    if(e.code==='Escape'){pause();return;}if(e.code==='KeyR'){recover();return;}
    if(state==='race'||state==='countdown')keys.add(e.code);
  }});
  document.addEventListener('keyup',e=>keys.delete(e.code));
  window.addEventListener('blur',()=>{keys.clear();if(state==='race'||state==='countdown')pause();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){keys.clear();if(state==='race'||state==='countdown')pause();}});
  soundLabel();$('soundButton').onclick=()=>{soundEnabled=!soundEnabled;soundLabel();if(soundEnabled)unlockAudio();else stopCheer();try{localStorage.setItem('limitless-sound',soundEnabled?'on':'off');}catch{}};
  $('enterCircuit').onclick=enterCircuit;$('skipIntro').onclick=home;$('introHome').onclick=e=>{e.preventDefault();showIntro();};
  $('startButton').onclick=start;$('againButton').onclick=start;$('pauseButton').onclick=pause;$('resumeButton').onclick=pause;$('restartButton').onclick=start;$('homeButton').onclick=home;$('finishHome').onclick=home;$('resetButton').onclick=recover;
  $('playerName').addEventListener('input',()=>{$('playerName').value=$('playerName').value.slice(0,8);});
  document.querySelectorAll('[data-key]').forEach(button=>{const release=()=>{keys.delete(button.dataset.key);button.classList.remove('active');};button.addEventListener('pointerdown',e=>{e.preventDefault();button.setPointerCapture(e.pointerId);if(state==='race'||state==='countdown'){keys.add(button.dataset.key);button.classList.add('active');}});button.addEventListener('pointerup',release);button.addEventListener('pointercancel',release);button.addEventListener('lostpointercapture',release);});
  resetBike();resetRivals();requestAnimationFrame(frame);
})();

