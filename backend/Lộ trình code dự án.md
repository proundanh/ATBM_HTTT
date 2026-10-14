# Lộ trình code dự án

- **Dữ liệu nhị phân** \(challenge, id, signature\.\.\.\) luôn là chuỗi **base64url**\.

- **Ceremony**: mỗi lần đăng ký, đăng nhập hay step\-up gồm 2 bước `options` rồi `verify`\. Server lưu challenge trong `IMemoryCache` theo `ceremonyId` \(TTL 60s, dùng một lần\) và trả `ceremonyId` về cho client gửi lại ở bước `verify`\.

- **Lỗi** theo dạng `{ code, message, data: {} ,error: [] }`\. Các `code` chính:

### Tổng quan endpoint

### Nhóm 1: Xác thực

**1\. ****`POST /api/auth/register/options`**

jsonc

```Plain Text
// Request{ "studentCode": "SV001", "fullName": "Nguyen Van A", "email": "a@school.edu.vn" }
// Response 200{ "ceremonyId": "…",  "options": { "rp": {"id":"localhost","name":"Student Portal"},    "user": {"id":"<b64url>","name":"SV001","displayName":"Nguyen Van A"},    "challenge": "<b64url>",    "pubKeyCredParams": [{"type":"public-key","alg":-7},{"type":"public-key","alg":-257}],    "timeout": 60000, "attestation": "none",    "authenticatorSelection": {"residentKey":"required","userVerification":"required"} } }// Lỗi: 400 validation, 409 STUDENT_CODE_TAKEN / EMAIL_TAKEN
```

Server **chưa tạo user** ở bước này, chỉ giữ thông tin đăng ký trong cache cùng challenge\. User chỉ được tạo khi bước 2 thành công, nhờ vậy DB không có tài khoản rác\.

**2\. ****`POST /api/auth/register/verify`**

jsonc

```Plain Text
// Request{ "ceremonyId": "…", "deviceName": "Laptop Asus",  "credential": { "id":"…","rawId":"…","type":"public-key",    "response": {"attestationObject":"…","clientDataJSON":"…"},    "transports": ["internal"] } }
// Response 201 (+ Set-Cookie){ "user": {"id":"…","studentCode":"SV001","fullName":"…","role":"Student"},  "credential": {"id":"…","deviceName":"Laptop Asus","createdAt":"…"} }// Lỗi: 400 CHALLENGE_EXPIRED / ATTESTATION_INVALID
```

Server tạo `Users`, `StudentProfiles` \(rỗng\), `StoredCredentials`, ghi log `RegisterSuccess`\.

**3\. ****`POST /api/auth/login/options`**

jsonc

```Plain Text
// Request: body rỗng {} (discoverable / Conditional UI) hoặc có MSSV{ "studentCode": "SV001" }   // tùy chọn
// Response 200{ "ceremonyId": "…",  "options": { "challenge":"…","rpId":"localhost","timeout":60000,               "userVerification":"required","allowCredentials":[] } }
```

Nếu có `studentCode` thì trả `allowCredentials` của user đó\. Nếu MSSV không tồn tại vẫn trả cùng cấu trúc với danh sách rỗng, để tránh bị dò xem MSSV nào có trong hệ thống\.

**4\. ****`POST /api/auth/login/verify`**

jsonc

```Plain Text
// Request{ "ceremonyId": "…",  "credential": { "id":"…","rawId":"…","type":"public-key",    "response": {"authenticatorData":"…","clientDataJSON":"…",                 "signature":"…","userHandle":"…"} } }
// Response 200 (+ Set-Cookie){ "user": {"id":"…","studentCode":"SV001","fullName":"…","role":"Student"} }// Lỗi: 401 ASSERTION_INVALID / CHALLENGE_EXPIRED / CREDENTIAL_REVOKED, 403 USER_INACTIVE
```

Server tra credential theo `id`, kiểm tra `userHandle` khớp `WebAuthnUserId`, verify chữ ký, cập nhật counter và `LastUsedAt` trong cùng transaction với việc ghi `SecurityLogs`\. Thất bại cũng ghi log \(với `UserId` nullable\)\.

**5, 6\. ****`POST /api/auth/logout`** trả 204\. **`GET /api/auth/me`** trả `{ id, studentCode, fullName, role }` hoặc 401\.

### Nhóm 2: Step\-up

**7\. ****`POST /api/auth/stepup/options`**

jsonc

