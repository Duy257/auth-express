# Giải thích Cơ chế Đăng nhập bằng Google (OAuth 2.0)

Chức năng này cho phép người dùng đăng nhập hoặc đăng ký vào hệ thống một cách nhanh chóng và an toàn bằng tài khoản Google của họ. Luồng hoạt động này tuân theo giao thức OAuth 2.0.

## Các thành phần chính

- **`server.ts`**: Khởi tạo `passport` và `express-session` để quản lý phiên đăng nhập và xác thực.
- **`src/routes/auth-route.ts`**: Định nghĩa các API endpoint (routes) cho việc xác thực, bao gồm cả route để bắt đầu đăng nhập Google và route callback.
- **`src/plugin/passport.ts`**: Cấu hình chi tiết cho "strategy" của Passport.js. Đây là nơi xử lý logic chính sau khi Google xác thực người dùng thành công, bao gồm việc tìm hoặc tạo người dùng mới trong cơ sở dữ liệu.
- **`src/controller/auth.ts`**: Chứa hàm `loginWithGoogle` để xử lý sau khi Passport đã xác thực xong, chủ yếu để tạo ra token (JWT) cho client.
- **`src/model/user.ts`**: Định nghĩa cấu trúc (schema) của một người dùng trong cơ sở dữ liệu MongoDB, bao gồm các trường như `googleId`.
- **`.env`**: File chứa các biến môi trường quan trọng và bí mật như `GOOGLE_CLIENT_ID` và `GOOGLE_CLIENT_SECRET`.

## Luồng hoạt động chi tiết

Đây là các bước diễn ra khi người dùng chọn đăng nhập bằng Google:

1.  **Bắt đầu đăng nhập (Client-side)**

    - Người dùng nhấn vào nút "Đăng nhập bằng Google" trên giao diện.
    - Trình duyệt sẽ điều hướng người dùng đến endpoint `GET /auth/google` trên server của bạn.

2.  **Chuyển hướng đến Google (Server-side)**

    - Endpoint `GET /auth/google` được bảo vệ bởi middleware `passport.authenticate('google', { scope: ['profile', 'email'] })`.
    - Passport sẽ tự động tạo một URL đăng nhập của Google và chuyển hướng người dùng đến trang đó.
    - Tại trang của Google, người dùng sẽ được yêu cầu cho phép ứng dụng của bạn truy cập vào các thông tin cơ bản của họ (được định nghĩa trong `scope` là `profile` và `email`).

3.  **Xác thực và Chuyển hướng trở lại (Google -> Server)**

    - Sau khi người dùng đồng ý, Google sẽ chuyển hướng họ trở lại ứng dụng của bạn tại địa chỉ `callbackURL` đã được cấu hình (`GET /auth/google/callback`).
    - Trong URL này, Google sẽ đính kèm một mã xác thực tạm thời (authorization code).

4.  **Xử lý Callback và Lấy thông tin người dùng (Server-side)**

    - Endpoint `GET /auth/google/callback` cũng được xử lý bởi Passport: `passport.authenticate('google', ...)`.
    - Passport sẽ nhận `authorization code`, tự động gửi một yêu cầu đến Google để đổi mã này lấy `access token` và thông tin chi tiết của người dùng (profile).
    - Khi đã có thông tin profile, Passport sẽ thực thi hàm `verify` đã được định nghĩa trong file `src/plugin/passport.ts`.

5.  **Tìm hoặc Tạo người dùng trong Database (Server-side)**

    - Bên trong hàm `verify` của `passport.ts`:
      - Hệ thống sẽ dùng `profile.id` (chính là `googleId`) để tìm kiếm trong cơ sở dữ liệu (`User.findOne({ googleId: profile.id })`).
      - **Nếu người dùng đã tồn tại**: Passport sẽ trả về đối tượng `user` đó.
      - **Nếu người dùng chưa tồn tại**: Hệ thống sẽ tạo một bản ghi người dùng mới (`User.create(newUser)`) với các thông tin lấy từ Google (tên, email, avatar,...) và sau đó trả về đối tượng `user` vừa tạo.

6.  **Tạo Token và Trả về cho Client (Server-side)**

    - Sau khi hàm `verify` của Passport thực thi xong và trả về `user`, luồng xử lý sẽ được chuyển tiếp đến controller `AuthController.loginWithGoogle`.
    - Controller này sẽ nhận đối tượng `user` từ `req.user`.
    - Dựa trên thông tin của `user`, hệ thống sẽ tạo ra một JSON Web Token (JWT) bằng hàm `Token.sign()`.
    - Cuối cùng, server trả về một response JSON cho client, chứa JWT (`accessToken`, `refreshToken`) và một số thông tin cơ bản của người dùng.

7.  **Hoàn tất (Client-side)**
    - Client nhận được JWT và lưu trữ nó (ví dụ: trong Local Storage).
    - Đối với các yêu cầu cần xác thực sau này, client sẽ đính kèm JWT này vào header `Authorization` để chứng minh danh tính.
