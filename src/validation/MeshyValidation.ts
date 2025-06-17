import Joi from "joi";
import Validator from "@/validation/Validator";

class MeshyValidation extends Validator {
    public static generateMeshy() {
        return this.validate(
            Joi.object({
                mode: Joi.string().valid("preview", "final", "rodin").optional(),
                prompt: this.text(1, 3000),
                art_style: Joi.string().valid("realistic", "cartoon", "sculpture").optional(),
                should_remesh: Joi.boolean().optional()
            })
        );
    }
}

export default MeshyValidation;
