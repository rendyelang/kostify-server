const Joi = require("joi")

const passwordPatternValidation = (password) => {
    const schema = Joi.object({
        password: Joi.string()
            .min(8)
            .pattern(/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/) // Simbol, huruf besar, huruf kecil, dan angka
            .required()
            .messages({
                "string.pattern.base": "New Password must consist of uppercase letters, lowercase letters, numbers, and symbols!",
                "string.min": "New Password must have at least 8 characters!",
                "any.required": "Password required!"
            }),
    })

    return schema.validate({password})
}

module.exports = {
    passwordPatternValidation
}