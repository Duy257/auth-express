import { Router } from "express";
import { auth } from "../middleware/auth";
import AddressController from "../controller/addressController";
import { adminPermission } from "../middleware/admin-permission";

export const AddressRoute = Router();

AddressRoute.get("/", AddressController.find);
AddressRoute.get("/:id", AddressController.findOne);
AddressRoute.post("/", auth, adminPermission, AddressController.create);
AddressRoute.put("/:id", auth, adminPermission, AddressController.update);
AddressRoute.delete("/:id", auth, adminPermission, AddressController.delete);
