import { NextFunction, Request, Response as EResponse } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import Variables from "@/config/Variables";
import Response from "@/config/Response";
import UserService from "@/service/UserService";

class Auth {
  private static verifyToken(token: string, res: EResponse): JwtPayload | undefined {
    try {
      return jwt.verify(token, Variables.SECRET) as JwtPayload;
    } catch (error) {
      Response.Unauthorized(res, "Invalid access Token");
      return;
    }
  }

  public static verifyRefreshToken(token: string, res: EResponse): JwtPayload | undefined {
    try {
      return jwt.verify(token, Variables.SECRET) as JwtPayload;
    } catch (err) {
      Response.Unauthorized(res, "Invalid refresh token");
    }
  }

  public static authorize() {
    return async (req: Request, res: EResponse, next: NextFunction): Promise<void> => {
      try {
        const tokenWithBearer = req.headers.authorization as string;

        if (!tokenWithBearer || !tokenWithBearer.startsWith("Bearer ")) {
          Response.Unauthorized(res, "No Token Provided");
          return;
        }

        const token = tokenWithBearer.split(" ")[1];

        const decoded = Auth.verifyToken(token, res);
        if (!decoded) return;

        const user = await UserService.getUserByID(decoded.id);
        if (!user) {
          Response.Unauthorized(res, "User not found");
          return;
        }

        res.locals.user = user;
        next();
      } catch (error: any) {
        Response.InternalServerError(res, error.message || "An error occurred");
        return;
      }
    };
  }

  public static generateAccessToken(id: string): string {
    return jwt.sign(
      { id },
      Variables.SECRET,
      { expiresIn: "15m" }
    );
  }

  public static generateRefreshToken(id: string): string {
    return jwt.sign(
      { id },
      Variables.SECRET,
      { expiresIn: "7d" }
    );
  }
}

export default Auth;
