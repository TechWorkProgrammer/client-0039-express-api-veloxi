import axios from "axios";
import fs from "fs";
import path from "path";
import WebSocket from "@/config/WebSocket";
import Service from "@/service/Service";
import Variables from "@/config/Variables";

const BASE_URL = "https://api.musicapi.ai/api/v1/sonic";
const MAX_TIME = 7 * 60 * 1000;
const POLL_INTERVAL = 1000;

class MusicWorker {
    private static queue: string[] = [];
    private static isProcessing = false;

    public static addToQueue(taskId: string): void {
        if (!this.queue.includes(taskId)) {
            this.queue.push(taskId);
            WebSocket.sendMessage(taskId, "queued", "Task added to queue.");
        }
    }

    public static boot(): void {
        if (this.isProcessing) return;
        this.isProcessing = true;

        const pollQueue = async () => {
            if (this.queue.length > 0) {
                const taskId = this.queue.shift();
                if (taskId) {
                    await new MusicWorker(taskId).processTask();
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
        WebSocket.sendMessage(this.taskId, "processing", "Worker started processing.");
        const startTime = Date.now();

        while (true) {
            try {
                const fetchResult = await axios.get(`${BASE_URL}/task/${this.taskId}`, {
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${Variables.MUSIC_API_KEY}`
                    }
                });

                const result = fetchResult.data.data[0];

                if (result?.state === "succeeded") {
                    WebSocket.sendMessage(this.taskId, "downloading", "Downloading files...");

                    const getFileExtension = (url: string): string =>
                        path.extname(new URL(url).pathname) || ".bin";

                    const imageExt = result.image_url ? getFileExtension(result.image_url) : ".jpg";
                    const audioExt = result.audio_url ? getFileExtension(result.audio_url) : ".mp3";
                    const videoExt = result.video_url ? getFileExtension(result.video_url) : ".mp4";

                    const imagePath = `storage/assets/images/${this.taskId}${imageExt}`;
                    const audioPath = `storage/assets/music/${this.taskId}${audioExt}`;
                    const videoPath = `storage/assets/videos/${this.taskId}${videoExt}`;

                    if (result.image_url) await this.downloadFile(result.image_url, imagePath);
                    if (result.audio_url) await this.downloadFile(result.audio_url, audioPath);
                    if (result.video_url) await this.downloadFile(result.video_url, videoPath);

                    await Service.prisma.music.update({
                        where: {taskId: this.taskId},
                        data: {
                            title: result.title,
                            tags: result.tags,
                            lyrics: result.lyrics,
                            audioUrl: `${Variables.BASE_URL}/assets/music/${this.taskId}${audioExt}`,
                            imageUrl: `${Variables.BASE_URL}/assets/images/${this.taskId}${imageExt}`,
                            videoUrl: `${Variables.BASE_URL}/assets/videos/${this.taskId}${videoExt}`,
                            state: "succeeded",
                        },
                    });

                    WebSocket.sendMessage(this.taskId, "done", "Task completed.");
                    break;
                }

                WebSocket.sendMessage(this.taskId, "waiting", "Still processing...");
            } catch (error: any) {
                WebSocket.sendMessage(this.taskId, "processing", `Error: ${error.message}`);
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
            writer.on("finish", () => {
                WebSocket.sendMessage(this.taskId, "download", `File saved: ${outputPath}`);
                resolve(outputPath);
            });
            writer.on("error", reject);
        });
    }
}

export default MusicWorker;
