const Joi = require("joi");

exports.registerSchema = Joi.object({
    name: Joi.string().min(3).max(100).required(),
    email: Joi.string().email().lowercase().required(),

    password: Joi.string()
        .min(6)
        .max(50)
        .required(),

    role: Joi.string()
        .valid("student", "teacher")
        .required(),
     // Regex equivalent: /^[A-Za-z0-9]{6,20}$/
    reg_no: Joi.string()
        .alphanum()
        .min(6)
        .max(20)
        .when("role", { is: "student", then: Joi.required() }),

    // ADDED: Department is required for students to assign teachers later
    department: Joi.string()
        .min(2)
        .max(50)
        .when("role", { is: "student", then: Joi.required() }),

    subject: Joi.string()
        .min(2)
        .max(100)
        .when("role", { is: "teacher", then: Joi.required() })
});

exports.loginSchema = Joi.object({
    email: Joi.string().email().lowercase().required(),
    password: Joi.string().min(6).required()
});
