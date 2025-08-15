import express from 'express';
import ForumController from '../controllers/forum.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { validate, validateQuery, validateParams } from '../middlewares/validate.middleware.js';
import {
    forumThreadSchema,
    threadUpdateSchema,
    forumCommentSchema,
    commentUpdateSchema,
    threadIdSchema,
    commentIdSchema,
    threadQuerySchema,
    typesSchema,
    idSchema
} from '../schemas/forum.schemas.js';
import {
    reportSchema,
    resolveReportSchema,
    reportIdSchema,
    reportsQuerySchema
} from '../schemas/report.schemas.js';

export default function forumRoutes(fileService, notificationService, emailService) {
    const router = express.Router();
    const forumController = new ForumController(fileService, notificationService, emailService);

    /**
     * @swagger
     * /api/forum/threads:
     *   post:
     *     summary: Crear nuevo hilo de discusión con multimedia
     *     tags: [Foro]
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/ThreadRequest'
     *     responses:
     *       201:
     *         description: Hilo creado exitosamente
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/ForumThread'
     *       400:
     *         $ref: '#/components/responses/ValidationError'
     *       401:
     *         $ref: '#/components/responses/UnauthorizedError'
     *       500:
     *         $ref: '#/components/responses/ServerError'
     */
    router.post('/threads',
        authenticate,
        validate(forumThreadSchema),
        fileService.getValidationMiddleware('media', { maxSize: 50 }),
        forumController.createThread
    );

    /**
     * @swagger
     * /api/forum/threads/{threadId}/media/images:
     *   post:
     *     summary: Añadir imagen a un hilo existente
     *     tags: [Foro]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - $ref: '#/components/parameters/threadId'
     *     requestBody:
     *       required: true
     *       content:
     *         multipart/form-data:
     *           schema:
     *             type: object
     *             properties:
     *               image:
     *                 type: string
     *                 format: binary
     *     responses:
     *       201:
     *         description: Imagen añadida exitosamente
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/ForumImage'
     *       400:
     *         $ref: '#/components/responses/ValidationError'
     *       401:
     *         $ref: '#/components/responses/UnauthorizedError'
     *       403:
     *         $ref: '#/components/responses/ForbiddenError'
     *       404:
     *         $ref: '#/components/responses/ThreadNotFound'
     *       413:
     *         description: Archivo demasiado grande (máx 10MB)
     */
    router.post(
        '/threads/:threadId/media/images',
        authenticate,
        validateParams(threadIdSchema),
        fileService.getValidationMiddleware('image', { maxSize: 10 }),
        forumController.addThreadImage
    );

    /**
     * @swagger
     * /api/forum/threads/{threadId}/media/videos:
     *   post:
     *     summary: Añadir video a un hilo existente
     *     tags: [Foro]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - $ref: '#/components/parameters/threadId'
     *     requestBody:
     *       required: true
     *       content:
     *         multipart/form-data:
     *           schema:
     *             type: object
     *             properties:
     *               video:
     *                 type: string
     *                 format: binary
     *     responses:
     *       201:
     *         description: Video añadido exitosamente
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/ForumVideo'
     *       400:
     *         $ref: '#/components/responses/ValidationError'
     *       401:
     *         $ref: '#/components/responses/UnauthorizedError'
     *       403:
     *         $ref: '#/components/responses/ForbiddenError'
     *       404:
     *         $ref: '#/components/responses/ThreadNotFound'
     *       413:
     *         description: Archivo demasiado grande (máx 50MB)
     */
    router.post(
        '/threads/:threadId/media/videos',
        authenticate,
        validateParams(threadIdSchema),
        fileService.getValidationMiddleware('video', { maxSize: 50 }),
        forumController.addThreadVideo
    );

    /**
    * @swagger
    * /api/forum/threads/{threadId}/media/images/{imageId}:
    *   delete:
    *     summary: Eliminar imagen de un hilo
    *     tags: [Foro]
    *     security:
    *       - bearerAuth: []
    *     parameters:
    *       - $ref: '#/components/parameters/threadId'
    *       - $ref: '#/components/parameters/mediaId'
    *     responses:
    *       200:
    *         description: Imagen eliminada exitosamente
    *         content:
    *           application/json:
    *             schema:
    *               type: object
    *               properties:
    *                 success:
    *                   type: boolean
    *                 message:
    *                   type: string
    *                 data:
    *                   type: object
    *                   properties:
    *                     deletedImageId:
    *                       type: string
    *                     remainingMedia:
    *                       type: integer
    *       401:
    *         $ref: '#/components/responses/UnauthorizedError'
    *       403:
    *         $ref: '#/components/responses/ForbiddenError'
    *       404:
    *         oneOf:
    *           - $ref: '#/components/responses/ThreadNotFound'
    *           - $ref: '#/components/responses/MediaNotFound'
    */
    router.delete(
        '/threads/:threadId/media/images/:imageId',
        authenticate,
        validateParams(threadIdSchema),
        forumController.removeThreadImage
    );

    /**
    * @swagger
    * /api/forum/threads/{threadId}/media/videos/{videoId}:
    *   delete:
    *     summary: Eliminar video de un hilo
    *     tags: [Foro]
    *     security:
    *       - bearerAuth: []
    *     parameters:
    *       - $ref: '#/components/parameters/threadId'
    *       - $ref: '#/components/parameters/mediaId'
    *     responses:
    *       200:
    *         description: Video eliminado exitosamente
    *         content:
    *           application/json:
    *             schema:
    *               type: object
    *               properties:
    *                 success:
    *                   type: boolean
    *                 message:
    *                   type: string
    *                 data:
    *                   type: object
    *                   properties:
    *                     deletedVideoId:
    *                       type: string
    *                     remainingMedia:
    *                       type: integer
    *       401:
    *         $ref: '#/components/responses/UnauthorizedError'
    *       403:
    *         $ref: '#/components/responses/ForbiddenError'
    *       404:
    *         oneOf:
    *           - $ref: '#/components/responses/ThreadNotFound'
    *           - $ref: '#/components/responses/MediaNotFound'
    */
    router.delete(
        '/threads/:threadId/media/videos/:videoId',
        authenticate,
        validateParams(threadIdSchema),
        forumController.removeThreadVideo
    );

    /**
     * @swagger
     * /api/forum/threads:
     *   get:
     *     summary: Obtener lista de hilos con paginación
     *     tags: [Foro]
     *     parameters:
     *       - $ref: '#/components/parameters/pageQuery'
     *       - $ref: '#/components/parameters/limitQuery'
     *       - in: query
     *         name: category
     *         schema:
     *           type: string
     *           enum: [general, empleos, eventos, carreras, proyectos]
     *       - in: query
     *         name: tags
     *         description: Tags para filtrar (separados por comas). Coincide parcialmente y es case-insensitive.
     *         schema:
     *           type: string
     *           example: "tecnologia,empleo"
     *       - in: query
     *         name: tagMatch
     *         description: Tipo de coincidencia para los tags (any = al menos un tag, all = todos los tags)
     *         schema:
     *           type: string
     *           enum: [any, all]
     *           default: any
     *       - in: query
     *         name: search
     *         schema:
     *           type: string
     *       - in: query
     *         name: sort
     *         schema:
     *           type: string
     *           enum: [newest, oldest, likes, popular]
     *           default: newest
     *       - in: query
     *         name: sortDirection
     *         schema:
     *           type: string
     *           enum: [asc, desc]
     *           default: desc
     *     responses:
     *       200:
     *         description: Lista paginada de hilos
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 data:
     *                   type: array
     *                   items:
     *                     $ref: '#/components/schemas/ForumThread'
     *                 pagination:
     *                   $ref: '#/components/schemas/Pagination'
     */
    router.get('/threads', authenticate, validateQuery(threadQuerySchema), forumController.getThreads);

    /**
     * @swagger
     * /api/forum/threads/{threadId}:
     *   get:
     *     summary: Obtener hilo con sus comentarios
     *     tags: [Foro]
     *     parameters:
     *       - $ref: '#/components/parameters/threadId'
     *     responses:
     *       200:
     *         description: Hilo completo con metadatos
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 id:
     *                   $ref: '#/components/schemas/ForumThread/properties/id'
     *                 title:
     *                   $ref: '#/components/schemas/ForumThread/properties/title'
     *                 commentCount:
     *                   $ref: '#/components/schemas/ForumThread/properties/commentCount'
     *                 comments:
     *                   type: array
     *                   items:
     *                     $ref: '#/components/schemas/ForumComment'
     *       404:
     *         description: Hilo no encontrado
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/ErrorResponse'
     */
    router.get('/threads/:threadId',
        authenticate,
        validateParams(threadIdSchema),
        forumController.getThreadWithComments
    );

    /**
     * @swagger
     * /api/forum/threads/{threadId}/comments:
     *   post:
     *     summary: Añadir comentario a un hilo
     *     tags: [Foro]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - $ref: '#/components/parameters/threadId'
     *     requestBody:
     *       required: true
     *       content:
     *         multipart/form-data:
     *           schema:
     *             $ref: '#/components/schemas/CommentRequest'
     *     responses:
     *       201:
     *         description: Comentario añadido exitosamente
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/ForumComment'
     *       400:
     *         $ref: '#/components/responses/ValidationError'
     *       401:
     *         $ref: '#/components/responses/UnauthorizedError'
     *       404:
     *         $ref: '#/components/responses/ThreadNotFound'
     */
    router.post('/threads/:threadId/comments',
        authenticate,
        validateParams(threadIdSchema),
        fileService.getValidationMiddleware('media', { maxSize: 50 }),
        validate(forumCommentSchema),
        forumController.addComment
    );

    /**
     * @swagger
     * /api/forum/like/{type}/{id}:
     *   post:
     *     summary: Dar/quitar like a un hilo o comentario
     *     tags: [Foro]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - $ref: '#/components/parameters/likeType'
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *           format: mongo-id
     *     responses:
     *       200:
     *         description: Like actualizado
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/LikeResponse'
     *       400:
     *         $ref: '#/components/responses/ValidationError'
     *       401:
     *         $ref: '#/components/responses/UnauthorizedError'
     *       404:
     *         oneOf:
     *           - $ref: '#/components/responses/ThreadNotFound'
     *           - $ref: '#/components/responses/CommentNotFound'
     */
    router.post('/like/:type/:id',
        authenticate,
        validateParams(typesSchema),
        validateParams(idSchema),
        forumController.toggleLike
    );

    /**
     * @swagger
     * /api/forum/threads/{threadId}:
     *   patch:
     *     summary: Actualizar parcialmente un hilo (solo creador)
     *     description: Actualiza campos específicos de un hilo. Solo el creador puede actualizarlo.
     *     tags: [Foro]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - $ref: '#/components/parameters/threadId'
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/ThreadUpdate'
     *     responses:
     *       200:
     *         description: Hilo actualizado exitosamente
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/ForumThread'
     *       400:
     *         $ref: '#/components/responses/ValidationError'
     *       401:
     *         $ref: '#/components/responses/UnauthorizedError'
     *       403:
     *         $ref: '#/components/responses/ForbiddenError'
     *       404:
     *         $ref: '#/components/responses/ThreadNotFound'
     */
    router.patch(
        '/threads/:threadId',
        authenticate,
        validateParams(threadIdSchema),
        validate(threadUpdateSchema),
        forumController.updateThread
    );

    /**
     * @swagger
     * /api/forum/threads/{threadId}:
     *   delete:
     *     summary: Eliminar un hilo (creador o admin)
     *     description: Elimina un hilo y todos sus comentarios y medios asociados
     *     tags: [Foro]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - $ref: '#/components/parameters/threadId'
     *     responses:
     *       200:
     *         description: Hilo eliminado exitosamente
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 success:
     *                   type: boolean
     *                 message:
     *                   type: string
     *                 data:
     *                   type: object
     *                   properties:
     *                     threadId:
     *                       type: string
     *                     deletions:
     *                       type: object
     *                       properties:
     *                         threadMedia:
     *                           type: object
     *                           properties:
     *                             attempted:
     *                               type: integer
     *                             succeeded:
     *                               type: integer
     *                         commentMedia:
     *                           type: object
     *                           properties:
     *                             attempted:
     *                               type: integer
     *                             succeeded:
     *                               type: integer
     *                         comments:
     *                           type: integer
     *       401:
     *         $ref: '#/components/responses/UnauthorizedError'
     *       403:
     *         $ref: '#/components/responses/ForbiddenError'
     *       404:
     *         $ref: '#/components/responses/ThreadNotFound'
     */
    router.delete(
        '/threads/:threadId',
        authenticate,
        validateParams(threadIdSchema),
        forumController.deleteThread
    );

    /**
     * @swagger
     * /api/forum/comments/{commentId}:
     *   patch:
     *     summary: Actualizar un comentario (solo el autor)
     *     tags: [Foro]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - $ref: '#/components/parameters/commentId'
     *     requestBody:
     *       required: true
     *       content:
     *         multipart/form-data:
     *           schema:
     *             $ref: '#/components/schemas/CommentUpdate'
     *     responses:
     *       200:
     *         description: Comentario actualizado exitosamente
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/ForumComment'
     *       400:
     *         $ref: '#/components/responses/ValidationError'
     *       401:
     *         $ref: '#/components/responses/UnauthorizedError'
     *       403:
     *         $ref: '#/components/responses/ForbiddenError'
     *       404:
     *         $ref: '#/components/responses/CommentNotFound'
        */
    router.patch(
        '/comments/:commentId',
        authenticate,
        validateParams(commentIdSchema),
        validate(commentUpdateSchema),
        fileService.getValidationMiddleware('media', { maxSize: 50 }),
        forumController.updateComment
    );

    /**
     * @swagger
     * /api/forum/comments/{commentId}:
     *   delete:
     *     summary: Eliminar un comentario (autor o admin)
     *     tags: [Foro]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: commentId
     *         required: true
     *         schema:
     *           type: string
     *     responses:
     *       200:
     *         description: Comentario eliminado
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 success:
     *                   type: boolean
     *                 message:
     *                   type: string
     *                 data:
     *                   type: object
     *                   properties:
     *                     commentId:
     *                       type: string
     *                     deletedMediaCount:
     *                       type: integer
     *       403:
     *         description: No autorizado
     *       404:
     *         description: Comentario no encontrado
     */
    router.delete(
        '/comments/:commentId',
        authenticate,
        validateParams(commentIdSchema),
        forumController.deleteComment
    );

    /**
     * @swagger
     * /api/forum/report:
     *   post:
     *     summary: Reportar un hilo o comentario
     *     description: Permite a los usuarios reportar contenido inapropiado
     *     tags: [Foro]
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/ReportRequest'
     *     responses:
     *       201:
     *         description: Reporte creado exitosamente
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/ForumReport'
     *       400:
     *         description: Error de validación
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/ErrorResponse'
     *       401:
     *         $ref: '#/components/responses/UnauthorizedError'
     *       404:
     *         description: Contenido no encontrado
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/ErrorResponse'
     */
    router.post('/report',
        authenticate,
        validate(reportSchema),
        forumController.createReport
    );

    /**
     * @swagger
     * /api/forum/reports:
     *   get:
     *     summary: Obtener lista de reportes (Admin)
     *     description: Retorna una lista paginada de reportes. Solo para administradores.
     *     tags: [Foro]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - $ref: '#/components/parameters/pageQuery'
     *       - $ref: '#/components/parameters/limitQuery'
     *       - $ref: '#/components/parameters/reportStatus'
     *     responses:
     *       200:
     *         description: Lista de reportes
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/ReportListResponse'
     *       401:
     *         $ref: '#/components/responses/UnauthorizedError'
     *       403:
     *         $ref: '#/components/responses/ForbiddenError'
     */
    router.get('/reports',
        authenticate,
        authorize('admin', 'superadmin'),
        validateQuery(reportsQuerySchema),
        forumController.getReports
    );

    /**
     * @swagger
     * /api/forum/reports/{reportId}:
     *   get:
     *     summary: Obtener un reporte por ID (Admin)
     *     description: Retorna los detalles de un reporte específico. Solo para administradores.
     *     tags: [Foro]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - $ref: '#/components/parameters/reportId'
     *     responses:
     *       200:
     *         description: Detalles del reporte
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/ForumReport'
     *       401:
     *         $ref: '#/components/responses/UnauthorizedError'
     *       403:
     *         $ref: '#/components/responses/ForbiddenError'
     *       404:
     *         $ref: '#/components/responses/ReportNotFound'
     */
    router.get('/reports/:reportId',
        authenticate,
        authorize('admin', 'superadmin'),
        validateParams(reportIdSchema),
        forumController.getReportById
    );

    /**
     * @swagger
     * /api/forum/reports/{reportId}/resolve:
     *   patch:
     *     summary: Resolver un reporte (Admin)
     *     description: Permite a los administradores marcar un reporte como resuelto y tomar acción.
     *     tags: [Foro]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - $ref: '#/components/parameters/reportId'
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/ResolveReportRequest'
     *     responses:
     *       200:
     *         description: Reporte resuelto exitosamente
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/ForumReport'
     *       400:
     *         description: Error de validación o reporte ya resuelto
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/ErrorResponse'
     *       401:
     *         $ref: '#/components/responses/UnauthorizedError'
     *       403:
     *         $ref: '#/components/responses/ForbiddenError'
     *       404:
     *         $ref: '#/components/responses/ReportNotFound'
     */
    router.patch('/reports/:reportId/resolve',
        authenticate,
        authorize('admin', 'superadmin'),
        validateParams(reportIdSchema),
        validate(resolveReportSchema),
        forumController.resolveReport
    );

    /**
     * @swagger
     * /api/forum/reports/{reportId}:
     *   delete:
     *     summary: Eliminar un reporte (Admin)
     *     description: Elimina un reporte que no esté en estado 'pending'. Solo para administradores.
     *     tags: [Foro]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - $ref: '#/components/parameters/reportId'
     *     responses:
     *       200:
     *         description: Reporte eliminado exitosamente
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 success:
     *                   type: boolean
     *                 message:
     *                   type: string
     *                 data:
     *                   $ref: '#/components/schemas/ForumReport'
     *       400:
     *         description: No se puede eliminar un reporte pendiente
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/ErrorResponse'
     *       401:
     *         $ref: '#/components/responses/UnauthorizedError'
     *       403:
     *         $ref: '#/components/responses/ForbiddenError'
     *       404:
     *         $ref: '#/components/responses/ReportNotFound'
     */
    router.delete('/reports/:reportId',
        authenticate,
        authorize('admin', 'superadmin'),
        validateParams(reportIdSchema),
        forumController.deleteReport
    );

    /**
     * @swagger
     * /api/forum/reports/cleanup:
     *   delete:
     *     summary: Eliminar reportes no pendientes (Admin)
     *     description: Elimina todos los reportes que no estén en estado 'pending'. Solo para administradores.
     *     tags: [Foro]
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: Reportes eliminados exitosamente
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 success:
     *                   type: boolean
     *                 data:
     *                   type: object
     *                   properties:
     *                     deletedCount:
     *                       type: integer
     *                 message:
     *                   type: string
     *       401:
     *         $ref: '#/components/responses/UnauthorizedError'
     *       403:
     *         $ref: '#/components/responses/ForbiddenError'
     */
    router.delete('/reports/cleanup',
        authenticate,
        authorize('admin', 'superadmin'),
        forumController.deleteNonPendingReports
    );

    return router;
}