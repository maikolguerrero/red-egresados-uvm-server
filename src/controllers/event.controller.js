/**
 * @fileoverview Controlador para operaciones de eventos
 * @module controllers/event.controller
 * @requires ../models/Event
 * @requires AppError
 */

import Event from '../models/Event.js';
import AppError from '../middlewares/AppError.js';

/**
 * @classdesc Controlador para operaciones relacionadas con eventos
 * @class EventController
 * 
 * @description
 * Maneja todas las operaciones relacionadas con:
 * - Creación de eventos
 * - Búsqueda y filtrado de eventos
 * - Obtención de eventos por ID
 * - Actualización de eventos
 * - Eliminación de eventos
 * - Subida de imágenes y videos a eventos
 * 
 * @example
 * // Uso típico en rutas:
 * const eventController = new EventController();
 * router.get('/search', eventController.searchEvents);
 */
export default class EventController {
    /**
   * @description Crea una instancia del controlador de autenticación
   * @param {FileService} fileService - Servicio de envío de emails
   * @example
   * const fileService = new FileService();
   * const eventController = new EventController(fileService);
   */
    constructor(fileService) {
        this.fileService = fileService;
    }

    /**
    * @method createEvent
    * @async
    * @description Crea un nuevo evento
    * @param {Object} req - Objeto de petición Express
    * @param {Object} res - Objeto de   respuesta Express
    * @param {Function} next - Función para pasar al siguiente middleware
    * @returns {Promise<void>} No retorna directamente, envía respuesta JSON con resultados
    */
    createEvent = async (req, res, next) => {
        try {
            const userId = req.user.id;
            const eventData = req.body;

            req.logger.debug('Inicio creación de evento', {
                userId,
                ip: req.ip
            });

            const event = await Event.create({
                ...eventData,
                createdBy: userId
            });

            req.logger.info('Evento creado exitosamente', {
                action: 'event_create_success',
                userId,
                eventId: event._id,
                ip: req.ip
            });

            res.status(201).json({
                success: true,
                data: event
            });
        } catch (error) {
            next(error);
        }
    };

    /**
    * @method getEvents
    * @async
    * @description Obtiene eventos con filtros y paginación
    * @param {Object} req - Objeto de petición Express
    * @param {Object} res - Objeto de respuesta Express
    * @param {Function} next - Función para pasar al siguiente middleware
    * @returns {Promise<void>} No retorna directamente, envía respuesta JSON con resultados
    */
    getEvents = async (req, res, next) => {
        try {
            const { page = 1, limit = 10, type, tags, tagMatch = 'any', search, upcoming } = req.query;
            const skip = (page - 1) * limit;
            let tagsArray = tags;
            // Convertir tags a array si viene como string
            if (tags && typeof tags === 'string') {
                tagsArray = tags.split(',').map(tag => tag.trim().toLowerCase());
            } else if (!tags) {
                tagsArray = [];
            }

            req.logger.debug('Inicio obtención de eventos', {
                userId: req.user.id,
                ip: req.ip
            });

            const filter = {};
            if (type) filter.eventType = type;
            if (tagsArray.length > 0) {
                if (tagMatch === 'all') {
                    // Para coincidencia con TODOS los tags
                    filter.tags = { $all: tagsArray.map(tag => new RegExp(tag, 'i')) };
                } else {
                    // Para coincidencia con ALGUNO de los tags
                    filter.tags = { $in: tagsArray.map(tag => new RegExp(tag, 'i')) };
                }
            }

            if (search) filter.$text = { $search: search };
            if (upcoming === 'true') filter.startDate = { $gte: new Date() };

            const [events, total] = await Promise.all([
                Event.find(filter)
                    .skip(skip)
                    .limit(parseInt(limit))
                    .sort({ startDate: 1 })
                    .populate('createdBy', 'username email'),
                Event.countDocuments(filter)
            ]);

            req.logger.info('Eventos obtenidos exitosamente', {
                action: 'event_get_success',
                userId: req.user.id,
                ip: req.ip
            });

            res.json({
                success: true,
                pagination: {
                    total,
                    page: parseInt(page),
                    pages: Math.ceil(total / limit),
                    limit: parseInt(limit)
                },
                data: events
            });
        } catch (error) {
            next(error);
        }
    };

