# Workspace Rules — Auto Antigravity

<RULE>
## Web Extension & DOM Automation Protocol (Tự Động Hóa Extension & Web UI)
- **Context:** Khi phát triển, sửa lỗi hoặc tối ưu Chrome Extension, Userscript, hoặc script tự động hóa thao tác UI (click, submit, auto-approve, scrape).
- **Constraint:** AI BẮT BUỘC tuân thủ 5 nguyên tắc sau và chủ động yêu cầu User hợp tác nếu cần:

1. **Khảo sát cấu trúc Frame trước khi viết Selector:**
   - Đối với Web App phức tạp (Cloud IDE, Google Antigravity, VS Code Web), giao diện tương tác chính thường nằm trong **Cross-Origin Iframe** (ví dụ domain `.goog`, `*.usercontent.goog`).
   - Phải kiểm tra ngay URL của Iframe và khai báo đầy đủ trong `manifest.json` (`all_frames: true`, `match_about_blank: true`, đúng domain cấp cao nhất của iframe).
   - Tuyệt đối không phỏng đoán mò từ trang vỏ (`top` frame). Chủ động kích hoạt subagent `/browser` hoặc yêu cầu User dùng `Inspect Element (Ctrl+Shift+C)` click vào nút để trích xuất HTML chính xác.

2. **Chống vòng lặp đệ quy MutationObserver (Infinite Loop):**
   - Không bao giờ để `MutationObserver` lắng nghe các biến đổi do chính UI của Extension tạo ra.
   - Luôn chặn cập nhật DOM thừa: `if (bar.innerHTML !== newHTML) { bar.innerHTML = newHTML; }`.
   - Lọc bỏ mọi mutation có `target.id` hoặc `closest()` thuộc về Extension trước khi xử lý.

3. **Bẻ khóa State của React (Force Click):**
   - Tuyệt đối không dùng `element.click()` đơn thuần trên các web app viết bằng React vì React sẽ bỏ qua Synthetic Events.
   - Bắt buộc bắn chuỗi sự kiện hoàn chỉnh: `pointerdown` -> `mousedown` -> `pointerup` -> `mouseup` -> `click`.
   - Với input/radio, bắt buộc dùng `Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'checked').set` để ép ghi đè value và dispatch sự kiện `change` + `input`.

4. **Tối ưu trải nghiệm thử nghiệm (Zero-F5 / Console First):**
   - Các webapp Cloud IDE kết nối qua WebSocket/WebRTC rất nặng và dễ lỗi Cold-Start / rớt kết nối khi F5.
   - Luôn ưu tiên viết đoạn script Console test nhanh (dán vào F12 Console) để User xác thực selector tức thì trên tab đang mở mà không bắt User phải reload trang nhiều lần.

5. **Chủ động nhắc nhở và yêu cầu User hợp tác (Proactive Collaboration):**
   - Nếu User quên kiểm tra context Iframe (`top ▼`) trong Console, AI phải chủ động nhắc User dùng công cụ Inspect click thẳng vào phần tử để chuyển context.
   - Nếu trang web bị chặn Cross-Origin mà Extension chưa inject được, phải hướng dẫn User mẹo vượt rào tức thì trước khi sửa file cấu hình.
</RULE>
