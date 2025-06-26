import express from 'express';
import ContentController from '../controllers/content.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { contentUpdateSchema } from '../schemas/content.schemas.js';

export default function contentRoutes(fileService) {
    const router = express.Router();
    const contentController = new ContentController(fileService);

    /**
     * @swagger
     * /api/content:
     *   get:
     *     summary: Obtener todo el contenido del sitio
     *     tags: [Content]
     *     responses:
     *       200:
     *         description: Contenido obtenido exitosamente
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Content'
     */
    router.get('/', authenticate, contentController.getContent);

    /**
     * @swagger
     * /api/content:
     *   patch:
     *     summary: Actualizar el contenido del sitio (solo admin)
     *     tags: [Content]
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/ContentUpdate'
     *     responses:
     *       200:
     *         description: Contenido actualizado exitosamente
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Content'
     */
    router.patch('/',
        authenticate,
        authorize('admin'),
        validate(contentUpdateSchema),
        contentController.updateContent
    );

    /**
     * @swagger
     * /api/content/carousel/media:
     *   post:
     *     summary: Subir medio para el carrusel (solo admin)
     *     tags: [Content]
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         multipart/form-data:
     *           schema:
     *             type: object
     *             properties:
     *               file:
     *                 type: string
     *                 format: binary
     *     responses:
     *       200:
     *         description: Medio subido exitosamente
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/CarouselMedia'
     */
    router.post(
        '/carousel/media',
        authenticate,
        authorize('admin'),
        fileService.getValidationMiddleware('file', { maxSize: 50 }),
        contentController.uploadCarouselMedia
    );

    /**
     * @swagger
     * /api/content/subsections/image/{sectionIndex}/{subsectionIndex}:
     *   post:
     *     summary: Subir imagen para subsección (solo admin)
     *     tags: [Content]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: sectionIndex
     *         required: true
     *         schema:
     *           type: integer
     *         description: Índice de la sección
     *       - in: path
     *         name: subsectionIndex
     *         required: true
     *         schema:
     *           type: integer
     *         description: Índice de la subsección
     *     requestBody:
     *       required: true
     *       content:
     *         multipart/form-data:
     *           schema:
     *             type: object
     *             properties:
     *               file:
     *                 type: string
     *                 format: binary
     *     responses:
     *       200:
     *         description: Imagen subida exitosamente
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/SubsectionImage'
     */
    router.post(
        '/subsections/:sectionIndex/:subsectionIndex/image',
        authenticate,
        authorize('admin'),
        fileService.getValidationMiddleware('file', { maxSize: 10, type: 'image' }),
        contentController.uploadSubsectionImage
    );

    /**
   * @swagger
   * /api/content/carousel/{index}:
   *   delete:
   *     summary: Elimina un item del carrusel (solo admin)
   *     tags: [Content]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: index
   *         required: true
   *         schema:
   *           type: integer
   *         description: Índice del item a eliminar
   *     responses:
   *       200:
   *         description: Ítem eliminado correctamente
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
   *                     deletedItemIndex:
   *                       type: integer
   *                     remainingItems:
   *                       type: integer
   */
    router.delete(
        '/carousel/:index',
        authenticate,
        authorize('admin'),
        contentController.deleteCarouselItem
    );

    /**
     * @swagger
     * /api/content/subsections/{sectionIndex}/{subsectionIndex}/image:
     *   delete:
     *     summary: Elimina imagen de una subsección (solo admin)
     *     tags: [Content]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: sectionIndex
     *         required: true
     *         schema:
     *           type: integer
     *         description: Índice de la sección
     *       - in: path
     *         name: subsectionIndex
     *         required: true
     *         schema:
     *           type: integer
     *         description: Índice de la subsección
     *     responses:
     *       200:
     *         description: Imagen eliminada correctamente
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
     *                   $ref: '#/components/schemas/Subsection'
     */
    router.delete(
        '/subsections/:sectionIndex/:subsectionIndex/image',
        authenticate,
        authorize('admin'),
        contentController.deleteSubsectionImage
    );

    return router;
}