```Plain Text
// Request{ "action": "UpdateProfile",            // hoặc "RevokeCredential"  "payload": { "phone":"09…","scholarshipAccount":"123…" } }
// Response 200{ "ceremonyId": "…",  "options": { "challenge":"…","rpId":"localhost","userVerification":"required",               "allowCredentials":[{"type":"public-key","id":"…"}] } }
```

Server tính `actionHash = SHA256(action + payload chuẩn hóa)` và lưu trong cache cùng challenge, gắn với `userId`\.

**8\. ****`POST /api/auth/stepup/verify`**

jsonc

```Plain Text
// Request: giống login/verify// Response 200{ "stepUpToken": "<random>", "expiresInSeconds": 120 }
```

Chỉ chấp nhận credential **thuộc đúng user đang đăng nhập**\. Token dùng một lần, gắn với `userId` và `actionHash`\.

Với `PUT /api/profile` và `DELETE /api/credentials/{id}`, client gửi header `X-StepUp-Token`\. Server tính lại hash từ nội dung request thật, nếu lệch thì trả `STEPUP_MISMATCH`\. Nhờ đó kẻ tấn công không thể lấy một token step\-up rồi dùng nó để đổi sang số tài khoản khác\.

### Nhóm 3: Thiết bị \(Credentials\)

**9\. ****`GET /api/credentials`** trả về:

jsonc

```Plain Text
[ { "id":"…","deviceName":"Laptop Asus","createdAt":"…","lastUsedAt":"…",    "backupEligible":true,"backupState":false,"transports":["internal"],    "aaguid":"…","isCurrent":true } ]
```

Chỉ trả các credential chưa bị thu hồi \(RevokedAt == null\)\.

**10, 11\. Thêm thiết bị**: `POST /api/credentials/options` \(body rỗng\) trả `{ ceremonyId, options }` và có `excludeCredentials` là các passkey đã có, để trình duyệt chặn đăng ký trùng thiết bị\. `POST /api/credentials/verify` nhận `{ ceremonyId, deviceName, credential }` và trả `201` kèm credential mới\. Ghi log `CredentialAdded`\.

**12\. ****`PATCH /api/credentials/{id}`**: body `{ "deviceName": "iPhone 13" }`, trả 200 kèm credential đã đổi tên\.

**13\. ****`DELETE /api/credentials/{id}`**: cần header `X-StepUp-Token` \(action `RevokeCredential`, payload `{credentialId}`\)\. Server đặt `RevokedAt` \(soft delete\)\. Trả 204\. Lỗi: `409 LAST_CREDENTIAL`, `401 STEPUP_REQUIRED`\.

### Nhóm 4: Nghiệp vụ sinh viên

**14\. ****`GET /api/profile`**

jsonc

```Plain Text
{ "studentCode":"SV001","fullName":"…","email":"…","class":"…","major":"…",  "phone":"…","scholarshipAccount":"•••• 4821","updatedAt":"…" }
```

Số tài khoản nên **che** khi hiển thị\. Khi sửa, người dùng nhập lại số đầy đủ\.

**15\. ****`PUT /api/profile`** \(header `X-StepUp-Token`\)

jsonc

```Plain Text
// Request{ "phone":"09…","email":"…","scholarshipAccount":"1234567890" }// Response 200: profile mới. Lỗi: 400 validation, 401 STEPUP_REQUIRED, 403 STEPUP_MISMATCH
```

Server ghi `ProfileUpdated` vào log, nhưng không ghi giá trị cũ hay mới\.

### Nhóm 5: Nhật ký và Inspect

**16\. ****`GET /api/security-logs?page=1&pageSize=20&isSuccess=&eventType=`**

jsonc

```Plain Text
{ "items": [ { "id":1,"eventType":"LoginSuccess","isSuccess":true,"failureReason":null,    "deviceName":"Laptop Asus","ipAddress":"…","userAgent":"…",    "signCountUsed":0,"timestamp":"…" } ],  "page":1,"pageSize":20,"total":57 }
```

**`EventType`**** nên là enum:** `RegisterSuccess, RegisterFailed, LoginSuccess, LoginFailed, Logout, StepUpSuccess, StepUpFailed, CredentialAdded, CredentialRenamed, CredentialRevoked, ProfileUpdated`\.

**Giao diện Inspect Data**: không cần endpoint riêng\. Các endpoint `verify` \(2, 4, 8, 11\) trả thêm trường `debug` khi request có header `X-Debug-Inspect: 1` **và** cấu hình `Demo:EnableInspect = true`:

jsonc

