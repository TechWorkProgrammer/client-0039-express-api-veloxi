import TelegramBot from "node-telegram-bot-api";
import MeshyApiService from "@/service/MeshyApiService";
import MeshWorker from "@/workers/MeshWorker";
import MeshRefineWorker from "@/workers/MeshRefineWorker";
import Service from "@/service/Service";
import MeshRodinWorker from "@/workers/MeshRodinWorker";

class MeshFeature extends Service {
    private static cleanUrl = (url: string | null): string => {
        if (!url) return "";
        let modifiedUrl = url.replace(":3010", "");
        return modifiedUrl.replace("/images/", "//images//");
    };

    public static init(bot: TelegramBot): void {
        bot.on("message", async (msg) => {
            const chatId = msg.chat.id;
            const telegramId = msg.from?.id?.toString();
            if (!telegramId) {
                await bot.sendMessage(
                    chatId,
                    "❌ <b>Unable to identify the user.</b>",
                    {parse_mode: "HTML"}
                );
                return;
            }
            if (msg.text) {
                if (msg.text.startsWith("/meshv2 ")) {
                    const prompt = msg.text.replace("/meshv2 ", "").trim();
                    if (prompt) {
                        await this.generateMeshV2(bot, chatId, telegramId, prompt);
                    } else {
                        await bot.sendMessage(
                            chatId,
                            "❌ <b>Invalid prompt. Please try again.</b>",
                            {parse_mode: "HTML"}
                        );
                    }
                } else if (msg.text.startsWith("/meshv3 ")) {
                    const prompt = msg.text.replace("/meshv3 ", "").trim();
                    if (prompt) {
                        await this.generateMeshV3(bot, chatId, telegramId, prompt);
                    } else {
                        await bot.sendMessage(
                            chatId,
                            "❌ <b>Invalid prompt. Please try again.</b>",
                            {parse_mode: "HTML"}
                        );
                    }
                } else if (msg.text.startsWith("/mesh ")) {
                    const prompt = msg.text.replace("/mesh ", "").trim();
                    if (prompt) {
                        await this.generateMesh(bot, chatId, telegramId, prompt);
                    } else {
                        await bot.sendMessage(
                            chatId,
                            "❌ <b>Invalid prompt. Please try again.</b>",
                            {parse_mode: "HTML"}
                        );
                    }
                }
            }
        });
    }

    public static async showMeshMenu(bot: TelegramBot, chatId: number): Promise<void> {
        const message = `🖼️ <b>3D Content Menu</b>\n\nChoose an action below:`;
        const menuOptions: TelegramBot.SendMessageOptions = {
            parse_mode: "HTML",
            reply_markup: {
                inline_keyboard: [
                    [{text: "📂 Show Assets", callback_data: "show_mesh_assets_page_1"}],
                    [{text: "✨ Generate New Model (v1)", callback_data: "generate_mesh"}],
                    [{text: "✨ Generate New Model (v2)", callback_data: "generate_mesh_v2"}],
                    [{text: "✨ Generate New Model (v3)", callback_data: "generate_mesh_v3"}],
                    [{text: "↩️ Back to Main Menu", callback_data: "back_main_menu"}]
                ]
            }
        };
        await bot.sendMessage(chatId, message, menuOptions);
    }

