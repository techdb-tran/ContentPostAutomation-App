# Auto Posting Scheduler

Hệ thống tự động đăng bài theo lịch cho Facebook Pages, dùng React ở frontend và Flask ở backend. Dự án được thiết kế để quản lý nhiều via account, lấy page access token, chọn nhiều page theo từng campaign, đồng bộ nội dung từ Google Sheet, và ghi log trạng thái từng lần chạy.

## Mục tiêu

- Quản lý nhiều via/account cùng lúc.
- Nạp và chọn danh sách Facebook Pages có quyền đăng bài.
- Tạo campaign/schedule với nhiều kiểu lịch khác nhau.
- Lấy nội dung từ Google Sheet theo hàng `Planning`.
- Tự động đăng bài, cập nhật trạng thái `Done` hoặc `Error`.
- Lưu execution log để theo dõi và rerun khi cần.

## Stack

- Frontend: React 18 + TypeScript + Vite
- Backend: Flask + SQLAlchemy + Marshmallow
- Auth: JWT demo login with 2 users
- UI data flow: TanStack Query
- Client state: Zustand
- API: Axios

## Tính năng đã dựng bước đầu

- Backend Flask app factory và healthcheck.
- JWT login cho 2 user demo: Admin1 và Admin2.
- Chuẩn response API thống nhất.
- Core domain model cho via account, Facebook page, campaign, sheet row, execution log.
- CRUD khởi đầu cho campaign.
- CRUD khởi đầu cho via account và Facebook page.
- Frontend dashboard shell với giao diện vận hành.
- Trang quản lý via account và Facebook page ở mức nền.

## Cấu trúc thư mục

```text
backend/
  app/
    api/
    models/
    repositories/
    schemas/
    services/
    utils/
  run.py

frontend/
  src/
    api/
    pages/
    router/
    types/
    styles.css
```

## Chạy backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
flask run
```

Backend mặc định chạy tại `http://localhost:5000`.

Nếu đang dùng Windows và muốn chạy thẳng không cần activate, có thể dùng:

```bash
cd backend
.venv\Scripts\flask.exe run
```

Không nên chạy `flask run` bằng Python hệ thống khi chưa activate `venv`, vì backend có các package chỉ được cài trong `.venv`.

## Chạy frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend mặc định chạy tại `http://localhost:5173`.

## API hiện có

- `GET /api/v1/health`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `GET /api/v1/auth/me`
- `GET /api/v1/campaigns`
- `POST /api/v1/campaigns`
- `GET /api/v1/via-accounts`
- `POST /api/v1/via-accounts`
- `GET /api/v1/facebook-pages`
- `POST /api/v1/facebook-pages`

## Tài khoản demo

- Username: `Admin1`
- Password: `Admin1@123`

- Username: `Admin2`
- Password: `Admin2@123`

Sau khi đăng nhập, frontend sẽ lưu access token và refresh token, rồi tự gọi refresh khi access token hết hạn.

## Google Sheet workflow

Mỗi lần campaign tới giờ chạy, backend sẽ lấy 1 dòng có `Status = Planning` từ Google Sheet, đăng nội dung của dòng đó lên các Facebook Page đã chọn trong campaign, rồi cập nhật lại:

- `Status` -> `Done` nếu đăng thành công
- `Posted URI` / `Posted URL` / `Link Post` -> link bài đã đăng
- `Status` -> `Error` nếu có lỗi và ghi thêm thông tin lỗi nếu sheet có cột tương ứng

Backend hiện hỗ trợ các cột phổ biến như:

- `Caption`
- `Video URI` hoặc `Video URL` hoặc `Video Link`
- `Status`
- `Posted URI` hoặc `Posted URL` hoặc `Link Post`
- `Time Post`

### Cấu hình cần có

```bash
GOOGLE_SERVICE_ACCOUNT_FILE=path/to/service-account.json
SCHEDULER_ENABLED=true
SCHEDULER_TIMEZONE=Asia/Ho_Chi_Minh
```

Sheet Google phải được share quyền edit cho service account trong file JSON trên.

### API chạy 1 row ngay

- `POST /api/v1/campaigns/<campaign_id>/execute-next`

Endpoint này sẽ lấy row Planning tiếp theo của campaign, đăng bài, rồi cập nhật lại Google Sheet.

## Ghi chú

- Dự án đang được triển khai theo hướng mở rộng dần từ core domain sang scheduler, Google Sheet sync, và Facebook posting pipeline.
- Luồng scheduling hiện được thiết kế để hỗ trợ nhiều mode lịch, gồm giờ cố định mỗi ngày, khung giờ với interval, và kiểu linh hoạt giống Make.com.
