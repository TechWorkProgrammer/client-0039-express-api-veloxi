import TelegramBot from "node-telegram-bot-api";
import MusicApiService from "@/service/MusicApiService";
import Service from "@/service/Service";
import MusicWorker from "@/workers/MusicWorker";

class MusicFeature extends Service {
    public static init(bot: TelegramBot): void {
        bot.on("message", async (msg) => {
            const chatId = msg.chat.id;
            const telegramId = msg.from?.id?.toString();
            if (!telegramId) {
                await bot.sendMessage(chatId, "❌ <b>Unable to identify the user.</b>", {parse_mode: "HTML"});
                return;
            }
            if (msg.text && msg.text.startsWith("/music ")) {
                const prompt = msg.text.replace("/music ", "").trim();
                if (prompt) {
                    await this.generateMusic(bot, chatId, telegramId, prompt);
                } else {
                    await bot.sendMessage(chatId, "❌ <b>Invalid prompt. Please try again.</b>", {parse_mode: "HTML"});
                }
            }
        });
    }

    public static async showMusicMenu(bot: TelegramBot, chatId: number): Promise<void> {
        const message = `🎵 <b>Music Content Menu</b>\n\nChoose an action below:`;
        const menuOptions: TelegramBot.SendMessageOptions = {
            parse_mode: "HTML",
            reply_markup: {
                inline_keyboard: [
                    [{text: "📂 Show Assets", callback_data: "show_music_assets_page_1"}],
                    [{text: "✨ Generate New Music", callback_data: "generate_music"}],
                    [{text: "↩️ Back to Main Menu", callback_data: "back_main_menu"}]
                ]
            }
        };
        await bot.sendMessage(chatId, message, menuOptions);
    }

    public static async handleCallbackQuery(bot: TelegramBot, callbackQuery: TelegramBot.CallbackQuery): Promise<void> {
        const chatId = callbackQuery.message?.chat.id;
        const telegramId = callbackQuery.from.id?.toString();
        const data = callbackQuery.data;
        if (!data || !chatId || !telegramId) {
            await bot.sendMessage(chatId || 0, "❌ <b>Unable to process the request.</b>", {parse_mode: "HTML"});
            return;
        }
        await bot.answerCallbackQuery(callbackQuery.id);
        try {
            if (data === "generate_music") {
                await this.promptMusicInput(bot, chatId);
            } else if (data.startsWith("show_music_assets_page_")) {
                const pageStr = data.replace("show_music_assets_page_", "");
                const page = parseInt(pageStr, 10) || 1;
                await this.displayMusicAssets(bot, chatId, telegramId, page);
            } else if (data.startsWith("select_music_")) {
                const taskId = data.replace("select_music_", "");
                await this.showMusicDetails(bot, chatId, taskId);
            } else if (data.startsWith("download_music_")) {
                const taskId = data.replace("download_music_", "");
                await this.downloadMusic(bot, chatId, taskId);
            } else if (data === "back_music_menu") {
                await this.showMusicMenu(bot, chatId);
            } else {
                await bot.sendMessage(chatId, "❓ <b>Unknown action.</b>", {parse_mode: "HTML"});
            }
        } catch (error: any) {
            console.error(`Error handling music action '${data}':`, error.message);
            await bot.sendMessage(chatId, "❌ <b>An error occurred while processing your request.</b>", {parse_mode: "HTML"});
        }
    }

    public static async promptMusicInput(bot: TelegramBot, chatId: number): Promise<void> {
        await bot.sendMessage(chatId, "🎵 <b>Send your music prompt using</b> <code>/music your_prompt</code>", {parse_mode: "HTML"});
    }

    private static async generateMusic(bot: TelegramBot, chatId: number, telegramId: string, prompt: string): Promise<void> {
        const telegramUser = await this.prisma.telegramUser.upsert({
            where: {telegramId},
            update: {},
            create: {
                telegramId,
                username: (await bot.getChat(chatId)).username || "Anonymous"
            }
        });
        const cooldown = await MusicApiService.checkCooldown(telegramUser.id);
        if (!cooldown.ok) {
            await bot.sendMessage(chatId, cooldown.message, {parse_mode: "HTML"});
            return;
        }
        await bot.sendMessage(chatId, "🎵 <b>Generating your music... Please wait!</b>", {parse_mode: "HTML"});
        try {
            const musicResponse = await MusicApiService.generateMusic(
                {custom_mode: true, prompt: " ", mv: "sonic-v3-5", gpt_description_prompt: prompt},
                undefined,
                telegramUser["id"]
            );
            await bot.sendMessage(
                chatId,
                `✅ <b>Music is being processed!</b>\n🆔 <b>Task ID:</b> <code>${musicResponse.taskId}</code>\n\nUse <b>Show Assets</b> to check your music.`,
                {parse_mode: "HTML"}
            );
        } catch (error: any) {
            console.error("Error generating music:", error.message);
            await bot.sendMessage(chatId, "❌ <b>Failed to generate music. Please try again later.</b>", {parse_mode: "HTML"});
        }
    }

