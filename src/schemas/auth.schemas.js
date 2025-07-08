import * as yup from 'yup';

// Esquema base reutilizable para email
const emailSchema = yup.string()
    .email('Ingrese un email válido')
    .required('El email es requerido')
    .transform(value => value.toLowerCase().trim());

// Esquema base para contraseña (reutilizable)
const passwordSchema = yup.string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    //   .matches(/[A-Z]/, 'Debe contener al menos una mayúscula')
    //   .matches(/[a-z]/, 'Debe contener al menos una minúscula')
    //   .matches(/[0-9]/, 'Debe contener al menos un número')
    .required('La contraseña es requerida');

// Esquema para login
export const loginSchema = yup.object().shape({
    emailOrUsername: yup.string().required('Email o usuario es requerido'),
    password: passwordSchema
});

// Esquema para registro
const usernameSchema = yup.string()
    .min(4, 'El usuario debe tener al menos 4 caracteres')
    .max(20, 'El usuario no puede exceder 20 caracteres')
    .matches(/^[a-z0-9_]+$/, 'Solo letras minúsculas, números y guiones bajos')
    .transform(value => value.toLowerCase())
    .required('El nombre de usuario es requerido');

export const usernameParamSchema = yup.object().shape({
    username: usernameSchema
});

// Esquema para listado de administradores
export const adminListSchema = yup.object().shape({
    // search: yup.string(),
    search: yup.string()
        .transform(value => value ? value.trim() : value)
        .max(100, 'La búsqueda no puede exceder 100 caracteres'),
    isActive: yup.boolean(),
    page: yup.number().min(1).default(1),
    limit: yup.number().min(1).max(100).default(10),
    sort: yup.string().oneOf(['username', 'fullName', 'email', 'lastLogin', 'createdAt']).default('username'),
    order: yup.string().oneOf(['asc', 'desc']).default('asc')
});

// Esquema para registro
const registerSchema = {
    email: emailSchema,
    username: usernameSchema,
    password: passwordSchema
};

// Esquemas para fechas
const dateSchema = yup.date()
    .transform((value, originalValue) => {
        // Convierte strings a Date
        if (originalValue && typeof originalValue === 'string') {
            const date = new Date(originalValue);
            return isNaN(date) ? null : date; // Retorna null si es inválido
        }
        return value;
    })
    .typeError('Debe ser una fecha válida')
    .max(new Date(), 'La fecha no puede ser futura');

// Esquema para registro de egresados
export const alumniRegistrationSchema = yup.object().shape({
    // Datos personales
    cedula: yup.string()
        .matches(/^[VE]-\d+$/, 'Formato cédula inválido (Ej: V-12345678)')
        .required('La cédula es requerida'),
    nombreCompleto: yup.string()
        .min(2, 'El nombre debe tener al menos 2 caracteres')
        .max(100, 'El nombre no puede exceder 100 caracteres')
        .required('El nombre es requerido'),
    // Registro
    ...registerSchema
});

// Esquema para registro de administradores
export const adminRegisterSchema = yup.object().shape({
    ...registerSchema,
    fullName: yup.string()
        .min(5, 'El nombre completo debe tener al menos 5 caracteres')
        .max(100, 'El nombre completo no puede exceder 100 caracteres')
        // .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, 'Solo se permiten letras y espacios')
        .transform(value => value.replace(/\s+/g, ' ').trim())
        .required('El nombre completo es requerido'),
});

// Esquema para email o usuario
const emailOrUsernameSchema = yup.string()
    .required('Email o usuario es requerido')
    .test(
        'email-or-username',
        'Debe ser email válido (usuario@dominio.com) o usuario (4-20 caracteres alfanuméricos)',
        (value) => {
            return emailSchema.isValidSync(value) || usernameSchema.isValidSync(value);
        }
    );

// Esquema para olvido de contraseña
export const forgotPasswordSchema = yup.object().shape({
    emailOrUsername: emailOrUsernameSchema
});

// Esquema para token
const tokenSchema = yup.string()
    .min(10, 'Token de verificación requerido')
    .required('Token de verificación requerido');

// Esquema para restablecimiento de contraseña
export const resetPasswordSchema = yup.object().shape({
    token: tokenSchema,
    newPassword: passwordSchema
});

// Esquema para verificación de email
export const emailVerificationSchema = yup.object().shape({
    token: tokenSchema,
});

// Esquema para reenvío de verificación
export const resendVerificationSchema = yup.object().shape({
    email: yup.string()
        .email('Ingrese un email válido')
        .required('El email es requerido')
});

// Esquema para cambio de email
export const changeEmailSchema = yup.object().shape({
    newEmail: emailSchema,
    currentPassword: passwordSchema
});