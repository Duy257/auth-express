import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import User from "../model/user";

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.FRONTEND_URL + "/auth/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      const newUser = {
        googleId: profile.id,
        name: profile.displayName, // Sử dụng displayName làm name chính
        firstName: profile.name.givenName,
        lastName: profile.name.familyName,
        avatar: profile.photos[0].value, // Sửa từ image thành avatar theo schema
        email: profile.emails[0].value,
        isGoogleUser: true, // Đánh dấu là Google user
        isEmailVerified: true, // Email từ Google đã được verify
      };

      try {
        let user = await User.findOne({ googleId: profile.id });

        if (user) {
          // Cập nhật thông tin user nếu có thay đổi từ Google
          user.name = profile.displayName;
          user.firstName = profile.name.givenName;
          user.lastName = profile.name.familyName;
          user.avatar = profile.photos[0].value;
          user.lastLogin = new Date();
          await user.save();
          done(null, user);
        } else {
          user = await User.create(newUser);
          done(null, user);
        }
      } catch (err) {
        console.error(err);
        done(err, null);
      }
    }
  )
);

passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});
