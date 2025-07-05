import * as yup from 'yup';

// Esquema para objetos de experiencia laboral
const experienceSchema = yup.object().shape({
  _id: yup.string().optional(),
  position: yup.string().required('El puesto es requerido'),
  company: yup.string().required('La empresa es requerida'),
  startDate: yup.date().required('La fecha de inicio es requerida').typeError('Formato de fecha de inicio inválido'), // Añadido typeError
  endDate: yup.date().nullable()
    .when('current', {
      is: true,
      then: (schema) => schema.nullable(), // Correcto: Usa el esquema que se pasa a 'then' o 'otherwise'
      otherwise: (schema) => schema // O puedes simplemente pasar el esquema base
        .min(yup.ref('startDate'), 'La fecha de fin debe ser posterior a la de inicio')
        .nullable()
    }),
  current: yup.boolean().default(false),
  description: yup.string().nullable()
});

// Esquema para objetos de educación
const educationSchema = yup.object().shape({
  _id: yup.string().optional(),
  institution: yup.string().required('La institución es requerida'),
  degree: yup.string().nullable(),
  fieldOfStudy: yup.string().nullable(),
  startYear: yup.number().integer().min(1900, 'El año de inicio es inválido').max(new Date().getFullYear(), 'El año de inicio no puede ser futuro').nullable().typeError('El año de inicio debe ser un número'), // Añadido typeError
  endYear: yup.number()
    .integer()
    .min(yup.ref('startYear'), 'El año de fin debe ser posterior o igual al de inicio') // Corregido el mensaje para incluir "igual"
    .max(new Date().getFullYear(), 'El año de fin no puede ser futuro')
    .nullable()
    .typeError('El año de fin debe ser un número') // Añadido typeError
});

// Esquema para objetos de certificación
const certificationSchema = yup.object().shape({
  _id: yup.string().optional(),
  name: yup.string().required('El nombre de la certificación es requerido'),
  issuingOrganization: yup.string().required('La organización emisora es requerida'),
  issueDate: yup.date().nullable().typeError('Formato de fecha de emisión inválido'), // Añadido typeError
  credentialID: yup.string().nullable(),
  credentialURL: yup.string().url('URL de credencial inválida').nullable()
});

// Esquema para actualización de perfil
export const profileUpdateSchema = yup.object().shape({
  fullName: yup.string()
    .min(5, 'El nombre completo debe tener al menos 5 caracteres')
    .max(100, 'El nombre completo no puede exceder 100 caracteres')
    .transform(value => value ? value.replace(/\s+/g, ' ').trim() : value) // Asegurar que value no sea null/undefined
    .nullable(),
  personalData: yup.object().shape({
    birthDate: yup.date().nullable(),
    location: yup.string().nullable()
  }).nullable(),
  contact: yup.object().shape({
    phone: yup.string()
      .matches(/^\+?\d{7,15}$/, 'Número telefónico inválido')
      .nullable(),
    alternateEmail: yup.string()
      .email('Email alternativo inválido')
      .nullable(),
    website: yup.string()
      .url('URL del sitio web inválida')
      .nullable()
  }).nullable(),
  socialMedia: yup.object().shape({
    instagram: yup.string().url('URL de Instagram inválida').nullable(), // Añadir .url() si esperas URLs
    facebook: yup.string().url('URL de Facebook inválida').nullable(), // Añadir .url() si esperas URLs
    linkedin: yup.string().url('URL de LinkedIn inválida').nullable(),
    x: yup.string().url('URL de X (Twitter) inválida').nullable(), // Añadir .url() si esperas URLs
    github: yup.string().url('URL de GitHub inválida').nullable(),
    youtube: yup.string().url('URL de YouTube inválida').nullable(),
    tiktok: yup.string().url('URL de TikTok inválida').nullable(), // Añadir .url() si esperas URLs
    whatsapp: yup.string().nullable(), // Usar .matches() si esperas un formato específico de número
    telegram: yup.string().nullable() // Puede ser un nombre de usuario o url, definir según se espere
  }).nullable(),
  professional: yup.object().shape({
    title: yup.string().max(100, 'El título no puede exceder 100 caracteres').nullable(),
    summary: yup.string().max(2000, 'El resumen no puede exceder 2000 caracteres').nullable(),
    skills: yup.array().of(yup.string().max(50, 'Cada habilidad no puede exceder 50 caracteres')).nullable(),
    interests: yup.array().of(yup.string().max(50, 'Cada interés no puede exceder 50 caracteres')).nullable()
  }).nullable(),
  experience: yup.array().of(experienceSchema).nullable(),
  education: yup.array().of(educationSchema).nullable(),
  certifications: yup.array().of(certificationSchema).nullable()
});