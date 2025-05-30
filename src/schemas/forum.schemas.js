import * as yup from 'yup';

export const forumThreadSchema = yup.object().shape({
  title: yup.string()
    .required('El título es requerido')
    .max(200, 'Máximo 200 caracteres'),
  content: yup.string()
    .required('El contenido es requerido')
    .max(5000, 'Máximo 5000 caracteres'),
  category: yup.string()
    .required('La categoría es requerida')
    .oneOf(['general', 'empleos', 'eventos', 'carreras', 'proyectos'], 'Categoría inválida'),
  tags: yup.array()
    .of(yup.string().max(20, 'Máximo 20 caracteres por tag'))
    .max(5, 'Máximo 5 tags')
});

export const forumCommentSchema = yup.object().shape({
  content: yup.string()
    .required('El contenido es requerido')
    .max(2000, 'Máximo 2000 caracteres'),
  parentCommentId: yup.string()
    .matches(/^[0-9a-fA-F]{24}$/, 'ID de comentario inválido')
    .nullable()
});