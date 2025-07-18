import { Request, Response } from "express";
import { Document } from "mongoose";

declare module "express-session" {
  interface SessionData {
    token?: string;
  }
}

const sendToken = (
  user: Document & { generateToken: () => string },
  statusCode: number,
  req: Request,
  res: Response
): void => {
  const token = user.generateToken();
  req.session.token = token; // Make sure express-session is properly set up

  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict" as const,
    expires: new Date(
      Date.now() + Number(process.env.COOKIE_EXPIRE!) * 24 * 60 * 60 * 1000
    ),
  };

  res.cookie("token", token, options);

  res.status(statusCode).json({
    success: true,
    user,
  });
};

export default sendToken;
