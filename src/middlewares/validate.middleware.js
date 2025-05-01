import { AppError } from './error/index.js';

// Middleware para validación de datos
export const validate = (schema, property = 'body') => {
    return async (req, res, next) => {
        try {
            // Manejo especial para cada tipo de propiedad
            let dataToValidate;
            switch (property) {
                case 'query':
                    dataToValidate = { ...req.query }; // Copia de query params
                    break;
                case 'params':
                    dataToValidate = { ...req.params }; // Copia de URL params
                    break;
                default:
                    dataToValidate = req[property];
            }

            const validatedData = await schema.validate(dataToValidate, {
                abortEarly: false,
                stripUnknown: true
            });

            // Asignación segura según el tipo
            if (property === 'query') {
                req.validatedQuery = validatedData;
            } else if (property === 'params') {
                req.validatedParams = validatedData;
            } else {
                req[property] = validatedData;
            }

            next();
        } catch (err) {
            const errors = err.inner?.map(error => ({
                field: error.path,
                message: error.message
            })) || [{
                field: err.path || 'unknown',
                message: err.message
            }];

            next(new AppError(
                'Error de validación',
                422,
                'VALIDATION_ERROR',
                {
                    errors,
                    context: 'input_validation',
                    ip: req.ip,
                    path: req.path
                }
            ));
        }
    };
};

// Middleware para validar query strings
export const validateQuery = (schema) => {
    return validate(schema, 'query');
};

// Middleware para URL params
export const validateParams = (schema) => {
    return validate(schema, 'params');
};

