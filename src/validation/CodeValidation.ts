import Joi from "joi";
import Validator from "@/validation/Validator";

class CodeValidation extends Validator {
    public static generateCode() {
        return this.validate(
            Joi.object({
                prompt: this.text(1, 3000).required(),
            })
        );
    }
}

export default CodeValidation;
