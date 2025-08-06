# Luồng hoạt động của chức năng đăng nhập với Google

Chức năng đăng nhập với Google được triển khai trong dự án này sử dụng thư viện `passport-google-oauth20` của Passport.js để xử lý quá trình xác thực OAuth 2.0. Dưới đây là mô tả chi tiết về luồng hoạt động:

## 1. Cấu hình Passport Strategy

File: `src/plugin/passport.ts`

- Passport.js được cấu hình với `GoogleStrategy`.
- `clientID` và `clientSecret` được lấy từ biến môi trường (`process.env.GOOGLE_CLIENT_ID`, `process.env.GOOGLE_CLIENT_SECRET`).
- `callbackURL` được định nghĩa là `${process.env.FRONTEND_URL}/auth/callback`. Đây là URL mà Google sẽ gửi phản hồi sau khi người dùng xác thực thành công.
- Trong callback của `GoogleStrategy`:
  - Khi Google trả về thông tin người dùng (`profile`), hệ thống sẽ kiểm tra xem người dùng đã tồn tại trong cơ sở dữ liệu dựa trên `googleId` hay chưa.
  - Nếu người dùng đã tồn tại, thông tin của họ (tên, avatar, thời gian đăng nhập cuối cùng) sẽ được cập nhật.
  - Nếu người dùng chưa tồn tại, một người dùng mới sẽ được tạo với các thông tin từ Google (googleId, tên, email, avatar, v.v.).
  - Người dùng Google được đánh dấu là `isGoogleUser: true` và `isEmailVerified: true`.
  - Vai trò mặc định (`role`) được đặt là "customer".
  - Hàm `done` được gọi để hoàn tất quá trình xác thực, truyền thông tin người dùng vào session.

## 2. Khởi tạo quá trình đăng nhập Google

File: `src/controller/auth.ts`

Phương thức `loginWithOAuth` trong `AuthController` chịu trách nhiệm khởi tạo quá trình đăng nhập Google.

- Khi nhận được yêu cầu đăng nhập với `type` là "google", phương thức này gọi `passport.authenticate("google", { scope: ["profile", "email"] })`.
- `scope: ["profile", "email"]` yêu cầu quyền truy cập vào thông tin profile cơ bản và địa chỉ email của người dùng từ Google.
- Passport sẽ tự động chuyển hướng người dùng đến trang đăng nhập Google để họ cấp quyền cho ứng dụng.

## 3. Xử lý Callback từ Google

File: `src/controller/auth.ts`

Phương thức `oauthCallback` trong `AuthController` xử lý phản hồi từ Google sau khi người dùng xác thực và cấp quyền.

- Google chuyển hướng người dùng trở lại `callbackURL` với một `authorization code` trong URL.
- Frontend (nếu có) sẽ lấy `authorization code` này và gửi nó đến endpoint `oauthCallback` của backend.
- Backend thực hiện các bước sau:
  - **Xác thực mã ủy quyền (`authorization code`):** Kiểm tra xem `code` có được cung cấp hay không.
  - **Trao đổi mã ủy quyền lấy Access Token:** Phương thức `exchangeCodeForToken` được gọi để gửi `authorization code` đến Google's token endpoint (`https://oauth2.googleapis.com/token`). Kèm theo `client_id`, `client_secret`, `grant_type: "authorization_code"`, và `redirect_uri`.
  - **Lấy thông tin Profile người dùng:** Sau khi nhận được `access_token` từ Google, phương thức `getUserProfile` được gọi để gửi yêu cầu đến Google's userinfo endpoint (`https://www.googleapis.com/oauth2/v3/userinfo`) với `access_token` để lấy thông tin chi tiết về người dùng (id, tên, email, avatar, v.v.).
  - **Tìm hoặc tạo người dùng trong cơ sở dữ liệu:**
    - Dựa trên `googleId` từ profile Google, hệ thống tìm kiếm người dùng trong cơ sở dữ liệu.
    - Nếu người dùng tồn tại, thông tin của họ được cập nhật (tên, avatar, thời gian đăng nhập cuối cùng).
    - Nếu không, một bản ghi người dùng mới được tạo với dữ liệu từ Google profile.
  - **Tạo JWT Tokens:** Sau khi người dùng được xử lý (tìm thấy hoặc tạo mới), một payload chứa `name`, `idUser` và `role` của người dùng được sử dụng để tạo `access_token` và `refresh_token` bằng cách sử dụng `Token.sign`.
  - **Phản hồi lại Frontend:** Backend trả về một phản hồi JSON chứa trạng thái thành công, thông tin người dùng (id, name, email, avatar, role) và các JWT tokens (`access_token`, `refresh_token`) cho frontend.

## 4. Cấu hình Routes

File: `src/routes/auth-route.ts`

- Các route liên quan đến xác thực Google được định nghĩa:
  - `router.get("/google", authController.loginWithOAuth);`: Route này khởi tạo luồng đăng nhập Google.
  - `router.post("/google/callback", authController.oauthCallback);`: Route này xử lý callback từ Google, nơi mã ủy quyền được gửi đến và trao đổi lấy token.

## Tóm tắt Luồng:

1. Người dùng click "Đăng nhập với Google" trên Frontend.
2. Frontend gọi API `/auth/google` của Backend.
3. Backend (Auth Controller) khởi tạo `passport.authenticate("google")`, chuyển hướng người dùng đến Google để xác thực.
4. Người dùng xác thực và cấp quyền trên trang của Google.
5. Google chuyển hướng về `callbackURL` (`/auth/callback`) với `authorization code`.
6. Frontend gửi `authorization code` đến API `/auth/google/callback` của Backend.
7. Backend (Auth Controller) nhận `code`:
   a. Trao đổi `code` với Google để lấy `access_token`.
   b. Dùng `access_token` để lấy thông tin profile người dùng từ Google.
   c. Tìm hoặc tạo người dùng trong database.
   d. Tạo JWT tokens (access và refresh) cho người dùng.
   e. Trả về thông tin người dùng và tokens cho Frontend.
8. Frontend lưu trữ tokens và xử lý phiên đăng nhập.
