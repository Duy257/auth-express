import { Router } from "express";
import AuthController from "../controller/auth";
import passport from "passport";

export const AuthRoute = Router();

AuthRoute.post("/register", AuthController.register);
AuthRoute.post("/signin", AuthController.login);
AuthRoute.post("/refresh", AuthController.loginWithToken);
AuthRoute.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
AuthRoute.get('/google/callback', passport.authenticate('google', { failureRedirect: '/login' }), AuthController.loginWithGoogle);
