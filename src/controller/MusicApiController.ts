import {Request, Response} from "express";
import MusicApiService from "@/service/MusicApiService";
import ResponseHelper from "@/config/Response";
import MusicWorker from "@/workers/MusicWorker";

class MusicApiController {
    public static async generateMusic(req: Request, res: Response): Promise<void> {
        const userId = res.locals.user.id;
        const payload = req.body;

        const data = await MusicApiService.generateMusic(payload, userId);
        ResponseHelper.Created(res, "Music generation started", data);
    }

    public static async getUserMusic(req: Request, res: Response): Promise<void> {
        const userId = res.locals.user.id;
        const data = await MusicApiService.getUserMusic(userId);
        ResponseHelper.Success(res, "User music fetched", data);
    }

    public static async getAllMusic(req: Request, res: Response): Promise<void> {
        const data = await MusicApiService.getAllMusic();
        ResponseHelper.Success(res, "All music fetched", data);
    }

    public static async getMusicResult(req: Request, res: Response): Promise<void> {
        const {taskId} = req.params;
        const data = await MusicApiService.getMusicResult(taskId);
        if (data["state"] === "pending") {
            MusicWorker.addToQueue(taskId);
            ResponseHelper.Accepted(res, "Result is not ready yet. Try again later.");
            return;
        }
        ResponseHelper.Success(res, "Music result fetched", data);
    }
}

export default MusicApiController;
