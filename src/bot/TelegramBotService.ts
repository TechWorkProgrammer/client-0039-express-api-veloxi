import TelegramBot from "node-telegram-bot-api";
import Variables from "@/config/Variables";
import MusicFeature from "@/bot/features/MusicFeature";
import MeshFeature from "@/bot/features/MeshFeature";
import ComingSoonFeature from "@/bot/features/ComingSoonFeature";

class TelegramBotService {
    private static bot: TelegramBot;
    private static cooldowns = new Map<string, { data: string; timestamp: number }>();

    public static boot(): void {
        this.bot = new TelegramBot(Variables.BOT_TELEGRAM_TOKEN, {polling: true});
        this.registerFeatures();
        this.bot.onText(/\/start/, (msg) => this.showMainMenu(msg.chat.id));
        this.bot.onText(/\/help/, (msg) => this.showMainMenu(msg.chat.id));
        this.handleMenuActions();
    }

    private static registerFeatures(): void {
        MusicFeature.init(this.bot);
        MeshFeature.init(this.bot);
    }

    private static showMainMenu(chatId: number): void {
        const message = `👋 <b>Welcome to LogicAI Bot!</b>\n\nSelect an option below to get started.`;
        const menuOptions: TelegramBot.SendMessageOptions = {
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
        };
        this.bot.sendMessage(chatId, message, menuOptions).then();
    }

    private static handleMenuActions(): void {
        this.bot.removeAllListeners("callback_query");
        this.bot.on("callback_query", async (callbackQuery) => {
            const chatId = callbackQuery.message!.chat.id;
            const telegramId = callbackQuery.from!.id.toString();
            const data = callbackQuery.data || "";
            const key = `${chatId}:${telegramId}`;
            const now = Date.now();
            const last = this.cooldowns.get(key);
            if (last && last.data === data && now - last.timestamp < 60000) {
                await this.bot.answerCallbackQuery(callbackQuery.id, {
                    text: "Please wait 1 minute before repeating the same action.",
                    show_alert: true
                });
                return;
            }

            if (last && last.data !== data && now - last.timestamp < 3000) {
                await this.bot.answerCallbackQuery(callbackQuery.id, {
                    text: "Please wait a few seconds before doing another action.",
                    show_alert: false
                });
                return;
            }

            this.cooldowns.set(key, {data, timestamp: now});
            setTimeout(() => this.cooldowns.delete(key), 60000);
            if (!data || !chatId) {
                await this.bot.sendMessage(chatId || 0, "❌ <b>Invalid callback query data.</b>", {parse_mode: "HTML"});
                return;
            }
            await this.bot.answerCallbackQuery(callbackQuery.id);
            try {
                if (data.startsWith("menu_")) {
                    switch (data) {
                        case "menu_3d":
                            await MeshFeature.showMeshMenu(this.bot, chatId);
                            break;
                        case "menu_music":
                            await MusicFeature.showMusicMenu(this.bot, chatId);
                            break;
                        case "menu_nft":
                        case "menu_metaverse":
                        case "menu_game":
                            await ComingSoonFeature.showComingSoonMessage(this.bot, chatId, data);
                            break;
                        default:
                            await this.bot.sendMessage(chatId, "❓ <b>Unknown menu action.</b>", {parse_mode: "HTML"});
                            break;
                    }
                } else if (
                    data.startsWith("generate_mesh") ||
                    data.startsWith("show_mesh_assets") ||
                    data.startsWith("select_mesh_") ||
                    data.startsWith("download_mesh_")
                ) {
                    await MeshFeature.handleCallbackQuery(this.bot, callbackQuery);
                } else if (
                    data.startsWith("generate_music") ||
                    data.startsWith("show_music_assets") ||
                    data.startsWith("select_music_") ||
                    data.startsWith("download_music_")
                ) {
                    await MusicFeature.handleCallbackQuery(this.bot, callbackQuery);
                } else if (data === "back_mesh_menu") {
                    await MeshFeature.showMeshMenu(this.bot, chatId);
                } else if (data === "back_main_menu") {
                    this.showMainMenu(chatId);
                } else if (data === "back_music_menu") {
                    await MusicFeature.showMusicMenu(this.bot, chatId);
                } else {
                    await this.bot.sendMessage(chatId, "❓ <b>Unknown action.</b>", {parse_mode: "HTML"});
                }
            } catch (error: any) {
                console.log(error.message);
                await this.bot.sendMessage(chatId, "❌ <b>An error occurred while processing your request.</b>", {parse_mode: "HTML"});
            }
        });
    }
}

export default TelegramBotService;
