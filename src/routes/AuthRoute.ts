import { Router } from "express";
import AuthValidation from "@/validation/AuthValidation";
import AuthController from "@/controller/AuthController";

class AuthRoute {
  private static router = Router();

  public static route(): Router {
    this.router.get("/nonce", AuthController.getNonce.bind(AuthController));
    this.router.post("/wallet-login", AuthController.walletLogin.bind(AuthController));
    this.router.post("/refresh", AuthController.refreshToken.bind(AuthController));
    this.router.post("/register", AuthValidation.register(), AuthController.register.bind(AuthController));
    this.router.post("/login", AuthValidation.login(), AuthController.login.bind(AuthController));

    return this.router;
  }
}

export default AuthRoute;