    /**
    * @method getEventById
    * @async
    * @description Obtiene un evento específico por ID con toda su información
    * @param {Object} req - Objeto de petición Express
    * @param {Object} res - Objeto de respuesta Express
    * @param {Function} next - Función para pasar al siguiente middleware
    * @returns {Promise<void>} No retorna directamente, envía respuesta JSON con resultados
    */
    getEventById = async (req, res, next) => {
        try {
            const { id } = req.params;

            req.logger.debug('Inicio obtención de evento por ID', {
                userId: req.user.id,
                ip: req.ip
            });

            const event = await Event.findById(id)
                .populate('createdBy', 'username email firstName lastName')

            if (!event) {
                throw new AppError('Evento no encontrado', 404, 'EVENT_NOT_FOUND');
            }

            req.logger.info('Evento obtenido exitosamente', {
                action: 'event_get_success',
                userId: req.user.id,
                ip: req.ip
            });

            res.json({
                success: true,
                data: event
            });
        } catch (error) {
            next(error);
        }
    };

    /**
    * @method updateEvent
    * @async
    * @description Actualiza la información básica de un evento
    * @param {Object} req - Objeto de petición Express
    * @param {Object} res - Objeto de respuesta Express
    * @param {Function} next - Función para pasar al siguiente middleware
    * @returns {Promise<void>} No retorna directamente, envía respuesta JSON con resultados
    */
    updateEvent = async (req, res, next) => {
        try {
            const { id } = req.params;
            const updateData = req.body;
            const { userId } = req.user;

            req.logger.debug('Inicio actualización de evento', {
                userId,
                ip: req.ip
            });

            const event = await Event.findById(id);
            if (!event) {
                throw new AppError('Evento no encontrado', 404, 'EVENT_NOT_FOUND');
            }

            // Solo el organizador o un admin puede actualizar
            if (event.createdBy.toString() !== userId && req.user.role !== 'admin') {
                throw new AppError('No autorizado para actualizar este evento', 403, 'FORBIDDEN');
            }

            // Actualizar campos permitidos
            const allowedUpdates = ['title', 'description', 'eventType', 'startDate', 'endDate', 'location', 'virtualLink', 'organizers', 'specialGuests', 'capacity', 'certificate', 'isActive', 'tags'];
            allowedUpdates.forEach(field => {
                if (updateData[field] !== undefined) {
                    event[field] = updateData[field];
                }
            });

            // Validación adicional para fechas
            if (updateData.startDate && updateData.endDate && new Date(updateData.endDate) <= new Date(updateData.startDate)) {
                throw new AppError('La fecha de fin debe ser posterior a la de inicio', 400, 'INVALID_DATE_RANGE');
            }

            await event.save();

            req.logger.info('Evento actualizado exitosamente', {
                action: 'event_update_success',
                userId,
                eventId: event._id,
                ip: req.ip
            });

            res.json({
                success: true,
                message: 'Evento actualizado correctamente',
                data: event
            });
        } catch (error) {
            next(error);
        }
    };

    /**
    * @method deleteEvent
    * @async
    * @description Elimina un evento y todos sus recursos asociados (admin o creador)
    * @param {Object} req - Objeto de petición Express
    * @param {Object} res - Objeto de respuesta Express
    * @param {Function} next - Función para pasar al siguiente middleware
    * @returns {Promise<void>} No retorna directamente, envía respuesta JSON con resultados
    */
    deleteEvent = async (req, res, next) => {
        try {
            const { id } = req.params;
            const { id: userId, role } = req.user;

            // 1. Buscar el evento con sus medios
            const event = await Event.findById(id);
            if (!event) {
                throw new AppError('Evento no encontrado', 404, 'EVENT_NOT_FOUND');
            }

            // 2. Eliminar todos los medios asociados
            const mediaDeletionResults = await Promise.all(
                event.media.map(media =>
                    this.deleteMediaWithLogging(media, id, req.logger)
                )
            );

            // 3. Eliminar el evento
            await event.deleteOne();

            // 4. Preparar estadísticas
            const deletionStats = {
                media: {
                    attempted: event.media.length,
                    succeeded: mediaDeletionResults.filter(r => r.success).length
                }
            };

            // 5. Registrar resultados
            req.logger.info('Evento eliminado exitosamente', {
                action: 'event_delete',
                eventId: id,
                userId,
                deletedBy: role === 'admin' ? 'admin' : 'creator',
                stats: deletionStats
            });

            // 6. Responder con detalles
            res.json({
                success: true,
                message: 'Evento y recursos asociados eliminados',
                data: {
                    eventId: id,
                    deletions: deletionStats
                },
                warnings: this.collectDeletionWarnings(mediaDeletionResults, 'Event')
            });

        } catch (error) {
            next(error);
        }
    };

