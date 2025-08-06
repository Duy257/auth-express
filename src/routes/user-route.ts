import { Router } from "express";
import UserController from "../controller/user";

export const UserRoute = Router();

UserRoute.get("/:id", UserController.fetch);
UserRoute.put("/:id", UserController.update);
