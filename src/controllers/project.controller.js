import Project from '../models/Project.js';
import User from '../models/User.js';
import AppError from '../middlewares/AppError.js';

export default class ProjectController {
    constructor(fileService) {
        this.fileService = fileService;
    }

    /**
     * @method createProject
     * @description Crea un nuevo proyecto
     */
    createProject = async (req, res, next) => {
        try {
            const { id: userId } = req.user;
            const projectData = req.body;

            // Crear el proyecto con el usuario como owner y primer colaborador
            const project = await Project.create({
                ...projectData,
                owner: userId,
                collaborators: [{
                    user: userId,
                    role: 'creator',
                    joinedAt: new Date()
                }]
            });

            // Poblar datos del owner
            await project.populate('owner', 'username profilePicture firstName lastName');

            req.logger.info('Proyecto creado exitosamente', {
                action: 'project_create',
                userId,
                projectId: project._id
            });

            res.status(201).json({
                success: true,
                data: project
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * @method getProjects
     * @description Obtiene proyectos con filtros
     */
    getProjects = async (req, res, next) => {
        try {
            const { page = 1, limit = 10, status, search, tags, tagMatch = 'any', userId = null, username } = req.query;
            const skip = (page - 1) * limit;

            let tagsArray = tags;
            if (tags && typeof tags === 'string') {
                tagsArray = tags.split(',').map(tag => tag.trim().toLowerCase());
            } else if (!tags) {
                tagsArray = [];
            }

            const filter = {};

            // Filtro por estado
            if (status) filter.status = status;

            // Filtro por búsqueda textual
            if (search) filter.$text = { $search: search };

            // Filtro por tags
            if (tagsArray.length > 0) {
                if (tagMatch === 'all') {
                    filter.tags = { $all: tagsArray.map(tag => new RegExp(tag, 'i')) };
                } else {
                    filter.tags = { $in: tagsArray.map(tag => new RegExp(tag, 'i')) };
                }
            }

            // Lógica para buscar por username o userId
            let targetUserId = userId; // Usaremos userId si se proporciona directamente

            if (username) {
                // Si se proporciona username, intentamos encontrar el ID de usuario
                const user = await User.findOne({ username: username.toLowerCase() }).select('_id');
                if (user) {
                    targetUserId = user._id; // Asignamos el ID encontrado para el filtro
                } else {
                    return res.json({
                        success: true,
                        pagination: {
                            total: 0,
                            page: parseInt(page),
                            pages: 0,
                            limit: parseInt(limit)
                        },
                        data: []
                    });
                }
            }

            // Filtro por usuario (owner o colaborador) usando el ID resultante
            if (targetUserId) {
                filter.$or = [
                    { owner: targetUserId },
                    { 'collaborators.user': targetUserId }
                ];
            }

            const [projects, total] = await Promise.all([
                Project.find(filter)
                    .skip(skip)
                    .limit(parseInt(limit))
                    .sort({ createdAt: -1 })
                    .populate('owner', 'username profilePicture firstName lastName')
                    .populate('collaborators.user', 'username profilePicture firstName lastName'),
                Project.countDocuments(filter)
            ]);

            res.json({
                success: true,
                pagination: {
                    total,
                    page: parseInt(page),
                    pages: Math.ceil(total / limit),
                    limit: parseInt(limit)
                },
                data: projects
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * @method getProjectById
     * @description Obtiene un proyecto por ID con todos sus detalles
     */
    getProjectById = async (req, res, next) => {
        try {
            const { id } = req.params;

            const project = await Project.findById(id)
                .populate('owner', 'username profilePicture firstName lastName')
                .populate('collaborators.user', 'username profilePicture firstName lastName')
                .populate('media.uploadedBy', 'username profilePicture');

            if (!project) {
                throw new AppError('Proyecto no encontrado', 404, 'PROJECT_NOT_FOUND');
            }

            // Incrementar contador de vistas
            await Project.findByIdAndUpdate(id, { $inc: { viewCount: 1 } });

            res.json({
                success: true,
                data: project
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * @method updateProject
     * @description Actualiza un proyecto (solo owner o admin)
     */
    updateProject = async (req, res, next) => {
        try {
            const { id } = req.params;
            const { id: userId } = req.user;
            const updates = req.body;

            // Verificar que el proyecto existe y el usuario tiene permisos
            const project = await Project.findOne({
                _id: id,
                $or: [
                    { owner: userId },
                    { 'collaborators.user': userId, 'collaborators.role': 'admin' }
                ]
            });

            if (!project) {
                throw new AppError('Proyecto no encontrado o no autorizado', 404, 'PROJECT_UPDATE_UNAUTHORIZED');
            }

            // Actualizar campos permitidos
            const allowedUpdates = ['title', 'description', 'status', 'tags', 'startDate', 'endDate', 'isPublic'];
            allowedUpdates.forEach(field => {
                if (updates[field] !== undefined) {
                    project[field] = updates[field];
                }
            });

            await project.save();

            req.logger.info('Proyecto actualizado', {
                action: 'project_update',
                projectId: id,
                userId,
                updatedFields: Object.keys(updates)
            });

            res.json({
                success: true,
                data: project
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * @method deleteProject
     * @description Elimina un proyecto y sus recursos (solo owner)
     */
    deleteProject = async (req, res, next) => {
        try {
            const { id } = req.params;
            const { id: userId, role } = req.user;

            // Verificar que el proyecto existe
            const project = await Project.findById(id);

            if (!project) {
                throw new AppError('Proyecto no encontrado o no autorizado', 404, 'PROJECT_DELETE_UNAUTHORIZED');
            }

            // 2. Verificar permisos (autor o admin)
            if (!project.owner.equals(userId) && role !== 'admin') {
                throw new AppError('No autorizado para eliminar este proyecto', 403, 'FORBIDDEN');
            }


            // Eliminar medios asociados
            const mediaDeletionResults = await Promise.all(
                project.media.map(media =>
                    this.deleteMediaWithLogging(media, id, req.logger)
                )
            );

            // Eliminar el proyecto
            await project.deleteOne();

            res.json({
                success: true,
                message: 'Proyecto eliminado correctamente',
                data: {
                    projectId: id,
                    mediaDeleted: project.media.length,
                    mediaDeleteSuccess: mediaDeletionResults.filter(r => r.success).length
                }
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * @method addCollaborator
     * @description Añade un colaborador al proyecto (solo owner o admin)
     */
    addCollaborator = async (req, res, next) => {
        try {
            const { id: projectId } = req.params;
            const { username, role } = req.body;
            const { id: currentUserId } = req.user;

            // Verificar permisos
            const project = await Project.findOne({
                _id: projectId,
                $or: [
                    { owner: currentUserId },
                    { 'collaborators.user': currentUserId, 'collaborators.role': 'admin' }
                ]
            });

            if (!project) {
                throw new AppError('No autorizado para añadir colaboradores', 403, 'FORBIDDEN');
            }

            // Verificar que el usuario existe
            const userToAdd = await User.findOne({ username: username.toLowerCase() }).select('_id');
            if (!userToAdd) {
                throw new AppError('Usuario no encontrado', 404, 'USER_NOT_FOUND');
            }
            const userId = userToAdd._id.toString();

            // Verificar que no es el owner
            if (project.owner.toString() === userId) {
                throw new AppError('El owner no puede ser colaborador', 400, 'OWNER_CANNOT_BE_COLLABORATOR');
            }

            // Verificar que el usuario no es ya colaborador
            const isAlreadyCollaborator = project.collaborators.some(
                collab => collab.user.toString() === userId
            );

            if (isAlreadyCollaborator) {
                throw new AppError('El usuario ya es colaborador', 400, 'USER_ALREADY_COLLABORATOR');
            }

            // Añadir colaborador
            project.collaborators.push({
                user: userId,
                role: role || 'member',
                joinedAt: new Date()
            });

            await project.save();

            // Poblar datos del nuevo colaborador para la respuesta
            await project.populate('collaborators.user', 'username profilePicture firstName lastName');

            res.json({
                success: true,
                data: project.collaborators.find(c => c.user._id.toString() === userId)
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * @method removeCollaborator
     * @description Elimina un colaborador del proyecto (solo owner o admin)
     */
    removeCollaborator = async (req, res, next) => {
        try {
            const { id: projectId, username } = req.params;
            const { id: currentUserId } = req.user;

            // Verificar permisos
            const project = await Project.findOne({
                _id: projectId,
                $or: [
                    { owner: currentUserId },
                    { 'collaborators.user': currentUserId, 'collaborators.role': 'admin' }
                ]
            });

            if (!project) {
                throw new AppError('No autorizado para eliminar colaboradores', 403, 'FORBIDDEN');
            }

            // Verificar que el usuario existe
            const userToAdd = await User.findOne({ username: username.toLowerCase() }).select('_id');
            if (!userToAdd) {
                throw new AppError('Usuario no encontrado', 404, 'USER_NOT_FOUND');
            }
            const userId = userToAdd._id.toString();

            // Verificar que no es el owner
            if (project.owner.toString() === userId) {
                throw new AppError('No se puede eliminar al owner', 400, 'CANNOT_REMOVE_OWNER');
            }

            // Verificar que el colaborador existe
            const collaborator = project.collaborators.find(collab => collab.user.toString() === userId);
            if (!collaborator) {
                throw new AppError('Colaborador no encontrado', 404, 'COLLABORATOR_NOT_FOUND');
            }

            // Eliminar colaborador
            project.collaborators = project.collaborators.filter(
                collab => collab.user.toString() !== userId
            );

            await project.save();

            res.json({
                success: true,
                message: 'Colaborador eliminado correctamente'
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * @method joinProject
     * @description Permite a un usuario unirse a un proyecto público
     */
    joinProject = async (req, res, next) => {
        try {
            const { id: projectId } = req.params;
            const { id: userId } = req.user;

            // Verificar que el proyecto existe y es público
            const project = await Project.findOne({
                _id: projectId,
                isPublic: true
            });

            if (!project) {
                throw new AppError('Proyecto no encontrado o no es público', 404, 'PROJECT_NOT_PUBLIC');
            }

            // Verificar que el usuario no es el owner
            if (project.owner.toString() === userId) {
                throw new AppError('Eres el owner de este proyecto', 400, 'USER_IS_OWNER');
            }

            // Verificar que el usuario no es ya colaborador
            const isAlreadyCollaborator = project.collaborators.some(
                collab => collab.user.toString() === userId
            );

            if (isAlreadyCollaborator) {
                throw new AppError('Ya eres colaborador de este proyecto', 400, 'ALREADY_COLLABORATOR');
            }

            // Añadir como colaborador con rol member
            project.collaborators.push({
                user: userId,
                role: 'member',
                joinedAt: new Date()
            });

            await project.save();

            res.json({
                success: true,
                message: 'Te has unido al proyecto exitosamente'
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * @method leaveProject
     * @description Permite a un colaborador abandonar un proyecto
     */
    leaveProject = async (req, res, next) => {
        try {
            const { id: projectId } = req.params;
            const { id: userId } = req.user;

            // Verificar que el proyecto existe
            const project = await Project.findById(projectId);

            if (!project) {
                throw new AppError('Proyecto no encontrado', 404, 'PROJECT_NOT_FOUND');
            }

            // Verificar que el usuario no es el owner
            if (project.owner.toString() === userId) {
                throw new AppError('El owner no puede abandonar el proyecto', 400, 'OWNER_CANNOT_LEAVE');
            }

            // Verificar que el usuario es colaborador
            const collaboratorIndex = project.collaborators.findIndex(
                collab => collab.user.toString() === userId
            );

            if (collaboratorIndex === -1) {
                throw new AppError('No eres colaborador de este proyecto', 400, 'NOT_COLLABORATOR');
            }

            // Eliminar al usuario de los colaboradores
            project.collaborators.splice(collaboratorIndex, 1);
            await project.save();

            res.json({
                success: true,
                message: 'Has abandonado el proyecto exitosamente'
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * @method addProjectMedia
     * @description Añade un medio (imagen/video) al proyecto
     */
    addProjectMedia = async (req, res, next) => {
        try {
            const { id: projectId } = req.params;
            const { file } = req;
            const { id: userId } = req.user;

            // Verificar permisos
            const project = await Project.findOne({
                _id: projectId,
                $or: [
                    { owner: userId },
                    { 'collaborators.user': userId }
                ]
            });

            console.log(project);

            if (!project) {
                throw new AppError('No autorizado para añadir medios', 403, 'FORBIDDEN');
            }

            if (!file) {
                throw new AppError('No se proporcionó archivo', 400, 'NO_FILE_PROVIDED');
            }

            // Convertir buffer a base64
            const fileBase64 = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;

            let uploadResult;
            let mediaType;

            if (file.mimetype.startsWith('image/')) {
                mediaType = 'image';
                uploadResult = await this.fileService.uploadImage(
                    fileBase64,
                    `project-${projectId}`,
                    {
                        // width: 1200,
                        // height: 630,
                        // crop: 'fill',
                        format: 'webp',
                        folder: 'projects/images',
                        originalName: file.originalname
                    }
                );
            } else if (file.mimetype.startsWith('video/')) {
                mediaType = 'video';
                uploadResult = await this.fileService.uploadVideo(
                    fileBase64,
                    `project-${projectId}`,
                    {
                        // width: 1280,
                        // height: 720,
                        format: 'mp4',
                        folder: 'projects/videos',
                        originalName: file.originalname
                    }
                );
            }

            const newMedia = {
                mediaType,
                url: uploadResult.url,
                publicId: uploadResult.publicId,
                uploadedBy: userId
            };

            if (uploadResult.format) newMedia.format = uploadResult.format;
            if (uploadResult.dimensions) newMedia.dimensions = uploadResult.dimensions;
            if (uploadResult.duration) newMedia.duration = uploadResult.duration;

            project.media.push(newMedia);
            await project.save();

            // Poblar datos del usuario que subió el medio
            await project.populate('media.uploadedBy', 'username profilePicture');

            res.json({
                success: true,
                data: {
                    media: newMedia,
                    projectId
                }
            });

        } catch (error) {
            next(error);
        }
    };

    /**
     * @method removeProjectMedia
     * @description Elimina un medio del proyecto
     */
    removeProjectMedia = async (req, res, next) => {
        try {
            const { id: projectId, mediaId } = req.params;
            const { id: userId } = req.user;

            // Verificar permisos
            const project = await Project.findOne({
                _id: projectId,
                $or: [
                    { owner: userId },
                    { 'collaborators.user': userId, 'collaborators.role': 'admin' }
                ]
            });

            if (!project) {
                throw new AppError('No autorizado para eliminar medios', 403, 'FORBIDDEN');
            }

            // Buscar el medio
            const mediaIndex = project.media.findIndex(
                media => media._id.toString() === mediaId
            );

            if (mediaIndex === -1) {
                throw new AppError('Medio no encontrado', 404, 'MEDIA_NOT_FOUND');
            }

            const mediaToDelete = project.media[mediaIndex];

            // Eliminar de Cloudinary
            await this.fileService.deleteFile(
                mediaToDelete.publicId,
                mediaToDelete.mediaType
            );

            // Eliminar del array
            project.media.splice(mediaIndex, 1);
            await project.save();

            res.json({
                success: true,
                message: 'Medio eliminado correctamente'
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * @method deleteMediaWithLogging
     * @description Elimina un medio con registro de logs
     */
    async deleteMediaWithLogging(media, projectId, logger) {
        const context = {
            projectId,
            mediaType: media.mediaType,
            publicId: media.publicId
        };

        try {
            const result = await this.fileService.deleteFile(
                media.publicId,
                media.mediaType
            );

            if (!result.success) {
                logger.warn('Eliminación de medio fallida', {
                    ...context,
                    error: result.error
                });
            }
            return result;
        } catch (error) {
            logger.error('Error al eliminar medio', {
                ...context,
                error: error.message
            });
            return { success: false, error: error.message };
        }
    }
}