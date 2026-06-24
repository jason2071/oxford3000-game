const ROUND = 10;          // questions per round (word modes)
const S_ROUND = 8;         // questions per round (sentence mode)
const LEVELS = ["A1","A2","B1","B2"];
const LV_DESC = {A1:"เริ่มต้น",A2:"พื้นฐาน",B1:"กลาง",B2:"กลาง-สูง"};

const MODES = [
  {id:"translate", t:"ทายคำแปล",   d:"เห็นคำ ทายความหมาย"},
  {id:"listen",    t:"ฟังเสียงทาย", d:"ฟังเสียง แล้วเลือก"},
  {id:"sentence",  t:"เรียงประโยค", d:"จัดคำให้เป็นประโยค"},
];
const VARIANTS = {
  translate:[
    {id:"en2th", t:"อังกฤษ → ไทย", d:"เห็นคำอังกฤษ ทายคำแปล"},
    {id:"th2en", t:"ไทย → อังกฤษ", d:"เห็นคำแปล ทายคำอังกฤษ"},
  ],
  listen:[
    {id:"audio2en", t:"เลือกคำที่ได้ยิน", d:"ฟัง แล้วเลือกคำอังกฤษ"},
    {id:"audio2th", t:"เลือกคำแปล",       d:"ฟัง แล้วเลือกคำไทย"},
  ],
  sentence:[],
};

let mode="translate", level="A1";
let variant={translate:"en2th", listen:"audio2en", sentence:null};
let queue=[],idx=0,score=0,streak=0,answered=false;
let sAnswer=[], sBank=[];   // sentence-mode tile state: [{w,id}]

