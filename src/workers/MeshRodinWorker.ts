import axios from "axios";
import fs from "fs";
import path from "path";
import {fal} from "@fal-ai/client";
import WebSocket from "@/config/WebSocket";
import Service from "@/service/Service";
import Variables from "@/config/Variables";
import puppeteer from "puppeteer";

const MAX_TIME = 10 * 60 * 1000;
const POLL_INTERVAL = 5000;

class MeshRodinWorker {
    private static queue: string[] = [];
    private static isProcessing = false;

    public static addToQueue(taskId: string): void {
        if (!this.queue.includes(taskId)) {
            this.queue.push(taskId);
            WebSocket.sendMessage(taskId, "queued", "Rodin task added to queue.");
        }
    }

    public static boot(): void {
        if (this.isProcessing) return;
        this.isProcessing = true;

        const pollQueue = async () => {
            if (this.queue.length > 0) {
                const taskId = this.queue.shift();
                if (taskId) {
                    await new MeshRodinWorker(taskId).processTask();
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

    private async generateThumbnailFromGlb(glbPath: string, outputPath: string): Promise<void> {
        const htmlContent = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <title>Thumbnail Generator</title>
            <script type="module" src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.5.0/model-viewer.min.js"></script>
            <style>
                body, html { margin: 0; padding: 0; overflow: hidden; }
                model-viewer { width: 512px; height: 512px; }
            </style>
        </head>
        <body>
            <model-viewer
                id="viewer"
                src="${glbPath}"
                camera-controls
                auto-rotate
                ar
                shadow-intensity="1"
                camera-orbit="-30deg 75deg 1.5m"
                exposure="1.0">
            </model-viewer>
        </body>
        </html>
    `;

        const browser = await puppeteer.launch({
            headless: true,
            args: [
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--disable-gpu",
                "--enable-webgl",
                "--use-gl=swiftshader",
                "--ignore-gpu-blacklist"
            ],
        });

        const page = await browser.newPage();
        await page.setContent(htmlContent, {waitUntil: "networkidle0"});

        try {
            await Promise.race([
                page.evaluate(() => {
                    return new Promise<void>((resolve, reject) => {
                        const viewer = document.getElementById("viewer") as HTMLElement & {
                            updateComplete?: Promise<void>;
                            addEventListener: typeof HTMLElement.prototype.addEventListener;
                        };

                        if (!viewer) {
                            reject(new Error("Element #viewer not found"));
                            return;
                        }

                        const handleError = (e: unknown) => {
                            reject(new Error("Model failed to load: " + JSON.stringify(e)));
                        };

                        viewer.addEventListener("error", handleError, {once: true});

                        viewer.addEventListener("load", async () => {
                            try {
                                if (viewer.updateComplete) {
                                    await viewer.updateComplete;
                                }
                                setTimeout(() => resolve(), 2000);
                            } catch (err) {
                                reject(new Error("viewer.updateComplete failed"));
                            }
                        }, {once: true});
                    });
                }),
                new Promise<void>((_, reject) =>
                    setTimeout(() => reject(new Error("Rendering timeout after 30 seconds")), 30_000)
                )
            ]);

            const modelViewerElement = await page.$("#viewer");
            if (!modelViewerElement) {
                const err = new Error("Cannot find #viewer for screenshot");
                console.error(err);
                throw err;
            }

            if (/\.(png|jpeg|webp)$/.test(outputPath)) {
                await modelViewerElement.screenshot({
                    path: outputPath as `${string}.png` | `${string}.jpeg` | `${string}.webp`
                });
            } else {
                console.error("Invalid output file extension:", outputPath);
            }
        } catch (err) {
            console.error("Thumbnail generation failed:", err);
            throw err;
        } finally {
            await browser.close();
        }
    }


    private async processTask(): Promise<void> {
        WebSocket.sendMessage(this.taskId, "processing", "Worker started processing Rodin model.");
        const startTime = Date.now();
        const fatalErrorStartTime = {time: null as null | number};
        while (true) {
            if (Date.now() - startTime > MAX_TIME) {
                WebSocket.sendMessage(this.taskId, "timeout", "Rodin worker timeout.");
                await Service.prisma.mesh.update({where: {taskIdRefine: this.taskId}, data: {state: "failed"}});
                break;
            }

            try {
                const result = await fal.queue.result("fal-ai/hyper3d/rodin", {
                    requestId: this.taskId
                });
                console.log(result);
                WebSocket.sendMessage(this.taskId, "downloading", "Downloading Rodin model files...");

                const glbUrl = result.data.model_mesh.url;
                const glbExt = path.extname(new URL(glbUrl).pathname) || ".glb";
                const glbPath = `storage/assets/models/${this.taskId}${glbExt}`;
                const glbModelUrlPath = `${Variables.BASE_URL}/assets/models/${this.taskId}${glbExt}`;
                await this.downloadFile(glbUrl, glbPath);

                let finalImageUrl: string | null = "https://veloxiai.app/icon.png";
                const textures = result.data.textures;

                if (textures && textures.length > 0) {
                    const firstTextureUrl = (textures[0] as any).url;
                    const textureExt = path.extname(new URL(firstTextureUrl).pathname) || ".png";
                    const localImagePath = `storage/assets/images/${this.taskId}_refine${textureExt}`;
                    await this.downloadFile(firstTextureUrl, localImagePath);
                    finalImageUrl = `${Variables.BASE_URL}/assets/images/${this.taskId}_refine${textureExt}`;
                } else {
                    WebSocket.sendMessage(this.taskId, "generating_thumbnail", "No image found, generating thumbnail from model...");
                    const thumbnailLocalPath = `storage/assets/images/${this.taskId}_thumb.png`;

                    try {
                        await this.generateThumbnailFromGlb(glbModelUrlPath, thumbnailLocalPath);
                        finalImageUrl = `${Variables.BASE_URL}/assets/images/${this.taskId}_thumb.png`;
                        WebSocket.sendMessage(this.taskId, "generating_thumbnail_done", "Thumbnail generated successfully.");
                    } catch (thumbError: any) {
                        console.error(`Failed to generate thumbnail for ${this.taskId}:`, thumbError);
                        WebSocket.sendMessage(this.taskId, "generating_thumbnail_failed", "Failed to generate thumbnail.");
                        finalImageUrl = `https://veloxiai.app/icon.png`;
                    }
                }

                const updatedMesh = await Service.prisma.mesh.update({
                    where: {taskIdRefine: this.taskId},
                    data: {
                        modelGlbRefine: glbModelUrlPath,
                        refineImage: finalImageUrl,
                        state: "succeeded",
                    },
                });

                for (const texture of result.data.textures) {
                    const textureUrl = (texture as any).url;
                    const textureFileName = (texture as any).file_name;
                    const texturePath = `storage/assets/images/${this.taskId}_${textureFileName}`;

                    await this.downloadFile(textureUrl, texturePath);

                    await Service.prisma.texture.create({
                        data: {
                            meshId: updatedMesh.id,
                            type: "pbr_texture",
                            url: `${Variables.BASE_URL}/assets/images/${this.taskId}_${textureFileName}`,
                        },
                    });
                }

                WebSocket.sendMessage(this.taskId, "done", "Rodin task completed successfully.");
                break;

            } catch (error: any) {
                if (
                    error.message.includes("404") ||
                    error.message.includes("not found") ||
                    error.message.includes("Bad Request") ||
                    error.message.includes("400")
                ) {
                    WebSocket.sendMessage(this.taskId, "waiting", "Still processing Rodin model...");
                } else {
                    if (!fatalErrorStartTime.time) {
                        fatalErrorStartTime.time = Date.now();
                    } else if (Date.now() - fatalErrorStartTime.time > 60 * 1000) {
                        WebSocket.sendMessage(this.taskId, "fatal_timeout", "Rodin model failed after repeated errors.");
                        await Service.prisma.mesh.update({where: {taskIdRefine: this.taskId}, data: {state: "failed"}});
                        break;
                    }
                    WebSocket.sendMessage(this.taskId, "error", `Error processing Rodin task: ${error.message}`);
                    await Service.prisma.mesh.update({where: {taskIdRefine: this.taskId}, data: {state: "failed"}});
                    break;
                }
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

export default MeshRodinWorker;