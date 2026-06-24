const ROUND = 10;          // questions per round (word modes / scramble)
const S_ROUND = 8;         // questions per round (sentence-based)
const LEVELS = ["A1","A2","B1","B2"];
const LV_DESC = {A1:"เริ่มต้น",A2:"พื้นฐาน",B1:"กลาง",B2:"กลาง-สูง"};

const MODES = [
  {id:"translate", t:"ทายคำแปล",          d:"เห็นคำ ทายความหมาย"},
  {id:"listen",    t:"ฟังเสียงทาย",        d:"ฟังเสียง แล้วเลือก"},
  {id:"sentence",  t:"ประโยค & ไวยากรณ์",  d:"เรียงประโยค + มินิเกม 10 หมวด"},
];
const VARIANTS = {
  translate:[
    {id:"en2th", t:"อังกฤษ → ไทย", d:"ทายคำแปล"},
    {id:"th2en", t:"ไทย → อังกฤษ", d:"ทายคำอังกฤษ"},
  ],
  listen:[
    {id:"audio2en", t:"เลือกคำที่ได้ยิน", d:"เลือกคำอังกฤษ"},
    {id:"audio2th", t:"เลือกคำแปล",       d:"เลือกคำไทย"},
  ],
};

// 10 categories under the sentence mode. kind drives the game mechanic.
const SCATS = [
  {key:"travel",       label:"เดินทาง·ท่องเที่ยว", kind:"order"},
  {key:"food",         label:"ร้านอาหาร·คาเฟ่",   kind:"order"},
  {key:"work",         label:"ทำงาน·ธุรกิจ",      kind:"order"},
  {key:"shopping",     label:"ช้อปปิ้ง",          kind:"order"},
  {key:"time",         label:"กาลเวลา",           kind:"order"},
  {key:"pos",          label:"ชนิดของคำ",         kind:"order"},
  {key:"stype",        label:"ประเภทประโยค",      kind:"order"},
  {key:"continuation", label:"ต่อประโยค",         kind:"continue"},
  {key:"scramble",     label:"สุ่มคำดิบ",          kind:"scramble"},
  {key:"cloze",        label:"ทายคำจากประโยค",     kind:"cloze"},
];
const KIND_TAG = {order:"เรียงประโยค", continue:"เลือกส่วนต่อ", scramble:"สะกดคำ", cloze:"เติมคำ"};
function scatKind(k){const c=SCATS.find(x=>x.key===k);return c?c.kind:"order";}

let mode="translate", level="A1";
let variant={translate:"en2th", listen:"audio2en", sentence:"travel"};
let queue=[],idx=0,score=0,streak=0,answered=false;
let sAnswer=[], sBank=[];                 // tile state: [{w,id}]
let curTarget=[], curNote="", curSpeak="", curSep=" ";   // tile-check context

