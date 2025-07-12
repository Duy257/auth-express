import { Router } from "express";
import { auth } from "../middleware/auth";
import MovieController from "../controller/movie";
import { adminPermission } from "../middleware/admin-permission";

export const MovieRoute = Router();

MovieRoute.get("/", MovieController.find);
MovieRoute.get("/:id", MovieController.findOne);
MovieRoute.post("/", auth, adminPermission, MovieController.create);
MovieRoute.put("/:id", auth, adminPermission, MovieController.update);
MovieRoute.delete("/:id", auth, adminPermission, MovieController.delete);
