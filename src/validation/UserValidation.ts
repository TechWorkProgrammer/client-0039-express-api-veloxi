import Joi from "joi";
import Validator from "@/validation/Validator";

class UserValidation extends Validator {
  public static updateUsername() {
    return this.validate(
      Joi.object({
        username: this.text(4, 20)
      })
    );
  }
}

export default UserValidation;
