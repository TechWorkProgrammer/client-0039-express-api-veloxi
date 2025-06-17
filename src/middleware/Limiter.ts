import rateLimit, {RateLimitRequestHandler} from "express-rate-limit";
import {Application, Request, Response as EResponse} from 'express';
import Response from "@/config/Response";
import Variables from "@/config/Variables";

class Limiter {
    static limiter: RateLimitRequestHandler;

    static boot() {
        this.limiter = rateLimit({
            windowMs: Variables.RATE_LIMIT_WINDOW_MS,
            limit: Variables.RATE_LIMIT_MAX,
            standardHeaders: true,
            legacyHeaders: false,
            skipFailedRequests: true,
            handler: (req: Request, res: EResponse) => {
                Response.TooManyRequests(res);
            }
        });
    }

    static applyRateLimits(app: Application): void {
        app.use(this.limiter);
    }
}

export default Limiter;
