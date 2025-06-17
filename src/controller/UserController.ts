import {Request, Response as EResponse} from "express";
import UserService from "@/service/UserService";
import Response from "@/config/Response";

class UserController {
    public static async updateUsername(req: Request, res: EResponse): Promise<void> {
        const userId = res.locals.user.id;
        const {username} = req.body;
        const updatedUser = await UserService.updateUsername(userId, username);
        Response.Success(res, "Username updated successfully", {
            id: updatedUser.id,
            username: updatedUser.username,
            address: updatedUser.address,
            point: updatedUser.point,
        });
    }

    public static async getUser(req: Request, res: EResponse): Promise<void> {
        const user = res.locals.user;
        if (!user) {
            Response.NotFound(res, "User not found");
            return;
        }
        Response.Success(res, "User retrieved successfully", user);
    }
}

export default UserController;
