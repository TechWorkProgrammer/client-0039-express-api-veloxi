import { Request, Response as EResponse } from 'express';
import multer from 'multer';
import crypto from 'crypto';
import path, { join } from 'path';
import { rename } from 'fs/promises';
import process from 'process';
import Variables from '@/config/Variables';
import CustomError from "@/middleware/CustomError";

class Multer {
    private static upload = multer({
        storage: multer.diskStorage({
            destination: (req: Request, file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) => {
                const tempPath = join(process.cwd(), Variables.TEMP_PATH);
                cb(null, tempPath);
            },
            filename: (req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
                const uniqueSuffix = Date.now() + '-' + crypto.randomBytes(8).toString('hex');
                const ext = path.extname(file.originalname);
                cb(null, file.fieldname + '-' + uniqueSuffix + ext);
            }
        }),
        limits: { fileSize: Variables.MAX_FILE_SIZE }
    }).single('image');

    public static storeImage(req: Request, res: EResponse): Promise<string> {
        return new Promise((resolve, reject) => {
            this.upload(req, res, async (err: any) => {
                if (err) {
                    reject(new CustomError('File upload failed'));
                } else if (req.file) {
                    try {
                        const tempPath = req.file.path;
                        const finalDestination = join(process.cwd(), Variables.ASSETS_PATH, req.file.filename);
                        await rename(tempPath, finalDestination);
                        const imageUrl = `${Variables.BASE_URL}/assets/${req.file.filename}`;
                        resolve(imageUrl);
                    } catch (error) {
                        reject(error);
                    }
                } else {
                    resolve('');
                }
            });
        });
    }
}

export default Multer;
