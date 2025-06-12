import express from 'express';
import ProjectController from '../controllers/project.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { validate, validateQuery, validateParams } from '../middlewares/validate.middleware.js';
import {
    projectCreateSchema,
    projectUpdateSchema,
    projectQuerySchema,
    projectIdSchema,
    collaboratorSchema
} from '../schemas/project.schemas.js';

export default function projectRoutes(fileService) {
    const router = express.Router();
    const projectController = new ProjectController(fileService);

    /**
     * @swagger
     * /api/projects:
     *   post:
     *     summary: Crear un nuevo proyecto
     *     tags: [Proyectos]
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - title
     *               - description
     *             properties:
     *               title:
     *                 type: string
     *                 maxLength: 100
     *               description:
     *                 type: string
     *                 maxLength: 5000
     *               status:
     *                 type: string
     *                 enum: [not_started, in_progress, completed, paused, cancelled]
     *                 default: not_started
     *               tags:
     *                 type: array
     *                 items:
     *                   type: string
     *                   maxLength: 20
     *               startDate:
     *                 type: string
     *                 format: date
     *               endDate:
     *                 type: string
     *                 format: date
     *               isPublic:
     *                 type: boolean
     *                 default: false
     *     responses:
     *       201:
     *         description: Proyecto creado exitosamente
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 success:
     *                   type: boolean
     *                 data:
     *                   $ref: '#/components/schemas/Project'
     *       400:
     *         description: Error de validación
     *       401:
     *         description: No autenticado
     */
    router.post(
        '/',
        authenticate,
        validate(projectCreateSchema),
        projectController.createProject
    );

    /**
     * @swagger
     * /api/projects:
     *   get:
     *     summary: Obtener lista de proyectos
     *     tags: [Proyectos]
     *     parameters:
     *       - in: query
     *         name: page
     *         schema:
     *           type: integer
     *           default: 1
     *       - in: query
     *         name: limit
     *         schema:
     *           type: integer
     *           default: 10
     *       - in: query
     *         name: status
     *         schema:
     *           type: string
     *           enum: [not_started, in_progress, completed, paused, cancelled]
     *       - in: query
     *         name: search
     *         schema:
     *           type: string
     *       - in: query
     *         name: tags
     *         description: Tags para filtrar (separados por comas)
     *         schema:
     *           type: string
     *       - in: query
     *         name: tagMatch
     *         description: Tipo de coincidencia para los tags (any = al menos un tag, all = todos los tags)
     *         schema:
     *           type: string
     *           enum: [any, all]
     *           default: any
     *       - in: query
     *         name: username
     *         description: Filtrar por proyectos de un usuario específico (como owner o colaborador)
     *         schema:
     *           type: string
     *     responses:
     *       200:
     *         description: Lista de proyectos
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 success:
     *                   type: boolean
     *                 pagination:
     *                   type: object
     *                   properties:
     *                     total:
     *                       type: integer
     *                     page:
     *                       type: integer
     *                     pages:
     *                       type: integer
     *                     limit:
     *                       type: integer
     *                 data:
     *                   type: array
     *                   items:
     *                     $ref: '#/components/schemas/Project'
     */
    router.get(
        '/',
        authenticate,
        validateQuery(projectQuerySchema),
        projectController.getProjects
    );

    /**
     * @swagger
     * /api/projects/{id}:
     *   get:
     *     summary: Obtener un proyecto por ID
     *     tags: [Proyectos]
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *     responses:
     *       200:
     *         description: Detalles del proyecto
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 success:
     *                   type: boolean
     *                 data:
     *                   $ref: '#/components/schemas/Project'
     *       404:
     *         description: Proyecto no encontrado
     */
    router.get(
        '/:id',
        authenticate,
        validateParams(projectIdSchema),
        projectController.getProjectById
    );

    /**
     * @swagger
     * /api/projects/{id}:
     *   patch:
     *     summary: Actualizar un proyecto existente
     *     description: Actualiza los campos de un proyecto. Solo el owner (dueño) o colaboradores con rol 'admin' pueden actualizar.
     *     tags: [Proyectos]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - $ref: '#/components/parameters/projectId'
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/ProjectUpdateRequest'
     *     responses:
     *       200:
     *         description: Proyecto actualizado exitosamente
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/ProjectResponse'
     *       400:
     *         $ref: '#/components/responses/ValidationError'
     *       401:
     *         $ref: '#/components/responses/UnauthorizedError'
     *       403:
     *         $ref: '#/components/responses/ForbiddenError'
     *       404:
     *         $ref: '#/components/responses/ProjectNotFound'
     */
    router.patch(
        '/:id',
        authenticate,
        validateParams(projectIdSchema),
        validate(projectUpdateSchema),
        projectController.updateProject
    );

    /**
     * @swagger
     * /api/projects/{id}:
     *   delete:
     *     summary: Eliminar un proyecto
     *     tags: [Proyectos]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *     responses:
     *       200:
     *         description: Proyecto eliminado
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
     *                     projectId:
     *                       type: string
     *                     mediaDeleted:
     *                       type: integer
     *                     mediaDeleteSuccess:
     *                       type: integer
     *       403:
     *         description: No autorizado
     *       404:
     *         description: Proyecto no encontrado
     */
    router.delete(
        '/:id',
        authenticate,
        validateParams(projectIdSchema),
        projectController.deleteProject
    );

    /**
     * @swagger
     * /api/projects/{id}/collaborators:
     *   post:
     *     summary: Añadir colaborador a un proyecto
     *     tags: [Proyectos]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - $ref: '#/components/parameters/projectId'
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/CollaboratorRequest'
     *     responses:
     *       200:
     *         description: Colaborador añadido exitosamente
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/CollaboratorResponse'
     *       400:
     *         $ref: '#/components/responses/ValidationError'
     *       403:
     *         $ref: '#/components/responses/ForbiddenError'
     *       404:
     *         oneOf:
     *           - $ref: '#/components/responses/ProjectNotFound'
     *           - $ref: '#/components/responses/UserNotFound'
     */
    router.post(
        '/:id/collaborators',
        authenticate,
        validateParams(projectIdSchema),
        validate(collaboratorSchema),
        projectController.addCollaborator
    );

    /**
     * @swagger
     * /api/projects/{id}/collaborators/{username}:
     *   delete:
     *     summary: Eliminar colaborador de un proyecto
     *     tags: [Proyectos]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - $ref: '#/components/parameters/projectId'
     *       - in: path
     *         name: username
     *         required: true
     *         schema:
     *           type: string
     *         description: Nombre de usuario del colaborador a eliminar
     *     responses:
     *       200:
     *         description: Colaborador eliminado exitosamente
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/SuccessResponse'
     *       400:
     *         $ref: '#/components/responses/ValidationError'
     *       403:
     *         $ref: '#/components/responses/ForbiddenError'
     *       404:
     *         $ref: '#/components/responses/ProjectNotFound'
     */
    router.delete(
        '/:id/collaborators/:username',
        authenticate,
        validateParams(projectIdSchema),
        projectController.removeCollaborator
    );

    /**
     * @swagger
     * /api/projects/{id}/join:
     *   post:
     *     summary: Unirse a un proyecto público
     *     tags: [Proyectos]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - $ref: '#/components/parameters/projectId'
     *     responses:
     *       200:
     *         description: Unión exitosa al proyecto
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/SuccessResponse'
     *       400:
     *         $ref: '#/components/responses/ValidationError'
     *       404:
     *         $ref: '#/components/responses/ProjectNotFound'
     */
    router.post(
        '/:id/join',
        authenticate,
        validateParams(projectIdSchema),
        projectController.joinProject
    );

    /**
     * @swagger
     * /api/projects/{id}/leave:
     *   post:
     *     summary: Abandonar un proyecto
     *     tags: [Proyectos]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - $ref: '#/components/parameters/projectId'
     *     responses:
     *       200:
     *         description: Abandono exitoso del proyecto
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/SuccessResponse'
     *       400:
     *         $ref: '#/components/responses/ValidationError'
     *       404:
     *         $ref: '#/components/responses/ProjectNotFound'
     */
    router.post(
        '/:id/leave',
        authenticate,
        validateParams(projectIdSchema),
        projectController.leaveProject
    );

    /**
     * @swagger
     * /api/projects/{id}/media:
     *   post:
     *     summary: Añadir medio (imagen/video) al proyecto
     *     tags: [Proyectos]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - $ref: '#/components/parameters/projectId'
     *     requestBody:
     *       required: true
     *       content:
     *         multipart/form-data:
     *           schema:
     *             type: object
     *             properties:
     *               media:
     *                 type: string
     *                 format: binary
     *                 description: Archivo a subir (imagen, video)
     *     responses:
     *       200:
     *         description: Medio añadido exitosamente
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/ProjectMediaResponse'
     *       400:
     *         $ref: '#/components/responses/ValidationError'
     *       403:
     *         $ref: '#/components/responses/ForbiddenError'
     *       404:
     *         $ref: '#/components/responses/ProjectNotFound'
     *       413:
     *         description: Archivo demasiado grande
     */
    router.post(
        '/:id/media',
        authenticate,
        validateParams(projectIdSchema),
        fileService.getValidationMiddleware('media', { maxSize: 50 }),
        projectController.addProjectMedia
    );

    /**
     * @swagger
     * /api/projects/{id}/media/{mediaId}:
     *   delete:
     *     summary: Eliminar medio del proyecto
     *     tags: [Proyectos]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - $ref: '#/components/parameters/projectId'
     *       - in: path
     *         name: mediaId
     *         required: true
     *         schema:
     *           type: string
     *           format: mongo-id
     *         description: ID del medio a eliminar
     *     responses:
     *       200:
     *         description: Medio eliminado exitosamente
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/SuccessResponse'
     *       403:
     *         $ref: '#/components/responses/ForbiddenError'
     *       404:
     *         oneOf:
     *           - $ref: '#/components/responses/ProjectNotFound'
     *           - $ref: '#/components/responses/MediaNotFound'
     */
    router.delete(
        '/:id/media/:mediaId',
        authenticate,
        validateParams(projectIdSchema),
        projectController.removeProjectMedia
    );

    return router;
}