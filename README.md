# Oxford 3000 — เกมฝึกคำศัพท์

เกมฝึกคำศัพท์ภาษาอังกฤษ Oxford 3000 (2,853 คำ) แบบ multiple-choice เล่นบนเว็บ
ไม่มี backend ไม่มี build step — เปิดไฟล์ก็เล่นได้เลย

**🎮 เล่นเลย:** https://jason2071.github.io/oxford3000-game/

## Features

- 📚 คำศัพท์ Oxford 3000 แยกตามระดับ CEFR — A1 (744), A2 (803), B1 (702), B2 (604)
- 🔄 2 โหมด: อังกฤษ → ไทย และ ไทย → อังกฤษ
- 🔊 ฟังเสียงอ่าน (Web Speech API) พร้อม IPA + คำอ่านไทย
- 🔥 ระบบคะแนน + streak (ตอบถูกติดกันได้โบนัส)
- 🏆 เก็บสถิติคะแนนสูงสุดต่อระดับ/โหมด ผ่าน `localStorage`
- 📱 Mobile-first, รองรับ `prefers-reduced-motion`

## Tech Stack

Vanilla HTML / CSS / JavaScript — ไม่มี dependency, ไม่มี framework

- **Design**: Vintage Academic Press theme (Playfair Display + IBM Plex Sans Thai)
- **Hosting**: GitHub Pages (static, deploy from `main` / root)

## Structure

```
index.html        markup + font links (icon ฝังเป็น inline SVG)
css/styles.css    design system + responsive + animations
js/data.js        WORDS dataset (en, th, ipa, pr, lv) — โหลดก่อน app.js
js/app.js         game logic (state, render, scoring, speech)
```

> `data.js` ต้องโหลดก่อน `app.js` เพราะ `app.js` ใช้ global `WORDS`

## รันในเครื่อง

ต้องเสิร์ฟผ่าน HTTP (เปิด `file://` ตรงๆ ไม่ได้ เพราะ font/asset):

```bash
python3 -m http.server 8000
# เปิด http://localhost:8000
```

## Deploy

Push ขึ้น `main` → GitHub Pages rebuild อัตโนมัติ (~1 นาที)
ตั้งค่า: **Settings → Pages → Source: Deploy from a branch → `main` / `/ (root)`**
