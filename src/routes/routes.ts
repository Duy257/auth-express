import { Router } from "express";
import { auth } from "../middleware/auth";
import { AuthRoute } from "./auth-route";
import { UserRoute } from "./user-route";
import { MovieRoute } from "./movie-route";
import { AddressRoute } from "./address-route";

export const routes = Router();

routes.use("/auth", AuthRoute);
routes.use("/user", auth, UserRoute);
routes.use("/movie", MovieRoute);
routes.use("/address", AddressRoute);
