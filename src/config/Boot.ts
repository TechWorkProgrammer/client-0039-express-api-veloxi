import express from "express";

import {createServer} from 'http';

import Limiter from "@/middleware/Limiter";
import Cors from "@/middleware/Cors";
import WebSocket from "@/config/WebSocket";
import Variables from "@/config/Variables";
import AnimationConsole from "@/utils/Console";
import Route from "@/routes/Route";
import TelegramBotService from "@/bot/TelegramBotService";
import MusicWorker from "@/workers/MusicWorker";
import MeshWorker from "@/workers/MeshWorker";
import MeshRefineWorker from "@/workers/MeshRefineWorker";
import MeshMasterWorker from "@/workers/MeshMasterWorker";
import MeshRodinWorker from "@/workers/MeshRodinWorker";

class Boot {
    private static app = express();

    private static server = createServer(this.app);


    public static async boot(): Promise<void> {
        await AnimationConsole.dots('Processing: getting information', new Promise<void>((resolve) => {
            Variables.boot();
            resolve();
        }));
        await AnimationConsole.static('Success: information retrieved');
        await AnimationConsole.dots('Processing: booting', new Promise<void>((resolve) => {
            this.booting();
            resolve();
        }));
        await AnimationConsole.static('Success: booting completed');
        await AnimationConsole.dots(`Starting: trying to run server on port ${Variables.PORT}`, new Promise<void>((resolve) => {
            this.initialize();
            resolve();
        }));
        this.server.listen(Variables.PORT, async () => {
            await AnimationConsole.static(`Server is running on port ${Variables.PORT}\n`);
        });
    }

    private static booting(): void {
        this.app.set('trust proxy', 1);
        WebSocket.boot(this.server);
        Limiter.boot();
        MusicWorker.boot();
        MeshWorker.boot();
        MeshRefineWorker.boot();
        MeshMasterWorker.boot();
        MeshRodinWorker.boot();
        TelegramBotService.boot();
    }

    private static initialize(): void {
        Cors.applyCors(this.app);
        Limiter.applyRateLimits(this.app);

        Route.registerRoutes(this.app);
    }
}

export default Boot;