    public static async handleCallbackQuery(
        bot: TelegramBot,
        callbackQuery: TelegramBot.CallbackQuery
    ): Promise<void> {
        const chatId = callbackQuery.message?.chat.id;
        const telegramId = callbackQuery.from.id?.toString();
        const data = callbackQuery.data;
        if (!data || !chatId) {
            await bot.sendMessage(
                chatId || 0,
                "❌ <b>Invalid callback query data.</b>",
                {parse_mode: "HTML"}
            );
            return;
        }
        if (!telegramId) {
            await bot.sendMessage(
                chatId,
                "❌ <b>Unable to identify the user.</b>",
                {parse_mode: "HTML"}
            );
            return;
        }
        await bot.answerCallbackQuery(callbackQuery.id);
        try {
            if (data === "generate_mesh") {
                await this.promptMeshInput(bot, chatId);
            } else if (data === "generate_mesh_v2") {
                await this.promptMeshInputV2(bot, chatId);
            } else if (data === "generate_mesh_v3") {
                await this.promptMeshInputV3(bot, chatId);
            } else if (data.startsWith("show_mesh_assets_page_")) {
                const pageStr = data.replace("show_mesh_assets_page_", "");
                const page = parseInt(pageStr, 10) || 1;
                await this.displayMeshAssets(bot, chatId, telegramId, page);
            } else if (data.startsWith("select_mesh_")) {
                const taskId = data.replace("select_mesh_", "");
                await this.showMeshDetails(bot, chatId, taskId);
            } else if (data.startsWith("download_mesh_")) {
                const parts = data.split("_");
                if (parts.length === 5) {
                    const [, , taskId, format, mode] = parts;
                    await this.downloadMesh(bot, chatId, taskId, format, mode);
                } else {
                    await bot.sendMessage(
                        chatId,
                        "❌ <b>Invalid download request.</b>",
                        {parse_mode: "HTML"}
                    );
                }
            } else if (data === "back_mesh_menu") {
                await this.showMeshMenu(bot, chatId);
            } else if (data === "back_main_menu") {
                await bot.sendMessage(
                    chatId,
                    "👋 <b>Welcome to LogicAI Bot!</b>\n\nSelect an option below to get started.",
                    {
                        parse_mode: "HTML",
                        reply_markup: {
                            inline_keyboard: [
                                [{text: "🖼️ 3D", callback_data: "menu_3d"}],
                                [{text: "🎵 Music", callback_data: "menu_music"}],
                                [{text: "💻 Project", url: "https://logicai.technology/program"}],
                                [{text: "🎨 NFT", callback_data: "menu_nft"}],
                                [{text: "🌐 Metaverse", callback_data: "menu_metaverse"}],
                                [{text: "🎮 Game", callback_data: "menu_game"}],
                                [{text: "🌐 Visit Our Website", url: "https://logicai.technology"}]
                            ]
                        }
                    }
                );
            } else {
                await bot.sendMessage(chatId, "❓ <b>Unknown action.</b>", {parse_mode: "HTML"});
            }
        } catch (error: any) {
            console.error(`Error handling menu action '${data}':`, error.message);
            await bot.sendMessage(
                chatId,
                "❌ <b>An error occurred while processing your request.</b>",
                {parse_mode: "HTML"}
            );
        }
    }

    public static async promptMeshInput(bot: TelegramBot, chatId: number): Promise<void> {
        await bot.sendMessage(
            chatId,
            "🖼️ <b>Send your 3D model prompt using</b> <code>/mesh your_prompt</code>",
            {parse_mode: "HTML"}
        );
    }

    public static async promptMeshInputV2(bot: TelegramBot, chatId: number): Promise<void> {
        await bot.sendMessage(
            chatId,
            "🖼️ <b>Send your 3D model prompt using</b> <code>/meshv2 your_prompt</code>",
            {parse_mode: "HTML"}
        );
    }

    public static async promptMeshInputV3(bot: TelegramBot, chatId: number): Promise<void> {
        await bot.sendMessage(
            chatId,
            "🖼️ <b>Send your 3D model prompt using</b> <code>/meshv3 your_prompt</code>",
            {parse_mode: "HTML"}
        );
    }

