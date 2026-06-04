# NỀN TẢNG THIẾT KẾ ĐỒNG PHỤC 3D ONLINE - MRS LINH

Dự án phát triển một nền tảng thiết kế đồng phục trực tuyến chuyên nghiệp, có mức độ tương tác cao, thiết kế theo phong cách hiện đại như Canva và Nike By You dành riêng cho thương hiệu **Mrs Linh Quy Nhơn**.

Nền tảng hỗ trợ đắc lực cho các doanh nghiệp, đội nhóm, nhà máy, công ty và kỹ sư tự thiết kế trang phục của mình trực quan, nhanh chóng, trước khi gửi trực tiếp tới xưởng may để đo và gia công.

---

## 🚀 Tính Năng Nổi Bật

### 1. Canvas Layer Rendering Engine (Kết Xuất Theo Lớp)
* Hệ thống tự động xếp chồng các lớp hình ảnh PNG trong suốt được tải trước từ thư mục `public/...`.
* Công nghệ **Offscreen Canvas Tinting**: Phủ màu sắc tùy chọn trực tiếp lên từng bộ phận áo/quần riêng lẻ (thân áo, tay, bo tay, cổ áo, túi, nẹp cổ, phản quang) bằng kỹ thuật blend màu `multiply` của HTML5 Canvas. Phương pháp này giúp giữ nguyên 100% chi tiết nguyên bản của nếp nhăn vải, bóng đổ thực tế, và đường may thay vì phủ một lớp màu phẳng bẹt thiếu chân thực.
* Quản lý các nhóm layer thông minh, tự động bật/tắt các chi tiết nắp túi, khuy cúc đi kèm túi khi người dùng tùy chỉnh.

### 2. Xoay 360 Độ Trực Quan & Mượt Mà
* Cung cấp góc xem preview 4 hướng tiêu chuẩn: **FRONT (Trước) — LEFT (Trái) — BACK (Sau) — RIGHT (Phải)**.
* Hỗ trợ tương tác vuốt (swipe) trên thiết bị di động và kéo thả (drag) chuột trên máy tính để xoay áo vòng tròn cực kỳ mượt mà.

### 3. Tải Lên Logo & Họa Tiết Thông Minh
* **Logo**: Hỗ trợ tải logo định dạng PNG/JPG, tự động nhận diện và **Snap (Hít)** vào các điểm neo tọa độ chuẩn trên áo (Ngực trái, Ngực phải, Giữa sau lưng, Bắp tay trái/phải). Logo sẽ tự động ẩn/hiện hoặc di chuyển chính xác khi người dùng xoay các góc nhìn 360 độ khác nhau.
* **Họa Tiết (Pattern)**: Cho phép người dùng tải lên hình in lớn tùy chỉnh riêng biệt cho từng góc nhìn, hỗ trợ kéo thả tự do, scale kích thước và xoay góc trong chế độ thiết kế nâng cao.

### 4. Chế Độ Basic Mode & Pro Mode
* **Basic Mode (Cơ bản)**: Tối ưu cho khách hàng phổ thông với giao diện đơn giản nhất. Chỉ hiển thị bảng phối màu tổng quan, upload logo và xem trước nhanh.
* **Pro Mode (Nâng cao)**: Dành riêng cho nhà thiết kế. Mở thêm bảng Debug Layers kiểm tra các lớp ảnh hoạt động, thanh trượt Opacity, tinh chỉnh tọa độ X/Y của hình in và logo siêu chi tiết.

### 5. ✨ Trí Tuệ Nhân Tạo Phối Màu (AI Design Suggestions)
* Nút bấm **AI Gợi Ý Thiết Kế** tự động thiết lập các công thức màu sắc, dải phản quang an toàn và túi đựng chuyên dụng phù hợp nhất cho từng ngành nghề đặc thù (Cơ khí, Điện lực, Xây dựng công trình, Nhà hàng Cafe, Thể thao Sự kiện).
* Tích hợp AI thuyết minh lý do phối màu với hiệu ứng chữ gõ (typewriter) sinh động như một ứng dụng SaaS thực thụ.

### 6. Xuất Bản & Đặt May
* Hỗ trợ **Tải ảnh PNG trong suốt** (chỉ tách riêng áo thiết kế không nền) để thiết kế logo phụ trợ, hoặc **Tải mockup Studio** (có nền spotlight cao cấp).
* Kết nối nhanh gửi mẫu thiết kế trực quan qua Zalo hoặc Form đăng ký nhận báo giá gốc trực tiếp từ Xưởng may Mrs Linh.

---

## 📁 Cấu Trúc Dự Án

