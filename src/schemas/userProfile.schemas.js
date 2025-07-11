import * as yup from 'yup';

// Esquema base para campos con visibilidad
const fieldSchema = (schema) => yup.object().shape({
  value: schema,
  isPublic: yup.boolean().default(true)
});

// Esquema para objetos de experiencia laboral (sin isPublic individual)
const experienceItemSchema = yup.object().shape({
  _id: yup.string().optional(),
  position: yup.string().required('El puesto es requerido'),
  company: yup.string().required('La empresa es requerida'),
  startDate: yup.date()
    .required('La fecha de inicio es requerida')
    .typeError('Formato de fecha de inicio inválido'),
  endDate: yup.date()
    .nullable()
    .when('current', {
      is: true,
      then: (schema) => schema.nullable(),
      otherwise: (schema) => schema
        .min(yup.ref('startDate'), 'La fecha de fin debe ser posterior a la de inicio')
        .nullable()
    }),
  current: yup.boolean().default(false),
  description: yup.string().nullable()
});

// Esquema para objetos de educación (sin isPublic individual)
const educationItemSchema = yup.object().shape({
  _id: yup.string().optional(),
  institution: yup.string().required('La institución es requerida'),
  degree: yup.string().nullable(),
  fieldOfStudy: yup.string().nullable(),
  startYear: yup.number()
    .integer()
    .min(1900, 'El año de inicio es inválido')
    .max(new Date().getFullYear(), 'El año de inicio no puede ser futuro')
    .nullable()
    .typeError('El año de inicio debe ser un número'),
  endYear: yup.number()
    .integer()
    .min(yup.ref('startYear'), 'El año de fin debe ser posterior o igual al de inicio')
    .max(new Date().getFullYear(), 'El año de fin no puede ser futuro')
    .nullable()
    .typeError('El año de fin debe ser un número')
});

// Esquema para objetos de certificación (sin isPublic individual)
const certificationItemSchema = yup.object().shape({
  _id: yup.string().optional(),
  name: yup.string().required('El nombre de la certificación es requerido'),
  issuingOrganization: yup.string().required('La organización emisora es requerida'),
  issueDate: yup.date()
    .nullable()
    .typeError('Formato de fecha de emisión inválido'),
  credentialID: yup.string().nullable(),
  credentialURL: yup.string()
    .url('URL de credencial inválida')
    .nullable()
});

// Esquema para arrays con isPublic global
const arrayWithVisibilitySchema = (itemSchema) => yup.object().shape({
  items: yup.array().of(itemSchema).nullable(),
  isPublic: yup.boolean().default(true)
});

// Esquema para actualización de perfil
export const profileUpdateSchema = yup.object().shape({
  fullName: fieldSchema(
    yup.string()
      .min(5, 'El nombre completo debe tener al menos 5 caracteres')
      .max(100, 'El nombre completo no puede exceder 100 caracteres')
      .transform(value => value ? value.replace(/\s+/g, ' ').trim() : value)
      .nullable()
  ),
  personalData: yup.object().shape({
    birthDate: fieldSchema(yup.date().nullable()),
    location: fieldSchema(yup.string().nullable())
  }).nullable(),
  contact: yup.object().shape({
    phone: fieldSchema(
      yup.string()
        .matches(/^\+?\d{7,15}$|$/, 'Número telefónico inválido')
        .nullable()
    ),
    alternateEmail: fieldSchema(
      yup.string()
        .email('Email alternativo inválido')
        .nullable()
    ),
    website: fieldSchema(
      yup.string()
        .url('URL del sitio web inválida')
        .nullable()
    )
  }).nullable(),
  socialMedia: yup.object().shape({
    instagram: fieldSchema(yup.string().url('URL de Instagram inválida').nullable()),
    facebook: fieldSchema(yup.string().url('URL de Facebook inválida').nullable()),
    linkedin: fieldSchema(yup.string().url('URL de LinkedIn inválida').nullable()),
    x: fieldSchema(yup.string().url('URL de X (Twitter) inválida').nullable()),
    github: fieldSchema(yup.string().url('URL de GitHub inválida').nullable()),
    youtube: fieldSchema(yup.string().url('URL de YouTube inválida').nullable()),
    tiktok: fieldSchema(yup.string().url('URL de TikTok inválida').nullable()),
    whatsapp: fieldSchema(yup.string().nullable()),
    telegram: fieldSchema(yup.string().nullable())
  }).nullable(),
  professional: yup.object().shape({
    title: fieldSchema(yup.string().max(100, 'El título no puede exceder 100 caracteres').nullable()),
    summary: fieldSchema(yup.string().max(2000, 'El resumen no puede exceder 2000 caracteres').nullable()),
    skills: yup.object().shape({
      values: yup.array().of(yup.string().max(50, 'Cada habilidad no puede exceder 50 caracteres')).nullable(),
      isPublic: yup.boolean().default(true)
    }).nullable(),
    interests: yup.object().shape({
      values: yup.array().of(yup.string().max(50, 'Cada interés no puede exceder 50 caracteres')).nullable(),
      isPublic: yup.boolean().default(true)
    }).nullable()
  }).nullable(),
  experience: arrayWithVisibilitySchema(experienceItemSchema).nullable(),
  education: arrayWithVisibilitySchema(educationItemSchema).nullable(),
  certifications: arrayWithVisibilitySchema(certificationItemSchema).nullable()
});