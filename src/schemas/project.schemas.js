import * as yup from 'yup';

// Esquema base para creación
export const projectCreateSchema = yup.object().shape({
    title: yup.string()
        .required('El título es requerido')
        .max(100, 'Máximo 100 caracteres')
        .trim(),
    description: yup.string()
        .required('La descripción es requerida')
        .max(5000, 'Máximo 5000 caracteres'),
    status: yup.string()
        .oneOf(['not_started', 'in_progress', 'completed', 'paused', 'cancelled'], 'Estado no válido')
        .default('not_started'),
    tags: yup.array()
        .of(yup.string().max(20, 'Máximo 20 caracteres por tag')),
    startDate: yup.date()
        .nullable()
        .when('endDate', (endDate, schema) => {
            return endDate
                ? schema.max(endDate, 'La fecha de inicio debe ser anterior a la de fin')
                : schema;
        }),
    endDate: yup.date()
        .nullable()
        .min(yup.ref('startDate'), 'La fecha de fin debe ser posterior a la de inicio'),
    isPublic: yup.boolean()
        .default(false)
});

// Esquema para actualización
export const projectUpdateSchema = yup.object().shape({
    title: yup.string()
        .max(100, 'Máximo 100 caracteres')
        .trim()
        .optional(),
    description: yup.string()
        .max(5000, 'Máximo 5000 caracteres')
        .optional(),
    status: yup.string()
        .oneOf(['not_started', 'in_progress', 'completed', 'paused', 'cancelled'], 'Estado no válido')
        .optional(),
    tags: yup.array()
        .of(yup.string().max(20, 'Máximo 20 caracteres por tag'))
        .optional(),
    startDate: yup.date()
        .nullable()
        .transform((value, originalValue) => {
            return originalValue === '' ? null : value;
        })
        .optional(),
    endDate: yup.date()
        .nullable()
        .transform((value, originalValue) => {
            return originalValue === '' ? null : value;
        })
        .when('startDate', (startDate, schema) => {
            return startDate
                ? schema.min(startDate, 'La fecha de fin debe ser posterior a la de inicio')
                : schema;
        })
        .optional(),
    isPublic: yup.boolean()
        .optional()
});

// Esquema para filtros
export const projectQuerySchema = yup.object().shape({
    page: yup.number()
        .min(1, 'La página debe ser al menos 1')
        .default(1),
    limit: yup.number()
        .min(1, 'El límite debe ser al menos 1')
        .max(100, 'No puedes solicitar más de 100 items')
        .default(10),
    status: yup.string()
        .oneOf(['not_started', 'in_progress', 'completed', 'paused', 'cancelled', undefined]),
    search: yup.string()
        .max(100, 'La búsqueda no puede exceder 100 caracteres'),
    tags: yup.string()
        .min(2, 'Cada tag debe tener al menos 2 caracteres')
        .optional(),
    tagMatch: yup.string()
        .oneOf(['all', 'any', undefined])
        .default('any'),
    // userId: yup.string()
    //     .matches(/^[0-9a-fA-F]{24}$/, 'ID de usuario no válido')
    //     .optional()
    username: yup.string()
        .max(20, 'El nombre de usuario no puede exceder 20 caracteres')
        .optional()
});

// Esquema para ID de proyecto
export const projectIdSchema = yup.object().shape({
    id: yup.string()
        .required()
        .matches(/^[0-9a-fA-F]{24}$/, 'ID no válido')
});

// Esquema para colaboradores
export const collaboratorSchema = yup.object().shape({
    // userId: yup.string()
    //     .required()
    //     .matches(/^[0-9a-fA-F]{24}$/, 'ID de usuario no válido'),
    username: yup.string()
        .max(20, 'El nombre de usuario no puede exceder 20 caracteres')
        .required(),
    role: yup.string()
        .oneOf(['admin', 'member'], 'Rol no válido')
        .default('member')
});