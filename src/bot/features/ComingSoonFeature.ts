import TelegramBot from "node-telegram-bot-api";

class ComingSoonFeature {
    public static async showComingSoonMessage(bot: TelegramBot, chatId: number, feature: string | undefined): Promise<void> {
        const featureName = {
            menu_nft: "NFT",
            menu_metaverse: "Metaverse",
            menu_game: "Game"
        }[feature || ""];

        if (!featureName) {
            await bot.sendMessage(chatId, "🚧 *Feature is coming soon!*", {
                parse_mode: "Markdown"
            });
            return;
        }

        await bot.sendMessage(chatId, `🚧 *${featureName} is coming soon!*`, {
            parse_mode: "Markdown"
        });
    }
}

export default ComingSoonFeature;
