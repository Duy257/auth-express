import { key_access, key_refresh } from "./config";
import jwt from "jsonwebtoken";

const Token = {
  sign: ({ payload }) => {
    let accessToken = jwt.sign(payload, key_access, {
      expiresIn: "1h",
    });
    let refreshToken = jwt.sign(payload, key_refresh, {
      expiresIn: "72h",
    });
    return {
      accessToken,
      refreshToken,
    };
  },
  refresh: ({ refreshToken }) => {
    return jwt.verify(
      refreshToken,
      key_refresh,
      (err, { username, idUser }) => {
        if (err) {
          throw new Error("not allow auth");
        } else {
          return Token.sign({ payload: { username, idUser } });
        }
      }
    );
  },
};
export { Token };
