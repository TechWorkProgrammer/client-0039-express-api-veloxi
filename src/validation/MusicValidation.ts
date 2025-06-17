import Joi from "joi";
import Validator from "@/validation/Validator";

class MusicValidation extends Validator {
  public static generateMusic() {
    return this.validate(Joi.object(
      {
        custom_mode: Joi.boolean().required(),
        prompt: this.text(0, 3000),
        mv: Joi.string().valid("sonic-v3-5", "sonic-v4").required(),
        title: Joi.string().optional().allow(""),
        tags: Joi.string().optional().allow(""),
        negative_tags: Joi.string().optional(),
        make_instrumental: Joi.boolean().optional(),
        gpt_description_prompt: Joi.string().optional()
      }
    ));
  }
}

export default MusicValidation;
