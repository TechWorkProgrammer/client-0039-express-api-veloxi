import axios from "axios";
import Variables from "@/config/Variables";
import CustomError from "@/middleware/CustomError";
import Service from "@/service/Service";
import {GenerateMeshPayload, MeshApiResponse} from "@/types/mesh";
import {Mesh} from "@prisma/client";
import MeshWorker from "@/workers/MeshWorker";
import MeshMasterWorker from "@/workers/MeshMasterWorker";
import {fal} from "@fal-ai/client";
import MeshRodinWorker from "@/workers/MeshRodinWorker";

class MeshyApiService extends Service {
    private static readonly COOLDOWN_MS = 5 * 60 * 1000;
    private static readonly PENDING_COOLDOWN_MS = 30 * 60 * 1000;

    public static async generateMesh(payload: GenerateMeshPayload, userId?: string, telegramUserId?: string): Promise<Mesh> {
        try {
            let response;
            let taskId;
            let aiVersion;

            if (payload.mode === "preview" || !payload.mode) {
                response = await axios.post<MeshApiResponse>(`https://api.meshy.ai/openapi/v2/text-to-3d`, payload, {
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${Variables.MESHY_API_KEY}`
                    }
                });
                taskId = response.data.result;
                aiVersion = "meshy";
            } else if (payload.mode === "final") {
                response = await axios.post(`https://api.genai.masterpiecex.com/v2/functions/general`, payload, {
                    headers: {
                        Accept: "application/json",
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${Variables.MASTERX_API_KEY}`
                    }
                });
                taskId = response.data.requestId;
                aiVersion = "master";
            } else if (payload.mode === "rodin") {
                const falResponse = await fal.queue.submit("fal-ai/hyper3d/rodin", {
                    input: {
                        prompt: payload.prompt,
                        geometry_file_format: "glb",
                        quality: "high",
                        material: "PBR",
                        tier: "Regular"
                    }
                });
                taskId = falResponse.request_id;
                aiVersion = "rodin";
            }

            if (userId) {
                await this.prisma.user.update({
                    where: {id: userId},
                    data: {
                        point: {
                            increment: 10,
                        }
                    }
                });
            }

            const mesh = await this.prisma.mesh.create({
                data: {
                    taskIdPreview: taskId,
                    taskIdRefine: (aiVersion === "master" || aiVersion === "rodin") ? taskId : null,
                    prompt: payload.prompt,
                    modelType: payload.art_style || "",
                    state: "pending",
                    aiVersion,
                    userId,
                    telegramUserId
                }
            });

            if (aiVersion === "meshy") {
                MeshWorker.addToQueue(taskId);
            } else if (aiVersion === "master") {
                MeshMasterWorker.addToQueue(taskId);
            } else if (aiVersion === "rodin") {
                MeshRodinWorker.addToQueue(taskId);
            }

            return mesh;
        } catch (error: any) {
            const errorMessage = error.response?.data?.error || error.message || "Unknown error";
            this.handleError(new CustomError(`Failed to generate 3D model: ${errorMessage}`, 500));
            throw new CustomError(`Failed to generate 3D model: ${errorMessage}`, 500);
        }
    }

    public static async getMeshResult(taskId: string): Promise<Mesh> {
        try {
            await this.prisma.mesh.updateMany({
                where: {
                    OR: [
                        {taskIdPreview: taskId},
                        {taskIdRefine: taskId}
                    ]
                },
                data: {totalView: {increment: 1}},
            });
            return await this.prisma.mesh.findFirstOrThrow({
                where: {
                    OR: [
                        {taskIdPreview: taskId},
                        {taskIdRefine: taskId}
                    ]
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            username: true
                        }
                    },
                    textures: true,
                }
            });
        } catch (error: any) {
            const errorMessage = error.response?.data?.error || error.message || "Failed to fetch mesh result";
            this.handleError(new CustomError(`Failed to fetch mesh result: ${errorMessage}`, 500));
            throw new CustomError(`Failed to fetch mesh result: ${errorMessage}`, 500);
        }
    }

    public static async getUserMeshes(userId: string): Promise<any[]> {
        try {
            return await this.prisma.mesh.findMany({
                where: {userId},
                select: {
                    id: true,
                    prompt: true,
                    taskIdPreview: true,
                    taskIdRefine: true,
                    previewImage: true,
                    refineImage: true,
                    aiVersion: true,
                    createdAt: true,
                    user: {
                        select: {
                            id: true,
                            username: true,
                        },
                    },
                },
            });
        } catch (error) {
            this.handleError(new CustomError("Failed to fetch user meshes", 500));
            throw error;
        }
    }

    public static async getTelegramMeshes(telegramUserId: string): Promise<Mesh []> {
        try {
            return await this.prisma.mesh.findMany({
                where: {telegramUserId},
            });
        } catch (error) {
            this.handleError(new CustomError("Failed to fetch telegram music", 500));
            throw error;
        }
    }

    public static async getAllMeshes(): Promise<any[]> {
        try {
            return await this.prisma.mesh.findMany({
                where: {
                    userId: {
                        not: null,
                    },
                },
                select: {
                    id: true,
                    prompt: true,
                    taskIdPreview: true,
                    taskIdRefine: true,
                    previewImage: true,
                    refineImage: true,
                    aiVersion: true,
                    createdAt: true,
                    user: {
                        select: {
                            id: true,
                            username: true,
                        },
                    },
                },
            });
        } catch (error) {
            this.handleError(new CustomError("Failed to fetch all meshes", 500));
            throw error;
        }
    }

    public static async checkCooldown(telegramUserId: string): Promise<{ ok: true } | { ok: false; message: string }> {
        const last = await this.prisma.mesh.findFirst({
            where: {telegramUserId},
            orderBy: {createdAt: "desc"},
            select: {id: true, state: true, createdAt: true},
        });
        if (!last) return {ok: true};

        const now = Date.now();
        const elapsed = now - last.createdAt.getTime();

        if (last.state === "pending" && elapsed < this.PENDING_COOLDOWN_MS) {
            const minutesLeft = Math.ceil(
                (this.PENDING_COOLDOWN_MS - elapsed) / 60000
            );
            return {
                ok: false,
                message: `⚠️ You have a mesh generation in progress. Please wait another ${minutesLeft} minute(s) (up to 30 minutes) before starting a new one.`
            };
        }

        if (last.state === "pending" && elapsed >= this.PENDING_COOLDOWN_MS) {
            await this.prisma.mesh.update({
                where: {id: last.id},
                data: {state: "timeout"},
            });
        }

        if (elapsed < this.COOLDOWN_MS) {
            const minutesLeft = Math.ceil(
                (this.COOLDOWN_MS - elapsed) / 60000
            );
            return {
                ok: false,
                message: `⚠️ Please wait another ${minutesLeft} minute(s) before generating a new mesh.`
            };
        }
        return {ok: true};
    }
}

export default MeshyApiService;
