# Backlog — Auto Antigravity (`AGY Auto-Approve`)

> Ghi chú các hạng mục đã thảo luận để giải quyết sau khi hoàn thành bài toán ưu tiên cao nhất (**Phê duyệt tự động & phát hiện cần phê duyệt trên nhiều dự án cùng lúc**).

---

## 🎯 Mục Tiêu Ưu Tiên Hiện Tại (Đang xử lý)
- **Phê duyệt cùng lúc nhiều dự án:**
  - Nghiên cứu cách phát hiện dự án / hội thoại nào đang chạy hoặc đang **chờ phê duyệt (approval)** trên Google Antigravity Web (`antigravity.google.com` & iframe `antigravity.static.usercontent.goog`).
  - Tự động chuyển (hoặc cảnh báo + nhảy sang) dự án đang chờ duyệt $\rightarrow$ tự động ấn phê duyệt $\rightarrow$ tiếp tục theo dõi các dự án khác mà không làm gián đoạn khi người dùng đang gõ.

---

## 📌 Danh Sách Vấn Đề Ghi Lại Để Làm Sau

### 1. Thu nhỏ Thanh điều khiển để đọc thông báo mới (`Dismiss` bị che)
- **Vấn đề:** Khi Google Antigravity hiển thị thông báo mới ở góc dưới màn hình (ví dụ thẻ *"Introducing Gemini 4 Hydrogen"* có nút **`Dismiss`**), thanh điều khiển `[ ... | u | o | d | → ]` nằm đè lên đúng vị trí nút `Dismiss` và nội dung thông báo.
- **Hướng giải quyết:**
  - Thêm nút **Thu gọn (`▾`)** trên thanh điều khiển.
  - Khi bấm `▾`, thanh điều khiển thu gọn thành 1 nút tròn nhỏ **`⚡`** nép sát góc dưới bên phải màn hình (`bottom: 10px; right: 10px`), để lộ hoàn toàn đáy màn hình cho việc đọc thông báo và bấm `Dismiss`. Bấm lại vào `⚡` để bung ra đầy đủ.

### 2. Bỏ chữ `"Ẩn ô"` & Phóng to toàn bộ nút `u`, `o`, `d`, `→`
- **Vấn đề:** Nút `📖 Ẩn ô` / `✏️ Hiện ô` tốn diện tích ngang, các nút tròn `29px` hiện tại quá nhỏ so với ngón tay trên điện thoại, dễ bấm nhầm.
- **Hướng giải quyết:**
  - Bỏ chữ `"Ẩn ô"` / `"Hiện ô"`, chỉ giữ icon tròn **`📖`** / **`✏️`**.
  - Phóng to tất cả các nút trên thanh điều khiển lên **`36px–38px`** và nới khoảng cách giữa các nút.

### 3. Bỏ nút `⇄` chuyển 2 dự án — Đưa Search Project mặc định xuống Thanh điều khiển
- **Vấn đề:** Nút đảo nhanh `⇄` không hiệu quả bằng hộp **`Conversations ⌄ | Search for conversations...`** có sẵn của Google Antigravity.
- **Hướng giải quyết:**
  - Xóa nút `⇄` và logic lưu 2 hội thoại gần nhất.
  - Đưa nút/thanh kích hoạt **Search Project mặc định** (`Search Conversations`) xuống vị trí thuận tiện gắn ngay với Thanh điều khiển để luôn sẵn sàng tìm & chọn bất kỳ dự án nào chỉ với 1 chạm (hoặc kết hợp chế độ Desktop Mode).

### 4. Giao diện Lai (Hybrid Desktop + Mobile) khi bật *"Trang web cho máy tính"* trên điện thoại
- **Vấn đề:** Ở chế độ Desktop Mode trên điện thoại, cột Sidebar bên trái hiển thị được tổng quan toàn bộ các dự án và hội thoại rất tiện, nhưng trình duyệt thu nhỏ khung ~`980px` xuống màn ~`390px` khiến chữ chat, nút gốc (`+`, `→`, Sidebar items) và cả thanh điều khiển Extension bị thu bé tí.
- **Hướng giải quyết:**
  - Tự phát hiện chế độ Desktop trên thiết bị cảm ứng màn hình nhỏ (`screen.width < 600 && window.innerWidth >= 700`).
  - **Phóng to bù trừ Thanh điều khiển Extension** về kích thước vật lý chuẩn ngón tay bất chấp tỷ lệ thu phóng của trang Desktop.
  - **CSS thích nghi cho Desktop-on-Mobile:** tăng cỡ chữ nội dung chat (~`26px–30px` trên viewport Desktop), tăng vùng chạm các dòng dự án ở Sidebar và các nút thao tác gốc (`+`, `→`, `Submit`, radio chọn option), giảm khoảng trắng dư hai bên khung chat.

### 5. Cơ chế Auto-Approve thông minh & "Thống nhất nút bấm trước khi dùng lâu dài"
- **Vấn đề:** Số lượng lựa chọn trong hộp thoại phê duyệt thay đổi liên tục (khi 4 lựa chọn, khi 5 lựa chọn...), hardcode Option 4 gây lỗi hoặc nguy cơ bấm nhầm khi phần mềm cập nhật.
- **Hướng giải quyết:**
  - **Tìm nút theo ngữ nghĩa + `Max - 1`:** Ưu tiên mức `Yes, and always allow` cao nhất (toàn cục $\rightarrow$ theo dự án $\rightarrow$ theo hội thoại), hoặc tự tính `Số lựa chọn tối đa - 1` (VD: 4 $\rightarrow$ 3; 5 $\rightarrow$ 4), tuyệt đối né `No` / `Skip` / `Reject`.
  - **Thiết lập đổi số tạm thời:** Cho phép người dùng chọn giữa **`Auto (Tối đa - 1)`** hoặc ép cứng một số (`1`, `2`, `3`, `4`, `5`) trong Popup Cài đặt và nút chọn nhanh ngay trên khung đếm ngược.
  - **Cơ chế Chốt Mẫu Khi Có Thay Đổi (Schema-Change Guard):** Lưu "chữ ký" của cấu trúc hộp thoại phê duyệt đã thống nhất (tổng số lựa chọn + nhãn nút được chọn). Khi phát hiện cấu trúc hộp thoại bị thay đổi so với lần chốt trước $\rightarrow$ **tạm dừng tự động bấm**, hiện bảng đề xuất nút phù hợp nhất để người dùng xác nhận **"Đồng ý dùng nút này lâu dài"** 1 lần trước khi chạy tự động trở lại.
