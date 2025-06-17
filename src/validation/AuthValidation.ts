import Joi from "joi";
import Validator from "@/validation/Validator";

class AuthValidation extends Validator {
  public static login() {
    return this.validate(
      Joi.object({
        username: this.text(),
        password: Joi.string().optional()
      })
    );
  }

  public static register() {
    return this.validate(
      Joi.object({
        username: this.text(),
        password: this.password(),
        repeat_password: this.repeat("password")
      })
    );
  }
}

export default AuthValidation;
