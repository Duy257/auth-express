import { Router } from "express";
import AuthController from "../controller/auth";

export const AuthRoute = Router();

AuthRoute.post("/register", AuthController.register);
AuthRoute.post("/signin", AuthController.login);
AuthRoute.post("/refresh", AuthController.loginWithToken);