const WEN = new Set(WORDS.map(w=>w.en.toLowerCase()));   // for cloze blanks
const $=id=>document.getElementById(id);
function shuffle(a){a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function byLevel(lv){return WORDS.filter(w=>w.lv===lv);}
function spellable(lv){return byLevel(lv).filter(w=>/^[a-z]+$/i.test(w.en)&&w.en.length>=3&&w.en.length<=10);}
function curVar(){return variant[mode];}

function poolCount(lv){
  if(mode!=="sentence")return byLevel(lv).length;
  const kind=scatKind(curVar());
  if(kind==="scramble")return spellable(lv).length;
  if(kind==="order")return SENTENCES.filter(s=>s.cat===curVar()&&s.lv===lv).length;
  return SENTENCES.filter(s=>s.lv===lv).length;
}

function bestKey(m,lv,v){return "ox_"+m+"_"+lv+"_"+(v||"-");}
function bestFor(m,lv,v){try{return parseInt(localStorage.getItem(bestKey(m,lv,v)))||0;}catch(e){return 0;}}
function bestGet(){return bestFor(mode,level,curVar());}
function bestSet(val){try{if(val>bestGet())localStorage.setItem(bestKey(mode,level,curVar()),val);}catch(e){}}

/* ── Session persistence (survive page refresh) ──────────
   view="game" stores the in-progress round so a refresh resumes the
   current question (the partial answer of the live question is dropped —
   we re-render it fresh). view="home" keeps only the menu selections. */
const SKEY="ox_session";
function saveState(view){
  try{
    const s={v:1,view,mode,level,variant};
    if(view==="game"){s.queue=queue;s.idx=idx;s.score=score;s.streak=streak;}
    localStorage.setItem(SKEY,JSON.stringify(s));
  }catch(e){}
}
function restoreState(){
  try{
    const raw=localStorage.getItem(SKEY);if(!raw)return false;
    const s=JSON.parse(raw);if(!s||s.v!==1)return false;
    if(s.mode)mode=s.mode;
    if(s.level)level=s.level;
    if(s.variant)Object.assign(variant,s.variant);
    if(s.view==="game"&&Array.isArray(s.queue)&&s.queue.length){
      queue=s.queue;idx=Math.min(s.idx||0,queue.length-1);
      score=s.score||0;streak=s.streak||0;
      renderHome();
      $("home").classList.add("hidden");$("end").classList.add("hidden");$("game").classList.remove("hidden");
      $("score").textContent=score;$("streak").textContent=streak;
      renderQ();
      return true;
    }
  }catch(e){}
  return false;
}

/* ── Home ─────────────────────────────────────────────── */
function renderHome(){
  const mg=$("mode-grid");mg.innerHTML="";
  MODES.forEach(m=>{
    const b=document.createElement("button");
    b.type="button";
    b.className="opt"+(m.id===mode?" active":"");
    b.setAttribute("aria-pressed",m.id===mode?"true":"false");
    b.innerHTML=`<span class="t">${m.t}</span><div class="d">${m.d}</div>`;
    b.onclick=()=>{mode=m.id;renderHome();};
    mg.appendChild(b);
  });

  const g=$("level-grid");g.innerHTML="";
  const unit=(mode==="sentence"&&scatKind(curVar())!=="scramble")?"ประโยค":"คำ";
  LEVELS.forEach(lv=>{
    const b=document.createElement("button");
    b.type="button";
    b.className="opt"+(lv===level?" active":"");
    b.setAttribute("aria-pressed",lv===level?"true":"false");
    b.innerHTML=`<span class="t">${lv}</span> <span class="d">${LV_DESC[lv]}</span>
      <div class="d">${poolCount(lv)} ${unit}</div>
      <div class="best">สถิติ ${bestFor(mode,lv,curVar())} คะแนน</div>`;
    b.onclick=()=>{level=lv;renderHome();};
    g.appendChild(b);
  });

  const vr=$("variant-row"),vl=$("variant-label");
  vr.innerHTML="";
  if(mode==="sentence"){
    vl.textContent="เลือกหมวด";vl.classList.remove("hidden");
    vr.className="grid scat-grid";vr.classList.remove("hidden");
    SCATS.forEach(c=>{
      const b=document.createElement("button");
      b.type="button";
      b.className="opt"+(c.key===curVar()?" active":"");
      b.setAttribute("aria-pressed",c.key===curVar()?"true":"false");
      b.innerHTML=`<span class="t">${c.label}</span><div class="d">${KIND_TAG[c.kind]}</div>`;
      b.onclick=()=>{variant.sentence=c.key;renderHome();};
      vr.appendChild(b);
    });
  }else{
    vr.className="row2";
    const vs=VARIANTS[mode];
    vl.textContent="รูปแบบคำถาม";vl.classList.remove("hidden");vr.classList.remove("hidden");
    vs.forEach(v=>{
      const b=document.createElement("button");
      b.type="button";
      b.className="opt"+(v.id===curVar()?" active":"");
      b.setAttribute("aria-pressed",v.id===curVar()?"true":"false");
      b.innerHTML=`<span class="t">${v.t}</span><div class="d">${v.d}</div>`;
      b.onclick=()=>{variant[mode]=v.id;renderHome();};
      vr.appendChild(b);
    });
  }
  if($("game").classList.contains("hidden"))saveState("home");
}

/* ── Start / speech ──────────────────────────────────── */
$("start-btn").onclick=()=>{
  if(mode==="sentence"){
    const kind=scatKind(curVar());
    if(kind==="scramble"){
      queue=shuffle(spellable(level)).slice(0,ROUND);
    }else if(kind==="order"){
      const pool=SENTENCES.filter(s=>s.cat===curVar()&&s.lv===level);
      queue=shuffle(pool).slice(0,Math.min(S_ROUND,pool.length));
    }else{ // continue / cloze: draw from all sentences of the level
      const pool=SENTENCES.filter(s=>s.lv===level);
      queue=shuffle(pool).slice(0,Math.min(S_ROUND,pool.length));
    }
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
// Single source of truth for the 🔊 listen button. Modes where the English
// is the answer call hideSpeak() during play, then showSpeak() after answering.
function showSpeak(text){const b=$("speak-btn");if(!text){hideSpeak();return;}
  b.classList.remove("hidden");b.onclick=()=>speak(text);}
function hideSpeak(){const b=$("speak-btn");b.classList.add("hidden");b.onclick=null;}
function showNote(t){
  const el=$("s-note");
  if(!t){el.classList.add("hidden");el.textContent="";return;}
  el.textContent="📝 "+t;el.classList.remove("hidden");
}

/* ── Question dispatch ───────────────────────────────── */
function renderQ(){
  answered=false;
  $("feedback").textContent="";$("feedback").className="feedback";
  $("next-btn").classList.add("hidden");
  $("q-main").classList.remove("q-sentence","clickable");
  $("q-main").onclick=null;   // single source of truth; listen mode re-sets it below
  showNote("");
  $("prog").textContent=(idx+1)+"/"+queue.length;
  saveState("game");

  if(mode==="sentence"){
    const kind=scatKind(curVar()),item=queue[idx];
    if(kind==="order")        renderTileQ(item.en.split(" "), item.th, item.note, "แตะคำ เรียงให้เป็นประโยค", item.en, " ");
    else if(kind==="scramble")renderTileQ(item.en.split(""), item.th+(item.ipa?" · "+item.ipa:""), null, "เรียงตัวอักษรให้เป็นคำภาษาอังกฤษ", item.en, "");
    else if(kind==="continue")renderContinuationQ(item);
    else                      renderClozeQ(item);
    return;
  }

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
    showSpeak(w.en);
    $("q-main").classList.add("clickable");
    $("q-main").onclick=()=>speak(w.en);
    if(curVar()==="audio2en"){key="en";correct=w.en;}
    else{key="th";correct=w.th;}
    distractors=shuffle(pool.filter(x=>x[key]!==correct)).slice(0,3).map(x=>x[key]);
    speak(w.en);
  }else if(curVar()==="en2th"){
    $("hint").textContent="คำนี้แปลว่าอะไร?";
    $("q-main").textContent=w.en;
    $("q-ipa").textContent=w.ipa;$("q-pr").textContent=w.pr;
    showSpeak(w.en);
    correct=w.th;
    distractors=shuffle(pool.filter(x=>x.th!==w.th)).slice(0,3).map(x=>x.th);
  }else{ // th2en
    $("hint").textContent="คำนี้ภาษาอังกฤษว่าอะไร?";
    $("q-main").textContent=w.th;
    $("q-ipa").textContent="";$("q-pr").textContent="";
    hideSpeak();   // English is the answer — reveal listen button after answering
    correct=w.en;
    distractors=shuffle(pool.filter(x=>x.en!==w.en)).slice(0,3).map(x=>x.en);
  }

  const opts=shuffle([correct,...distractors]);
  const box=$("choices");box.innerHTML="";
  opts.forEach(o=>{
    const b=document.createElement("button");
    b.type="button";
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
  showSpeak(w.en);   // after answering, always allow replaying the English audio
  $("score").textContent=score;$("streak").textContent=streak;
  $("next-btn").classList.remove("hidden");
}

/* ── Tile games: order + scramble ────────────────────── */
function renderTileQ(tokens,promptText,note,hintText,speakText,sep){
  $("choices").classList.add("hidden");
  $("q-main").classList.add("hidden");
  $("q-ipa").textContent="";$("q-pr").textContent="";
  hideSpeak();   // English is the answer — reveal listen button after answering
  $("sentence-area").classList.remove("hidden");
  $("hint").textContent=hintText;
  $("s-prompt").textContent=promptText;
  curTarget=tokens.slice();curNote=note;curSpeak=speakText;curSep=sep;
  sAnswer=[];sBank=shuffle(tokens.map((w,i)=>({w,id:i})));
  $("s-check").classList.remove("hidden");
  drawTiles();
}

function drawTiles(){
  const bank=$("s-bank"),ans=$("s-answer");
  bank.innerHTML="";ans.innerHTML="";
  const letter=(curSep==="");
  sBank.forEach(tk=>{
    const b=document.createElement("button");
    b.type="button";
    b.className="tile"+(letter?" letter":"");b.textContent=tk.w;
    b.onclick=()=>{if(answered)return;
      sBank=sBank.filter(x=>x.id!==tk.id);sAnswer.push(tk);drawTiles();};
    bank.appendChild(b);
  });
  sAnswer.forEach(tk=>{
    const b=document.createElement("button");
    b.type="button";
    b.className="tile in-answer"+(letter?" letter":"");b.textContent=tk.w;
    b.onclick=()=>{if(answered)return;
      sAnswer=sAnswer.filter(x=>x.id!==tk.id);sBank.push(tk);drawTiles();};
    ans.appendChild(b);
  });
  $("s-check").disabled=(sBank.length!==0||sAnswer.length===0);
}

$("s-check").onclick=()=>{
  if(answered||sBank.length!==0)return;answered=true;
  const builtArr=sAnswer.map(t=>t.w);
  const ok=builtArr.join(curSep)===curTarget.join(curSep);
  const tiles=$("s-answer").querySelectorAll(".tile");
  tiles.forEach((t,i)=>t.classList.add(t.textContent===curTarget[i]?"correct":"wrong"));
  const fb=$("feedback");
  if(ok){
    score+=10+streak*2;streak++;
    fb.className="feedback ok";
    fb.textContent=streak>=3?("เยี่ยม! ถูกติดกัน "+streak+" ข้อ 🔥"):"ถูกต้อง! ✓";
  }else{
    streak=0;
    fb.className="feedback no";
    fb.innerHTML="ยังไม่ถูก ที่ถูกคือ <b>"+curTarget.join(curSep)+"</b>";
  }
  if(curSpeak)speak(curSpeak);
  showSpeak(curSpeak);
  showNote(curNote);
  $("s-check").classList.add("hidden");
  $("score").textContent=score;$("streak").textContent=streak;
  $("next-btn").classList.remove("hidden");
};

/* ── Choice games: continuation + cloze ──────────────── */
function setupSentenceChoice(hintText){
  $("sentence-area").classList.add("hidden");
  $("choices").classList.remove("hidden");
  $("q-main").classList.remove("hidden");
  $("q-main").classList.add("q-sentence");
  $("q-ipa").textContent="";$("q-pr").textContent="";
  hideSpeak();   // English is the answer — reveal listen button after answering
  $("hint").textContent=hintText;
}

function renderContinuationQ(s){
  setupSentenceChoice("เลือกส่วนต่อของประโยคให้ถูก");
  const toks=s.en.split(" "),cut=Math.max(2,Math.ceil(toks.length/2));
  const tail=toks.slice(cut).join(" "),prefix=toks.slice(0,cut).join(" ");
  $("q-main").textContent=prefix+" …";
  const dis=[];
  for(const o of shuffle(SENTENCES.filter(x=>x.lv===level&&x.en!==s.en))){
    const ot=o.en.split(" "),c=Math.max(2,Math.ceil(ot.length/2)),t=ot.slice(c).join(" ");
    // skip distractors whose source shares this prefix (would be an equally-valid continuation)
    if(t&&t!==tail&&!dis.includes(t)&&ot.slice(0,c).join(" ")!==prefix)dis.push(t);
    if(dis.length>=3)break;
  }
  renderSChoices([tail,...dis],tail,s.note,s.en);
}

const stripEnd=t=>t.replace(/[.?,!]+$/,"");
function renderClozeQ(s){
  setupSentenceChoice("เลือกคำเติมช่องว่าง");
  const toks=s.en.split(" ");
  // primary: content words (>=3 letters) that exist in WORDS — strip trailing punctuation first
  // (so the final word of a sentence is blankable too), skip the capitalized first word.
  let cand=[];
  toks.forEach((t,i)=>{const w=stripEnd(t);
    if(i>0&&/^[A-Za-z]+$/.test(w)&&w.length>=3&&WEN.has(w.toLowerCase()))cand.push(i);});
  if(cand.length===0){ // fallback: longest in-vocab token (skip first word, keeps distractor parity)
    let bi=-1,bl=0;
    toks.forEach((t,i)=>{const w=stripEnd(t).toLowerCase();if(i>0&&WEN.has(w)&&w.length>bl){bl=w.length;bi=i;}});
    if(bi<0)toks.forEach((t,i)=>{const w=stripEnd(t);if(/^[A-Za-z]+$/.test(w)&&w.length>bl){bl=w.length;bi=i;}});
    cand=[bi>=0?bi:0];
  }
  const bi=cand[Math.floor(Math.random()*cand.length)];
  // lowercase the answer so casing never gives it away vs the lowercase WORDS distractors
  const correct=stripEnd(toks[bi]).toLowerCase();
  $("q-main").textContent=toks.map((t,i)=>i===bi?"_____":t).join(" ");
  const dis=shuffle(byLevel(level).map(w=>w.en).filter(e=>e.toLowerCase()!==correct)).slice(0,3);
  renderSChoices([correct,...dis],correct,s.note,s.en);
}

function renderSChoices(opts,correct,note,speakText){
  if(opts.length<4)console.warn("renderSChoices: <4 options (thin distractor pool)",opts);
  const box=$("choices");box.innerHTML="";
  // opts/correct are authored static data (sentences/words) — never user input — so innerHTML below is safe
  shuffle(opts).forEach(o=>{
    const b=document.createElement("button");
    b.type="button";
    b.className="choice";b.textContent=o;
    b.onclick=()=>pickSentence(b,o,correct,note,speakText);
    box.appendChild(b);
  });
}

function pickSentence(btn,chosen,correct,note,speakText){
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
  }else{
    streak=0;btn.classList.add("wrong");
    fb.className="feedback no";
    fb.innerHTML="ยังไม่ถูก คำตอบคือ <b>"+correct+"</b>";
  }
  if(speakText)speak(speakText);
  showSpeak(speakText);
  showNote(note);
  $("score").textContent=score;$("streak").textContent=streak;
  $("next-btn").classList.remove("hidden");
}

/* ── Navigation ──────────────────────────────────────── */
$("next-btn").onclick=()=>{idx++;if(idx>=queue.length){endGame();return;}renderQ();};
$("back-btn").onclick=goHome;
$("replay-btn").onclick=()=>$("start-btn").click();
$("home-btn").onclick=goHome;

function endGame(){
  bestSet(score);
  saveState("home");   // round finished — drop the resume state, keep selections
  $("game").classList.add("hidden");$("end").classList.remove("hidden");
  $("end-score").textContent=score+" คะแนน";
  const top=score>=queue.length*16;
  let msg;
  if(top)msg="สุดยอดมาก! แม่นยำสุดๆ";
  else if(score>=queue.length*10)msg="เยี่ยม ทำได้ดีมาก";
  else msg="ดีขึ้นเรื่อยๆ ลองอีกรอบนะ สู้ๆ";
  $("end-msg").textContent=msg+" · สถิติดีสุด "+bestGet()+" คะแนน";
}
function goHome(){$("game").classList.add("hidden");$("end").classList.add("hidden");$("home").classList.remove("hidden");saveState("home");renderHome();}

// Boot: resume an in-progress round if one was saved, else show home.
if(!restoreState())renderHome();
