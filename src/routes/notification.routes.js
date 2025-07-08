import express from 'express';
import NotificationController from '../controllers/notification.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { validateQuery, validateParams, validate } from '../middlewares/validate.middleware.js';
import { notificationQuerySchema, notificationIdSchema, bulkNotificationSchema } from '../schemas/notification.schemas.js';

export default function notificationRoutes(notificationService) {
    const router = express.Router();
    const controller = new NotificationController(notificationService);

    /**
     * @swagger
     * /api/notifications:
     *   get:
     *     summary: Obtener notificaciones del usuario
     *     description: Retorna una lista paginada de notificaciones para el usuario autenticado
     *     tags: [Notificaciones]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - $ref: '#/components/parameters/pageQuery'
     *       - $ref: '#/components/parameters/limitQuery'
     *       - in: query
     *         name: read
     *         schema:
     *           type: boolean
     *         description: Filtrar por notificaciones leídas/no leídas
     *       - in: query
     *         name: type
     *         schema:
     *           type: string
     *           enum: [like, mention, thread_comment, comment_reply, thread_activity]
     *         description: Filtrar por tipo de notificación
     *     responses:
     *       200:
     *         description: Lista de notificaciones
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/NotificationListResponse'
     *       401:
     *         $ref: '#/components/responses/UnauthorizedError'
     *       500:
     *         $ref: '#/components/responses/ServerError'
     */
    router.get('/',
        authenticate,
        validateQuery(notificationQuerySchema),
        controller.getNotifications
    );

    /**
     * @swagger
     * /api/notifications/{id}/read:
     *   patch:
     *     summary: Marcar notificación como leída
     *     description: Actualiza el estado de una notificación a "leída"
     *     tags: [Notificaciones]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *           format: mongo-id
     *         description: ID de la notificación a marcar como leída
     *     responses:
     *       200:
     *         description: Notificación actualizada
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/NotificationUpdateResponse'
     *       401:
     *         $ref: '#/components/responses/UnauthorizedError'
     *       404:
     *         description: Notificación no encontrada
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/ErrorResponse'
     *             example:
     *               success: false
     *               error:
     *                 code: "NOTIFICATION_404"
     *                 message: "Notificación no encontrada"
     *       500:
     *         $ref: '#/components/responses/ServerError'
     */
    router.patch(
        '/:id/read',
        authenticate,
        validateParams(notificationIdSchema),
        controller.markAsRead
    );

    /**
     * @swagger
     * /api/notifications/{id}:
     *   delete:
     *     summary: Eliminar notificación
     *     description: Elimina permanentemente una notificación
     *     tags: [Notificaciones]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *           format: mongo-id
     *         description: ID de la notificación a eliminar
     *     responses:
     *       200:
     *         description: Notificación eliminada
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/NotificationDeleteResponse'
     *       401:
     *         $ref: '#/components/responses/UnauthorizedError'
     *       404:
     *         description: Notificación no encontrada
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/ErrorResponse'
     *       500:
     *         $ref: '#/components/responses/ServerError'
     */
    router.delete(
        '/:id',
        authenticate,
        validateParams(notificationIdSchema),
        controller.deleteNotification
    );

    /**
     * @swagger
     * /api/notifications/unread-count:
     *   get:
     *     summary: Obtener conteo de notificaciones no leídas
     *     description: Retorna el número de notificaciones no leídas para el usuario autenticado
     *     tags: [Notificaciones]
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: Conteo de notificaciones no leídas
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 success:
     *                   type: boolean
     *                   example: true
     *                 count:
     *                   type: integer
     *                   description: Número de notificaciones no leídas
     *                   example: 5
     *       401:
     *         $ref: '#/components/responses/UnauthorizedError'
     *       500:
     *         $ref: '#/components/responses/ServerError'
     */
    router.get('/unread-count', authenticate, controller.getUnreadCount);

    /**
     * @swagger
     * /api/notifications/bulk/graduates:
     *   post:
     *     summary: Enviar notificación a todos los egresados
     *     description: Permite a los administradores enviar una notificación del sistema a todos los usuarios egresados
     *     tags: [Notificaciones]
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - message
     *             properties:
     *               message:
     *                 type: string
     *                 minLength: 10
     *                 maxLength: 500
     *                 example: "Estimados egresados, les informamos sobre nuevos eventos disponibles..."
     *                 description: Mensaje de la notificación (10-500 caracteres)
     *     responses:
     *       200:
     *         description: Notificación enviada exitosamente a los egresados
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 success:
     *                   type: boolean
     *                   example: true
     *                 data:
     *                   type: object
     *                   properties:
     *                     success:
     *                       type: boolean
     *                       example: true
     *                     message:
     *                       type: string
     *                       example: "Notificación enviada a 250 egresados"
     *                     totalSent:
     *                       type: integer
     *                       example: 250
     *       400:
     *         description: Error de validación en el cuerpo de la solicitud
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/ErrorResponse'
     *             example:
     *               success: false
     *               error:
     *                 code: "VALIDATION_ERROR"
     *                 message: "El mensaje debe tener al menos 10 caracteres"
     *       401:
     *         $ref: '#/components/responses/UnauthorizedError'
     *       403:
     *         description: Acceso prohibido (solo para administradores)
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/ErrorResponse'
     *             example:
     *               success: false
     *               error:
     *                 code: "UNAUTHORIZED_ROLE"
     *                 message: "No tienes acceso a este recurso"
     *       500:
     *         $ref: '#/components/responses/ServerError'
     */
    router.post(
        '/bulk/graduates',
        authenticate,
        authorize('admin', 'superadmin'),
        validate(bulkNotificationSchema),
        controller.sendBulkNotificationToGraduates
    );
    return router;
}