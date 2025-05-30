import express from 'express';
import ForumController from '../controllers/forum.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
// import { forumThreadSchema, forumCommentSchema } from '../schemas/forum.schemas.js';

export default function forumRoutes(fileService) {
    const router = express.Router();
    const forumController = new ForumController(fileService);

    // Configuración de multer para subida de archivos
    const mediaUpload = fileService.getValidationMiddleware('media', {
        maxSize: 50, // 50MB máximo (para videos)
        fileTypes: ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime']
    });

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
     *         multipart/form-data:
     *           schema:
     *             type: object
     *             properties:
     *               title:
     *                 type: string
     *               content:
     *                 type: string
     *               category:
     *                 type: string
     *                 enum: [general, empleos, eventos, carreras, proyectos]
     *               tags:
     *                 type: array
     *                 items:
     *                   type: string
     *               media:
     *                 type: string
     *                 format: binary
     *     responses:
     *       201:
     *         description: Hilo creado exitosamente
     */
    router.post('/threads', authenticate, mediaUpload, forumController.createThread);

    /**
     * @swagger
     * /api/forum/threads:
     *   get:
     *     summary: Obtener lista de hilos
     *     tags: [Foro]
     *     parameters:
     *       - in: query
     *         name: page
     *         schema:
     *           type: integer
     *         description: Número de página
     *       - in: query
     *         name: limit
     *         schema:
     *           type: integer
     *         description: Límite por página
     *       - in: query
     *         name: category
     *         schema:
     *           type: string
     *           enum: [general, empleos, eventos, carreras, proyectos]
     *         description: Filtrar por categoría
     *       - in: query
     *         name: sort
     *         schema:
     *           type: string
     *           enum: [newest, oldest, top]
     *         description: Ordenar por
     *     responses:
     *       200:
     *         description: Lista de hilos
     */
    router.get('/threads', authenticate, forumController.getThreads);

    /**
     * @swagger
     * /api/forum/threads/{threadId}:
     *   get:
     *     summary: Obtener un hilo con comentarios anidados
     *     tags: [Foro]
     *     parameters:
     *       - in: path
     *         name: threadId
     *         required: true
     *         schema:
     *           type: string
     *     responses:
     *       200:
     *         description: Hilo con comentarios anidados
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/ForumThread'
     *             example:
     *               success: true
     *               data:
     *                 title: "Título del hilo"
     *                 content: "Contenido del hilo..."
     *                 comments:
     *                   - content: "Comentario principal"
     *                     replies:
     *                       - content: "Respuesta al comentario"
     *                         replies: []
     */
    router.get('/threads/:threadId', authenticate, forumController.getThreadWithNestedComments);

    /**
     * @swagger
     * /api/forum/threads/{threadId}/comments:
     *   post:
     *     summary: Añadir comentario con multimedia
     *     tags: [Foro]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: threadId
     *         required: true
     *         schema:
     *           type: string
     *     requestBody:
     *       required: true
     *       content:
     *         multipart/form-data:
     *           schema:
     *             type: object
     *             properties:
     *               content:
     *                 type: string
     *               parentCommentId:
     *                 type: string
     *               media:
     *                 type: string
     *                 format: binary
     *     responses:
     *       201:
     *         description: Comentario añadido
     */
    router.post('/threads/:threadId/comments', authenticate, mediaUpload, forumController.addComment);

    /**
     * @swagger
     * /api/forum/like/{type}/{id}:
     *   post:
     *     summary: Dar/quitar like a un hilo o comentario
     *     tags: [Foro]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: type
     *         required: true
     *         schema:
     *           type: string
     *           enum: [thread, comment]
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *     responses:
     *       200:
     *         description: Like actualizado
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 action:
     *                   type: string
     *                   enum: [liked, unliked]
     *                 likeCount:
     *                   type: integer
     *                 isLiked:
     *                   type: boolean
     */
    router.post('/like/:type/:id', authenticate, forumController.toggleLike);

    return router;
}