```Plain Text
"debug": { "challenge":"…",  "clientData": {"type":"webauthn.get","origin":"https://localhost:5001","crossOrigin":false},  "authenticatorData": {"rpIdHash":"…","flags":{"UP":true,"UV":true,"BE":false,"BS":false},"signCount":0},  "signatureAlgorithm": "ES256" }
```

Dữ liệu `debug` chỉ nằm trong response, **không lưu vào DB** để khớp quy tắc “log không chứa challenge hay dữ liệu nhạy cảm”\. Phần `options` và `credential` thô thì frontend đã có sẵn nên tự hiển thị\.

### Nhóm 6: Admin

**17\. ****`GET /api/admin/students?search=&page=1&pageSize=20`** trả `{ items:[{ userId, studentCode, fullName, email, class, major, isActive, credentialCount, lastLoginAt }], page, pageSize, total }`\.

**18\. ****`GET /api/admin/security-logs?studentCode=&isSuccess=&from=&to=&page=`** có cấu trúc như endpoint 16, thêm `studentCode` và `studentCodeAttempted` ở mỗi dòng\.

Tài khoản Admin đầu tiên nên được **seed** lúc khởi động \(qua cấu hình\), vì đăng ký công khai chỉ tạo `Student`\. Tuyệt đối không có endpoint nào cho phép tự nâng role\.

### Phần việc Frontend

**Module dùng chung \(làm trước\)**

- `webauthn.js`: chuyển base64url ↔ ArrayBuffer, kiểm tra `window.PublicKeyCredential`, `isConditionalMediationAvailable()`, và các hàm bọc `createPasskey(options)`, `getPasskey(options, {conditional, signal})`\.

- `api.js`: wrapper `fetch` tự gửi cookie, chuẩn hóa lỗi theo `code`\.

- Ánh xạ lỗi trình duyệt sang thông báo tiếng Việt: 

    - `NotAllowedError`: người dùng hủy hoặc hết thời gian\.

    - `InvalidStateError`: thiết bị này đã đăng ký rồi\.

    - `SecurityError`: sai RP ID, dùng chính cho kịch bản demo phishing\.

    - `AbortError`: hủy luồng Conditional UI\.

- Auth guard: gọi `/api/auth/me` khi tải trang, chưa đăng nhập thì chuyển về `/login`\.

- Component **StepUpModal**: nhận `action` và `payload`, chạy 7 rồi 8, trả về `stepUpToken`\. Dùng chung cho cập nhật hồ sơ và thu hồi thiết bị\.

- Toast thông báo và drawer **Inspect Data** \(bật tắt toàn cục\)\.

**Các trang**

**Riêng cho buổi thuyết trình**

- Toggle **Inspect Data** hiển thị JSON của `options`, `credential` gửi đi, và `debug` từ server, tô sáng `challenge`, `origin`, `signCount`\.

- Banner cảnh báo trang trên `/login` khi origin không phải domain chính thức, để kịch bản phishing có cái để chỉ vào\.

- Dòng ghi chú trong màn hình đăng ký: *“Bản demo: chưa xác minh danh tính khi đăng ký”*\.



# Lưu ý từ Gemni 4\.0

#### Chuẩn hóa JSON khi tính `actionHash` ở bước Step\-up

Ở bước 7 \(`stepup/options`\) và bước 15 \(`PUT /api/profile`\), server tính `SHA256(action + payload)`\.

- **Vấn đề:** Nếu serialize toàn bộ cục JSON `payload` thành chuỗi để hash, sự khác biệt về thứ tự các trường \(key ordering\), khoảng trắng, hoặc các trường không gửi lên sẽ làm hash ở bước 7 và bước 15 bị lệch nhau \(`STEPUP_MISMATCH`\)\.

- **Giải pháp:** Không hash chuỗi JSON thô\. Hãy nối chuỗi theo định dạng cố định \(Canonical String\) trên server\.

    - *Ví dụ với **`UpdateProfile`**:* `$"UpdateProfile|{email.Trim().ToLower()}|{phone.Trim()}|{scholarshipAccount.Trim()}"`

    - *Ví dụ với **`RevokeCredential`**:* `$"RevokeCredential|{credentialId}"`

    - Lưu ý: Ở `/profile`, nếu người dùng không sửa số tài khoản \(vẫn để chuỗi bị che `•••• 4821`\), bạn cần quy định rõ là bắt nhập lại hay cho phép giữ nguyên\. Bạn đã ghi *"Khi sửa, người dùng nhập lại số đầy đủ"* — hãy đảm bảo validate phía frontend bắt buộc nhập lại hoặc chỉ gửi các trường thực sự thay đổi\.

#### ③ Xác định cờ `isCurrent: true` trong `GET /api/credentials`

