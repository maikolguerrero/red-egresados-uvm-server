import * as yup from 'yup';

export const alumniSearchSchema = yup.object().shape({
    query: yup.string()
        .max(100, 'La búsqueda no puede exceder 100 caracteres')
        .nullable(),
    degree: yup.string()
        .max(100, 'La carrera no puede exceder 100 caracteres')
        .nullable(),
    graduationYear: yup.number()
        .integer('El año debe ser un número entero')
        .min(1997, 'El año debe ser mayor a 1997')
        .max(new Date().getFullYear(), 'El año no puede ser futuro')
        .nullable(),
    location: yup.string()
        .max(100, 'La ubicación no puede exceder 100 caracteres')
        .nullable(),
    username: yup.string()
        .max(20, 'El nombre de usuario no puede exceder 20 caracteres')
        .nullable(),
    page: yup.number()
        .integer('La página debe ser un número entero')
        .min(1, 'La página debe ser al menos 1')
        .default(1),
    limit: yup.number()
        .integer('El límite debe ser un número entero')
        .min(1, 'El límite debe ser al menos 1')
        .max(100, 'El límite no puede exceder 100')
        .default(10)
});

export const usernameParamSchema = yup.object().shape({
    username: yup.string()
        .min(4, 'El usuario debe tener al menos 4 caracteres')
        .max(20, 'El usuario no puede exceder 20 caracteres')
        .matches(/^[a-z0-9_]+$/, 'Solo letras minúsculas, números y guiones bajos')
        .required('El nombre de usuario es requerido')
        .transform(value => value.toLowerCase())
});

export const cedulaParamSchema = yup.object().shape({
    cedula: yup.string()
        .required('La cédula es requerida')
        .matches(/^([VvEe]-)?\d{6,9}$/, 'Formato de cédula inválido')
});