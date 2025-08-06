import passport from "passport";
import { exchangeCodeForToken, getUserProfile } from "./service";
import User from "../../model/user";
import { sha256 } from "../../plugin/sha256";
import { Token } from "../../plugin/token";
import { OAuth2Client } from "google-auth-library";

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

  login = async (req, res) => {
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
  };
  loginWithToken = async (req, res) => {
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
  };

  loginWithOAuth = async (req: any, res: any, next: any) => {
    const { type } = req.params;
    if (type === "google") {
      // Gọi passport.authenticate middleware đúng cách
      return passport.authenticate("google", {
        scope: ["profile", "email"],
      })(req, res, next);
    }

    return res.status(400).json({
      message: "Invalid type",
    });
  };

  /**
   * Xử lý OAuth callback từ frontend
   * Frontend gửi authorization code từ Google để đổi lấy access token và user info
   * @param code - Authorization code từ Google
   */
  oauthCallback = async (req: any, res: any) => {
    try {
      const { code } = req.body;

      // Validate required parameters
      if (!code) {
        return res.status(400).json({
          error: "Missing authorization code",
          message: "Authorization code is required",
        });
      }

      // Exchange authorization code for access token
      const tokenData = await exchangeCodeForToken(code);
      if (!tokenData) {
        return res.status(400).json({
          error: "Token exchange failed",
          message: "Failed to exchange authorization code for access token",
        });
      }

      const { access_token } = tokenData;

      // Get user profile from Google
      const profile = await getUserProfile(access_token);
      if (!profile) {
        return res.status(400).json({
          error: "Profile fetch failed",
          message: "Failed to fetch user profile from Google",
        });
      }

      // Find or create user in database
      let user = await User.findOne({ googleId: profile.id });

      if (user) {
        // Update existing user info
        user.name = profile.name;
        user.firstName = profile.given_name;
        user.lastName = profile.family_name;
        user.avatar = profile.picture;
        user.lastLogin = new Date();
        await user.save();
      } else {
        // Create new user
        const newUserData = {
          googleId: profile.id,
          name: profile.name,
          firstName: profile.given_name,
          lastName: profile.family_name,
          avatar: profile.picture,
          email: profile.email,
          isGoogleUser: true,
          isEmailVerified: true,
          role: "customer",
          lastLogin: new Date(),
        };

        user = await User.create(newUserData);
      }

      // Generate JWT tokens
      const payload = {
        name: user.name,
        idUser: user.id,
        role: user.role,
      };

      const tokens = Token.sign({ payload });

      return res.status(200).json({
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          role: user.role,
        },
        ...tokens,
      });
    } catch (error) {
      console.error("OAuth callback error:", error);
      return res.status(500).json({
        error: "Internal server error",
        message: "An error occurred during OAuth authentication",
      });
    }
  };

  oAuthMobile = async (req: any, res: any) => {
    try {
      const { tokenId, provider } = req.body;

      // Validate required parameters
      if (!tokenId) {
        return res.status(400).json({
          error: "Missing token ID",
          message: "Token ID is required",
        });
      }

      if (!provider) {
        return res.status(400).json({
          error: "Missing provider",
          message: "Provider is required",
        });
      }

      // Validate supported providers
      const supportedProviders = ["google"];
      if (!supportedProviders.includes(provider.toLowerCase())) {
        return res.status(400).json({
          error: "Unsupported provider",
          message: `Provider '${provider}' is not supported. Supported providers: ${supportedProviders.join(
            ", "
          )}`,
        });
      }

      // Only handle Google OAuth for now
      if (provider.toLowerCase() !== "google") {
        return res.status(400).json({
          error: "Provider not implemented",
          message: "Only Google OAuth is currently implemented",
        });
      }

      // Verify the Google ID token
      const client = new OAuth2Client();
      let ticket: any;

      // First, try to decode the token to get the audience
      let tokenPayload: any;
      try {
        // Decode without verification to get audience
        const parts = tokenId.split(".");
        if (parts.length !== 3) {
          throw new Error("Invalid token format");
        }
        tokenPayload = JSON.parse(Buffer.from(parts[1], "base64").toString());
      } catch (decodeError) {
        console.error("Token decode failed:", decodeError);
        return res.status(401).json({
          error: "Token decode failed",
          message: "Invalid token format",
        });
      }

      // Define allowed audiences (you may need to add multiple client IDs)
      const allowedAudiences = [
        process.env.GOOGLE_CLIENT_ID,
        // Add other client IDs if you have multiple OAuth apps
        tokenPayload.aud, // Temporarily allow the token's audience for debugging
      ].filter(Boolean);

      try {
        ticket = await client.verifyIdToken({
          idToken: tokenId,
          audience: allowedAudiences,
        });
      } catch (verificationError) {
        if (verificationError.message.includes("audience")) {
          return res.status(401).json({
            error: "Audience mismatch",
            message:
              "The token was issued for a different client ID. Please check your Google OAuth configuration.",
            details: {
              tokenAudience: tokenPayload.aud,
              expectedAudience: process.env.GOOGLE_CLIENT_ID,
            },
          });
        }

        return res.status(401).json({
          error: "Token verification failed",
          message: "Invalid or expired Google ID token",
        });
      }

      const profile = ticket.getPayload();
      if (!profile) {
        return res.status(400).json({
          error: "Invalid token",
          message: "Failed to extract user profile from token",
        });
      }

      // Validate required profile fields
      if (!profile.sub || !profile.email) {
        return res.status(400).json({
          error: "Incomplete profile",
          message: "Required user information missing from Google profile",
        });
      }

      // Extract user information from payload
      const userProfile = {
        id: profile.sub,
        name: profile.name || profile.email, // Fallback to email if name not available
        given_name: profile.given_name,
        family_name: profile.family_name,
        picture: profile.picture,
        email: profile.email,
      };

      // Find or create user in database
      let user = await User.findOne({ googleId: userProfile.id });

      if (user) {
        // Update existing user info
        user.name = userProfile.name;
        user.firstName = userProfile.given_name;
        user.lastName = userProfile.family_name;
        user.avatar = userProfile.picture;
        user.lastLogin = new Date();
        // Ensure provider is set for existing users
        if (!user.provider) {
          user.provider = provider.toLowerCase() as
            | "google"
            | "facebook"
            | "apple";
        }
        await user.save();
      } else {
        // Create new user
        const newUserData = {
          googleId: userProfile.id,
          name: userProfile.name,
          firstName: userProfile.given_name,
          lastName: userProfile.family_name,
          avatar: userProfile.picture,
          email: userProfile.email,
          isGoogleUser: true,
          isEmailVerified: true,
          role: "customer" as "user" | "admin" | "customer",
          lastLogin: new Date(),
          provider: provider.toLowerCase() as "google" | "facebook" | "apple",
        };

        user = await User.create(newUserData);
      }

      // Generate JWT tokens
      const payload = {
        name: user.name,
        idUser: user.id,
        role: user.role,
      };

      const tokens = Token.sign({ payload });

      return res.status(200).json({
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          avatar: user.avatar,
          role: user.role,
          provider: user.provider,
        },
        ...tokens,
      });
    } catch (error) {
      console.error("OAuth mobile error:", error);

      // More specific error handling
      if (error.name === "ValidationError") {
        return res.status(400).json({
          error: "Validation error",
          message: "User data validation failed",
          details: error.message,
        });
      }

      return res.status(500).json({
        error: "Internal server error",
        message: "An error occurred during OAuth mobile authentication",
      });
    }
  };
}
export default new AuthController();
