import { Router } from "express";
import Auth from "@/middleware/Auth";
import UserValidation from "@/validation/UserValidation";
import UserController from "@/controller/UserController";

class UserRoute {
  private static router = Router();

  public static route(): Router {
    this.router.put("/username", Auth.authorize(), UserValidation.updateUsername(), UserController.updateUsername);
    this.router.get("/me", Auth.authorize(), UserController.getUser);
    return this.router;
  }
}

export default UserRoute;
