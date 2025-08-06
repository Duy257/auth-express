// Xác minh token
import jwt from "jsonwebtoken";
import { key_access } from "../plugin/config";

export const auth = (req: any, res: any, next: any) => {
  try {
    const authorization = req.headers.authorization;

    if (!authorization) {
      return res.status(401).json({
        message: "Authorization header is required",
      });
    }

    const parts = authorization.split(" ");
    if (parts.length !== 2 || parts[0] !== "Bearer") {
      return res.status(401).json({
        message: "Authorization header format must be: Bearer <token>",
      });
    }

    const accessToken = parts[1];
    if (!accessToken) {
      return res.status(401).json({
        message: "Access token is required",
      });
    }

    jwt.verify(accessToken, key_access, (err: any, decoded: any) => {
      if (err) {
        if (err.name === "TokenExpiredError") {
          return res.status(401).json({
            message: "Token has expired",
          });
        } else if (err.name === "JsonWebTokenError") {
          return res.status(401).json({
            message: "Invalid token",
          });
        } else {
          return res.status(401).json({
            message: "Token verification failed",
          });
        }
      }

      req.decoded = decoded;
      next();
    });
  } catch (error) {
    return res.status(500).json({
      message: "Internal server error during authentication",
    });
  }
};
