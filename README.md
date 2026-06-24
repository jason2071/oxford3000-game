# Oxford 3000 — เกมฝึกคำศัพท์

เกมฝึกคำศัพท์ภาษาอังกฤษ Oxford 3000 (2,853 คำ) แบบ multiple-choice เล่นบนเว็บ
ไม่มี backend ไม่มี build step — เปิดไฟล์ก็เล่นได้เลย

**🎮 เล่นเลย:** https://jason2071.github.io/oxford3000-game/

## Features

3 โหมดหลัก แยกตามระดับ CEFR (A1/A2/B1/B2):

1. **ทายคำแปล** — อังกฤษ → ไทย และ ไทย → อังกฤษ (2,853 คำ)
2. **ฟังเสียงทาย** — ฟังเสียงอังกฤษ แล้วเลือกคำ/คำแปล (2 sub-mode)
3. **ประโยค & ไวยากรณ์** — 10 หมวด พร้อมคำอธิบายไวยากรณ์หลังตอบ:
   - 7 หมวดเรียงประโยค: เดินทาง · ร้านอาหาร · ทำงาน · ช้อปปิ้ง · กาลเวลา · ชนิดของคำ · ประเภทประโยค (280 ประโยคพร้อม note)
   - มินิเกม: **ต่อประโยค** (เลือกส่วนต่อ) · **สุ่มคำดิบ** (สะกดคำจากตัวอักษร) · **ทายคำจากประโยค** (cloze)

- 🔊 ฟังเสียงอ่าน (Web Speech API) พร้อม IPA + คำอ่านไทย
- 📝 คำอธิบายไวยากรณ์ + คำสำคัญ ทุกประโยค (โหมดประโยค)
- 🔥 ระบบคะแนน + streak (ตอบถูกติดกันได้โบนัส)
- 🏆 เก็บสถิติคะแนนสูงสุดแยกต่อโหมด/หมวด/ระดับ ผ่าน `localStorage`
- 📱 Mobile-first, รองรับ `prefers-reduced-motion`

## Tech Stack

Vanilla HTML / CSS / JavaScript — ไม่มี dependency, ไม่มี framework

- **Design**: Vintage Academic Press theme (Playfair Display + IBM Plex Sans Thai)
- **Hosting**: GitHub Pages (static, deploy from `main` / root)

## Structure

```
index.html         markup + font links (icon ฝังเป็น inline SVG)
css/styles.css     design system + responsive + animations
js/data.js         WORDS dataset (en, th, ipa, pr, lv) — 2,853 คำ
js/sentences.js    SENTENCES dataset (en, th, lv, cat, note) — 280 ประโยค, 7 หมวด
js/app.js          game logic (modes, category dispatch, mini-games, scoring)
```

> `data.js` + `sentences.js` ต้องโหลดก่อน `app.js` (app ใช้ global `WORDS` / `SENTENCES`)

## รันในเครื่อง

ต้องเสิร์ฟผ่าน HTTP (เปิด `file://` ตรงๆ ไม่ได้ เพราะ font/asset):

```bash
python3 -m http.server 8000
# เปิด http://localhost:8000
```

## Deploy

Push ขึ้น `main` → GitHub Pages rebuild อัตโนมัติ (~1 นาที)
ตั้งค่า: **Settings → Pages → Source: Deploy from a branch → `main` / `/ (root)`**
