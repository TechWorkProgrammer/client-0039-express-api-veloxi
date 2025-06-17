import axios from "axios";
import fs from "fs";
import path from "path";
import WebSocket from "@/config/WebSocket";
import Service from "@/service/Service";
import Variables from "@/config/Variables";

const BASE_URL = "https://api.meshy.ai/openapi/v2/text-to-3d";
const MAX_TIME = 10 * 60 * 1000;
const POLL_INTERVAL = 1000;

class MeshRefineWorker {
    private static queue: string[] = [];
    private static isProcessing = false;

    public static addToQueue(taskId: string): void {
        if (!this.queue.includes(taskId)) {
            this.queue.push(taskId);
            WebSocket.sendMessage(taskId, "queued", "Refine task added to queue.");
        }
    }

    public static boot(): void {
        if (this.isProcessing) return;
        this.isProcessing = true;

        const pollQueue = async () => {
            if (this.queue.length > 0) {
                const taskId = this.queue.shift();
                if (taskId) {
                    await new MeshRefineWorker(taskId).processTask();
                }
            }
            setTimeout(pollQueue, POLL_INTERVAL);
        };

        pollQueue().then();
    }

    private readonly taskId: string;

    constructor(taskId: string) {
        this.taskId = taskId;
    }

    private async processTask(): Promise<void> {
        WebSocket.sendMessage(this.taskId, "processing", "Refine processing started.");
        const startTime = Date.now();

        while (true) {
            try {
                const fetchResult = await axios.get(`${BASE_URL}/${this.taskId}`, {
                    headers: {Authorization: `Bearer ${Variables.MESHY_API_KEY}`},
                });

                const result = fetchResult.data;
                if (result?.status === "SUCCEEDED") {
                    WebSocket.sendMessage(this.taskId, "downloading", "Downloading refined model files...");

                    const getFileExtension = (url: string): string =>
                        path.extname(new URL(url).pathname) || ".bin";

                    const glbExt = getFileExtension(result.model_urls.glb);
                    const fbxExt = getFileExtension(result.model_urls.fbx);
                    const usdzExt = getFileExtension(result.model_urls.usdz);
                    const objExt = getFileExtension(result.model_urls.obj);
                    const mtlExt = getFileExtension(result.model_urls.mtl);
                    const imageExt = getFileExtension(result.thumbnail_url);
                    const videoExt = getFileExtension(result.video_url);

                    const glbPath = `storage/assets/models/${this.taskId}${glbExt}`;
                    const fbxPath = `storage/assets/models/${this.taskId}${fbxExt}`;
                    const usdzPath = `storage/assets/models/${this.taskId}${usdzExt}`;
                    const objPath = `storage/assets/models/${this.taskId}${objExt}`;
                    const mtlPath = `storage/assets/models/${this.taskId}${mtlExt}`;
                    const imagePath = `storage/assets/images/${this.taskId}${imageExt}`;
                    const videoPath = `storage/assets/videos/${this.taskId}${videoExt}`;

                    if (result.model_urls.glb) await this.downloadFile(result.model_urls.glb, glbPath);
                    if (result.model_urls.fbx) await this.downloadFile(result.model_urls.fbx, fbxPath);
                    if (result.model_urls.usdz) await this.downloadFile(result.model_urls.usdz, usdzPath);
                    if (result.model_urls.obj) await this.downloadFile(result.model_urls.obj, objPath);
                    if (result.model_urls.mtl) await this.downloadFile(result.model_urls.mtl, mtlPath);
                    if (result.thumbnail_url) await this.downloadFile(result.thumbnail_url, imagePath);
                    if (result.video_url) await this.downloadFile(result.video_url, videoPath);

                    const mesh = await Service.prisma.mesh.update({
                        where: {taskIdRefine: this.taskId},
                        data: {
                            modelGlbRefine: `${Variables.BASE_URL}/assets/models/${this.taskId}${glbExt}`,
                            modelFbxRefine: `${Variables.BASE_URL}/assets/models/${this.taskId}${fbxExt}`,
                            modelUsdzRefine: `${Variables.BASE_URL}/assets/models/${this.taskId}${usdzExt}`,
                            modelObjRefine: `${Variables.BASE_URL}/assets/models/${this.taskId}${objExt}`,
                            modelMtlRefine: `${Variables.BASE_URL}/assets/models/${this.taskId}${mtlExt}`,
                            refineImage: `${Variables.BASE_URL}/assets/images/${this.taskId}${imageExt}`,
                            videoRefine: `${Variables.BASE_URL}/assets/videos/${this.taskId}${videoExt}`,
                            state: "succeeded",
                        },
                    });

                    WebSocket.sendMessage(this.taskId, "done", "Refine task completed.");

                    if (result["texture_urls"] && Array.isArray(result["texture_urls"])) {
                        for (const textureSet of result["texture_urls"]) {
                            for (const textureType in textureSet) {
                                const textureUrl = textureSet[textureType];
                                if (!textureUrl) continue;

                                const textureExt = path.extname(new URL(textureUrl).pathname) || ".jpg";
                                const texturePath = `storage/assets/images/${this.taskId}_${textureType}${textureExt}`;

                                await this.downloadFile(textureUrl, texturePath);

                                await Service.prisma.texture.create({
                                    data: {
                                        meshId: mesh["id"],
                                        type: textureType,
                                        url: `${Variables.BASE_URL}/assets/images/${this.taskId}_${textureType}${textureExt}`,
                                    },
                                });
                            }
                        }
                    }
                    break;
                }

                WebSocket.sendMessage(this.taskId, "waiting", "Still refining...");
            } catch (error: any) {
                WebSocket.sendMessage(this.taskId, "error", `Error: ${error.message}`);
            }

            if (Date.now() - startTime > MAX_TIME) {
                WebSocket.sendMessage(this.taskId, "timeout", "Refine worker timeout.");
                break;
            }

            await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
        }
    }

    private async downloadFile(url: string, outputPath: string): Promise<string> {
        if (!url) return "";

        const writer = fs.createWriteStream(outputPath);
        const response = await axios({url, method: "GET", responseType: "stream"});

        response.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on("finish", () => resolve(outputPath.replace("storage/", "")));
            writer.on("error", reject);
        });
    }
}

export default MeshRefineWorker;