```text
/thiet-ke-dong-phuc/
├── index.html        # Trang giao diện chính chuẩn SEO
├── styles.css        # Hệ thống thiết kế CSS Glassmorphism cao cấp
├── app.js            # Logic Engine cốt lõi (Canvas, Xoay 360, AI)
├── README.md         # Hướng dẫn chi tiết dự án
└── /public/          # Thư mục chứa tài nguyên ảnh layers PNG gốc
    ├── /ao-polo-nam/ # Các layer của áo Polo Nam
    ├── /ao-polo-nu/  # Các layer của áo Polo Nữ
    ├── /ao-thun-nam/ # Các layer của áo thun cổ tròn Nam
    ├── /ao-thun-nu/  # Các layer của áo thun cổ tròn Nữ
    └── /quan-ao-bao-ho-lao-dong/
        ├── /ao-bao-ho-lao-dong/   # Đồ bảo hộ áo kỹ sư công trình
        └── /quan-bao-ho-lao-dong/ # Đồ bảo hộ quần túi hộp, phản quang
```

---

## 🛠 Hướng Dẫn Sử Dụng & Triển Khai

1. Nền tảng được viết hoàn toàn bằng **HTML5, Vanilla CSS3 và Pure ES6 JavaScript**, không sử dụng framework nặng nề hay công cụ build trung gian, giúp ứng dụng có tốc độ tải trang gần như tức thì.
2. Để chạy thử dự án locally, bạn chỉ cần click đúp vào file `index.html` hoặc chạy một máy chủ local server đơn giản (như **Live Server** trên VS Code hoặc lệnh `node server.js` trong terminal).
3. Khi tải logo lên, hãy ưu tiên các ảnh định dạng `.png` đã được xóa nền (trong suốt) để đảm bảo logo được thêu/in lên áo với thẩm mỹ cao nhất.
4. Trình duyệt hỗ trợ: Chrome, Edge, Safari, Firefox, Opera trên cả nền tảng Desktop và Mobile Safari/Chrome.

---

## 🌐 Hướng Dẫn Đưa Lên GitHub & GitHub Pages

Để lưu trữ mã nguồn và chạy trực tuyến trang web này miễn phí trên GitHub, bạn thực hiện các bước sau:

### Bước 1: Khởi tạo Git cục bộ & Commit code
Mở terminal (như Git Bash, Command Prompt hoặc PowerShell) tại thư mục dự án này và chạy các lệnh:
```bash
# 1. Khởi tạo Git
git init

# 2. Add toàn bộ tệp vào Git (file .gitignore sẽ tự bỏ qua các file rác)
git add .

# 3. Tạo bản commit đầu tiên
git commit -m "Initial commit - Mrs Linh 3D Uniform Designer production ready"
```

### Bước 2: Tạo Repository trên GitHub và đẩy code lên
1. Truy cập [github.com](https://github.com) và đăng nhập tài khoản của bạn.
2. Nhấn nút **New** (hoặc biểu tượng dấu `+` ở góc trên bên phải -> **New repository**).
3. Đặt tên kho chứa (ví dụ: `thiet-ke-dong-phuc`), chọn chế độ **Public** và **không** tích chọn bất kỳ file khởi tạo nào (như README, .gitignore). Nhấn **Create repository**.
4. Chạy các lệnh dưới đây trong terminal tại máy của bạn để liên kết và đẩy code lên:
```bash
# Đổi tên nhánh chính thành main
git branch -M main

# Liên kết với kho chứa trên GitHub (Thay USERNAME và REPO_NAME bằng thông tin của bạn)
git remote add origin https://github.com/USERNAME/REPO_NAME.git

# Đẩy code lên GitHub
git push -u origin main
```

### Bước 3: Kích hoạt GitHub Pages để chạy trang web trực tuyến miễn phí
1. Tại trang Repository của bạn trên GitHub, chọn tab **Settings** (biểu tượng bánh răng).
2. Tại menu bên trái, tìm và nhấn vào mục **Pages**.
3. Tại phần **Build and deployment -> Source**, giữ nguyên mặc định là **Deploy from a branch**.
4. Tại phần **Branch**, nhấn vào nút chọn nhánh và chọn nhánh `main`. Phần thư mục giữ nguyên là `/ (root)`. Nhấn nút **Save**.
5. Chờ khoảng 1-2 phút. Tải lại trang Settings -> Pages, bạn sẽ thấy một khung màu xanh lá cây chứa đường link trang web trực tuyến của mình, ví dụ:
   `https://USERNAME.github.io/REPO_NAME/`
```
