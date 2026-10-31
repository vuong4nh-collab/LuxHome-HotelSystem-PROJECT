# LuxHome Customer PWA — UI/UX Remediation Checklist

Danh sách công việc được sắp theo mức độ ưu tiên dựa trên đợt audit UI/UX.
Phạm vi: `frontend/customer-pwa`. Các mục chưa đánh dấu là chưa được xác nhận hoàn tất.

## P0 — Ưu tiên cao nhất

- [ ] **Không báo check-in/check-out thành công khi API thất bại**
  - Vị trí: `frontend/customer-pwa/src/components/CheckInTab.jsx` — `handlePerformCheckIn`, `handlePerformCheckOut`.
  - Chỉ cập nhật trạng thái sau phản hồi thành công từ server; khi lỗi, giữ nguyên trạng thái và hiển thị thông báo lỗi có thể đọc bằng screen reader.
  - **Hoàn tất khi:** API lỗi không đổi trạng thái booking/không hiện thành công; người dùng có thể thử lại.

- [ ] **Khôi phục luồng giỏ chuyến đi và thanh toán cho tour/xe**
  - Vị trí: `frontend/customer-pwa/src/App.jsx`, `TripCartDrawer.jsx`, `UnifiedCheckoutModal.jsx`.
  - Nối `tripItems` với giao diện giỏ, cho phép xem/sửa/xóa dịch vụ và mở checkout; CTA “đặt ngay” phải đi tới checkout thay vì tab đơn hàng.
  - **Hoàn tất khi:** Có thể thêm tour/xe, mở giỏ, kiểm tra tổng tiền và hoàn tất hoặc nhận lỗi checkout rõ ràng.

- [ ] **Phân biệt lỗi tải dữ liệu với danh sách rỗng**
  - Vị trí: `TourSection.jsx`, `CarSection.jsx`, `OrdersTab.jsx` (và kiểm tra các màn hình gọi API khác).
  - Thể hiện riêng loading/error/empty/success; có hành động thử lại; không thay lỗi API bằng danh sách rỗng.
  - **Hoàn tất khi:** Với API 500/offline, UI báo không tải được dữ liệu; chỉ hiện empty state sau phản hồi thành công với danh sách rỗng.

## P1 — Ưu tiên cao

- [x] **Ngăn check-in/check-out mô phỏng khi backend từ chối**
  - Phụ thuộc vào mục P0 đầu tiên: xác minh thêm quyền, trạng thái booking và dữ liệu server trước khi chuyển trạng thái.
  - **Hoàn tất khi:** Không còn nhánh fallback giả lập thành công cho hành động cần ghi nhận trên server.

- [ ] **Hoàn thiện trải nghiệm offline và service worker**
  - Vị trí: `frontend/customer-pwa/public/sw.js`, `frontend/customer-pwa/index.html`.
  - Cache app shell và asset production cần thiết; thêm fallback offline, chỉ báo mất mạng và chính sách rõ cho request API; kiểm thử cập nhật phiên bản mà không làm mất phiên đang dùng.
  - **Hoàn tất khi:** App mở được khi offline sau lần tải đầu; màn hình giải thích rõ các chức năng cần mạng; bản cập nhật được xử lý nhất quán.

- [ ] **Đạt tương phản WCAG 2.2 AA cho chữ và trạng thái**
  - Vị trí: `frontend/customer-pwa/src/index.css` — token chữ phụ/mờ và màu nhãn tab.
  - Tăng tương phản chữ thường lên tối thiểu 4.5:1 và thành phần UI cần thiết lên 3:1 trên tất cả nền thực tế.
  - **Hoàn tất khi:** Đo lại các tổ hợp foreground/background ở trạng thái thường, active, disabled và lỗi; không còn tổ hợp dưới ngưỡng áp dụng.

- [ ] **Chuẩn hóa semantics và quản lý focus trong mọi modal**
  - Vị trí: `App.jsx`, `BookingFlow.jsx`, `UnifiedCheckoutModal.jsx`, `OrdersTab.jsx`, `TourSection.jsx`, `CarSection.jsx`.
  - Bổ sung dialog semantics, tên accessible, focus trap/restore, đóng bằng Escape và ngăn tương tác nền khi modal mở.
  - **Hoàn tất khi:** Có thể mở, dùng, đóng mọi modal chỉ bằng bàn phím; screen reader thông báo đúng tên/vai trò modal.

## P2 — Ưu tiên vừa