Trong danh sách thiết bị trả về có trường `"isCurrent": true` để hiện badge *"Thiết bị này"*\.

- **Cách làm:** Khi user đăng nhập thành công ở `/login/verify` \(hoặc `/register/verify`\), bạn cần lưu luôn `CredentialId` vừa dùng vào trong **Claims của Cookie xác thực** \(ví dụ claim `"amr_cred_id": "..."`\)\. Khi gọi `GET /api/credentials`, chỉ cần so sánh `cred.Id == currentClaimCredId` là ra `isCurrent`\.

#### ④ Xử lý `SignCount` \(Bộ đếm chữ ký\) và lỗi `COUNTER_ROLLBACK`

Bạn có mã lỗi `COUNTER_ROLLBACK` khi bộ đếm giảm\.

- **Lưu ý thực tế:** Nhiều trình quản lý Passkey đồng bộ đám mây hiện nay \(như Apple iCloud Keychain hoặc Google Password Manager trên một số thiết bị\) **luôn trả về ****`signCount = 0`** vì chúng không thể đồng bộ bộ đếm thời gian thực giữa các thiết bị\.

- **Cách xử lý chuẩn \(và thư viện ****`Fido2NetLib`**** của \.NET cũng hỗ trợ\):** Chỉ kiểm tra `newCounter > oldCounter` khi `oldCounter > 0` hoặc `newCounter > 0`\. Nếu cả hai đều bằng `0`, đó là hành vi hợp lệ của synced passkey, không được báo lỗi rollback\.

#### ⑤ Cờ `excludeCredentials` trong `/credentials/options` \(Thêm thiết bị\)

- Khi gọi `POST /api/credentials/options`, danh sách `excludeCredentials` chỉ nên lấy các credential của user đó mà **`RevokedAt == null`**\. Nếu một thiết bị đã bị thu hồi trước đó, nên cho phép họ đăng ký lại thiết bị đó nếu muốn\.

### Dùng `AddCookie()` có phải là Session\-based không?

Về mặt **trải nghiệm hoạt động** \(trình duyệt tự động giữ phiên đăng nhập và gửi kèm cookie ở mỗi request\), nó hoạt động **giống hệt Session\-based**\. Đây cũng chính là cơ chế khớp 100% với đặc tả của bạn \(`Response 200 (+ Set-Cookie)` và `wrapper fetch tự gửi cookie`\)\.

Tuy nhiên, về mặt **kỹ thuật bên dưới của ****ASP\.NET**** Core**, nó thông minh hơn Session truyền thống một chút:

- **Session truyền thống:** Server lưu thông tin user trong RAM/Database, chỉ trả về trình duyệt một `SessionId`\.

- **ASP\.NET**** Core Cookie Auth:** Server gom các thông tin cơ bản của user \(`UserId`, `StudentCode`, `Role`, `CredentialId`\) thành một danh sách **Claims**, sau đó **mã hóa và ký số \(Encrypt \& Sign\)** toàn bộ cục đó rồi nhét thẳng vào Cookie\.

- **Lợi ích:** Bạn **không cần tốn RAM hay bảng Database** để lưu Session\. Mỗi lần React gửi request kèm Cookie lên, ASP\.NET Core tự giải mã Cookie đó ra thành đối tượng `HttpContext.User` ngay lập tức\. Kẻ tấn công không thể sửa đổi nội dung Cookie vì không có khóa bí mật của Server\.

### Lưu ý cực kỳ quan trọng khi Frontend là React \(Khác Port\)

Vì bạn tách riêng React \(ví dụ chạy ở `http://localhost:5173` của Vite hoặc `3000` của CRA\) và ASP\.NET Core Backend \(ví dụ `https://localhost:5001`\), có **3 vấn đề sống còn** liên quan đến **Cookie** và **WebAuthn** bạn phải cấu hình đúng:

#### Vấn đề 1: Quy định về `SameSite` và `CORS` giữa 2 Port khác nhau

- **Tin vui:** Trong chuẩn trình duyệt hiện đại \(Chrome, Edge, Firefox\), 2 port khác nhau trên cùng `localhost` \(ví dụ `:5173` và `:5001`\) vẫn được tính là **Same\-Site** \(cùng site\), nhưng là **Cross\-Origin** \(khác nguồn\)\.