    /**
    * @method addEventImage
    * @async
    * @description Añade una imagen al evento
    * @param {Object} req - Objeto de petición Express
    * @param {Object} res - Objeto de respuesta Express
    * @param {Function} next - Función para pasar al siguiente middleware
    * @returns {Promise<void>} No retorna directamente, envía respuesta JSON con resultados
    */
    addEventImage = async (req, res, next) => {
        try {
            const { id } = req.params;
            const { file } = req;
            const { userId } = req.user;

            req.logger.debug('Inicio añadir imagen al evento', {
                userId,
                ip: req.ip
            });

            const event = await Event.findById(id);
            if (!event) {
                throw new AppError('Evento no encontrado', 404, 'EVENT_NOT_FOUND');
            }

            if (!file) {
                throw new AppError('No se proporcionó archivo', 400, 'NO_FILE_PROVIDED');
            }

            // Convertir buffer a formato que Cloudinary pueda procesar
            const fileBase64 = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;

            // Subir imagen usando FileService
            const uploadResult = await this.fileService.uploadImage(
                fileBase64, // Enviar como string base64
                `event-${id}`,
                {
                    // width: 1200,
                    // height: 630,
                    // crop: 'fill',
                    format: 'webp',
                    folder: 'events/images',
                    originalName: file.originalname
                }
            );

            if (!uploadResult.success) {
                throw new AppError('Error al subir imagen', 500, 'IMAGE_UPLOAD_FAILED');
            }

            const newImage = {
                url: uploadResult.url,
                publicId: uploadResult.publicId,
                uploadedBy: userId,
                format: uploadResult.format,
                dimensions: {
                    width: uploadResult.width,
                    height: uploadResult.height
                }
            };

            // Añadir metadatos al evento
            event.media.push(newImage);

            await event.save();

            req.logger.info('Imagen añadida exitosamente', {
                action: 'event_image_add_success',
                userId,
                eventId: id,
                ip: req.ip
            });

            res.json({
                success: true,
                data: {
                    image: newImage,
                    eventId: id
                }
            });

        } catch (error) {
            next(error);
        }
    };

    /**
    * @method addEventVideo
    * @async
    * @description Añade un video al evento
    * @param {Object} req - Objeto de petición Express
    * @param {Object} res - Objeto de respuesta Express
    * @param {Function} next - Función para pasar al siguiente middleware
    * @returns {Promise<void>} No retorna directamente, envía respuesta JSON con resultados
    */
    addEventVideo = async (req, res, next) => {
        try {
            const { id } = req.params;
            const { file } = req;
            const { userId } = req.user;

            req.logger.debug('Inicio añadir video al evento', {
                userId,
                ip: req.ip
            });

            const event = await Event.findById(id);
            if (!event) {
                throw new AppError('Evento no encontrado', 404, 'EVENT_NOT_FOUND');
            }

            if (!file) {
                throw new AppError('No se proporcionó archivo', 400, 'NO_FILE_PROVIDED');
            }

            // Convertir buffer a formato que Cloudinary pueda procesar
            const fileBase64 = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;

            // Subir video usando FileService
            const uploadResult = await this.fileService.uploadVideo(
                fileBase64,
                `event-${id}`,
                {
                    // width: 1280,
                    // height: 720,
                    format: 'mp4',
                    folder: 'events/videos',
                    originalName: file.originalname,
                    resource_type: 'video' // Especificar explícitamente el tipo
                }
            );

            if (!uploadResult.success) {
                throw new AppError('Error al subir video', 500, 'VIDEO_UPLOAD_FAILED', {
                    eventId: id,
                    userId
                });
            }

            const newVideo = {
                mediaType: 'video',
                url: uploadResult.url,
                publicId: uploadResult.publicId,
                duration: uploadResult.duration,
                format: uploadResult.format,
                dimensions: {
                    width: uploadResult.width,
                    height: uploadResult.height
                },
                uploadedBy: userId
            };

            // Añadir metadatos al evento
            event.media.push(newVideo);
            await event.save();

            req.logger.info('Video añadido exitosamente', {
                action: 'event_video_add_success',
                userId,
                eventId: id,
                ip: req.ip
            });

            res.json({
                success: true,
                data: {
                    video: newVideo,
                    eventId: id
                }
            });

        } catch (error) {
            next(error);
        }
    };

