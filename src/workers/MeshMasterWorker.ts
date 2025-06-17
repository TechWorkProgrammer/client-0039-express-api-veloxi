import axios from "axios";
import fs from "fs";
import path from "path";
import WebSocket from "@/config/WebSocket";
import Service from "@/service/Service";
import Variables from "@/config/Variables";

const BASE_URL = "https://api.genai.masterpiecex.com/v2/status";
const MAX_TIME = 8 * 60 * 1000;
const POLL_INTERVAL = 3000;

class MeshMasterWorker {
    private static queue: string[] = [];
    private static isProcessing = false;

    public static addToQueue(taskId: string): void {
        if (!this.queue.includes(taskId)) {
            this.queue.push(taskId);
            WebSocket.sendMessage(taskId, "queued", "Master task added to queue.");
        }
    }

    public static boot(): void {
        if (this.isProcessing) return;
        this.isProcessing = true;

        const pollQueue = async () => {
            if (this.queue.length > 0) {
                const taskId = this.queue.shift();
                if (taskId) {
                    await new MeshMasterWorker(taskId).processTask();
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
                    headers: {Authorization: `Bearer ${Variables.MASTERX_API_KEY}`},
                });

                const result = fetchResult.data;
                if (result?.status === "complete") {
                    WebSocket.sendMessage(this.taskId, "downloading", "Downloading model files...");

                    const getFileExtension = (url: string): string =>
                        path.extname(new URL(url).pathname) || ".bin";

                    const glbExt = getFileExtension(result.outputs.glb);
                    const fbxExt = getFileExtension(result.outputs.fbx);
                    const usdzExt = getFileExtension(result.outputs.usdz);
                    const imageExt = getFileExtension(result.outputs.thumbnail);

                    const glbPath = `storage/assets/models/${this.taskId}${glbExt}`;
                    const fbxPath = `storage/assets/models/${this.taskId}${fbxExt}`;
                    const usdzPath = `storage/assets/models/${this.taskId}${usdzExt}`;
                    const imagePath = `storage/assets/images/${this.taskId}${imageExt}`;

                    if (result.outputs.glb) await this.downloadFile(result.outputs.glb, glbPath);
                    if (result.outputs.fbx) await this.downloadFile(result.outputs.fbx, fbxPath);
                    if (result.outputs.usdz) await this.downloadFile(result.outputs.usdz, usdzPath);
                    if (result.outputs.thumbnail) await this.downloadFile(result.outputs.thumbnail, imagePath);

                    await Service.prisma.mesh.update({
                        where: {taskIdPreview: this.taskId},
                        data: {
                            modelGlbRefine: `${Variables.BASE_URL}/assets/models/${this.taskId}${glbExt}`,
                            modelFbxRefine: `${Variables.BASE_URL}/assets/models/${this.taskId}${fbxExt}`,
                            modelUsdzRefine: `${Variables.BASE_URL}/assets/models/${this.taskId}${usdzExt}`,
                            refineImage: `${Variables.BASE_URL}/assets/images/${this.taskId}${imageExt}`,
                            state: "succeeded",
                        },
                    });
                    WebSocket.sendMessage(this.taskId, "done", "Master task completed.");
                    break;
                }

                WebSocket.sendMessage(this.taskId, "waiting", "Still processing master model...");
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

export default MeshMasterWorker;