- Do là **Cross\-Origin**, để React nhận và gửi được Cookie, bạn bắt buộc phải:

    1. **Ở React \(****`api.js`****\):** Mọi lệnh `fetch` phải bật cờ `credentials: 'include'`\.

    2. **Ở Backend \(****`Program.cs`****\):** Phải bật CORS có `.AllowCredentials()` và chỉ định rõ địa chỉ của React\.

    3. **Trả về mã 401 thay vì Redirect:** Mặc định `AddCookie()` của \.NET khi thấy chưa đăng nhập sẽ trả về mã `302 Redirect` sang trang `/Account/Login` \(kiểu MVC cũ\)\. Với React API, bạn phải chặn hành vi này để nó trả về đúng mã `401 Unauthorized` hoặc `403 Forbidden`\.

#### Vấn đề 2: `Origin` và `RpId` trong WebAuthn khi khác Port

Đây là chỗ rất dễ lỗi `SecurityError` hoặc `ATTESTATION_INVALID` khi làm đồ án:

- Khi trình duyệt gọi `navigator.credentials.create()` hoặc `.get()` trên trang React \(`http://localhost:5173`\), trình duyệt sẽ đóng gói **`origin: "`****`http://localhost:5173`****`"`** vào trong `clientDataJSON` và gửi về Backend\.

- Lúc này trên Backend \(`Fido2NetLib`\), nếu bạn cấu hình `Origins` là `https://localhost:5001` \(port của Backend\), hàm Verify của Backend sẽ **báo lỗi ngay lập tức** vì lệch Origin\!

- **Quy tắc chuẩn khi tách React \+ API:**

    - `rpId` \(Relying Party ID\): Đặt là `"``localhost``"` \(không có port, không có http\)\.

    - `Origins` \(trong cấu hình Fido2 ở Backend\): Phải đặt là **địa chỉ của React** \(ví dụ: `"``http://localhost:5173``"` hoặc `"``https://localhost:5173``"`\)\.

### Code mẫu cấu hình chuẩn trong `Program.cs` \(ASP\.NET Core\)

Dù bạn dùng Proxy hay gọi thẳng khác port, đây là đoạn cấu hình `Program.cs` chuẩn xác nhất cho kiến trúc React \+ WebAuthn của bạn:

C\#

```Plain Text
var builder = WebApplication.CreateBuilder(args);

// 1. Cấu hình CORS cho phép React (port 5173) gửi/nhận Cookie
builder.Services.AddCors(options =>
{
    options.AddPolicy("ReactApp", policy =>
    {
        policy.WithOrigins("http://localhost:5173", "https://localhost:5173") // Port của React
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials(); // BẮT BUỘC để gửi nhận Set-Cookie
    });
});

// 2. Cấu hình Cookie Authentication chuẩn cho Web API
builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(options =>
    {
        options.Cookie.Name = "StudentPortal.Auth";
        options.Cookie.HttpOnly = true; // Chống XSS đọc cookie// Nếu gọi khác port không qua proxy, dùng Lax hoặc None (kèm Secure Always)
        options.Cookie.SameSite = SameSiteMode.Lax; 
        options.Cookie.SecurePolicy = CookieSecurePolicy.Always; 
        options.ExpireTimeSpan = TimeSpan.FromHours(2);

        // Chặn hành vi Redirect 302 mặc định của .NET, đổi thành trả mã 401/403 cho React
        options.Events.OnRedirectToLogin = context =>
        {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            return Task.CompletedTask;
        };
        options.Events.OnRedirectToAccessDenied = context =>
        {
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            return Task.CompletedTask;
        };
    });

// 3. Cấu hình Fido2NetLib (Lưu ý Origins phải chứa port của React!)
builder.Services.AddFido2(options =>
{
    options.ServerDomain = "localhost"; // rpId
    options.ServerName = "Student Portal";
    options.Origins = new HashSet<string> 
    { 
        "http://localhost:5173",  // Origin của React khi chạy HTTP"https://localhost:5173", // Origin của React khi chạy HTTPS"https://localhost:5001"  // Dự phòng
    };
});

var app = builder.Build();

app.UseCors("ReactApp"); // Phải đặt TRƯỚC UseAuthentication
app.UseAuthentication();
app.UseAuthorization();
```

Và ở phía **React \(****`api.js`****\)**, hàm wrapper `fetch` của bạn chỉ cần viết ngắn gọn như sau:

JavaScript

```Plain Text
export async function apiFetch(endpoint, options = {}) {
  const res = await fetch(`https://localhost:5001${endpoint}`, { // Hoặc chỉ cần `endpoint` nếu dùng Vite Proxy
    ...options,
    credentials: 'include', // Tự động đính kèm Cookie và nhận Set-Cookieheaders: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  // Xử lý lỗi { status, code, message } ở đây...
}
```



