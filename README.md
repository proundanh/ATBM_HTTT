# PDF Ed25519 Audit System (ATBM_HTTT)

Hệ thống Ký số & Kiểm toán Toàn vẹn Tệp tin PDF sử dụng thuật toán Ed25519 (RFC 8032) và SHA-256 (FIPS 180-4) phục vụ Đồ án môn học An Toàn & Bảo Mật Hệ Thống Thông Tin.

## Tính năng nổi bật
- **Bảo toàn Bit-Exact 100%**: Nhúng tệp gốc nguyên vẹn dưới dạng PDF Attachment (`original_source.pdf`), khắc phục triệt để bẫy PDF serialization khi render lại tài liệu.
- **Trang Chứng thực & Mã QR**: Tự động sinh trang Audit Trail khổ A4 ở cuối tài liệu với bảng thông tin pháp lý chi tiết và mã QR nhận diện bằng chứng số.
- **100% Client-Side Engine**: Toàn bộ thuật toán sinh khóa Ed25519, băm SHA-256 nhị phân, ký số và kiểm toán chạy hoàn toàn phía client (trình duyệt) với Web Cryptography API và `@noble/curves`, không gửi dữ liệu ra máy chủ.
- **Giao diện 2 phân hệ**:
  - **Document Signer**: Kéo thả file PDF, quản lý cặp khóa Ed25519 (tạo mới, ẩn/hiện Private Key, tự động suy xuất Public Key), ký và tự động tải file `_signed.pdf`.
  - **Document Verifier**: Nạp tệp đã ký, bóc tách attachment kiểm tra bit-exact, đối soát bảng mã băm và chữ ký, cảnh báo trạng thái trực quan (Hợp lệ xanh lục bảo / Bị sửa đổi đỏ rực).

## Công nghệ sử dụng
- **React 19 & TypeScript**
- **Vite**
- **Tailwind CSS & Lucide React**
- **@noble/curves** (Ed25519 EdDSA)
- **pdf-lib** (PDF Manipulation & Stream Attachment)
- **qrcode** (Mã QR chứng thực)

## Hướng dẫn cài đặt & khởi chạy
```bash
# Cài đặt dependencies
npm install

# Chạy môi trường phát triển (Dev server)
npm run dev

# Kiểm tra lint
npm run lint

# Biên dịch sản phẩm (Production build)
npm run build
```
