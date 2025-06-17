import {randomBytes} from "crypto";
import Service from "@/service/Service";
import {User} from "@prisma/client";
import bcrypt from "bcryptjs";

class UserService extends Service {
    public static async createUser(address: string, password?: string | null): Promise<User> {
        try {
            const randomUsername = `user_${randomBytes(4).toString("hex")}`;

            return await this.prisma.user.create({
                data: {
                    username: randomUsername,
                    address: address,
                    password,
                    point: 0
                }
            });
        } catch (error) {
            this.handleError(error);
            throw error;
        }
    }

    public static async createUserVeloxiAI(username: string, password?: string | null): Promise<User> {
        try {
            const address = `vai_${randomBytes(16).toString("hex")}`;
            const hashedPassword = password ? await bcrypt.hash(password, 10) : null;

            return await this.prisma.user.create({
                data: {
                    username,
                    address,
                    password: hashedPassword,
                    point: 0
                }
            });
        } catch (error) {
            this.handleError(error);
            throw error;
        }
    }

    public static async getUserByID(id: string): Promise<User | null> {
        try {
            return await this.prisma.user.findUnique({
                where: {id}
            });
        } catch (error) {
            this.handleError(error);
            throw error;
        }
    }

    public static async getUserByAddress(address: string): Promise<User | null> {
        try {
            return await this.prisma.user.findUnique({
                where: {address}
            });
        } catch (error) {
            this.handleError(error);
            throw error;
        }
    }

    public static async getUserByUsername(username: string): Promise<User | null> {
        try {
            return await this.prisma.user.findUnique({
                where: {username}
            });
        } catch (error) {
            this.handleError(error);
            throw error;
        }
    }

    public static async updateUsername(userId: string, username: string): Promise<User> {
        try {
            return await this.prisma.user.update({
                where: {id: userId},
                data: {username}
            });
        } catch (error) {
            this.handleError(error);
            throw error;
        }
    }
}

export default UserService;
