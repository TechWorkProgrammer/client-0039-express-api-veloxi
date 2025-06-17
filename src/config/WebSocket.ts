import {Server, Socket} from "socket.io";
import {Server as HTTPServer} from "http";

class WebSocket {
    private static io: Server | undefined;

    static boot(server: HTTPServer): void {
        this.io = new Server(server, {
            cors: {
                origin: "*",
                methods: ["GET", "POST"],
                allowedHeaders: ["Content-Type"],
                credentials: true
            }
        });

        this.io.on('connection', (socket: Socket) => {
            console.log('A user connected with socket id:', socket.id);

            socket.on('disconnect', () => {
                console.log('User disconnected', socket.id);
            });
        });
    }

    static sendMessage(taskId: string, status: string, message: string) {
        if (this.io) {
            this.io.emit(taskId, {status, message} as unknown as any);
            console.log(`📡 WebSocket | TaskID: ${taskId} | Status: ${status} | Message: ${message}`);
        }
    }
}

export default WebSocket;
