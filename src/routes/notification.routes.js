import express from 'express';
import NotificationController from '../controllers/notification.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { validateQuery, validateParams } from '../middlewares/validate.middleware.js';
import { notificationQuerySchema, notificationIdSchema } from '../schemas/notification.schemas.js';

export default function notificationRoutes() {
    const router = express.Router();
    const controller = new NotificationController();

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

    return router;
}