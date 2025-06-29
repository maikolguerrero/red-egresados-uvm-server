import * as yup from 'yup';

export const reportSchema = yup.object().shape({
  threadId: yup.string()
    .matches(/^[0-9a-fA-F]{24}$/, 'ID de hilo inválido')
    .required('Se requiere ID de hilo o comentario'),
  commentId: yup.string()
    .matches(/^[0-9a-fA-F]{24}$/, 'ID de comentario inválido')
    .nullable(),
  reason: yup.string()
    .required('La razón del reporte es requerida')
    .oneOf(['spam', 'inappropriate', 'harassment', 'other']),
  description: yup.string().max(500).optional()
});

export const reportsQuerySchema = yup.object().shape({
  status: yup.string()
    .oneOf(['pending', 'resolved', 'rejected', undefined])
    .optional(),
  page: yup.number()
    .min(1, 'La página debe ser al menos 1')
    .default(1),
  limit: yup.number()
    .min(1, 'El límite debe ser al menos 1')
    .max(50, 'No puedes solicitar más de 50 items')
    .default(10)
});

export const reportIdSchema = yup.object().shape({
  reportId: yup.string()
    .matches(/^[0-9a-fA-F]{24}$/, 'ID de reporte inválido')
    .required('ID de reporte es requerido')
});

export const resolveReportSchema = yup.object().shape({
  action: yup.string()
    .required('La acción es requerida')
    .oneOf(
      ['deleted', 'warning', 'no_action', 'banned_user'],
      'Acción inválida. Opciones válidas: deleted, warning, no_action, banned_user'
    ),
  message: yup.string()
    .max(200, 'El mensaje no puede exceder 200 caracteres')
    .optional(),
  severity: yup.string()
    .oneOf(['low', 'medium', 'high'], 'Gravedad inválida')
    .optional(),
  suspensionDuration: yup.number()
    .optional()
});