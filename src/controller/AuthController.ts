import {Request, Response as EResponse} from "express";
import Auth from "@/middleware/Auth";
import UserService from "@/service/UserService";
import Response from "@/config/Response";
import {randomBytes} from "crypto";
import Service from "@/service/Service";
import {verifyMessage} from "ethers";
import bcrypt from "bcryptjs";

class AuthController extends Service {
    public static async getNonce(req: Request, res: EResponse) {
        const {address} = req.query;
        if (!address || typeof address !== "string") {
            Response.BadRequest(res, "wallet address required");
            return;
        }
        const nonce = randomBytes(16).toString("hex");
        await this.prisma.walletNonce.upsert({
            where: {address},
            update: {nonce, createdAt: new Date()},
            create: {address, nonce}
        });
        Response.Success(res, "Generate Nonce Success", {nonce});
    }

    public static async walletLogin(req: Request, res: EResponse) {
        const {address, signature} = req.body;
        if (!address || !signature) {
            Response.BadRequest(res, "Address and Signature are required");
            return;
        }
        const record = await this.prisma.walletNonce.findUnique({where: {address}});
        if (!record) {
            Response.Forbidden(res, "No nonce found for this address");
            return;
        }
        const message = record.nonce;
        let recovered: string;
        try {
            recovered = verifyMessage(message, signature);
        } catch {
            Response.Forbidden(res, "Invalid signature");
            return;
        }
        if (recovered.toLowerCase() !== address.toLowerCase()) {
            Response.Forbidden(res, "Signature does not match address");
            return;
        }
        await this.prisma.walletNonce.delete({where: {address}});

        let user = await UserService.getUserByAddress(address);
        if (!user) {
            user = await UserService.createUser(address, null);
        }

        const accessToken = Auth.generateAccessToken(user.id);
        const refreshToken = Auth.generateRefreshToken(user.id);

        const now = new Date();
        const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        await this.prisma.session.upsert({
            where: {userId: user.id},
            update: {refreshToken, expiresAt},
            create: {userId: user.id, token: accessToken, refreshToken, expiresAt}
        });

        Response.Success(res, "Wallet login successful", {
            user: {id: user.id, username: user.username, address: user.address, point: user.point},
            accessToken,
            refreshToken
        });
    }

    public static async refreshToken(req: Request, res: EResponse) {
        const {refreshToken} = req.body;

        if (!refreshToken) {
            Response.BadRequest(res, "refreshToken is required");
            return;
        }

        const decoded = Auth.verifyRefreshToken(req.body.refreshToken, res);
        if (!decoded) return;

        const session = await this.prisma.session.findUnique({where: {userId: decoded.id}});
        if (!session || session.refreshToken !== refreshToken) {
            Response.Unauthorized(res, "Refresh token mismatch");
            return;
        }
        const newAccessToken = Auth.generateAccessToken(decoded.id);
        const newRefreshToken = Auth.generateRefreshToken(decoded.id);
        const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await this.prisma.session.update({
            where: {userId: decoded.id},
            data: {token: newAccessToken, refreshToken: newRefreshToken, expiresAt: newExpiresAt}
        });
        const user = await UserService.getUserByID(decoded.id);
        if (!user) {
            Response.NotFound(res, "Account not found");
            return;
        }
        Response.Success(res, "Registration successful", {
            user: {id: user.id, username: user.username, address: user.address, point: user.point},
            accessToken: newAccessToken,
            refreshToken: newRefreshToken
        });
    }

    public static async register(req: Request, res: EResponse) {
        const {username, password} = req.body;
        const exist = await UserService.getUserByUsername(username);
        if (exist) {
            Response.BadRequest(res, "Username already used");
            return;
        }
        const user = await UserService.createUserVeloxiAI(username, password);
        const accessToken = Auth.generateAccessToken(user.id);
        const refreshToken = Auth.generateRefreshToken(user.id);
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await this.prisma.session.create({
            data: {userId: user.id, token: accessToken, refreshToken, expiresAt}
        });
        Response.Success(res, "Registration successful", {
            user: {id: user.id, username: user.username, address: user.address, point: user.point},
            accessToken,
            refreshToken
        });
    }

    public static async login(req: Request, res: EResponse): Promise<void> {
        const {username, password} = req.body;
        let user = await UserService.getUserByUsername(username);
        if (!user) {
            Response.NotFound(res, "Account not found");
            return;
        }
        if (password) {
            const isMatch = await bcrypt.compare(password, user.password || "");
            if (!isMatch) {
                Response.Forbidden(res, "Password didn't match with related address");
                return;
            }
        }
        const accessToken = Auth.generateAccessToken(user.id);
        const refreshToken = Auth.generateRefreshToken(user.id);
        Response.Success(res, "Login successful", {
            user: {id: user.id, username: user.username, address: user.address, point: user.point},
            accessToken,
            refreshToken
        });
    }
}

export default AuthController;