    /**
     * @method removeEventImage
     * @async
     * @description Elimina una imagen asociada a un evento
     * @param {Object} req - Objeto de petición Express
     * @param {Object} res - Objeto de respuesta Express
     * @param {Function} next - Función para pasar al siguiente middleware
     * @returns {Promise<void>} No retorna directamente, envía respuesta JSON con resultados
     */
    removeEventImage = async (req, res, next) => {
        try {
            const { id: eventId, imageId } = req.params;
            const { userId } = req.user;

            req.logger.debug('Inicio eliminación de imagen del evento', {
                userId,
                ip: req.ip
            });

            // 1. Buscar el evento y verificar existencia
            const event = await Event.findById(eventId);
            if (!event) {
                throw new AppError('Evento no encontrado', 404, 'EVENT_NOT_FOUND');
            }

            // 3. Buscar la imagen en el array
            const imageIndex = event.media.findIndex(
                img => img._id.toString() === imageId
            );

            if (imageIndex === -1) {
                throw new AppError('Imagen no encontrada en el evento', 404, 'IMAGE_NOT_FOUND');
            }

            const imageToDelete = event.media[imageIndex];

            // 4. Eliminar de Cloudinary
            const deleteResult = await this.fileService.deleteFile(imageToDelete.publicId);

            if (!deleteResult.success) {
                throw new AppError('Error al eliminar la imagen', 500, 'IMAGE_DELETE_FAILED');
            }

            // 5. Eliminar del array y guardar
            event.media.splice(imageIndex, 1);
            await event.save();

            res.json({
                success: true,
                message: 'Imagen eliminada correctamente',
                data: {
                    deletedImageId: imageId,
                    remainingImages: event.media.length
                }
            });

            req.logger.info('Imagen eliminada exitosamente', {
                action: 'event_image_delete_success',
                userId,
                eventId,
                imageId,
                ip: req.ip
            });

        } catch (error) {
            next(error);
        }
    };

    /**
    * @method removeEventVideo
    * @async
    * @description Elimina un video asociado a un evento
    * @param {Object} req - Objeto de petición Express
    * @param {Object} res - Objeto de respuesta Express
    * @param {Function} next - Función para pasar al siguiente middleware
    * @returns {Promise<void>} No retorna directamente, envía respuesta JSON con resultados
    */
    removeEventVideo = async (req, res, next) => {
        try {
            const { id: eventId, videoId } = req.params;
            const { userId } = req.user;

            req.logger.debug('Inicio eliminación de video del evento', {
                userId,
                ip: req.ip
            });

            // 1. Buscar el evento
            const event = await Event.findById(eventId);
            if (!event) {
                throw new AppError('Evento no encontrado', 404, 'EVENT_NOT_FOUND');
            }

            // 3. Buscar el video en el array
            const videoIndex = event.media.findIndex(
                vid => vid._id.toString() === videoId
            );

            if (videoIndex === -1) {
                throw new AppError('Video no encontrado en el evento', 404, 'VIDEO_NOT_FOUND');
            }

            const videoToDelete = event.media[videoIndex];

            // 4. Eliminar de Cloudinary
            const deleteResult = await this.fileService.deleteFile(videoToDelete.publicId, 'video');

            if (!deleteResult.success) {
                throw new AppError('Error al eliminar la imagen', 500, 'IMAGE_DELETE_FAILED');
            }

            // 5. Eliminar del array y guardar
            event.media.splice(videoIndex, 1);
            await event.save();

            req.logger.info('Video eliminado exitosamente', {
                action: 'event_video_delete_success',
                userId,
                eventId,
                videoId,
                ip: req.ip
            });

            res.json({
                success: true,
                message: 'Video eliminado correctamente',
                data: {
                    deletedVideoId: videoId,
                    remainingVideos: event.media.length
                }
            });

        } catch (error) {
            next(error);
        }
    };

