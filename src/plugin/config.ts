// JWT Keys - sử dụng biến môi trường cho bảo mật
const key_access = process.env.JWT_ACCESS_SECRET || "k2y_acc3ss";
const key_refresh = process.env.JWT_REFRESH_SECRET || "k2y_refr3sh";

export { key_access, key_refresh };
