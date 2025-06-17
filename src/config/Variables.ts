import dotenv from "dotenv";
import process from "process";
import CustomError from "@/middleware/CustomError";

class Variables {
  static PORT: string;
  static BASE_URL: string;
  static DATABASE_URL: string;
  static SECRET: string;
  static TIMEOUT: number;
  static TEMP_PATH: string;
  static ASSETS_PATH: string;
  static ALLOWED_ORIGINS: string[];
  static ALLOWED_HEADERS: string;
  static ALLOWED_METHODS: string;
  static RATE_LIMIT_MAX: number;
  static RATE_LIMIT_WINDOW_MS: number;
  static MAX_FILE_SIZE: number;
  static BOT_TELEGRAM_TOKEN: string;
  static MUSIC_API_KEY: string;
  static MESHY_API_KEY: string;
  static OPENAI_API_KEY: string;
  static MASTERX_API_KEY: string;

  static boot(): void {
    dotenv.config();

    this.PORT = process.env.PORT || this.throwError("PORT");
    this.BASE_URL = process.env.BASE_URL || this.throwError("BASE_URL");
    this.DATABASE_URL = process.env.DATABASE_URL || this.throwError("DATABASE_URL");
    this.SECRET = process.env.SECRET || this.throwError("SECRET");
    this.BOT_TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN || this.throwError("TELEGRAM_BOT_TOKEN");
    this.MUSIC_API_KEY = process.env.MUSIC_API_KEY || this.throwError("MUSIC_API_KEY");
    this.MESHY_API_KEY = process.env.MESHY_API_KEY || this.throwError("MESHY_API_KEY");
    this.OPENAI_API_KEY = process.env.OPENAI_API_KEY || this.throwError("OPENAI_API_KEY");
    this.MASTERX_API_KEY = process.env.MASTERX_API_KEY || this.throwError("MASTERX_API_KEY");
    this.TIMEOUT = process.env.TIMEOUT ? parseInt(process.env.TIMEOUT) : 5000;
    this.TEMP_PATH = process.env.TEMP_PATH || "/storage/temp";
    this.ASSETS_PATH = process.env.ASSETS_PATH || "/storage/assets";
    this.ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
      ? process.env.ALLOWED_ORIGINS.split(",")
      : ["http://localhost:3000"];
    this.ALLOWED_HEADERS = process.env.ALLOWED_HEADERS || "Content-Type,Authorization,Accept";
    this.ALLOWED_METHODS = process.env.ALLOWED_METHODS || "GET,POST,PUT,DELETE";

    this.RATE_LIMIT_WINDOW_MS = process.env.RATE_LIMIT_WINDOW_MS ? parseInt(process.env.RATE_LIMIT_WINDOW_MS) : 60000;
    this.RATE_LIMIT_MAX = process.env.RATE_LIMIT_MAX ? parseInt(process.env.RATE_LIMIT_MAX) : 30;
    this.MAX_FILE_SIZE = process.env.MAX_FILE_SIZE ? parseInt(process.env.MAX_FILE_SIZE) : 1048576;
  }

  static throwError(variable: string): never {
    throw new CustomError(`Missing required environment variable: ${variable}`);
  }
}

export default Variables;
