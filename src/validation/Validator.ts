import {ObjectSchema} from 'joi';
import {NextFunction, Request, Response as EResponse} from 'express';
import Response from '@/config/Response';
import Definition from "@/utils/Definition";

class Validator extends Definition {
    protected static validate(schema: ObjectSchema) {
        return (req: Request, res: EResponse, next: NextFunction): void => {
            const {error} = schema.validate(req.body, {abortEarly: false});

            if (error) {
                const isUnknownKeyError = error.details.some(detail => detail.type === 'object.unknown');
                if (isUnknownKeyError) {
                    Response.BadRequest(res, 'Request contains unexpected fields.');
                    return;
                } else {
                    const errorMessage = error.details.map(err => err.message).join(', ');
                    Response.UnprocessableEntity(res, errorMessage);
                    return
                }
            }

            next();
        };
    }
}

export default Validator;
