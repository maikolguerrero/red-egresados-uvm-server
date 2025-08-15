import AppError from './AppError.js';

/**
 * @fileoverview Middlewares para validación estructurada de datos
 * @module middlewares/validate.middleware
 * @requires ./AppError - Clase de errores personalizados
 * 
 * @description  
 * Sistema de validación con:
 * - Soporte para body, query params y URL params  
 * - Normalización de datos validados  
 * - Mensajes de error detallados  
 * - Integración con Joi/Yup u otros validadores
 */

/**
 * Middleware factory para validación de datos
 * @function validate
 * @param {Object} schema - Esquema de validación (Joi/Yup/etc)
 * @param {string} [property='body'] - Propiedad del request a validar
 * @returns {Function} Middleware de validación
 * 
 * @description  
 * Flujo de validación:
 * 1. Extrae datos del request según propiedad  
 * 2. Valida contra el esquema proporcionado  
 * 3. Asigna datos validados a:  
 *    - `req.validatedQuery` (para query params)  
 *    - `req.validatedParams` (para URL params)  
 *    - `req[property]` (para otros casos)  
 * 4. Maneja errores con formato estandarizado
 * 
 * @throws {AppError} 
 * - 422 con código VALIDATION_ERROR y array de errores
 * 
 * @example
 * // Validación de body:
 * router.post('/', validate(bodySchema), handler);
 * 
 * @example
 * // Validación de query params:
 * router.get('/', validate(querySchema, 'query'), handler);
 */
export const validate = (schema, property = 'body') => {
    return async (req, res, next) => {
        try {
            let dataToValidate;

            // Manejo especial para cada tipo de propiedad
            switch (property) {
                case 'query':
                    dataToValidate = { ...req.query };
                    break;
                case 'params':
                    dataToValidate = { ...req.params };
                    break;
                default:
                    // Para body, usamos req.body directamente (ya procesado por Multer)
                    dataToValidate = req[property];

                    // Si es FormData, los campos vienen como strings, podríamos necesitar parsear
                    if (req.is('multipart/form-data')) {
                        const parsedData = {};
                        for (const [key, value] of Object.entries(dataToValidate)) {
                            try {
                                // Intenta parsear valores que podrían ser JSON
                                parsedData[key] = JSON.parse(value);
                            } catch {
                                parsedData[key] = value;
                            }
                        }
                        dataToValidate = parsedData;
                    }
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

/**
 * Middleware especializado para validación de query strings
 * @function validateQuery
 * @param {Object} schema - Esquema de validación
 * @returns {Function} Middleware de validación
 * 
 * @description  
 * Versión especializada de validate() para query params:  
 * - Asigna datos validados a `req.validatedQuery`  
 * - Mantiene los query params originales intactos  
 * 
 * @example
 * router.get('/search', validateQuery(searchSchema), searchHandler);
 */
export const validateQuery = (schema) => {
    return validate(schema, 'query');
};

/**
 * Middleware especializado para validación de URL params
 * @function validateParams
 * @param {Object} schema - Esquema de validación
 * @returns {Function} Middleware de validación
 * 
 * @description  
 * Versión especializada de validate() para URL params:  
 * - Asigna datos validados a `req.validatedParams`  
 * - Normaliza tipos de datos (ej: string -> number)  
 * 
 * @example
 * router.get('/users/:id', validateParams(idSchema), userHandler);
 */
export const validateParams = (schema) => {
    return validate(schema, 'params');
};