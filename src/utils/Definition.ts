import Joi from "joi";

class Definition {
    protected static text = (min: number = 1, max: number = 255) => Joi.string().min(min).max(max).required();
    protected static uuid = () => Joi.string().guid({version: 'uuidv4'}).required();
    protected static integer = (min: number = 0, max: number = Number.MAX_SAFE_INTEGER) => Joi.number().integer().min(min).max(max).required();
    protected static float = (min: number = 0, max?: number) => {
        const schema = Joi.number().min(min);
        return max !== undefined ? schema.max(max).required() : schema.required();
    };
    protected static phone = () => Joi.string().min(10).max(15).required().regex(/^\+?[1-9]\d{1,14}$/).messages({'string.pattern.base': 'Phone number must be valid'});
    protected static email = () => Joi.string().email().required();
    protected static file = () => Joi.any().required();
    protected static boolean = () => Joi.boolean().required();
    protected static password = (min: number = 8, max: number = 15) => Joi.string().min(min).max(max).required();
    protected static repeat = (ref: string) => Joi.string().equal(Joi.ref(ref)).required().messages({
        'any.only': `${ref}s must match`,
    });
    protected static enum = <T extends string | number | boolean>(allowedValues: T[]) =>
        Joi.string().valid(...allowedValues).default(allowedValues[0]).required();
}

export default Definition;
