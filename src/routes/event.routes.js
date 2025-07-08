import express from 'express';
import EventController from '../controllers/event.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { validate, validateQuery, validateParams } from '../middlewares/validate.middleware.js';
import { eventCreateSchema, eventUpdateSchema, eventQuerySchema, eventIdSchema } from '../schemas/event.schemas.js';

export default function eventRoutes(fileService) {
    const router = express.Router();
    const eventController = new EventController(fileService);

    /**
     * @swagger
     * /api/events:
     *   post:
     *     summary: Crear un nuevo evento
     *     description: Crea un nuevo evento con los datos proporcionados
     *     tags: [Eventos]
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/EventRequest'
     *     responses:
     *       201:
     *         $ref: '#/components/responses/EventSuccess'
     *       400:
     *         $ref: '#/components/responses/ValidationError'
     *       401:
     *         $ref: '#/components/responses/UnauthorizedError'
     *       403:
     *         $ref: '#/components/responses/ForbiddenError'
     *       500:
     *         $ref: '#/components/responses/ServerError'
     */
    router.post('/',
        authenticate,
        authorize('admin', 'superadmin'),
        validate(eventCreateSchema),
        eventController.createEvent);

    /**
     * @swagger
     * /api/events:
     *   get:
     *     summary: Listar eventos
     *     description: Obtiene una lista paginada de eventos con filtros opcionales
     *     tags: [Eventos]
     *     parameters:
     *       - $ref: '#/components/parameters/pageQuery'
     *       - $ref: '#/components/parameters/limitQuery'
     *       - in: query
     *         name: type
     *         schema:
     *           type: string
     *           enum: [conferencia, taller, seminario, social, networking, otros]
     *         description: Tipo de evento a filtrar
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
     *         description: Búsqueda textual en título y descripción
     *       - in: query
     *         name: sort
     *         schema:
     *           type: string
     *           enum: [startDate, createdAt]
     *           default: createdAt
     *         description: Campo por el que ordenar los eventos
     *     responses:
     *       200:
     *         $ref: '#/components/responses/EventListSuccess'
     *       400:
     *         $ref: '#/components/responses/ValidationError'
     *       500:
     *         $ref: '#/components/responses/ServerError'
     */
    router.get('/', authenticate, validateQuery(eventQuerySchema), eventController.getEvents);

    /**
     * @swagger
     * /api/events/{id}:
     *   get:
     *     summary: Obtener detalles de un evento
     *     description: Obtiene todos los detalles de un evento específico
     *     tags: [Eventos]
     *     parameters:
     *       - $ref: '#/components/parameters/eventId'
     *     responses:
     *       200:
     *         $ref: '#/components/responses/EventSuccess'
     *       404:
     *         $ref: '#/components/responses/EventNotFound'
     *       500:
     *         $ref: '#/components/responses/ServerError'
     */
    router.get('/:id', authenticate, validateParams(eventIdSchema), eventController.getEventById);

    /**
     * @swagger
     * /api/events/{id}:
     *   patch:
     *     summary: Actualizar evento
     *     description: Actualiza los datos de un evento existente
     *     tags: [Eventos]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - $ref: '#/components/parameters/eventId'
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/EventUpdateRequest'
     *     responses:
     *       200:
     *         $ref: '#/components/responses/EventSuccess'
     *       400:
     *         $ref: '#/components/responses/ValidationError'
     *       401:
     *         $ref: '#/components/responses/UnauthorizedError'
     *       403:
     *         $ref: '#/components/responses/ForbiddenError'
     *       404:
     *         $ref: '#/components/responses/EventNotFound'
     *       500:
     *         $ref: '#/components/responses/ServerError'
     */
    router.patch('/:id',
        authenticate,
        authorize('admin', 'superadmin'),
        validateParams(eventIdSchema),
        validate(eventUpdateSchema),
        eventController.updateEvent);

    /**
     * @swagger
     * /api/events/{id}:
     *   delete:
     *     summary: Eliminar evento
     *     description: Elimina un evento y todos sus recursos asociados (imágenes, videos)
     *     tags: [Eventos]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - $ref: '#/components/parameters/eventId'
     *     responses:
     *       200:
     *         $ref: '#/components/responses/EventDeleted'
     *       401:
     *         $ref: '#/components/responses/UnauthorizedError'
     *       403:
     *         $ref: '#/components/responses/ForbiddenError'
     *       404:
     *         $ref: '#/components/responses/EventNotFound'
     *       500:
     *         $ref: '#/components/responses/ServerError'
     */
    router.delete('/:id',
        authenticate,
        authorize('admin', 'superadmin'),
        validateParams(eventIdSchema),
        eventController.deleteEvent);

    /**
     * @swagger
     * /api/events/{id}/media/images:
     *   post:
     *     summary: Añadir imagen al evento
     *     description: Sube una imagen y la asocia al evento
     *     tags: [Eventos]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - $ref: '#/components/parameters/eventId'
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
     *       200:
     *         $ref: '#/components/responses/EventMediaSuccess'
     *       400:
     *         $ref: '#/components/responses/ValidationError'
     *       401:
     *         $ref: '#/components/responses/UnauthorizedError'
     *       403:
     *         $ref: '#/components/responses/ForbiddenError'
     *       404:
     *         $ref: '#/components/responses/EventNotFound'
     *       413:
     *         description: Archivo demasiado grande
     *       500:
     *         $ref: '#/components/responses/ServerError'
     */
    router.post(
        '/:id/media/images',
        authenticate,
        authorize('admin', 'superadmin'),
        validateParams(eventIdSchema),
        fileService.getValidationMiddleware('image', { maxSize: 10 }),
        eventController.addEventImage
    );

    /**
     * @swagger
     * /api/events/{id}/media/videos:
     *   post:
     *     summary: Añadir video al evento
     *     description: Sube un video y lo asocia al evento
     *     tags: [Eventos]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - $ref: '#/components/parameters/eventId'
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
     *       200:
     *         $ref: '#/components/responses/EventMediaSuccess'
     *       400:
     *         $ref: '#/components/responses/ValidationError'
     *       401:
     *         $ref: '#/components/responses/UnauthorizedError'
     *       403:
     *         $ref: '#/components/responses/ForbiddenError'
     *       404:
     *         $ref: '#/components/responses/EventNotFound'
     *       413:
     *         description: Archivo demasiado grande
     *       500:
     *         $ref: '#/components/responses/ServerError'
     */
    router.post(
        '/:id/media/videos',
        authenticate,
        authorize('admin', 'superadmin'),
        validateParams(eventIdSchema),
        fileService.getValidationMiddleware('video', { maxSize: 50 }),
        eventController.addEventVideo
    );

    /**
     * @swagger
     * /api/events/{id}/media/images/{imageId}:
     *   delete:
     *     summary: Eliminar imagen del evento
     *     description: Elimina una imagen específica asociada al evento
     *     tags: [Eventos]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - $ref: '#/components/parameters/eventId'
     *       - in: path
     *         name: imageId
     *         required: true
     *         schema:
     *           type: string
     *           format: mongo-id
     *         description: ID de la imagen a eliminar
     *     responses:
     *       200:
     *         $ref: '#/components/responses/MediaDeleted'
     *       401:
     *         $ref: '#/components/responses/UnauthorizedError'
     *       403:
     *         $ref: '#/components/responses/ForbiddenError'
     *       404:
     *         oneOf:
     *           - $ref: '#/components/responses/EventNotFound'
     *           - $ref: '#/components/responses/MediaNotFound'
     *       500:
     *         $ref: '#/components/responses/ServerError'
     */
    router.delete('/:id/media/images/:imageId',
        authenticate,
        authorize('admin', 'superadmin'),
        validateParams(eventIdSchema),
        eventController.removeEventImage
    );

    /**
      * @swagger
      * /api/events/{id}/media/videos/{videoId}:
      *   delete:
      *     summary: Eliminar video del evento
      *     description: Elimina un video específico asociado al evento
      *     tags: [Eventos]
      *     security:
      *       - bearerAuth: []
      *     parameters:
      *       - $ref: '#/components/parameters/eventId'
      *       - in: path
      *         name: videoId
      *         required: true
      *         schema:
      *           type: string
      *           format: mongo-id
      *         description: ID del video a eliminar
      *     responses:
      *       200:
      *         $ref: '#/components/responses/MediaDeleted'
      *       401:
      *         $ref: '#/components/responses/UnauthorizedError'
      *       403:
      *         $ref: '#/components/responses/ForbiddenError'
      *       404:
      *         oneOf:
      *           - $ref: '#/components/responses/EventNotFound'
      *           - $ref: '#/components/responses/MediaNotFound'
      *       500:
      *         $ref: '#/components/responses/ServerError'
      */
    router.delete('/:id/media/videos/:videoId',
        authenticate,
        authorize('admin', 'superadmin'),
        validateParams(eventIdSchema),
        eventController.removeEventVideo
    );

    /**
     * @swagger
     * /api/events/{id}/save:
     *   post:
     *     summary: Guardar evento en agenda personal
     *     description: Permite a un egresado guardar un evento en su agenda personal para recibir recordatorios
     *     tags: [Eventos]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *         description: ID del evento a guardar
     *     responses:
     *       200:
     *         description: Evento guardado exitosamente
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
     *                     eventId:
     *                       type: string
     *                     savedByUser:
     *                       type: boolean
     *                     totalSaves:
     *                       type: integer
     *       400:
     *         description: Error si el usuario ya tiene guardado el evento
     *       404:
     *         description: Evento no encontrado
     */
    router.post('/:id/save', authenticate, validateParams(eventIdSchema), eventController.saveEventForUser);

    /**
     * @swagger
     * /api/events/{id}/unsave:
     *   delete:
     *     summary: Quitar evento de agenda personal
     *     description: Permite a un egresado quitar un evento de su agenda personal
     *     tags: [Eventos]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *         description: ID del evento a quitar
     *     responses:
     *       200:
     *         description: Evento removido exitosamente
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
     *                     eventId:
     *                       type: string
     *                     savedByUser:
     *                       type: boolean
     *                     totalSaves:
     *                       type: integer
     *       400:
     *         description: Error si el usuario no tenía guardado el evento
     *       404:
     *         description: Evento no encontrado
   */
    router.delete('/:id/unsave', authenticate, validateParams(eventIdSchema), eventController.unsaveEventForUser);

    return router;
}