    /**
     * @method deleteMediaWithLogging
     * @description Elimina un medio con registro detallado
     */
    async deleteMediaWithLogging(media, eventId, logger) {
        const context = {
            eventId,
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

    /**
     * @method collectDeletionWarnings
     * @description Recopila advertencias de eliminación fallida
     */
    collectDeletionWarnings(results, type) {
        const failures = results.filter(r => !r.success);
        if (failures.length === 0) return {};

        return {
            [`${type.toLowerCase()}MediaFailures`]: failures.map(f => ({
                publicId: f.publicId,
                error: f.error
            }))
        };
    }

    /**
    * @method saveEventForUser
    * @async
    * @description Permite a un usuario guardar un evento en su agenda personal
    * @param {Object} req - Objeto de petición Express
    * @param {Object} res - Objeto de respuesta Express
    * @param {Function} next - Función para pasar al siguiente middleware
    * @returns {Promise<void>} No retorna directamente, envía respuesta JSON con resultados
    */
    saveEventForUser = async (req, res, next) => {
        try {
            const { id: eventId } = req.params;
            const { id: userId } = req.user;

            req.logger.debug('Inicio guardar evento en agenda', {
                userId,
                ip: req.ip
            });

            const event = await Event.findById(eventId);
            if (!event) {
                throw new AppError('Evento no encontrado', 404, 'EVENT_NOT_FOUND');
            }

            // Verificar si el usuario ya tiene guardado el evento
            if (event.savedByUsers.includes(userId)) {
                throw new AppError('El usuario ya tiene este evento guardado', 400, 'EVENT_ALREADY_SAVED');
            }

            // Agregar el usuario a la lista de guardados
            event.savedByUsers.push(userId);
            await event.save();

            req.logger.info('Evento guardado en tu agenda exitosamente', {
                action: 'event_save_success',
                userId,
                eventId,
                ip: req.ip
            });

            res.json({
                success: true,
                message: 'Evento guardado en tu agenda exitosamente',
                data: {
                    eventId: event._id,
                    savedByUser: true,
                    totalSaves: event.savedByUsers.length
                }
            });
        } catch (error) {
            next(error);
        }
    };

    /**
     * @method unsaveEventForUser
     * @async
     * @description Permite a un usuario quitar un evento de su agenda personal
     * @param {Object} req - Objeto de petición Express
     * @param {Object} res - Objeto de respuesta Express
     * @param {Function} next - Función para pasar al siguiente middleware
     * @returns {Promise<void>} No retorna directamente, envía respuesta JSON con resultados
     */
    unsaveEventForUser = async (req, res, next) => {
        try {
            const { id: eventId } = req.params;
            const { id: userId } = req.user;

            req.logger.debug('Inicio quitar evento de agenda', {
                userId,
                ip: req.ip
            });

            const event = await Event.findById(eventId);
            if (!event) {
                throw new AppError('Evento no encontrado', 404, 'EVENT_NOT_FOUND');
            }

            // Verificar si el usuario tiene guardado el evento
            if (!event.savedByUsers.includes(userId)) {
                throw new AppError('El usuario no tiene este evento guardado', 400, 'EVENT_NOT_SAVED');
            }

            // Remover el usuario de la lista de guardados
            event.savedByUsers = event.savedByUsers.filter(id => id.toString() !== userId);
            await event.save();

            req.logger.info('Evento removido de tu agenda exitosamente', {
                action: 'event_unsave_success',
                userId,
                eventId,
                ip: req.ip
            });

            res.json({
                success: true,
                message: 'Evento removido de tu agenda exitosamente',
                data: {
                    eventId: event._id,
                    savedByUser: false,
                    totalSaves: event.savedByUsers.length
                }
            });
        } catch (error) {
            next(error);
        }
    };
}