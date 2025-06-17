import {Request, Response} from "express";
import ResponseHelper from "@/config/Response";
import OpenAiCodeService from "@/service/OpenAiCodeService";

class CodeApiController {
    public static async generateCode(req: Request, res: Response): Promise<void> {
        const userId = res.locals.user.id;
        const payload = req.body;

        const data = await OpenAiCodeService.generateCode(payload, userId);
        ResponseHelper.Created(res, "Code generation started", data);
    }
}

export default CodeApiController;
