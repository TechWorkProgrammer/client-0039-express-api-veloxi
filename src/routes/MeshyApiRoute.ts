import {Router} from "express";
import MeshyApiController from "@/controller/MeshyApiController";
import Auth from "@/middleware/Auth";
import MeshyValidation from "@/validation/MeshyValidation";

class MeshyApiRoute {
    private static router = Router();

    public static route(): Router {
        this.router.post("/generate", Auth.authorize(), MeshyValidation.generateMeshy(), MeshyApiController.generateMeshy);
        this.router.get("/user", Auth.authorize(), MeshyApiController.getUserMeshy);
        this.router.get("/user/:userId", MeshyApiController.getMeshyByUserId);
        this.router.get("/result/:taskId", MeshyApiController.getMeshyResult);
        this.router.get("/", MeshyApiController.getAllMeshy);

        return this.router;
    }
}

export default MeshyApiRoute;
