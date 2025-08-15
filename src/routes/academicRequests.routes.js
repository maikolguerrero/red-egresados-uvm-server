import express from 'express';
import ContentController from '../controllers/content.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { validate } from '../middlewares/validate.middleware.js';
import { academicRequestsUpdateSchema } from '../schemas/content.schemas.js';
import AcademicRequests from '../models/AcademicRequests.js';

export default function academicRequestsRoutes(fileService, logger) {
    const router = express.Router();
    const contentController = new ContentController(AcademicRequests, fileService, logger);

    /**
     * @swagger
     * /api/content/academic-requests:
     *   get:
     *     summary: Obtener todo el contenido del sitio
     *     tags: [Contenido de Solicitudes Académicas]
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
     *                   type: object
     *                   properties:
     *                     text:
     *                       type: string
     *                     email:
     *                       type: string
     */
    router.get('/', contentController.getAcademicRequests);

    /**
     * @swagger
     * /api/content/academic-requests:
     *   patch:
     *     summary: Actualizar el contenido del sitio (solo admin)
     *     tags: [Contenido de Solicitudes Académicas]
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               academicRequests:
     *                 type: object
     *                 properties:
     *                   text:
     *                     type: string
     *                   email:
     *                     type: string
     *             example:
     *               academicRequests:
     *                 text: "Para tramitar solicitudes académicas, pueden contactarnos a través del correo:"
     *                 email: "solicitudesacademicas@uvm.edu.ve"
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
     *                   type: object
     *                   properties:
     *                     text:
     *                       type: string
     *                     email:
     *                       type: string
     */
    router.patch('/',
        authenticate,
        authorize('admin', 'superadmin'),
        validate(academicRequestsUpdateSchema),
        contentController.updateAcademicRequests
    );

    return router;
}