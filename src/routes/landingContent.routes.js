import express from 'express';
import ContentController from '../controllers/content.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { contentUpdateSchema } from '../schemas/content.schemas.js';
import LandingPageContent from '../models/LandingPageContent.js';

export default function landingContentRoutes(fileService, logger) {
    const router = express.Router();
    const contentController = new ContentController(LandingPageContent, fileService, logger);

    /**
     * @swagger
     * /api/content/landing:
     *   get:
     *     summary: Obtener todo el contenido del sitio
     *     tags: [Contenido de la Landing Page]
     *     responses:
     *       200:
     *         description: Contenido obtenido exitosamente
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 success:
     *                   type: boolean
     *                 data:
     *                   $ref: '#/components/schemas/LandingPageContent'
     */
    router.get('/', authenticate, contentController.getContent);

    /**
     * @swagger
     * /api/content/landing/footer:
     *   get:
     *     summary: Obtener el contenido del footer
     *     tags: [Contenido de la Landing Page]
     *     responses:
     *       200:
     *         description: Contenido obtenido exitosamente
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 success:
     *                   type: boolean
     *                 data:
     *                   $ref: '#/components/schemas/LandingPageContent'
     */
    router.get('/footer', contentController.getContentFooter);

    /**
     * @swagger
     * /api/content/landing:
     *   patch:
     *     summary: Actualizar el contenido del sitio (solo admin)
     *     tags: [Contenido de la Landing Page]
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/LandingPageContentUpdate'
     *     responses:
     *       200:
     *         description: Contenido actualizado exitosamente
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
     *                   $ref: '#/components/schemas/LandingPageContent'
     */
    router.patch('/',
        authenticate,
        authorize('admin'),
        validate(contentUpdateSchema),
        contentController.updateContent
    );

    /**
     * @swagger
     * /api/content/landing/carousel/media:
     *   post:
     *     summary: Subir medio para el carrusel (solo admin)
     *     tags: [Contenido de la Landing Page]
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
     *               type: object
     *               properties:
     *                 success:
     *                   type: boolean
     *                 data:
     *                   $ref: '#/components/schemas/CarouselMedia'
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
     * /api/content/landing/subsections/image/{sectionIndex}/{subsectionIndex}:
     *   post:
     *     summary: Subir imagen para subsección (solo admin)
     *     tags: [Contenido de la Landing Page]
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
     *               type: object
     *               properties:
     *                 success:
     *                   type: boolean
     *                 message:
     *                   type: string
     *                 data:
     *                   $ref: '#/components/schemas/SubsectionImage'
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
   * /api/content/landing/carousel/{index}:
   *   delete:
   *     summary: Elimina un item del carrusel (solo admin)
   *     tags: [Contenido de la Landing Page]
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
     * /api/content/landing/subsections/{sectionIndex}/{subsectionIndex}/image:
     *   delete:
     *     summary: Elimina imagen de una subsección (solo admin)
     *     tags: [Contenido de la Landing Page]
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