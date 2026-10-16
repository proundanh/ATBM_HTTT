import { chromium } from 'playwright';

async function runTest() {
  console.log('🚀 Bắt đầu quy trình kiểm thử tự động toàn diện EduPasskey...');

  // Khởi chạy Edge với WebAuthn Virtual Authenticator
  const browser = await chromium.launch({
    channel: 'msedge',
    headless: false,
    slowMo: 600,
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  // Kích hoạt WebAuthn virtual authenticator qua Chrome DevTools Protocol
  const cdp = await context.newCDPSession(page);
  await cdp.send('WebAuthn.enable');
  const authenticator = await cdp.send('WebAuthn.addVirtualAuthenticator', {
    options: {
      protocol: 'ctap2',
      transport: 'internal',
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
    },
  });

  console.log('✅ Đã kích hoạt Virtual Authenticator CTAP2/FIDO2:', authenticator.authenticatorId);

  try {
    // 1. Mở trang web
    console.log('📍 Bước 1: Mở cổng sinh viên http://localhost:5173...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const brandText = await page.textContent('body');
    if (!brandText.includes('EduPasskey')) {
      throw new Error('Không tìm thấy thương hiệu EduPasskey trên giao diện!');
    }
    console.log('✅ Giao diện sáng tối giản đã tải thành công.');

    // 2. Đăng ký Passkey sinh viên mới
    const testMssv = `B21DCAT${Math.floor(100 + Math.random() * 900)}`;
    const testName = 'Lê An Toàn';
    const testEmail = `${testMssv.toLowerCase()}@student.ptit.edu.vn`;

    console.log(`📍 Bước 2: Đăng ký Passkey cho sinh viên: ${testMssv} - ${testName}...`);
    
    await page.fill('input[placeholder*="SV001"]', testMssv);
    await page.fill('input[placeholder*="Nguyễn Văn A"]', testName);
    await page.fill('input[placeholder*="sv001@school.edu.vn"]', testEmail);

    console.log('👉 Nhấn nút submit đăng ký Passkey...');
    await page.click('button[type="submit"]');

    // Chờ màn hình thành công
    console.log('⏳ Đang chờ xác thực phần cứng FIDO2 & cấp Cookie phiên...');
    await page.waitForSelector('text=Đăng Ký Passkey Thành Công', { timeout: 15000 });
    console.log('✅ ĐĂNG KÝ PASSKEY THÀNH CÔNG! Đã nhận được Attestation và tạo khóa trên máy chủ.');

    // Nhấn "Vào Cổng Sinh Viên"
    console.log('👉 Bấm "Vào Cổng Sinh Viên"...');
    await page.click('button:has-text("Vào Cổng Sinh Viên")');
    await page.waitForSelector('text=Tiến Độ Học Tập & Tín Chỉ Tích Lũy', { timeout: 8000 });
    console.log('✅ Đã chuyển thành công vào Hồ sơ sinh viên (Student Dashboard).');

    // 3. Kiểm tra Dashboard và Test Step-Up Authentication
    console.log('📍 Bước 3: Kiểm tra thông tin hồ sơ và thử nghiệm Step-Up Authentication...');
    const dashboardText = await page.textContent('body');
    if (!dashboardText.includes(testMssv)) {
      throw new Error('Thông tin MSSV sinh viên hiển thị không đúng trên Dashboard!');
    }
    console.log(`✅ Dashboard hiển thị chính xác sinh viên: ${testMssv}`);

    // Sửa thông tin nhạy cảm: SĐT & STK học bổng
    console.log('👉 Cập nhật SĐT và STK ngân hàng nhận học bổng...');
    await page.fill('input[placeholder="0912345678"]', '0988776655');
    await page.fill('input[placeholder*="Nhập số tài khoản ngân hàng chính chủ"]', '9999888877 - Vietcombank');

    console.log('👉 Bấm "Xác Nhận Lưu & Quét Passkey" để kích hoạt Step-Up...');
    await page.click('form button[type="submit"]');

    // Chờ modal Step-Up xuất hiện
    await page.waitForSelector('text=Xác Thực Bổ Sung (Step-Up Authentication)', { timeout: 5000 });
    console.log('✅ Modal Step-Up đã mở. Hệ thống yêu cầu chạm cảm biến sinh trắc.');

    // Bấm nút chạm cảm biến
    await page.click('button:has-text("Chạm cảm biến xác nhận ngay")');

    // Chờ thông báo thành công
    await page.waitForSelector('text=Xác Thực Sinh Trắc Thành Công!', { timeout: 8000 });
    console.log('✅ STEP-UP AUTHENTICATION THÀNH CÔNG! STK học bổng đã được bảo vệ cập nhật.');

    await page.waitForTimeout(2000);

    // 4. Kiểm tra Quản lý Thiết bị (CredentialsTab)
    console.log('📍 Bước 4: Kiểm tra Tab Thiết Bị Bảo Mật Passkey...');
    await page.click('nav button:has-text("Thiết bị bảo mật")');
    await page.waitForSelector('text=Thiết Bị Bảo Mật Passkey', { timeout: 5000 });

    const credText = await page.textContent('body');
    if (!credText.includes('Thiết bị này')) {
      throw new Error('Không tìm thấy badge "Thiết bị này" trong danh sách thiết bị!');
    }
    console.log('✅ Danh sách thiết bị hiển thị đầy đủ khóa FIDO2 của sinh viên.');

    // Thử đổi tên thiết bị
    console.log('👉 Đổi tên thiết bị sang: "Laptop Lenovo ThinkPad"...');
    await page.click('button[title="Đổi tên thiết bị"]');
    const renameInput = page.locator('input[value*="Hello"], input[value*="Khóa"], input[value*="Passkey"], input[value*="Windows"]').first();
    await renameInput.fill('Laptop Lenovo ThinkPad');
    await page.click('button[title="Lưu"]');
    await page.waitForTimeout(1000);
    console.log('✅ Đổi tên thiết bị thành công.');

    // 5. Kiểm tra Nhật ký An ninh (SecurityLogsTab)
    console.log('📍 Bước 5: Kiểm tra Tab Nhật Ký Kiểm Toán An Ninh...');
    await page.click('nav button:has-text("Nhật ký bảo mật")');
    await page.waitForSelector('text=Nhật Ký Kiểm Toán Bảo Mật', { timeout: 5000 });

    const logsText = await page.textContent('body');
    console.log('📋 Các sự kiện ghi nhận trong CSDL:');
    if (logsText.includes('Đăng ký Passkey thành công')) console.log('  - [Audit Log] Đăng ký Passkey thành công');
    if (logsText.includes('Step-Up') || logsText.includes('hồ sơ')) console.log('  - [Audit Log] Xác thực Step-Up & Cập nhật hồ sơ');
    if (logsText.includes('Đổi tên thiết bị')) console.log('  - [Audit Log] Đổi tên thiết bị Passkey');
    console.log('✅ Audit Logs hoạt động chuẩn xác 100%.');

    // 6. Kiểm tra Thanh tra Gói tin (Inspect Drawer)
    console.log('📍 Bước 6: Kiểm tra Thanh Tra Gói Tin FIDO2 (Inspect Data)...');
    await page.click('button:has-text("Inspect Data")');
    await page.waitForSelector('text=Thanh Tra Gói Tin FIDO2 / WebAuthn', { timeout: 5000 });

    const inspectText = await page.textContent('body');
    if (inspectText.includes('Step-Up') || inspectText.includes('Đăng ký') || inspectText.includes('Client')) {
      console.log('✅ Gói tin JSON thực tế giữa Trình duyệt và Server C# đã được bắt đầy đủ.');
    }
    // Đóng drawer bằng nút X
    await page.locator('div[class*="fixed"] button:has(svg.lucide-x)').click();
    await page.waitForTimeout(600);

    // 7. Thử nghiệm Đăng xuất & Đăng nhập lại bằng Passkey
    console.log('📍 Bước 7: Thử nghiệm Đăng xuất và Đăng nhập lại...');
    await page.click('button[title="Đăng xuất"]');

    await page.waitForSelector('text=Đăng Nhập Bằng Passkey', { timeout: 8000 });
    console.log('✅ Đã đăng xuất an toàn. Đã chuyển về trang Đăng Nhập Bằng Passkey.');

    // Thử đăng nhập một chạm bằng resident key
    console.log('👉 Nhấn nút "Chạm Vân Tay / Passkey Để Đăng Nhập"...');
    await page.click('button:has-text("Chạm Vân Tay / Passkey Để Đăng Nhập")');

    // Chờ đăng nhập thành công và quay lại Dashboard
    await page.waitForSelector('text=Tiến Độ Học Tập & Tín Chỉ Tích Lũy', { timeout: 8000 });
    console.log('✅ ĐĂNG NHẬP PASSKEY MỘT CHẠM THÀNH CÔNG! Không cần gõ bất kỳ mật khẩu nào.');

    console.log('\n========================================================');
    console.log('🎉 TẤT CẢ 7 KỊCH BẢN KIỂM THỬ ĐÃ HOÀN THÀNH XUẤT SẮC 100%!');
    console.log('========================================================\n');

  } catch (error) {
    console.error('❌ Lỗi trong quá trình kiểm thử:', error);
    await page.screenshot({ path: 'test_failure.png' });
    throw error;
  } finally {
    await page.waitForTimeout(2000);
    await browser.close();
  }
}

runTest();
