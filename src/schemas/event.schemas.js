import * as yup from 'yup';

// Esquema base reutilizable
const baseEventSchema = {
    title: yup.string()
        .required('El título es requerido')
        .max(100, 'Máximo 100 caracteres')
        .trim(),
    description: yup.string()
        .required('La descripción es requerida')
        .max(2000, 'Máximo 2000 caracteres'),
    eventType: yup.string()
        .required('El tipo de evento es requerido')
        .oneOf(
            ['conferencia', 'taller', 'seminario', 'social', 'networking', 'otros'],
            'Tipo de evento no válido'
        ),
    startDate: yup.date()
        .required('La fecha de inicio es requerida')
        .min(new Date(), 'La fecha no puede ser en el pasado'),
    endDate: yup.date()
        .required('La fecha de finalización es requerida')
        .when('startDate', (startDate, schema) => {
            return startDate
                ? schema.min(startDate, 'La fecha de fin debe ser posterior a la de inicio')
                : schema;
        }),
    location: yup.string()
        // .required('La ubicación es requerida')
        .trim()
        .nullable()
        .transform(value => value || null),
    virtualLink: yup.string()
        .url('Debe ser una URL válida')
        .nullable()
        .transform(value => value || null),
    organizers: yup.array()
        .of(yup.string().trim().max(50, 'Máximo 50 caracteres por organizador'))
        .min(1, 'Debe haber al menos un organizador'),
    specialGuests: yup.array()
        .of(yup.string().trim().max(50, 'Máximo 50 caracteres por invitado')),
    capacity: yup.number()
        .min(0, 'La capacidad mínima es 0')
        .integer()
        .nullable()
        .transform(value => value || null),
    certificate: yup.boolean(),
    tags: yup.array()
        .of(yup.string().trim().max(20, 'Máximo 20 caracteres por tag')),
    isActive: yup.boolean()
};

// Esquema para creación
export const eventCreateSchema = yup.object().shape({
    ...baseEventSchema,
});

// Esquema para actualización (más flexible)
export const eventUpdateSchema = yup.object().shape({
    title: baseEventSchema.title.optional(),
    description: baseEventSchema.description.optional(),
    eventType: baseEventSchema.eventType.optional(),
    startDate: yup.date()
        .nullable()
        .transform((value, originalValue) => {
            // Si el valor original es undefined, null o string vacío, devuelve null
            return originalValue === '' || originalValue == null ? null : value;
        })
        .typeError('La fecha debe ser válida'),
    endDate: yup.date()
        .nullable()
        .transform((value, originalValue) => {
            return originalValue === '' || originalValue == null ? null : value;
        })
        .when('startDate', (startDate, schema) => {
            return startDate
                ? schema.min(startDate, 'La fecha de fin debe ser posterior a la de inicio')
                : schema;
        })
        .typeError('La fecha debe ser válida'),
    location: baseEventSchema.location.optional(),
    virtualLink: baseEventSchema.virtualLink.optional(),
    organizers: yup.array()
        .of(yup.string().trim().max(50, 'Máximo 50 caracteres por organizador'))
        .optional(),
    specialGuests: yup.array()
        .of(yup.string().trim().max(50, 'Máximo 50 caracteres por invitado'))
        .optional(),
    capacity: baseEventSchema.capacity.optional(),
    certificate: yup.boolean().optional(),
    tags: baseEventSchema.tags.optional(),
    isActive: yup.boolean().optional(),
});

// Esquema para filtros de búsqueda
export const eventQuerySchema = yup.object().shape({
    page: yup.number()
        .min(1, 'La página debe ser al menos 1')
        .default(1),
    limit: yup.number()
        .min(1, 'El límite debe ser al menos 1')
        .max(100, 'No puedes solicitar más de 100 items')
        .default(10),
    type: yup.string()
        .oneOf(['conferencia', 'taller', 'seminario', 'social', 'networking', 'otros', undefined]),
    search: yup.string()
        .max(100, 'La búsqueda no puede exceder 100 caracteres'),
    tags: yup.string()
        .min(1, 'Cada tag debe tener al menos 1 caracteres')
        .optional(),
    tagMatch: yup.string()
        .oneOf(['all', 'any', undefined])
        .default('any'),
    upcoming: yup.boolean()
});

// Esquema para validación de ID de evento
export const eventIdSchema = yup.object().shape({
    id: yup.string()
        .required()
        .matches(/^[0-9a-fA-F]{24}$/, 'ID no válido')
});