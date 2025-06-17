import {Request, Response} from "express";
import MeshyApiService from "@/service/MeshyApiService";
import ResponseHelper from "@/config/Response";
import MeshWorker from "@/workers/MeshWorker";
import MeshRefineWorker from "@/workers/MeshRefineWorker";
import MeshMasterWorker from "@/workers/MeshMasterWorker";

class MeshyApiController {
    public static async generateMeshy(req: Request, res: Response): Promise<void> {
        const userId = res.locals.user.id;
        const payload = req.body;

        const data = await MeshyApiService.generateMesh(payload, userId);
        ResponseHelper.Created(res, "Meshy generation started", data);
    }

    public static async getUserMeshy(req: Request, res: Response): Promise<void> {
        const userId = res.locals.user.id;
        const data = await MeshyApiService.getUserMeshes(userId);
        ResponseHelper.Success(res, "Meshy music fetched", data);
    }

    public static async getMeshyByUserId(req: Request, res: Response): Promise<void> {
        const {userId} = req.params;
        const data = await MeshyApiService.getUserMeshes(userId);
        ResponseHelper.Success(res, "Meshy music fetched", data);
    }

    public static async getAllMeshy(req: Request, res: Response): Promise<void> {
        const data = await MeshyApiService.getAllMeshes();
        ResponseHelper.Success(res, "All meshy fetched", data);
    }

    public static async getMeshyResult(req: Request, res: Response): Promise<void> {
        const {taskId} = req.params;
        const data = await MeshyApiService.getMeshResult(taskId);
        if (data["state"] === "pending") {
            (data.aiVersion === "meshy")
                ? MeshWorker.addToQueue(taskId)
                : MeshMasterWorker.addToQueue(taskId);
            ResponseHelper.Accepted(res, "Result is not ready yet. Try again later.");
            return;
        }

        if (!data.refineImage && data.taskIdRefine && data.aiVersion == "meshy") {
            MeshRefineWorker.addToQueue(data.taskIdRefine);
        }
        ResponseHelper.Success(res, "Meshy result fetched", data);
    }
}

export default MeshyApiController;
