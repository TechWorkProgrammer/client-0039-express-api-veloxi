import process from "process";

class Console {
    private static lastMessageLength: number = 0;

    public static async dots(message: string, execFunction: Promise<void>): Promise<void> {
        let dotCount = 0;
        const maxDots = 3;
        const intervalTime = 300;

        return new Promise((resolve) => {
            const interval = setInterval(() => {
                dotCount = (dotCount + 1) % (maxDots + 1);
                const dots = '.'.repeat(dotCount);
                const fullMessage = `${message}${dots}`;
                process.stdout.write(`\r${' '.repeat(this.lastMessageLength)}\r`);
                process.stdout.write(`\r${fullMessage}`);
                this.lastMessageLength = fullMessage.length;
            }, intervalTime);

            execFunction
                .then(() => {
                    clearInterval(interval);
                    process.stdout.write(`\r${' '.repeat(this.lastMessageLength)}\r`);
                    resolve();
                })
                .catch((error) => {
                    clearInterval(interval);
                    process.stdout.write(`\r${' '.repeat(this.lastMessageLength)}\r`);
                    resolve();
                    throw error;
                });
        });
    }

    public static async static(message: string, duration: number = 1000): Promise<void> {
        process.stdout.write(`\r${' '.repeat(this.lastMessageLength)}\r`);
        process.stdout.write(`\r${message}`);
        this.lastMessageLength = message.length; // Track the new message length
        return new Promise((resolve) => setTimeout(resolve, duration));
    }
}

export default Console;