    public static async displayMusicAssets(bot: TelegramBot, chatId: number, telegramId: string, page: number): Promise<void> {
        const telegramUser = await this.prisma.telegramUser.upsert({
            where: {telegramId},
            update: {},
            create: {
                telegramId,
                username: (await bot.getChat(chatId)).username || "Anonymous"
            }
        });
        const allMusic = await MusicApiService.getTelegramMusic(telegramUser["id"]);
        for (const music of allMusic) {
            if (music.state === "pending") {
                try {
                    await MusicApiService.getMusicResult(music.taskId);
                } catch (error: any) {
                    console.error(`Failed to update music with task ID ${music.taskId}:`, error.message);
                }
            }
        }
        const succeededMusicList = await MusicApiService.getTelegramMusic(telegramUser["id"]);
        if (succeededMusicList.length === 0) {
            await bot.sendMessage(chatId, "❌ <b>No music available. Generate some music first!</b>", {parse_mode: "HTML"});
            return;
        }
        const sortedMusicList = succeededMusicList.sort(
            (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
        const ITEMS_PER_PAGE = 5;
        const totalPages = Math.ceil(sortedMusicList.length / ITEMS_PER_PAGE);
        const currentPage = Math.min(Math.max(page, 1), totalPages);
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        const pageItems = sortedMusicList.slice(startIndex, startIndex + ITEMS_PER_PAGE);
        const inlineKeyboard = pageItems.map((music) => [
            {text: `Task: ${music.taskId}`, callback_data: `select_music_${music.taskId}`}
        ]);
        const navButtons: any[] = [];
        if (currentPage > 1) {
            navButtons.push({text: "⬅️ Previous", callback_data: `show_music_assets_page_${currentPage - 1}`});
        }
        if (currentPage < totalPages) {
            navButtons.push({text: "Next ➡️", callback_data: `show_music_assets_page_${currentPage + 1}`});
        }
        if (navButtons.length > 0) {
            inlineKeyboard.push(navButtons);
        }
        inlineKeyboard.push([{text: "↩️ Back", callback_data: "back_music_menu"}]);
        const message = `🎵 <b>Your Music Assets (Page ${currentPage}/${totalPages})</b>\nSelect a music item to view details or download.`;
        await bot.sendMessage(chatId, message, {parse_mode: "HTML", reply_markup: {inline_keyboard: inlineKeyboard}});
    }

    public static async showMusicDetails(bot: TelegramBot, chatId: number, taskId: string): Promise<void> {
        try {
            const music = await MusicApiService.getMusicResult(taskId);
            if (!music) {
                await bot.sendMessage(chatId, "❌ <b>Music not found.</b>", {parse_mode: "HTML"});
                return;
            }
            if (music.state === "pending") {
                console.log(`🟡 [showMusicDetails] Task ID: ${taskId} is still pending.`);
                MusicWorker.addToQueue(music.taskId);
                await bot.sendMessage(
                    chatId,
                    "🎧 <b>LogicAI is still creating your music track.</b>\n\nGreat tunes take time! Try checking back in <b>about 3 minutes</b> — it’ll be worth the wait.",
                    {parse_mode: "HTML"}
                );
                return;
            }
            const caption = `🎶 <b>${music.title || "Untitled"}</b>\n🆔 <b>Task ID:</b> <code>${music.taskId}</code>`;
            const downloadButton = music.audioUrl ? [{
                text: "📥 Download Music",
                callback_data: `download_music_${music.taskId}`
            }] : [];
            const detailsKeyboard = [downloadButton, [{text: "↩️ Back", callback_data: "back_music_menu"}]];
            if (music.imageUrl) {
                await bot.sendPhoto(chatId, music.imageUrl, {
                    caption,
                    parse_mode: "HTML",
                    reply_markup: {inline_keyboard: detailsKeyboard}
                });
            } else {
                await bot.sendMessage(chatId, caption, {
                    parse_mode: "HTML",
                    reply_markup: {inline_keyboard: detailsKeyboard}
                });
            }
        } catch (error: any) {
            await bot.sendMessage(chatId, "❌ <b>Failed to retrieve music details.</b>", {parse_mode: "HTML"});
        }
    }

    private static async downloadMusic(bot: TelegramBot, chatId: number, taskId: string): Promise<void> {
        const music = await MusicApiService.getMusicResult(taskId);
        if (!music) {
            await bot.sendMessage(chatId, "❌ <b>Music not found.</b>", {parse_mode: "HTML"});
            return;
        }
        if (music.audioUrl) {
            await bot.sendAudio(chatId, music.audioUrl, {
                caption: `📥 <b>Your Music</b>`,
                parse_mode: "HTML"
            });
        } else {
            await bot.sendMessage(chatId, "❌ <b>No audio available for download.</b>", {parse_mode: "HTML"});
        }
    }
}

export default MusicFeature;
