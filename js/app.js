const ROUND = 10;
const LEVELS = ["A1","A2","B1","B2"];
const LV_DESC = {A1:"เริ่มต้น",A2:"พื้นฐาน",B1:"กลาง",B2:"กลาง-สูง"};
let level="A1", dir="en2th";
let queue=[],idx=0,score=0,streak=0,answered=false;

const $=id=>document.getElementById(id);
function shuffle(a){a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function byLevel(lv){return WORDS.filter(w=>w.lv===lv);}
function bestGet(){try{return parseInt(localStorage.getItem("ox_"+level+"_"+dir))||0;}catch(e){return 0;}}
function bestSet(v){try{if(v>bestGet())localStorage.setItem("ox_"+level+"_"+dir,v);}catch(e){}}

function renderHome(){
  const g=$("level-grid");g.innerHTML="";
  LEVELS.forEach(lv=>{
    const n=byLevel(lv).length;
    const b=document.createElement("button");
    b.className="opt"+(lv===level?" active":"");
    b.innerHTML=`<span class="t">${lv}</span> <span class="d">${LV_DESC[lv]}</span>
      <div class="d">${n} คำ</div>
      <div class="best">สถิติ ${(()=>{try{return parseInt(localStorage.getItem("ox_"+lv+"_"+dir))||0;}catch(e){return 0;}})()} คะแนน</div>`;
    b.onclick=()=>{level=lv;renderHome();};
    g.appendChild(b);
  });
}
document.querySelectorAll("[data-dir]").forEach(b=>{
  b.onclick=()=>{document.querySelectorAll("[data-dir]").forEach(x=>x.classList.remove("active"));
    b.classList.add("active");dir=b.dataset.dir;renderHome();};
});

$("start-btn").onclick=()=>{
  const pool=byLevel(level);
  queue=shuffle(pool).slice(0,ROUND);
  idx=0;score=0;streak=0;
  $("home").classList.add("hidden");$("end").classList.add("hidden");$("game").classList.remove("hidden");
  $("score").textContent="0";$("streak").textContent="0";
  renderQ();
};

function speak(text){
  try{const u=new SpeechSynthesisUtterance(text);u.lang="en-US";u.rate=.9;
    speechSynthesis.cancel();speechSynthesis.speak(u);}catch(e){}
}

function renderQ(){
  answered=false;
  $("feedback").textContent="";$("feedback").className="feedback";
  $("next-btn").classList.add("hidden");
  $("prog").textContent=(idx+1)+"/"+queue.length;
  const w=queue[idx];
  const pool=byLevel(level);
  let promptText, correct, distractors, getLabel;
  if(dir==="en2th"){
    $("hint").textContent="คำนี้แปลว่าอะไร?";
    $("q-main").textContent=w.en;
    $("q-ipa").textContent=w.ipa;
    $("q-pr").textContent=w.pr;
    $("speak-btn").classList.remove("hidden");
    $("speak-btn").onclick=()=>speak(w.en);
    correct=w.th;
    distractors=shuffle(pool.filter(x=>x.th!==w.th)).slice(0,3).map(x=>x.th);
  }else{
    $("hint").textContent="คำนี้ภาษาอังกฤษว่าอะไร?";
    $("q-main").textContent=w.th;
    $("q-ipa").textContent="";
    $("q-pr").textContent="";
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
    if(dir==="th2en")speak(w.en);
  }else{
    streak=0;btn.classList.add("wrong");
    fb.className="feedback no";
    fb.innerHTML="ยังไม่ถูก คำตอบคือ <b>"+correct+"</b>"+(dir==="en2th"?"":" ("+w.ipa+")");
  }
  $("score").textContent=score;$("streak").textContent=streak;
  $("next-btn").classList.remove("hidden");
}

$("next-btn").onclick=()=>{idx++;if(idx>=queue.length){endGame();return;}renderQ();};
$("back-btn").onclick=goHome;
$("replay-btn").onclick=()=>$("start-btn").click();
$("home-btn").onclick=goHome;

function endGame(){
  bestSet(score);
  $("game").classList.add("hidden");$("end").classList.remove("hidden");
  $("end-score").textContent=score+" คะแนน";
  let msg;
  if(score>=160)msg="สุดยอดมาก! แม่นยำสุดๆ";
  else if(score>=100)msg="เยี่ยม ทำได้ดีมาก";
  else msg="ดีขึ้นเรื่อยๆ ลองอีกรอบนะ สู้ๆ";
  $("end-msg").textContent=msg+" · สถิติดีสุด "+bestGet()+" คะแนน";
}
function goHome(){$("game").classList.add("hidden");$("end").classList.add("hidden");$("home").classList.remove("hidden");renderHome();}
renderHome();
