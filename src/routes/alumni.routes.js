
import express from 'express';
import AlumniController from '../controllers/alumni.controller.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { validate, validateQuery, validateParams } from '../middlewares/validate.middleware.js';
import {
    alumniSearchSchema, usernameParamSchema, cedulaParamSchema,
} from '../schemas/alumni.schemas.js';
import { profileUpdateSchema } from '../schemas/userProfile.schemas.js';

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
export default function alumniRoutes(fileService) {
    const router = express.Router();
    const alumniController = new AlumniController(fileService);

    /**
     * @swagger
     * /api/alumni/verify-alumni:
     *   get:
     *     summary: Verifica si una cédula corresponde a un egresado
     *     description: Endpoint público para verificar si una persona es egresada
     *     tags: [Egresados]
     *     parameters:
     *       - in: query
     *         name: cedula
     *         required: true
     *         schema:
     *           type: string
     *           example: "V-12345678"
     *         description: Cédula del egresado (formato V/E-12345678)
     *     responses:
     *       200:
     *         description: Resultado de la verificación
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 success:
     *                   type: boolean
     *                   example: true
     *                 esEgresado:
     *                   type: boolean
     *                   example: true
     *                 datos:
     *                   type: object
     *                   properties:
     *                     nombreCompleto:
     *                       type: string
     *                       example: "Juan Pérez"
     *                     cedula:
     *                       type: string
     *                       example: "V-12345678"
     *                     carrerasPregrado:
     *                       type: array
     *                       items:
     *                         type: object
     *                         properties:
     *                           carrera:
     *                             type: string
     *                           fechaGrado:
     *                             type: string
     *                             format: date
     *                     programasPostgrado:
     *                       type: array
     *                       items:
     *                         type: object
     *                         properties:
     *                           programa:
     *                             type: string
     *                           fechaGrado:
     *                             type: string
     *                             format: date
     *       400:
     *         description: Cédula inválida
     *       404:
     *         description: No se encontró egresado con esa cédula
     */
    router.get('/verify-alumni/:cedula', validateParams(cedulaParamSchema), alumniController.checkAlumni);

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
     *         description: Texto para buscar en nombre completo o email alternativo
     *       - in: query
     *         name: pregrado
     *         schema:
     *           type: string
     *         description: Filtrar por título de pregrado (ej. "Administración")
     *       - in: query
     *         name: postgrado
     *         schema:
     *           type: string
     *         description: Filtrar por título de postgrado (ej. "Magister")
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
     *       - in: query
     *         name: username
     *         schema:
     *           type: string
     *         description: Filtrar por nombre de usuario
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
     *                 pagination:
     *                   type: object
     *                   properties:
     *                     total:
     *                       type: integer
     *                       example: 50
     *                     page:
     *                       type: integer
     *                       example: 1
     *                     pages:
     *                       type: integer
     *                       example: 5
     *                     limit:
     *                       type: integer
     *                       example: 10
     *                 data:
     *                   type: array
     *                   items:
     *                     type: object
     *                     properties:
     *                       id:
     *                         type: string
     *                         format: mongo-id
     *                       username:
     *                         type: string
     *                       profilePicture:
     *                         type: string
     *                         format: url
     *                       lastLogin:
     *                         type: string
     *                         format: date-time
     *                       nombreCompleto:
     *                         type: string
     *                       ubicacion:
     *                         type: string
     *                       carrerasPregrado:
     *                         type: array
     *                         items:
     *                           type: object
     *                           properties:
     *                             carrera:
     *                               type: string
     *                             fechaGrado:
     *                               type: string
     *                               format: date
     *                       programasPostgrado:
     *                         type: array
     *                         items:
     *                           type: object
     *                           properties:
     *                             programa:
     *                               type: string
     *                             fechaGrado:
     *                               type: string
     *                               format: date
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

    /**
     * @swagger
     * /api/alumni/update-profile:
     *   patch:
     *     summary: Actualizar perfil del egresado
     *     description: Permite al egresado autenticado actualizar su información de perfil
     *     tags: [Egresados]
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               contact:
     *                 type: object
     *                 properties:
     *                   phone:
     *                     type: string
     *                     example: "+584123456789"
     *                   alternateEmail:
     *                     type: string
     *                     format: email
     *                     example: "personal@example.com"
     *                   website:
     *                     type: string
     *                     format: url
     *                     example: "https://miweb.com"
     *               socialMedia:
     *                 type: object
     *                 properties:
     *                   linkedin:
     *                     type: string
     *                     format: url
     *                     example: "https://linkedin.com/in/usuario"
     *                   github:
     *                     type: string
     *                     format: url
     *                     example: "https://github.com/usuario"
     *                   instagram:
     *                     type: string
     *                     example: "@usuario"
     *               professional:
     *                 type: object
     *                 properties:
     *                   title:
     *                     type: string
     *                     example: "Ingeniero de Software"
     *                   summary:
     *                     type: string
     *                     example: "Experto en desarrollo web con 5 años de experiencia..."
     *                   skills:
     *                     type: array
     *                     items:
     *                       type: string
     *                     example: ["JavaScript", "React", "Node.js"]
     *     responses:
     *       200:
     *         description: Perfil actualizado exitosamente
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 success:
     *                   type: boolean
     *                   example: true
     *                 message:
     *                   type: string
     *                   example: "Perfil actualizado correctamente"
     *                 data:
     *                   $ref: '#/components/schemas/UserProfile'
     *       400:
     *         description: Validación fallida
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/ErrorResponse'
     *       401:
     *         $ref: '#/components/responses/UnauthorizedError'
     *       404:
     *         description: Perfil no encontrado
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
    router.patch('/update-profile', authenticate, validate(profileUpdateSchema), alumniController.updateProfile);

    /**
     * @swagger
     * /api/alumni/profile/picture:
     *   patch:
     *     summary: Actualizar foto de perfil
     *     tags: [Egresados]
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         multipart/form-data:
     *           schema:
     *             type: object
     *             properties:
     *               picture:
     *                 type: string
     *                 format: binary
     *                 description: Imagen de perfil (JPEG/PNG, máx 10MB)
     *     responses:
     *       200:
     *         description: Foto de perfil actualizada
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/ProfilePictureResponse'
     *             examples:
     *               success:
     *                 value:
     *                   success: true
     *                   data:
     *                     profilePicture: "https://res.cloudinary.com/uvm/image/upload/v123/profile_abc123.webp"
     *                     publicId: "users/profile-pictures/abc123"
     *                     dimensions:
     *                       width: 300
     *                       height: 300
     *                     format: "webp"
     *                     userId: "507f1f77bcf86cd799439011"
     *                     updatedAt: "2025-05-27T07:30:45.000Z"
     *       400:
     *         $ref: '#/components/responses/InvalidFileError'
     *       401:
     *         $ref: '#/components/responses/UnauthorizedError'
     *       413:
     *         $ref: '#/components/responses/FileTooLargeError'
     */
    router.patch('/profile/picture',
        authenticate,
        fileService.getValidationMiddleware('picture', { maxSize: 10, type: 'image' }),
        alumniController.updateProfilePicture
    );

    /**
     * @swagger
     * /api/alumni/pregrado:
     *   post:
     *     summary: Carga masiva de egresados de pregrado desde CSV
     *     tags: [Egresados]
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
     *                 description: Archivo CSV con datos de egresados de pregrado
     *     responses:
     *       200:
     *         description: Resultado de la carga masiva
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 success:
     *                   type: boolean
     *                 total:
     *                   type: integer
     *                   description: Total de registros procesados
     *                 inserted:
     *                   type: integer
     *                   description: Registros insertados correctamente
     *                 duplicates:
     *                   type: integer
     *                   description: Registros duplicados (no insertados)
     *                 errors:
     *                   type: integer
     *                   description: Registros con errores
     *                 errorDetails:
     *                   type: array
     *                   items:
     *                     type: object
     *                     properties:
     *                       line:
     *                         type: integer
     *                       error:
     *                         type: string
     *                       record:
     *                         type: string
     *       400:
     *         description: Error en el archivo o validación
     *       401:
     *         description: No autorizado
     *       403:
     *         description: No tiene permisos para esta acción
     */
    router.post('/pregrado',
        authenticate,
        authorize('admin', 'superadmin'),
        fileService.getValidationMiddleware('file', { maxSize: 10, type: 'text/csv' }),
        alumniController.uploadPregrado
    );

    /**
     * @swagger
     * /api/alumni/postgrado:
     *   post:
     *     summary: Carga masiva de egresados de postgrado desde CSV
     *     tags: [Egresados]
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
     *                 description: Archivo CSV con datos de egresados de postgrado
     *     responses:
     *       200:
     *         description: Resultado de la carga masiva
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 success:
     *                   type: boolean
     *                 total:
     *                   type: integer
     *                   description: Total de registros procesados
     *                 inserted:
     *                   type: integer
     *                   description: Registros insertados correctamente
     *                 duplicates:
     *                   type: integer
     *                   description: Registros duplicados (no insertados)
     *                 errors:
     *                   type: integer
     *                   description: Registros con errores
     *                 errorDetails:
     *                   type: array
     *                   items:
     *                     type: object
     *                     properties:
     *                       line:
     *                         type: integer
     *                       error:
     *                         type: string
     *                       record:
     *                         type: string
     *       400:
     *         description: Error en el archivo o validación
     *       401:
     *         description: No autorizado
     *       403:
     *         description: No tiene permisos para esta acción
     */
    router.post('/postgrado',
        authenticate,
        authorize('admin', 'superadmin'),
        fileService.getValidationMiddleware('file', { maxSize: 10, type: 'text/csv' }),
        alumniController.uploadPostgrado
    );

    return router;
}