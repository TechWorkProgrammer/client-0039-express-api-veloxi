import axios from "axios";
import fs from "fs";
import path from "path";
import WebSocket from "@/config/WebSocket";
import Service from "@/service/Service";
import Variables from "@/config/Variables";
import MeshRefineWorker from "@/workers/MeshRefineWorker";
import {MeshApiResponse} from "@/types/mesh";

const BASE_URL = "https://api.meshy.ai/openapi/v2/text-to-3d";
const MAX_TIME = 5 * 60 * 1000;
const POLL_INTERVAL = 1000;

class MeshWorker {
    private static queue: string[] = [];
    private static isProcessing = false;

    public static addToQueue(taskId: string): void {
        if (!this.queue.includes(taskId)) {
            this.queue.push(taskId);
            WebSocket.sendMessage(taskId, "queued", "Preview task added to queue.");
        }
    }

    public static boot(): void {
        if (this.isProcessing) return;
        this.isProcessing = true;

        const pollQueue = async () => {
            if (this.queue.length > 0) {
                const taskId = this.queue.shift();
                if (taskId) {
                    await new MeshWorker(taskId).processTask();
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
        WebSocket.sendMessage(this.taskId, "processing", "Worker started processing preview.");
        const startTime = Date.now();

        while (true) {
            try {
                const fetchResult = await axios.get(`${BASE_URL}/${this.taskId}`, {
                    headers: {Authorization: `Bearer ${Variables.MESHY_API_KEY}`},
                });

                const result = fetchResult.data;
                if (result?.status === "SUCCEEDED") {
                    WebSocket.sendMessage(this.taskId, "downloading", "Downloading preview model files...");

                    const getFileExtension = (url: string): string =>
                        path.extname(new URL(url).pathname) || ".bin";

                    const glbExt = getFileExtension(result.model_urls.glb);
                    const fbxExt = getFileExtension(result.model_urls.fbx);
                    const usdzExt = getFileExtension(result.model_urls.usdz);
                    const objExt = getFileExtension(result.model_urls.obj);
                    const imageExt = getFileExtension(result.thumbnail_url);
                    const videoExt = getFileExtension(result.video_url);

                    const glbPath = `storage/assets/models/${this.taskId}${glbExt}`;
                    const fbxPath = `storage/assets/models/${this.taskId}${fbxExt}`;
                    const usdzPath = `storage/assets/models/${this.taskId}${usdzExt}`;
                    const objPath = `storage/assets/models/${this.taskId}${objExt}`;
                    const imagePath = `storage/assets/images/${this.taskId}${imageExt}`;
                    const videoPath = `storage/assets/videos/${this.taskId}${videoExt}`;

                    if (result.model_urls.glb) await this.downloadFile(result.model_urls.glb, glbPath);
                    if (result.model_urls.fbx) await this.downloadFile(result.model_urls.fbx, fbxPath);
                    if (result.model_urls.usdz) await this.downloadFile(result.model_urls.usdz, usdzPath);
                    if (result.model_urls.obj) await this.downloadFile(result.model_urls.obj, objPath);
                    if (result.thumbnail_url) await this.downloadFile(result.thumbnail_url, imagePath);
                    if (result.video_url) await this.downloadFile(result.video_url, videoPath);

                    await Service.prisma.mesh.update({
                        where: {taskIdPreview: this.taskId},
                        data: {
                            modelGlbPreview: `${Variables.BASE_URL}/assets/models/${this.taskId}${glbExt}`,
                            modelFbxPreview: `${Variables.BASE_URL}/assets/models/${this.taskId}${fbxExt}`,
                            modelUsdzPreview: `${Variables.BASE_URL}/assets/models/${this.taskId}${usdzExt}`,
                            modelObjPreview: `${Variables.BASE_URL}/assets/models/${this.taskId}${objExt}`,
                            previewImage: `${Variables.BASE_URL}/assets/images/${this.taskId}${imageExt}`,
                            videoPreview: `${Variables.BASE_URL}/assets/videos/${this.taskId}${videoExt}`,
                            state: "succeeded",
                        },
                    });

                    WebSocket.sendMessage(this.taskId, "done", "Preview task completed.");
                    const response = await axios.post<MeshApiResponse>(`${BASE_URL}`, {
                        "mode": "refine",
                        "preview_task_id": this.taskId,
                        "enable_pbr": true
                    }, {
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${Variables.MESHY_API_KEY}`
                        }
                    });

                    const taskIdRefine = response.data.result;

                    await Service.prisma.mesh.update({
                        where: {
                            taskIdPreview: this.taskId
                        },
                        data: {
                            taskIdRefine,
                        }
                    });
                    MeshRefineWorker.addToQueue(taskIdRefine)
                    break;
                }

                WebSocket.sendMessage(this.taskId, "waiting", "Still processing preview...");
            } catch (error: any) {
                WebSocket.sendMessage(this.taskId, "error", `Error: ${error.message}`);
            }

            if (Date.now() - startTime > MAX_TIME) {
                WebSocket.sendMessage(this.taskId, "timeout", "Worker timeout.");
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

export default MeshWorker;
