import {Router} from "express";
import MusicApiController from "@/controller/MusicApiController";
import MusicValidation from "@/validation/MusicValidation";
import Auth from "@/middleware/Auth";

class MusicApiRoute {
    private static router = Router();

    public static route(): Router {
        this.router.post("/generate", Auth.authorize(), MusicValidation.generateMusic(), MusicApiController.generateMusic);
        this.router.get("/user", Auth.authorize(), MusicApiController.getUserMusic);
        this.router.get("/result/:taskId", MusicApiController.getMusicResult);
        this.router.get("/", MusicApiController.getAllMusic);

        return this.router;
    }
}

export default MusicApiRoute;
