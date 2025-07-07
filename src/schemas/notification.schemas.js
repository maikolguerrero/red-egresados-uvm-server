import * as yup from 'yup';

// Esquema para IDs de notificación
export const notificationIdSchema = yup.object().shape({
  id: yup.string()
    .matches(/^[0-9a-fA-F]{24}$/, 'ID de notificación inválido')
    .required('ID de notificación es requerido')
});

// Esquema para parámetros de consulta en notificaciones
export const notificationQuerySchema = yup.object().shape({
  page: yup.number()
    .min(1, 'La página debe ser al menos 1')
    .default(1),
  limit: yup.number()
    .min(1, 'El límite debe ser al menos 1')
    .max(100, 'No puedes solicitar más de 100 items')
    .default(20),
  read: yup.boolean()
    .optional(),
  type: yup.string()
    .oneOf(['like', 'mention', 'thread_comment', 'comment_reply', 'thread_activity', undefined])
    .optional()
});

// Esquema para notificaciones masivas a egresados
export const bulkNotificationSchema = yup.object().shape({
  message: yup.string()
    .required('El mensaje es requerido')
    .min(10, 'El mensaje debe tener al menos 10 caracteres')
    .max(500, 'El mensaje no puede exceder los 500 caracteres')
});