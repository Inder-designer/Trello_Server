import express from 'express';
import cors from 'cors';
import routes from "./routes/index";
import cookieParser from 'cookie-parser';
import session from 'express-session';
import { errorMiddleware } from './middleware/errorMiddleware';
import MongoStore from 'connect-mongo';
import passport from 'passport';
import './config/passport';
import { validateSession } from './middleware/validateSession';

const app = express();
const isProduction = process.env.NODE_ENV === 'PROD';
console.log("isProduction :", isProduction);

app.use(cors({
    origin: (origin, callback) => {
        callback(null, true)
    },
    credentials: true,
    exposedHeaders: ['set-cookie']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        maxAge: (Number(process.env.COOKIE_EXPIRE)) * 24 * 60 * 60 * 1000, // same as cookie
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
    },
    proxy: true,
    store: MongoStore.create({
        mongoUrl: process.env.MONGO_URI!,
        collectionName: "sessions",
    }),
}));


app.use(passport.initialize());
app.use(passport.session());

// Public API docs (lightweight) - do not require session validation
app.get('/api-docs', (_req, res) => {
        res.setHeader('Content-Type', 'text/html');
        res.send(`
                <!doctype html>
                <html>
                <head>
                    <meta charset="utf-8" />
                    <meta name="viewport" content="width=device-width,initial-scale=1" />
                    <title>API Docs</title>
                    <style>body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;line-height:1.6;padding:20px;color:#111}h1{margin-bottom:0.25rem}code{background:#f3f4f6;padding:2px 6px;border-radius:4px}</style>
                </head>
                <body>
                    <h1>API Docs</h1>
                    <p>Available API groups (prefix <code>/api</code>):</p>
                    <ul>
                        <li><code>/api/auth</code> - authentication (login, register, tokens)</li>
                        <li><code>/api/user</code> - user profile (requires authentication)</li>
                        <li><code>/api/board</code> - board operations (requires authentication)</li>
                        <li><code>/api/w</code> - workspace operations (requires authentication)</li>
                        <li><code>/api/car</code> - car-related endpoints</li>
                        <li><code>/api/admin</code> - admin endpoints</li>
                        <li><code>/api/</code> - general endpoints</li>
                    </ul>
                    <p>Notes:</p>
                    <ul>
                        <li>Some endpoints require a valid session or authentication token.</li>
                        <li>Use your frontend origin when making requests; CORS is enabled.</li>
                    </ul>
                </body>
                </html>
        `);
});

// Validate session for all other routes
app.use(validateSession);

app.use("/api", routes);
app.use(errorMiddleware);

export default app;
