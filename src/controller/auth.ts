import { sha256 } from "../plugin/sha256";
import { Token } from "../plugin/token";
import User from "../model/user";

class AuthController {
  register = async (req, res) => {
    try {
      let { email, name, password } = req.body;
      if (!email || !password || !name)
        return res.status(500).send({
          error: "Thiếu thông tin",
        });

      const checkUsername = await User.findOne({ email });
      if (checkUsername) {
        return res.status(500).send({
          error: "Tài khoản đã tồn tại!",
        });
      } else {
        const hashPassword = await sha256(password);
        const data = {
          password: hashPassword,
          name,
          email,
          role: "user",
        };
        await User.create(data);
        return res.status(200).json({ success: true });
      }
    } catch (error) {
      return res.status(400).send({
        error,
      });
    }
  };

  async login(req, res) {
    let { email, password } = req.body;
    if (!email || !password)
      return res.status(500).send({
        error: "Thiếu thông tin",
      });
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(500).json({
        message: "Tài khoản hoặc mật khẩu sai",
      });
    } else {
      const hashPassword = await sha256(password);
      if (hashPassword === user.password) {
        let payload = {
          name: user.name,
          idUser: user.id,
          role: user.role,
        };
        const generateToken = Token.sign({ payload });
        return res.status(200).json({
          ...generateToken,
          idUser: user.id,
        });
      } else {
        return res.status(401).json({
          message: "Tài khoản hoặc mật khẩu sai",
        });
      }
    }
  }
  async loginWithToken(req, res) {
    try {
      let { refreshToken } = req.body;
      if (!refreshToken)
        return res.status(500).send({
          error: "Thiếu thông tin",
        });
      const token = Token.refresh({ refreshToken });
      return res.status(200).json(token);
    } catch (error) {
      throw error;
    }
  }
}
export default new AuthController();