    private static async generateMesh(
        bot: TelegramBot,
        chatId: number,
        telegramId: string,
        prompt: string
    ): Promise<void> {
        const telegramUser = await this.prisma.telegramUser.upsert({
            where: {telegramId},
            update: {},
            create: {
                telegramId,
                username: (await bot.getChat(chatId)).username || "Anonymous"
            }
        });
        const cooldown = await MeshyApiService.checkCooldown(telegramUser.id);
        if (!cooldown.ok) {
            await bot.sendMessage(chatId, cooldown.message, {parse_mode: "HTML"});
            return;
        }
        await bot.sendMessage(
            chatId,
            "🖼️ <b>Generating your 3D model... Please wait!</b>",
            {parse_mode: "HTML"}
        );
        try {
            const meshResponse = await MeshyApiService.generateMesh(
                {mode: "preview", prompt, art_style: "realistic", should_remesh: true},
                undefined,
                telegramUser["id"]
            );
            await bot.sendMessage(
                chatId,
                `✅ <b>3D Model (v1) is being processed!</b>\n🆔 <b>Task ID:</b> <code>${meshResponse.taskIdPreview}</code>\n\nUse <b>Show Assets</b> to check your 3D Model.\nTo generate another model, send <code>/mesh your_prompt</code>.`,
                {parse_mode: "HTML"}
            );
        } catch (error: any) {
            console.error("Error generating 3D Model (v1):", error.message);
            if (error.status === 429) {
                await bot.sendMessage(chatId, error.message, {parse_mode: "HTML"});
                return;
            }
            await bot.sendMessage(
                chatId,
                "❌ <b>Failed to generate 3D model (v1). Please try again later.</b>",
                {parse_mode: "HTML"}
            );
        }
    }

    private static async generateMeshV2(
        bot: TelegramBot,
        chatId: number,
        telegramId: string,
        prompt: string
    ): Promise<void> {
        const telegramUser = await this.prisma.telegramUser.upsert({
            where: {telegramId},
            update: {},
            create: {
                telegramId,
                username: (await bot.getChat(chatId)).username || "Anonymous"
            }
        });
        const cooldown = await MeshyApiService.checkCooldown(telegramUser.id);
        if (!cooldown.ok) {
            await bot.sendMessage(chatId, cooldown.message, {parse_mode: "HTML"});
            return;
        }
        await bot.sendMessage(
            chatId,
            "🖼️ <b>Generating your 3D model (v2)... Please wait!</b>",
            {parse_mode: "HTML"}
        );
        try {
            const meshResponse = await MeshyApiService.generateMesh(
                {prompt},
                undefined,
                telegramUser["id"]
            );
            await bot.sendMessage(
                chatId,
                `✅ <b>3D Model (v2) is being processed!</b>\n🆔 <b>Task ID:</b> <code>${meshResponse.taskIdPreview}</code>\n\nUse <b>Show Assets</b> to check your 3D Model.\nTo generate another model, send <code>/meshv2 your_prompt</code>.`,
                {parse_mode: "HTML"}
            );
        } catch (error: any) {
            console.error("Error generating 3D Model (v2):", error.message);
            if (error.status === 429) {
                await bot.sendMessage(chatId, error.message, {parse_mode: "HTML"});
                return;
            }
            await bot.sendMessage(
                chatId,
                "❌ <b>Failed to generate 3D model (v2). Please try again later.</b>",
                {parse_mode: "HTML"}
            );
        }
    }

    private static async generateMeshV3(
        bot: TelegramBot,
        chatId: number,
        telegramId: string,
        prompt: string
    ): Promise<void> {
        const telegramUser = await this.prisma.telegramUser.upsert({
            where: {telegramId},
            update: {},
            create: {
                telegramId,
                username: (await bot.getChat(chatId)).username || "Anonymous"
            }
        });
        const cooldown = await MeshyApiService.checkCooldown(telegramUser.id);
        if (!cooldown.ok) {
            await bot.sendMessage(chatId, cooldown.message, {parse_mode: "HTML"});
            return;
        }
        await bot.sendMessage(
            chatId,
            "🖼️ <b>Generating your 3D model (v3)... Please wait!</b>",
            {parse_mode: "HTML"}
        );
        try {
            const meshResponse = await MeshyApiService.generateMesh(
                {mode: "rodin", prompt},
                undefined,
                telegramUser["id"]
            );
            await bot.sendMessage(
                chatId,
                `✅ <b>3D Model (v3) is being processed!</b>\n🆔 <b>Task ID:</b> <code>${meshResponse.taskIdPreview}</code>\n\nUse <b>Show Assets</b> to check your 3D Model.\nTo generate another model, send <code>/meshv3 your_prompt</code>.`,
                {parse_mode: "HTML"}
            );
        } catch (error: any) {
            console.error("Error generating 3D Model (v3):", error.message);
            if (error.status === 429) {
                await bot.sendMessage(chatId, error.message, {parse_mode: "HTML"});
                return;
            }
            await bot.sendMessage(
                chatId,
                "❌ <b>Failed to generate 3D model (v3). Please try again later.</b>",
                {parse_mode: "HTML"}
            );
        }
    }