const $=id=>document.getElementById(id);
function shuffle(a){a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function byLevel(lv){return WORDS.filter(w=>w.lv===lv);}
function sentsByLevel(lv){return SENTENCES.filter(s=>s.lv===lv);}
function curVar(){return variant[mode];}
function poolCount(lv){return mode==="sentence"?sentsByLevel(lv).length:byLevel(lv).length;}

function bestKey(m,lv,v){return "ox_"+m+"_"+lv+"_"+(v||"-");}
function bestFor(m,lv,v){try{return parseInt(localStorage.getItem(bestKey(m,lv,v)))||0;}catch(e){return 0;}}
function bestGet(){return bestFor(mode,level,curVar());}
function bestSet(val){try{if(val>bestGet())localStorage.setItem(bestKey(mode,level,curVar()),val);}catch(e){}}

/* ── Home ─────────────────────────────────────────────── */
function renderHome(){
  // mode picker
  const mg=$("mode-grid");mg.innerHTML="";
  MODES.forEach(m=>{
    const b=document.createElement("button");
    b.className="opt"+(m.id===mode?" active":"");
    b.innerHTML=`<span class="t">${m.t}</span><div class="d">${m.d}</div>`;
    b.onclick=()=>{mode=m.id;renderHome();};
    mg.appendChild(b);
  });

  // level grid (count + best depend on current mode/variant)
  const g=$("level-grid");g.innerHTML="";
  const unit=mode==="sentence"?"ประโยค":"คำ";
  LEVELS.forEach(lv=>{
    const b=document.createElement("button");
    b.className="opt"+(lv===level?" active":"");
    b.innerHTML=`<span class="t">${lv}</span> <span class="d">${LV_DESC[lv]}</span>
      <div class="d">${poolCount(lv)} ${unit}</div>
      <div class="best">สถิติ ${bestFor(mode,lv,curVar())} คะแนน</div>`;
    b.onclick=()=>{level=lv;renderHome();};
    g.appendChild(b);
  });

  // variant row (per mode); hide entirely for sentence mode
  const vr=$("variant-row"),vl=$("variant-label"),vs=VARIANTS[mode];
  vr.innerHTML="";
  if(vs.length===0){vr.classList.add("hidden");vl.classList.add("hidden");}
  else{
    vr.classList.remove("hidden");vl.classList.remove("hidden");
    vs.forEach(v=>{
      const b=document.createElement("button");
      b.className="opt"+(v.id===curVar()?" active":"");
      b.innerHTML=`<span class="t">${v.t}</span><div class="d">${v.d}</div>`;
      b.onclick=()=>{variant[mode]=v.id;renderHome();};
      vr.appendChild(b);
    });
  }
}

/* ── Start / speech ──────────────────────────────────── */
$("start-btn").onclick=()=>{
  if(mode==="sentence"){
    const pool=sentsByLevel(level);
    queue=shuffle(pool).slice(0,Math.min(S_ROUND,pool.length));
  }else{
    queue=shuffle(byLevel(level)).slice(0,ROUND);
  }
  idx=0;score=0;streak=0;
  $("home").classList.add("hidden");$("end").classList.add("hidden");$("game").classList.remove("hidden");
  $("score").textContent="0";$("streak").textContent="0";
  renderQ();
};

function speak(text){
  try{const u=new SpeechSynthesisUtterance(text);u.lang="en-US";u.rate=.9;
    speechSynthesis.cancel();speechSynthesis.speak(u);}catch(e){}
}

/* ── Question dispatch ───────────────────────────────── */
function renderQ(){
  answered=false;
  $("feedback").textContent="";$("feedback").className="feedback";
  $("next-btn").classList.add("hidden");
  $("prog").textContent=(idx+1)+"/"+queue.length;

  if(mode==="sentence"){renderSentenceQ(queue[idx]);return;}

  // word modes (translate / listen) share the choices UI
  $("sentence-area").classList.add("hidden");
  $("choices").classList.remove("hidden");
  $("q-main").classList.remove("hidden");
  const w=queue[idx];
  const pool=byLevel(level);
  let correct,distractors,key;

  if(mode==="listen"){
    $("hint").textContent=curVar()==="audio2en"?"ฟังแล้วเลือกคำที่ได้ยิน":"ฟังแล้วเลือกคำแปล";
    $("q-main").textContent="🔊";
    $("q-ipa").textContent="";$("q-pr").textContent="";
    $("speak-btn").classList.remove("hidden");
    $("speak-btn").onclick=()=>speak(w.en);
    $("q-main").onclick=()=>speak(w.en);
    if(curVar()==="audio2en"){key="en";correct=w.en;}
    else{key="th";correct=w.th;}
    distractors=shuffle(pool.filter(x=>x[key]!==correct)).slice(0,3).map(x=>x[key]);
    speak(w.en);
  }else if(curVar()==="en2th"){
    $("hint").textContent="คำนี้แปลว่าอะไร?";
    $("q-main").textContent=w.en;$("q-main").onclick=null;
    $("q-ipa").textContent=w.ipa;$("q-pr").textContent=w.pr;
    $("speak-btn").classList.remove("hidden");
    $("speak-btn").onclick=()=>speak(w.en);
    correct=w.th;
    distractors=shuffle(pool.filter(x=>x.th!==w.th)).slice(0,3).map(x=>x.th);
  }else{ // th2en
    $("hint").textContent="คำนี้ภาษาอังกฤษว่าอะไร?";
    $("q-main").textContent=w.th;$("q-main").onclick=null;
    $("q-ipa").textContent="";$("q-pr").textContent="";
    $("speak-btn").classList.add("hidden");
    correct=w.en;
    distractors=shuffle(pool.filter(x=>x.en!==w.en)).slice(0,3).map(x=>x.en);
  }

  const opts=shuffle([correct,...distractors]);
  const box=$("choices");box.innerHTML="";
  opts.forEach(o=>{
    const b=document.createElement("button");
    b.className="choice";b.textContent=o;
    b.onclick=()=>pick(b,o,correct,w);
    box.appendChild(b);
  });
}

function pick(btn,chosen,correct,w){
  if(answered)return;answered=true;
  document.querySelectorAll("#choices .choice").forEach(b=>{
    b.disabled=true;
    if(b.textContent===correct)b.classList.add("correct");
  });
  const fb=$("feedback");
  if(chosen===correct){
    score+=10+streak*2;streak++;
    fb.className="feedback ok";
    fb.textContent=streak>=3?("เยี่ยม! ถูกติดกัน "+streak+" ข้อ 🔥"):"ถูกต้อง! ✓";
    if(mode==="translate"&&curVar()==="th2en")speak(w.en);
  }else{
    streak=0;btn.classList.add("wrong");
    fb.className="feedback no";
    const extra=(mode==="listen"||curVar()==="th2en")?" ("+w.ipa+")":"";
    fb.innerHTML="ยังไม่ถูก คำตอบคือ <b>"+correct+"</b>"+extra;
  }
  $("score").textContent=score;$("streak").textContent=streak;
  $("next-btn").classList.remove("hidden");
}

/* ── Sentence mode ───────────────────────────────────── */
function renderSentenceQ(s){
  $("choices").classList.add("hidden");
  $("q-main").classList.add("hidden");
  $("q-ipa").textContent="";$("q-pr").textContent="";
  $("speak-btn").classList.add("hidden");
  $("sentence-area").classList.remove("hidden");
  $("hint").textContent="แตะคำ เรียงให้เป็นประโยคภาษาอังกฤษ";
  $("s-prompt").textContent=s.th;

  const tokens=s.en.split(" ");
  sAnswer=[];
  sBank=shuffle(tokens.map((w,i)=>({w,id:i})));
  $("s-check").classList.remove("hidden");
  drawTiles();
}

function drawTiles(){
  const bank=$("s-bank"),ans=$("s-answer");
  bank.innerHTML="";ans.innerHTML="";
  sBank.forEach(tk=>{
    const b=document.createElement("button");
    b.className="tile";b.textContent=tk.w;
    b.onclick=()=>{if(answered)return;
      sBank=sBank.filter(x=>x.id!==tk.id);sAnswer.push(tk);drawTiles();};
    bank.appendChild(b);
  });
  sAnswer.forEach(tk=>{
    const b=document.createElement("button");
    b.className="tile in-answer";b.textContent=tk.w;
    b.onclick=()=>{if(answered)return;
      sAnswer=sAnswer.filter(x=>x.id!==tk.id);sBank.push(tk);drawTiles();};
    ans.appendChild(b);
  });
  $("s-check").disabled=(sBank.length!==0||sAnswer.length===0);
}

$("s-check").onclick=()=>{
  if(answered||sBank.length!==0)return;answered=true;
  const s=queue[idx];
  const built=sAnswer.map(t=>t.w).join(" ");
  const ok=built===s.en;
  const tiles=$("s-answer").querySelectorAll(".tile");
  const target=s.en.split(" ");
  tiles.forEach((t,i)=>t.classList.add(t.textContent===target[i]?"correct":"wrong"));
  const fb=$("feedback");
  if(ok){
    score+=10+streak*2;streak++;
    fb.className="feedback ok";
    fb.textContent=streak>=3?("เยี่ยม! ถูกติดกัน "+streak+" ข้อ 🔥"):"ถูกต้อง! ✓";
  }else{
    streak=0;
    fb.className="feedback no";
    fb.innerHTML="ยังไม่ถูก ที่ถูกคือ <b>"+s.en+"</b>";
  }
  speak(s.en);
  $("s-check").classList.add("hidden");
  $("score").textContent=score;$("streak").textContent=streak;
  $("next-btn").classList.remove("hidden");
};

/* ── Navigation ──────────────────────────────────────── */
$("next-btn").onclick=()=>{idx++;if(idx>=queue.length){endGame();return;}renderQ();};
$("back-btn").onclick=goHome;
$("replay-btn").onclick=()=>$("start-btn").click();
$("home-btn").onclick=goHome;

function endGame(){
  bestSet(score);
  $("game").classList.add("hidden");$("end").classList.remove("hidden");
  $("end-score").textContent=score+" คะแนน";
  const top=score>=(mode==="sentence"?S_ROUND*16:160);
  let msg;
  if(top)msg="สุดยอดมาก! แม่นยำสุดๆ";
  else if(score>=100)msg="เยี่ยม ทำได้ดีมาก";
  else msg="ดีขึ้นเรื่อยๆ ลองอีกรอบนะ สู้ๆ";
  $("end-msg").textContent=msg+" · สถิติดีสุด "+bestGet()+" คะแนน";
}
function goHome(){$("game").classList.add("hidden");$("end").classList.add("hidden");$("home").classList.remove("hidden");renderHome();}
renderHome();
