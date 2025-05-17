
import express from 'express';
import AlumniController from '../controllers/alumni.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { validateQuery, validateParams } from '../middlewares/validate.middleware.js';
import { alumniSearchSchema, usernameParamSchema } from '../schemas/alumni.schemas.js';

/**
 * @swagger
 * tags:
 *   name: Egresados
 *   description: Endpoints para manejo de egresados
 */

/**
 * @fileoverview Rutas de egresados para la API REST
 * @module routes/alumni
 * @requires express
 * @requires ../controllers/alumni.controller
 * @requires ../middlewares/auth.middleware
 * @requires ../middlewares/validate.middleware
 * @requires ../schemas/alumni.schemas
 * 
 * @description  
 * Configura todas las rutas relacionadas con egresados:  
 * - Búsqueda de egresados  
 * - Perfil público  
 * 
 * @see {@link ./alumni.controller} Para la lógica de negocio
 */

/**
 * @function alumniRoutes
 * @description Factory function que devuelve un router de Express con todas las rutas de egresados
 * @returns {express.Router} Router configurado con middlewares y handlers
 * 
 * @example
 * // Uso típico:
 * const alumniRouter = alumniRoutes();
 * app.use('/api/alumni', alumniRouter);
 */
export default function alumniRoutes() {
    const router = express.Router();
    const alumniController = new AlumniController();

    /**
     * @swagger
     * /api/alumni/search:
     *   get:
     *     summary: Buscar egresados
     *     description: Permite buscar egresados registrados según varios criterios
     *     tags: [Egresados]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: query
     *         name: query
     *         schema:
     *           type: string
     *         description: Texto para buscar en nombres, apellidos o email
     *       - in: query
     *         name: degree
     *         schema:
     *           type: string
     *           enum:
     *             - Licenciatura en Administración de Empresas
     *             - Licenciatura en Contaduría Pública
     *             - Ingeniería de Computación
     *             - Ingeniería Industrial
     *             - Derecho
     *             - Ciencias Políticas y Administrativas
     *         description: Filtrar por carrera
     *       - in: query
     *         name: graduationYear
     *         schema:
     *           type: integer
     *           format: year
     *         description: Filtrar por año de graduación
     *       - in: query
     *         name: location
     *         schema:
     *           type: string
     *         description: Filtrar por ubicación geográfica
     *     responses:
     *       200:
     *         description: Lista de egresados que coinciden con los criterios
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
     *                   example: 5
     *                 data:
     *                   type: array
     *                   items:
     *                     $ref: '#/components/schemas/AlumniProfile'
     *       401:
     *         $ref: '#/components/responses/UnauthorizedError'
     *       500:
     *         description: Error del servidor
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/ErrorResponse'
     */
    router.get('/search', authenticate, validateQuery(alumniSearchSchema), alumniController.searchAlumni);

    /**
     * @swagger
     * /api/alumni/{username}:
     *   get:
     *     summary: Obtener perfil de egresado
     *     description: Devuelve el perfil público de un egresado específico
     *     tags: [Egresados]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: username
     *         required: true
     *         schema:
     *           type: string
     *         description: Nombre de usuario del egresado
     *     responses:
     *       200:
     *         description: Perfil del egresado
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 success:
     *                   type: boolean
     *                   example: true
     *                 data:
     *                   $ref: '#/components/schemas/AlumniProfile'
     *       401:
     *         $ref: '#/components/responses/UnauthorizedError'
     *       404:
     *         description: Egresado no encontrado
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/ErrorResponse'
     *       500:
     *         description: Error del servidor
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/ErrorResponse'
     */
    router.get('/:username', authenticate, validateParams(usernameParamSchema), alumniController.getAlumniProfileByUsername);
    
    return router;
}