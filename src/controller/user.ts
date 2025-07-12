import { NextFunction, Request, Response } from "express";
import { omit } from "lodash";
import { sha256 } from "../plugin/sha256";
import User from "../model/user";

class UserController {
  fetch = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id;
      if (!id) return res.status(500).json("Thiếu id");
      let user = await User.findOne({ _id: id });
      if (!user) {
        return res.status(404).json("Không tìm thấy người dùng");
      } else {
        const userClone = omit(user, "password");
        return res.status(200).json(userClone);
      }
    } catch (err) {
      next(err);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const { name, email, password, role } = req.body;
    try {
      let user = await User.findOne({ _id: id });
      if (!user) {
        return res.status(404).json("Không tìm thấy người dùng");
      } else {
        const dataUpdate = {};
        if (name) dataUpdate["name"] = name;
        if (email) dataUpdate["email"] = email;
        if (password) dataUpdate["password"] = await sha256(password);
        if (role) dataUpdate["role"] = role;
        await User.updateOne(
          {
            _id: id,
          },
          {
            $set: dataUpdate,
          }
        );
        return res.status(200).json({ success: true });
      }
    } catch (err) {
      res.status(400).json(err);
    }
  };
}
export default new UserController();