- [ ] **Hoàn thiện manifest và tài nguyên cài đặt PWA**
  - Vị trí: `frontend/customer-pwa/public/manifest.json`, `frontend/customer-pwa/index.html`, `public/`.
  - Thêm icon 192×192, 512×512 và maskable; khai báo `scope`/`id` phù hợp; thêm Apple touch icon; xác minh luồng cài đặt trên Chrome và hướng dẫn cài trên iOS.
  - **Hoàn tất khi:** Manifest hợp lệ và trình duyệt nhận diện installability trên môi trường HTTPS.

- [x] **Nối cài đặt tài khoản với tính năng thực tế**
  - Vị trí: `frontend/customer-pwa/src/components/AccountTab.jsx`.
  - Kết nối đổi điểm và thông báo đẩy với backend/API tương ứng; nếu chưa hỗ trợ, hiển thị rõ tính năng chưa khả dụng thay vì xác nhận thành công giả.
  - **Hoàn tất khi:** Điểm/voucher được lưu và xác nhận bởi server; push chỉ bật sau khi quyền/đăng ký hợp lệ.

- [x] **Tăng vùng chạm cho các nút nhỏ**
  - Vị trí: `frontend/customer-pwa/src/index.css` — công cụ kết quả khách sạn, liên kết chi tiết và bộ lọc sao.
  - Tăng touch target hướng tới 44×44 px; nếu không thể, xác minh kích thước/khoảng cách theo WCAG 2.2 Target Size.
  - **Hoàn tất khi:** Các điều khiển chạm không khó bấm ở viewport mobile hẹp.

## P3 — Ưu tiên thấp

- [x] **Loại bỏ tải font không dùng và tối ưu font**
  - Vị trí: `frontend/customer-pwa/index.html`, `frontend/customer-pwa/src/index.css`.
  - Chọn một font thống nhất; bỏ font/request thừa; đặt chiến lược `font-display` phù hợp và xác minh font fallback khi offline.
  - **Hoàn tất khi:** Không còn tải font không được dùng và không phát sinh chặn hiển thị không cần thiết.

- [ ] **Thực hiện vòng đo kiểm Lighthouse/axe trên đủ màn hình**
  - Chạy trên các màn hình chính ở viewport 360×640, 390×844, 768×1024, 1440×900; bao gồm light/dark, Slow 4G và offline.
  - Ghi lại điểm Lighthouse theo màn hình, lỗi axe, LCP/INP/CLS và các bước tái hiện; thực hiện lại sau các mục P0–P2.
  - **Hoàn tất khi:** Báo cáo kiểm thử có số liệu, môi trường, ngày chạy và không còn lỗi Critical/Serious chưa xử lý.

## Ghi chú kiểm chứng

- Audit trước đó quan sát API trả HTTP 500 cho một số màn hình động; xác minh lại sau khi môi trường backend hoạt động.
- Check-in/out chỉ đổi trạng thái sau phản hồi server xác nhận booking ID; backend kiểm tra quyền sở hữu và trạng thái booking. Đã bỏ QR/PIN/NFC và thông tin khóa phòng giả; màn hình báo chưa khả dụng cho đến khi có khóa số do máy chủ cấp.
- Backend chưa có API đổi điểm, voucher hoặc push; giao diện tài khoản nêu rõ chưa khả dụng và không hiển thị số điểm/hạng/ưu đãi chưa được xác nhận.
- Công cụ khách sạn, liên kết chi tiết và bộ lọc sao có vùng tối thiểu 44×44 px. Font dùng system stack, không còn request font ngoài.
- Đã đo các cặp chữ/trạng thái chính: chữ phụ trên nền sáng thấp nhất 4.95:1; nhãn tab active 8.98:1; nhãn pending 4.51:1; confirmed 5.49:1; success 4.57:1; cancelled 5.30:1. Còn rà soát ma trận đầy đủ trước khi đánh dấu mục tương phản.
- Đã kiểm tra cú pháp 14 tệp JS/JSX bằng esbuild, cú pháp service worker, JSON manifest và kích thước PNG (192×192, 512×512, maskable 512×512, Apple 180×180); `git diff --check` không báo lỗi whitespace.
- Còn chờ kiểm tra chạy thực tế: offline/cache/cập nhật service worker; cài đặt Chrome trên HTTPS và iOS; ma trận tương phản đầy đủ; thao tác bàn phím/screen reader với mọi modal; Lighthouse/axe ở các viewport, chế độ màu, Slow 4G và offline. Không đánh dấu các hạng mục này hoàn tất trước khi kiểm tra.
