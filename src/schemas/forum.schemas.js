import * as yup from 'yup';

// Esquema para hilos del foro
export const forumThreadSchema = yup.object().shape({
  title: yup.string()
    .required('El título es requerido')
    .min(5, 'El título debe tener al menos 5 caracteres')
    .max(200, 'El título no puede exceder 200 caracteres')
    .trim(),
  content: yup.string()
    .required('El contenido es requerido')
    .min(10, 'El contenido debe tener al menos 10 caracteres')
    .max(5000, 'El contenido no puede exceder 5000 caracteres')
    .trim(),
  category: yup.string()
    .required('La categoría es requerida')
    .oneOf(
      ['general', 'empleos', 'eventos', 'carreras', 'proyectos'],
      'Categoría inválida. Opciones válidas: general, empleos, eventos, carreras, proyectos'
    ),
  tags: yup.array()
    .of(
      yup.string()
        .min(2, 'Cada tag debe tener al menos 2 caracteres')
        .max(20, 'Cada tag no puede exceder 20 caracteres')
        .matches(/^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ\s]+$/, 'Los tags solo pueden contener letras, números y espacios')
    )
    .max(5, 'Máximo 5 tags permitidos')
});

// Esquema para actualización de hilos
export const threadUpdateSchema = yup.object().shape({
  title: yup.string()
    .min(5, 'El título debe tener al menos 5 caracteres')
    .max(200, 'El título no puede exceder 200 caracteres')
    .trim()
    .optional(),
  content: yup.string()
    .min(10, 'El contenido debe tener al menos 10 caracteres')
    .max(5000, 'El contenido no puede exceder 5000 caracteres')
    .trim()
    .optional(),
  category: yup.string()
    .oneOf(
      ['general', 'empleos', 'eventos', 'carreras', 'proyectos'],
      'Categoría inválida'
    )
    .optional(),
  tags: yup.array()
    .of(
      yup.string()
        .min(2, 'Cada tag debe tener al menos 2 caracteres')
        .max(20, 'Cada tag no puede exceder 20 caracteres')
    )
    .max(5, 'Máximo 5 tags permitidos')
    .optional()
});

// Esquema para comentarios
export const forumCommentSchema = yup.object().shape({
  content: yup.string()
    .min(1, 'El contenido debe tener al menos 1 caracter')
    .max(2000, 'El contenido no puede exceder 2000 caracteres')
    .trim()
    .required('El contenido es requerido'),
  parentCommentId: yup.string()
    .matches(/^[0-9a-fA-F]{24}$/, 'ID de comentario inválido')
    .nullable()
    .optional(),
});

// Esquema para actualización de comentarios
export const commentUpdateSchema = yup.object().shape({
  content: yup.string()
    .min(1, 'El contenido debe tener al menos 1 caracter')
    .max(2000, 'El contenido no puede exceder 2000 caracteres')
    .trim()
    .optional()
});

// Esquemas para IDs
export const threadIdSchema = yup.object().shape({
  threadId: yup.string()
    .matches(/^[0-9a-fA-F]{24}$/, 'ID de hilo inválido')
    .required('ID de hilo es requerido')
});

export const commentIdSchema = yup.object().shape({
  commentId: yup.string()
    .matches(/^[0-9a-fA-F]{24}$/, 'ID de comentario inválido')
    .required('ID de comentario es requerido')
});

export const mediaIdSchema = yup.object().shape({
  commentId: yup.string()
    .matches(/^[0-9a-fA-F]{24}$/, 'ID de comentario inválido')
    .required('ID de comentario es requerido')
});

export const idSchema = yup.object().shape({
  id: yup.string()
    .matches(/^[0-9a-fA-F]{24}$/, 'ID de comentario inválido')
    .required('ID de comentario es requerido')
});

export const typesSchema = yup.object().shape({
  type: yup.string()
    .oneOf(['thread', 'comment'], 'Tipo inválido')
    .required('Tipo es requerido')
});

// Esquema para búsqueda/filtrado de hilos
export const threadQuerySchema = yup.object().shape({
  page: yup.number()
    .min(1, 'La página debe ser al menos 1')
    .default(1),
  limit: yup.number()
    .min(1, 'El límite debe ser al menos 1')
    .max(50, 'No puedes solicitar más de 50 items')
    .default(10),
  category: yup.string()
    .oneOf(['general', 'empleos', 'eventos', 'carreras', 'proyectos', undefined]),
  tags: yup.string()
    .min(2, 'Cada tag debe tener al menos 2 caracteres')
    .optional(),
  tagMatch: yup.string()
    .oneOf(['all', 'any', undefined])
    .default('any'),
  search: yup.string()
    .max(100, 'La búsqueda no puede exceder 100 caracteres'),
  sort: yup.string()
    .oneOf(['newest', 'oldest', 'likes', 'popular', undefined]),
    username: yup.string()
    .max(20, 'El nombre de usuario no puede exceder 20 caracteres')
    .optional()
});