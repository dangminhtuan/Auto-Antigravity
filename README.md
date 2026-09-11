# AGY Auto-Approve — Chrome Extension

Tu dong phe duyet (auto-approve) cac action prompt cua Google Antigravity.
Thay vi phai go "4" va Enter moi lan, extension se tu dong lam viec do sau mot khoang delay co the cau hinh.

---

## Cai dat (Load Unpacked)

1. Mo Chrome → vao dia chi: `chrome://extensions`
2. Bat **Developer mode** (goc tren phai)
3. Click **"Load unpacked"**
4. Chon thu muc `Auto Antigravity` (thu muc nay, chua file `manifest.json`)
5. Extension se xuat hien trong danh sach — icon ⚡ se hien tren thanh cong cu

---

## Cach dung

- **Icon badge**: Hien `ON` (xanh) hoac `OFF` (do) de biet trang thai
- **Popup**: Click icon de:
  - Bat/Tat extension
  - Chinh delay cho action AN TOAN (mac dinh: 5s)
  - Chinh delay cho action NGUY HIEM (mac dinh: 120s)
  - Xem lich su cac lan auto-approve

- **Countdown overlay**: Khi phat hien approval prompt, extension hien:
  - Loai phan loai (AN TOAN / NGUY HIEM)
  - Dem nguoc so giay con lai
  - Nut **"Huy"** de huy bo
  - Nut **"Phe duyet ngay"** de approve ngay lap tuc

---

## Phan loai AN TOAN vs NGUY HIEM

Extension dung keyword matching (khong can AI) de phan loai:

### AN TOAN (delay ngan) — Vi du:
- `view_file`, `read_file`, `list_dir`
- `grep_search`, `find_by_name`, `search_web`
- `cargo check`, `npm test`, `git status`, `git log`
- `echo`, `ls`, `cat`, `ping`

### NGUY HIEM (delay dai) — Vi du:
- `rm -rf`, `del /f`, `rmdir /s`
- `write_to_file`, `replace_file_content`
- `git push`, `git reset --hard`
- `npm publish`, `wrangler deploy`, `terraform apply`
- `DROP TABLE`, `DELETE FROM`, `password`, `secret`

> Neu khong match keyword nao → mac dinh la NGUY HIEM (an toan hon)

---

## Tuong thich

| Giao dien | Tuong thich |
|---|---|
| Antigravity web (Chrome) | ✅ Hoat dong ngay |
| Antigravity 2.0 Desktop (Electron) | ⚠️ Can them buoc (xem ben duoi) |

### Doi voi Antigravity 2.0 Desktop App (Electron)

Neu AGY 2.0 la Electron app, extension Chrome khong tu dong inject duoc.
Co 2 lua chon:

**Option A (De nhat) — Dung Tampermonkey:**
1. Cai Tampermonkey vao Chrome
2. Chuyen noi dung `rules.js` + `content.js` thanh mot userscript
3. Set match URL phu hop voi URL cua AGY 2.0

**Option B — Them extension vao Electron:**
1. Tim file khoi dong cua AGY 2.0 (vi du: `agy.exe` hoac shell script)
2. Them flag: `--load-extension="C:\path\to\Auto Antigravity"`
3. Restart app

---

## Cau truc thu muc

```
Auto Antigravity/
├── manifest.json       # Extension manifest (MV3)
├── content.js          # Core logic (MutationObserver + countdown)
├── rules.js            # Keyword ruleset phan loai
├── background.js       # Service worker (badge ON/OFF)
├── popup/
│   ├── popup.html      # UI cau hinh
│   ├── popup.js        # Logic popup
│   └── popup.css       # Style dark theme
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md           # File nay
```
