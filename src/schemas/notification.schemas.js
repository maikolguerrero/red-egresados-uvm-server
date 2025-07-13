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
    .oneOf([
      'like',
      'mention',
      'thread_mention',
      'thread_comment',
      'comment_reply',
      'thread_activity',
      'event_reminder',
      'project_join_request',
      'project_request_update',
      'new_report',
      'report_resolved',
      'user_warning',
      'system',
      undefined
    ])
    .optional()
});

// Esquema para notificaciones masivas a egresados
export const bulkNotificationSchema = yup.object().shape({
  message: yup.string()
    .required('El mensaje es requerido')
    .min(1, 'El mensaje debe tener al menos 1 caracteres')
    .max(2000, 'El mensaje no puede exceder los 2000 caracteres')
});