    public static async displayMeshAssets(
        bot: TelegramBot,
        chatId: number,
        telegramId: string,
        page: number
    ): Promise<void> {
        const telegramUser = await this.prisma.telegramUser.upsert({
            where: {telegramId},
            update: {},
            create: {
                telegramId,
                username: (await bot.getChat(chatId)).username || "Anonymous"
            }
        });
        const allMesh = await MeshyApiService.getTelegramMeshes(telegramUser["id"]);
        for (const mesh of allMesh) {
            if (mesh.state === "pending") {
                try {
                    await MeshyApiService.getMeshResult(mesh.taskIdPreview);
                } catch (error: any) {
                    console.error(`Failed to update model with Task ID ${mesh.taskIdPreview}:`, error.message);
                }
            }
        }
        const succeededMeshList = await MeshyApiService.getTelegramMeshes(telegramUser["id"]);
        if (succeededMeshList.length === 0) {
            await bot.sendMessage(
                chatId,
                "❌ <b>No 3D models available. Generate some models first!</b>",
                {parse_mode: "HTML"}
            );
            return;
        }
        const sortedMeshList = succeededMeshList.sort(
            (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
        const ITEMS_PER_PAGE = 5;
        const totalPages = Math.ceil(sortedMeshList.length / ITEMS_PER_PAGE);
        const currentPage = Math.min(Math.max(page, 1), totalPages);
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        const pageItems = sortedMeshList.slice(startIndex, startIndex + ITEMS_PER_PAGE);
        const inlineKeyboard = pageItems.map((mesh) => {
            const buttonText = mesh.prompt.length > 30
                ? `${mesh.prompt.substring(0, 30)}...`
                : mesh.prompt;
            return [{
                text: buttonText,
                callback_data: `select_mesh_${mesh.taskIdPreview}`
            }];
        });
        const navButtons: any[] = [];
        if (currentPage > 1) {
            navButtons.push({text: "⬅️ Previous", callback_data: `show_mesh_assets_page_${currentPage - 1}`});
        }
        if (currentPage < totalPages) {
            navButtons.push({text: "Next ➡️", callback_data: `show_mesh_assets_page_${currentPage + 1}`});
        }
        if (navButtons.length > 0) {
            inlineKeyboard.push(navButtons);
        }
        inlineKeyboard.push([{text: "↩️ Back", callback_data: "back_mesh_menu"}]);
        const message = `🖼️ <b>Your 3D Models (Page ${currentPage}/${totalPages})</b>\nSelect a model to view details or download.`;
        await bot.sendMessage(chatId, message, {
            parse_mode: "HTML",
            reply_markup: {inline_keyboard: inlineKeyboard}
        });
    }

    public static async showMeshDetails(
        bot: TelegramBot,
        chatId: number,
        taskId: string
    ): Promise<void> {
        try {
            console.log(`🟢 [showMeshDetails] Processing Task ID: ${taskId}`);

            const mesh = await MeshyApiService.getMeshResult(taskId);
            console.log(`🟢 [showMeshDetails] Mesh data received`);

            if (!mesh) {
                console.log(`🔴 [showMeshDetails] Mesh not found for Task ID: ${taskId}`);
                await bot.sendMessage(
                    chatId,
                    "❌ <b>Model not found.</b>",
                    {parse_mode: "HTML"}
                );
                return;
            }

            if (mesh.state === "pending") {
                console.log(`🟡 [showMeshDetails] Task ID: ${taskId} is still pending.`);
                MeshWorker.addToQueue(mesh.taskIdPreview);
                await bot.sendMessage(
                    chatId,
                    "🧠 <b>LogicAI is still working on your 3D model.</b>\n\nHigh-quality results take a little time. Please try again in around <b>3 minutes</b> — your asset will be ready soon!",
                    {parse_mode: "HTML"}
                );
                return;
            }

            if (!mesh.refineImage && mesh.taskIdRefine) {
                console.log(
                    `🟡 [showMeshDetails] Task ID: ${taskId} does not have refineImage, adding to refine queue.`
                );
                if (mesh.aiVersion == "meshy") {
                    MeshRefineWorker.addToQueue(mesh.taskIdRefine);
                } else {
                    MeshRodinWorker.addToQueue(mesh.taskIdRefine);
                }
            }

            console.log(`🟢 [showMeshDetails] Constructing message caption.`);
            const caption = `🖼️ <b>${mesh.prompt}</b>\n🆔 <b>Task ID:</b> <code>${mesh.taskIdPreview}</code>\n🔖 <b>Type:</b> ${mesh.modelType}\n📅 <b>Created:</b> ${new Date(mesh.createdAt).toLocaleDateString()}\n📈 <b>Status:</b> ${mesh.state}`;

            console.log(`🟢 [showMeshDetails] Constructing inline keyboard.`);
            const webTaskId = mesh.taskIdRefine ? mesh.taskIdRefine : mesh.taskIdPreview;
            const detailsKeyboard = [
                [
                    {
                        text: "🌐 View on Web",
                        url: `https://logicai.technology/3d/${webTaskId}`
                    },
                    {text: "↩️ Back to 3D Menu", callback_data: "back_mesh_menu"}
                ]
            ];

            const imageUrl = this.cleanUrl(mesh.refineImage) || this.cleanUrl(mesh.previewImage);
            console.log(`🟢 [showMeshDetails] Sending image: ${imageUrl}`);

            await bot.sendPhoto(chatId, imageUrl, {
                caption,
                parse_mode: "HTML",
                reply_markup: {inline_keyboard: detailsKeyboard}
            });

            console.log(`✅ [showMeshDetails] Message sent successfully for Task ID: ${taskId}`);
        } catch (error: any) {
            console.log(`🔴 [showMeshDetails] Error: ${error.message}`);
            await bot.sendMessage(
                chatId,
                "❌ <b>Failed to retrieve model details.</b>",
                {parse_mode: "HTML"}
            );
        }
    }

    private static async downloadMesh(
        bot: TelegramBot,
        chatId: number,
        taskId: string,
        format: string,
        mode: string
    ): Promise<void> {
        const mesh = await MeshyApiService.getMeshResult(taskId);
        if (!mesh) {
            await bot.sendMessage(
                chatId,
                "❌ <b>Model not found.</b>",
                {parse_mode: "HTML"}
            );
            return;
        }
        let modelUrl: string | null = null;
        if (mode === "preview") {
            if (format === "glb") {
                modelUrl = mesh.modelGlbPreview;
            } else if (format === "fbx") {
                modelUrl = mesh.modelFbxPreview;
            }
        } else if (mode === "refine") {
            if (format === "glb") {
                modelUrl = mesh.modelGlbRefine;
            } else if (format === "fbx") {
                modelUrl = mesh.modelFbxRefine;
            }
        }
        if (modelUrl) {
            await bot.sendDocument(chatId, this.cleanUrl(modelUrl), {
                caption: `📥 <b>Your 3D model in ${format.toUpperCase()} (${mode}) format</b>`,
                parse_mode: "HTML"
            });
        } else {
            await bot.sendMessage(
                chatId,
                `❌ <b>No ${format.toUpperCase()} (${mode}) model available for download.</b>`,
                {parse_mode: "HTML"}
            );
        }
    }
}

export default MeshFeature;
