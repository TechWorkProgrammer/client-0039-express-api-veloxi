import {Router} from "express";
import Auth from "@/middleware/Auth";
import CodeValidation from "@/validation/CodeValidation";
import CodeApiController from "@/controller/CodeApiController";

class CodeApiRoute {
    private static router = Router();

    public static route(): Router {
        this.router.post("/generate", Auth.authorize(), CodeValidation.generateCode(), CodeApiController.generateCode);

        return this.router;
    }
}

export default CodeApiRoute;
