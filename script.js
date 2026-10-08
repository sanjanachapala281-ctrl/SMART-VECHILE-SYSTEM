const state = {
  running:false, paused:false, stage:0, progress:0, startTime:null, elapsed:0, priorityCount:0,
  timer:null, lastEvent:null
};

const $ = (id) => document.getElementById(id);
const ambulance = $("ambulance");
const map = $("cityMap");
const toast = $("toast");

function timeNow(){
  return new Date().toLocaleTimeString([], {hour:"2-digit", minute:"2-digit", second:"2-digit"});
}
function toastMsg(msg){
  toast.textContent = msg;
  toast.classList.add("show");
  setTimeout(()=>toast.classList.remove("show"), 2200);
}
function logEvent(message, important=false){
  const list = $("eventList");
  const empty = list.querySelector(".empty-event");
  if(empty) empty.remove();
  const row = document.createElement("div");
  row.className = "event";
  row.innerHTML = `<time>${timeNow()}</time><i class="bar"></i><div class="msg">${important?"<strong>":""}${message}${important?"</strong>":""}</div>`;
  list.prepend(row);
  $("eventCount").textContent = `${list.querySelectorAll(".event").length} events`;
}
function setStep(n){
  for(let i=1;i<=5;i++) $("step"+i).classList.toggle("active", i<=n);
}
function setLights(color){
  ["red","yellow","green"].forEach(x=>$(x+"Light").classList.remove("on"));
  if(color) $(color+"Light").classList.add("on");
  $("signalState").textContent = color ? color.toUpperCase() : "OFF";
}
function setNodeLights(node, color){
  const nodes = document.querySelectorAll(".signal-node");
  if(!nodes[node-1]) return;
  nodes[node-1].querySelectorAll(".light").forEach(l=>l.classList.remove("on"));
  const light=nodes[node-1].querySelector(".light."+color);
  if(light) light.classList.add("on");
}
function updateDistance(){
  const d=Math.max(0,2.8-state.progress*2.8);
  $("distance").textContent=d.toFixed(1)+" km";
}
function updateAmbulance(){
  const width=map.clientWidth;
  const left=Math.max(24, Math.min(width-145, 24 + state.progress*(width-190)));
  ambulance.style.left=left+"px";
}
function normalState(){
  setLights("red");
  setNodeLights(1,"red"); setNodeLights(2,"red"); setNodeLights(3,"red");
  $("signalTitle").textContent="J-01 · Normal";
  $("safetyStatus").textContent="READY";
  $("routeBadge").textContent="STANDBY";
  $("routeBadge").classList.remove("live");
  $("emergencyState").textContent="INACTIVE";
  $("nextJunction").textContent="J-01";
  $("trafficImpact").textContent="LOW";
  $("trafficAlert").innerHTML=`<div class="alert-icon">◉</div><div><b>Traffic control</b><span>Waiting for an emergency request.</span></div><em>STANDBY</em>`;
}
function start(){
  if(state.running && !state.paused) return;
  if(state.stage===5) reset();
  state.running=true; state.paused=false;
  if(!state.startTime) state.startTime=performance.now();
  $("startBtn").disabled=true;
  $("startBtn").style.opacity=".6";
  $("emergencyState").textContent="ACTIVE";
  $("routeBadge").textContent="PRIORITY ROUTE";
  $("routeBadge").classList.add("live");
  setStep(1);
  $("safetyStatus").textContent="CHECKING";
  logEvent("Emergency vehicle AMB-102 detected", true);
  logEvent("Authorized vehicle identity verified");
  $("trafficAlert").innerHTML=`<div class="alert-icon">!</div><div><b>Traffic control</b><span>Emergency request received and being evaluated.</span></div><em>VERIFYING</em>`;
  toastMsg("Emergency vehicle detected");
  state.lastEvent=performance.now();
  state.timer=setInterval(tick,80);
}
function tick(){
  if(state.paused) return;
  state.progress += 0.0045;
  updateAmbulance(); updateDistance();
  const p=state.progress;
  if(state.stage===0 && p>=.10){
    state.stage=1; setStep(2); $("safetyStatus").textContent="VERIFIED";
    logEvent("Authentication passed — AMB-102 is authorized");
  }
  if(state.stage===1 && p>=.27){
    state.stage=2; setStep(3); $("nextJunction").textContent="J-02";
    $("signalTitle").textContent="J-02 · Approaching";
    $("trafficAlert").innerHTML=`<div class="alert-icon">◉</div><div><b>Route intelligence</b><span>J-02 identified as next priority junction.</span></div><em>LOCATED</em>`;
    logEvent("Live location received — direction NORTH");
    logEvent("Next junction identified: J-02");
  }
  if(state.stage===2 && p>=.43){
    state.stage=3; setStep(4); state.priorityCount=1; $("priorityCount").textContent="1";
    $("safetyStatus").textContent="SAFE CHECK";
    $("trafficImpact").textContent="CONTROLLED";
    $("trafficAlert").innerHTML=`<div class="alert-icon">⚠</div><div><b>Traffic control</b><span>Priority request sent to J-02. Traffic personnel notified.</span></div><em>REQUESTED</em>`;
    logEvent("Priority request sent to J-02", true);
    logEvent("Traffic personnel alert dispatched");
    toastMsg("Priority corridor requested");
  }
  if(state.stage===3 && p>=.51){
    state.stage=4; setStep(5); setLights("yellow"); setNodeLights(2,"yellow");
    $("safetyStatus").textContent="TRANSITION";
    $("signalTitle").textContent="J-02 · Safe transition";
    $("trafficAlert").querySelector("span").textContent="Signal transition in progress — clearing cross traffic.";
    $("trafficAlert").querySelector("em").textContent="CAUTION";
    logEvent("Safety check passed — controlled signal transition");
  }
  if(state.stage===4 && p>=.60){
    state.stage=4.5; setLights("green"); setNodeLights(2,"green");
    $("safetyStatus").textContent="PRIORITY ACTIVE";
    $("signalTitle").textContent="J-02 · Priority GREEN";
    $("trafficAlert").innerHTML=`<div class="alert-icon">✓</div><div><b>Traffic control</b><span>Emergency corridor open. AMB-102 has priority.</span></div><em>ACTIVE</em>`;
    logEvent("J-02 priority GREEN activated", true);
    toastMsg("Emergency corridor open");
  }
  if(state.stage===4.5 && p>=.82){
    state.stage=4.8;
    logEvent("AMB-102 entering J-02 intersection");
    $("trafficAlert").querySelector("span").textContent="Emergency vehicle crossing the priority junction.";
  }
  if(state.stage===4.8 && p>=.94){
    state.stage=5;
    $("signalTitle").textContent="J-02 · Restoring";
    setLights("yellow"); setNodeLights(2,"yellow");
    $("safetyStatus").textContent="RESTORING";
    logEvent("Emergency vehicle cleared J-02", true);
    setTimeout(()=>{
      setLights("red"); setNodeLights(2,"red");
      $("safetyStatus").textContent="READY";
      $("signalTitle").textContent="J-02 · Normal";
      $("emergencyState").textContent="COMPLETE";
      $("trafficImpact").textContent="LOW";
      $("trafficAlert").innerHTML=`<div class="alert-icon">✓</div><div><b>Traffic control</b><span>Route cleared. Normal traffic flow restored.</span></div><em>CLEARED</em>`;
      logEvent("Normal traffic restored");
      finish();
    },1100);
  }
}
function finish(){
  clearInterval(state.timer); state.timer=null; state.running=false;
  const sec=((performance.now()-state.startTime)/1000);
  $("responseTime").textContent=sec.toFixed(1)+"s";
  $("timeSaved").textContent=Math.max(8,Math.round(sec*0.45))+"s";
  $("startBtn").disabled=false; $("startBtn").style.opacity="1";
  $("routeBadge").textContent="COMPLETE";
  $("routeBadge").classList.remove("live");
  toastMsg("Emergency passage complete");
}
function pause(){
  if(!state.running && !state.paused) return;
  state.paused=!state.paused;
  $("pauseBtn").textContent=state.paused?"▶ Resume":"Ⅱ Pause";
  $("trafficAlert").querySelector("em").textContent=state.paused?"PAUSED":"ACTIVE";
  toastMsg(state.paused?"Simulation paused":"Simulation resumed");
}
function reset(){
  clearInterval(state.timer); state.timer=null;
  state.running=false; state.paused=false; state.stage=0; state.progress=0; state.startTime=null; state.elapsed=0; state.priorityCount=0;
  $("startBtn").disabled=false; $("startBtn").style.opacity="1"; $("pauseBtn").textContent="Ⅱ Pause";
  $("priorityCount").textContent="0"; $("responseTime").textContent="—"; $("timeSaved").textContent="—";
  $("eventList").innerHTML='<div class="empty-event">Start the simulation to populate the live event stream.</div>';
  $("eventCount").textContent="0 events"; $("distance").textContent="2.8 km"; $("emergencyState").textContent="INACTIVE";
  $("nextJunction").textContent="J-01"; $("trafficImpact").textContent="LOW"; setStep(1); normalState(); updateAmbulance();
}
$("startBtn").addEventListener("click",start);
$("pauseBtn").addEventListener("click",pause);
$("resetBtn").addEventListener("click",reset);
window.addEventListener("resize",updateAmbulance);
reset();
