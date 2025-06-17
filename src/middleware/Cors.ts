import {Application, NextFunction, Request, Response as EResponse} from 'express';
import Variables from "@/config/Variables";
import Response from "@/config/Response";

class Cors {
    static middleware(app: Application): void {
        app.use((req: Request, res: EResponse, next: NextFunction): void => {
            const origin = req.headers.origin || '';
            const allowedOrigins = Variables.ALLOWED_ORIGINS;

            if (allowedOrigins.includes(origin)) {
                res.setHeader('Access-Control-Allow-Origin', origin);
                res.setHeader('Access-Control-Allow-Methods', Variables.ALLOWED_METHODS);
                res.setHeader('Access-Control-Allow-Headers', Variables.ALLOWED_HEADERS);
                res.setHeader('Access-Control-Allow-Credentials', 'true');

                if (req.method === 'OPTIONS') {
                    res.sendStatus(200);
                    return;
                }
            } else {
                if (req.method === 'OPTIONS') {
                    Response.Forbidden(res, 'Not allowed by CORS');
                    return;
                }
            }

            next();
        });
    }

    static applyCors(app: Application): void {
        this.middleware(app);
    }
}

export default Cors;
