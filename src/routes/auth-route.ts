import { Router } from "express";
import AuthController from "../controller/auth";

export const AuthRoute = Router();

AuthRoute.post("/register", AuthController.register);
AuthRoute.post("/signin", AuthController.login);
AuthRoute.post("/refresh", AuthController.loginWithToken);
AuthRoute.post("/oauth/mobile", AuthController.oAuthMobile);
AuthRoute.get("/oauth/:type", AuthController.loginWithOAuth);

// Route callback từ Google OAuth - Frontend gửi authorization code
AuthRoute.post("/oauth/google/callback", AuthController.oauthCallback);
