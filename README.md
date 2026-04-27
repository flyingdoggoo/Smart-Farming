# NCKH-Refractor

Refactor hệ thống Smart Farming gồm:
- `server`: Node.js + Express + Prisma + PostgreSQL.
- `client`: React + Vite dashboard.
- `ml`: Flask predict server + notebook train model.
- `firmware`: ESP32 code.

## 1) Chạy nhanh toàn bộ hệ thống

Chạy một trong hai file:
- Root: `start_all.bat`
- Từ thư mục ML: `ml/start_all.bat`

Script sẽ tự:
1. Khởi động PostgreSQL bằng Docker Compose (nếu Docker đang bật).
2. Mở ML server (`http://localhost:8080`).
3. Mở backend (`http://localhost:3001`).
4. Mở frontend (`http://localhost:5173`).

Không cần pgAdmin để chạy dự án.

## 2) Chạy thủ công (nếu không dùng batch)

### PostgreSQL
```bat
docker compose up -d
```

### Backend
```bat
cd server
npm install
npm run db:push
npm run db:seed
npm run dev
```

`db:seed` chỉ seed user/mode/settings/schedule, không tạo dữ liệu cảm biến giả.

### Frontend
```bat
cd client
npm install
npm run dev
```

### ML server
```bat
cd ml
python -m pip install -r requirements.txt
python app.py
```

## 3) Firmware cũ có cần sửa endpoint không?

Không cần sửa ngay.

`firmware/core.ino` hiện vẫn gọi:
- `/database/update.php`
- `/database/getLedStatus.php`
- `/database/getmode.php`
- `/database/getTimeOnOff.php`

Backend đã có lớp tương thích ngược (`/database/*.php -> /api/*`) nên firmware cũ vẫn chạy.

Các endpoint legacy đang hỗ trợ để tương thích code cũ:
- `/database/update.php`
- `/database/getLedStatus.php`
- `/database/getmode.php` (trả plain text `0/1` như bản cũ)
- `/database/getTimeOnOff.php`
- `/database/getSensorData.php` (trả format `soilTemperature/.../reg_date` như bản cũ)
- `/database/get_readings_ajax.php` (trả format `temp/humi/ec/...` như dashboard cũ)
- `/database/getThreshhold.php` (trả plain text threshold)
- `/database/checkSensor.php` (check + gửi Telegram alert theo ngưỡng)

## 4) Train lại model từ đầu

Notebook mới:
- `ml/train_crop_recommendation_from_scratch.ipynb`

Notebook này có:
1. Tiền xử lý NaN/null + xử lý ngoại lai (IQR).
2. Visualization trước train (distribution, heatmap, boxplot, pairplot...).
3. Train và lưu history cho 4 mô hình: Random Forest, Naive Bayes, KNN, SVM.
4. Visualization sau train (accuracy, F1, CV stability, confusion matrix, report).
5. Lưu artifact production:
   - `models/versions/<version>/model.pkl`
   - `models/versions/<version>/standscaler.pkl`
   - `models/versions/<version>/minmaxscaler.pkl`
   - `models/versions/<version>/training_metrics.json`
   - cập nhật `models/latest_version.txt`

Sau khi train xong, chỉ cần restart `ml/app.py` để load model version mới.
Mặc định `.env` đang để `ML_MODEL_VERSION="auto"` để tự đọc `models/latest_version.txt`.

## 5) Dashboard môi trường + thời tiết

Dashboard đã tích hợp:
- Sensor phần cứng realtime (NPK, BH1750, INA219, relay status).
- Weather hôm nay qua API Open-Meteo (`/api/weather/today`).

## 6) Telegram Alert (như dự án cũ)

Backend đã tích hợp cảnh báo Telegram khi nhiệt độ vượt ngưỡng `settings.temperatureThreshold`.

Thiết lập trong `.env`:
- `TELEGRAM_ALERT_ENABLED=true`
- `TELEGRAM_BOT_TOKEN=<bot_token>`
- `TELEGRAM_CHAT_ID=<chat_id>`
- `TELEGRAM_ALERT_COOLDOWN_SEC=1800` (tránh spam liên tục)

API check thủ công:
- `GET /api/alerts/temperature/check`
- legacy: `GET /database/checkSensor.php`

## 7) Deploy lên Internet (Cloudflare Tunnel)

Dùng Cloudflare Tunnel để biến laptop thành server, truy cập qua domain riêng.

### Kiến trúc

```
Internet → smartfarm.k23bkdn.io.vn     → localhost:5173 (Frontend)
         → api.smartfarm.k23bkdn.io.vn → localhost:3001 (Backend)

Nội bộ (không expose):
         → localhost:8080 (ML Server)
         → localhost:5432 (PostgreSQL Docker)
```

### Cài đặt nhanh

```bat
:: 1. Cài cloudflared
winget install Cloudflare.cloudflared

:: 2. Đăng nhập
cloudflared tunnel login

:: 3. Tạo tunnel
cloudflared tunnel create smartfarm

:: 4. Copy file config mẫu
::    cloudflared-config.example.yml → %USERPROFILE%\.cloudflared\config.yml
::    Thay <TUNNEL_ID>, <USERNAME>, <YOURDOMAIN> bằng giá trị thật

:: 5. Tạo DNS records
cloudflared tunnel route dns smartfarm smartfarm.k23bkdn.io.vn
cloudflared tunnel route dns smartfarm api.smartfarm.k23bkdn.io.vn

:: 6. Cập nhật .env (xem comment "Production:" trong file)

:: 7. Chạy production
start_production.bat
```

File config mẫu: `cloudflared-config.example.yml`