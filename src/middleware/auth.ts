// Xác minh token
import jwt from "jsonwebtoken";
import { key_access } from "../plugin/config";

export const auth = (req, res, next) => {
  let authorization = req.headers.authorization;
  if (authorization) {
    let accessToken = authorization.split(" ")[1];
    if (!accessToken) {
      res.status(401).json({
        message: "Error Unauthorized Access",
      });
      throw new Error("");
    } else {
      jwt.verify(
        accessToken,
        key_access,
        (err: { message: any }, data: any) => {
          if (err) {
            res.status(401).json({
              message: err.message,
            });
          } else {
            req.decoded = data;
            next();
          }
        }
      );
    }
  } else {
    res.status(401).json({
      message: "Error Unauthorized Access",
    });
  }
};
