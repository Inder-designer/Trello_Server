import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import User from "../models/User/User";

passport.use(
    new LocalStrategy({ usernameField: "email" }, async (email, password, done) => {
        try {
            const user = await User.findOne({ email }).select("+password");
            if (!user || !(await user.comparePassword(password))) {
                return done(null, false, { message: "Invalid email or password" });
            }
            return done(null, user);
        } catch (err) {
            return done(err);
        }
    })
);

// Serialize user to store ID in session
passport.serializeUser((user: any, done) => {
    done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id).select("+role");

        // if (user?.role === "partner") {
        //     user = await User.findById(id).populate({
        //         path: "partner",
        //         select: "partnerType"
        //     });
        // }
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});