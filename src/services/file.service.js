/**
 * @fileoverview Servicio mejorado para manejo de archivos en Cloudinary
 * @module services/file.service
 * @requires cloudinary
 * @requires multer
 * @requires multer-storage-cloudinary
 * @requires dotenv
 * @requires AppError
 * 
 * @description
 * Versión mejorada con:
 * - Métodos separados para fotos y videos
 * - Configuraciones flexibles de dimensiones y calidad
 * - Validación mejorada de tipos de archivo
 * - Soporte para transformaciones avanzadas
 */

import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import multer from 'multer';
import dotenv from 'dotenv';
import AppError from '../middlewares/AppError.js';

dotenv.config();

// Configuración básica de Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
});

export default class FileService {
    constructor(logger) {
        this.logger = logger.child({ service: 'FileService' });
        this.cloudinary = cloudinary;

        // Configuración básica de Multer
        this.upload = multer({
            storage: new CloudinaryStorage({ cloudinary }),
            limits: { fileSize: 50 * 1024 * 1024 }, // 50MB máximo
            fileFilter: this._fileFilter.bind(this)
        });
    }

    /**
     * @private
     * @method _fileFilter
     * @description Filtro para tipos de archivo permitidos
     */
    _fileFilter(req, file, cb) {
        const allowedTypes = [
            'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif', // Imágenes
            'video/mp4', 'video/quicktime', 'video/x-msvideo' // Videos
        ];

        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            const error = new AppError(
                'Tipo de archivo no permitido',
                400,
                'INVALID_FILE_TYPE',
                {
                    action: 'file_upload',
                    mimeType: file.mimetype,
                    originalName: file.originalname,
                    allowedTypes
                }
            );
            cb(error, false);
        }
    }

    /**
     * @method uploadImage
     * @async
     * @description Sube una imagen con configuraciones personalizables
     * @param {Object} file - Archivo de Multer
     * @param {string} userId - ID del usuario
     * @param {Object} options - Opciones de configuración
     * @param {number} [options.width] - Ancho deseado
     * @param {number} [options.height] - Alto deseado
     * @param {string} [options.folder='profile'] - Carpeta de destino
     * @param {string} [options.quality='auto:good'] - Calidad de compresión
     * @param {string} [options.format='webp'] - Formato de salida
     * @returns {Promise<Object>} Resultado de la subida
     * 
     * @example
     * // Subir imagen con configuración personalizada
     * await fileService.uploadImage(fileBase64, userId, {
     *   width: 1280,
     *   height: 720,
     *   folder: 'profile',
     *   format: 'webp',
     *   originalName: 'aniversario',
     * });
     */
    async uploadImage(fileBase64, userId, options = {}) {
        const {
            width,
            height,
            crop = 'limit',
            folder = 'profile',
            quality = 'auto:good',
            format = 'webp',
            originalName = 'unknown',
            resource_type = 'image'
        } = options;

        const publicId = `img_${userId}_${Date.now()}`;
        const uploadPath = `uvm-alumni/${folder}/${userId}`;

        this.logger.info('Subiendo imagen', {
            action: 'uploadImage',
            userId,
            options,
            originalName
        });

        try {
            const result = await this.cloudinary.uploader.upload(fileBase64, {
                public_id: publicId,
                folder: uploadPath,
                transformation: [
                    { width, height, crop, quality, format },
                    { fetch_format: format }
                ],
                overwrite: true,
                resource_type: resource_type
            });

            this.logger.info('Imagen subida exitosamente', {
                action: 'uploadImage',
                publicId: result.public_id,
                url: result.secure_url
            });

            return {
                success: true,
                publicId: result.public_id,
                url: result.secure_url,
                width: result.width,
                height: result.height,
                format: result.format
            };
        } catch (error) {
            throw new AppError(
                'Error al subir la imagen',
                500,
                'IMAGE_UPLOAD_FAILED',
                {
                    userId,
                    originalName,
                    errorDetails: error.message
                }
            );
        }
    }

    /**
     * @method uploadVideo
     * @async
     * @description Sube un video con configuraciones personalizables
     * @param {Object} file - Archivo de Multer
     * @param {string} userId - ID del usuario
     * @param {Object} options - Opciones de configuración
     * @param {number} [options.width] - Ancho deseado
     * @param {number} [options.height] - Alto deseado
     * @param {string} [options.folder='videos'] - Carpeta de destino
     * @param {string} [options.quality='auto:good'] - Calidad de compresión
     * @param {string} [options.format='mp4'] - Formato de salida
     * @param {boolean} [options.audio=true] - Mantener audio
     * @returns {Promise<Object>} Resultado de la subida
     * 
     * @example
     * // Subir video con configuración personalizada
     * await fileService.uploadVideo(fileBase64, userId, {
     *   width: 1280,
     *   height: 720,
     *   folder: 'presentations',
     *   format: 'webm',
     *   audio: true,
     *   originalName: 'aniversario',
     * });
     */
    async uploadVideo(fileBase64, userId, options = {}) {
        const {
            width,
            height,
            folder = 'videos',
            quality = 'auto:good',
            format = 'mp4',
            audio = true,
            originalName = 'unknown',
            resource_type = 'video'
        } = options;

        const publicId = `vid_${userId}_${Date.now()}`;
        const uploadPath = `uvm-alumni/${folder}/${userId}`;

        this.logger.info('Subiendo video', {
            action: 'uploadVideo',
            userId,
            options,
            originalName
        });

        try {
            const result = await this.cloudinary.uploader.upload(fileBase64, {
                resource_type: resource_type,
                public_id: publicId,
                folder: uploadPath,
                transformation: [
                    { width, height, quality, format },
                    { audio_codec: audio ? 'aac' : 'none' }
                ],
                chunk_size: 6000000, // 6MB chunks
                eager_async: true
            });

            this.logger.info('Video subido exitosamente', {
                action: 'uploadVideo',
                publicId: result.public_id,
                url: result.secure_url,
                duration: result.duration
            });

            return {
                success: true,
                publicId: result.public_id,
                url: result.secure_url,
                duration: result.duration,
                format: result.format,
                width: result.width,
                height: result.height
            };
        } catch (error) {
            throw new AppError(
                'Error al subir el video',
                500,
                'VIDEO_UPLOAD_FAILED',
                {
                    userId,
                    originalName,
                    errorDetails: error.message
                }
            );
        }
    }

    /**
     * @method deleteFile
     * @async
     * @description Elimina un archivo de Cloudinary
     * @param {string} public_id - ID público del archivo en Cloudinary
     * @param {string} [resource_type='image'] - Tipo de recurso ('image' o 'video')
     * @returns {Promise<Object>} Resultado de la operación
     * 
     * @example
     * await fileService.deleteFile('uvm-alumni/profiles/user123/profile_123', 'image');
     */
    async deleteFile(public_id, resource_type = 'image') {
        this.logger.info('Eliminando archivo de Cloudinary', {
            action: 'deleteFile',
            public_id,
            resource_type
        });

        try {
            const result = await this.cloudinary.uploader.destroy(public_id, {
                resource_type: resource_type
            });

            if (result.result === 'ok') {
                this.logger.info('Archivo eliminado exitosamente', {
                    action: 'deleteFile',
                    public_id,
                    result
                });
                return { success: true };
            } else {
                this.logger.warn('No se pudo eliminar el archivo', {
                    action: 'deleteFile',
                    public_id,
                    result
                });
                return { success: false, error: result.result };
            }
        } catch (error) {
            this.logger.error('Error al eliminar archivo', {
                action: 'deleteFile',
                public_id,
                error: error.message,
                stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
            });
            return { success: false, error: error.message };
        }
    }

    /**
     * @method getSecureUrl
     * @description Genera una URL segura con transformaciones
     * @param {string} public_id - ID público del archivo
     * @param {Object} [options] - Opciones de transformación
     * @param {string} [options.resource_type='image'] - Tipo de recurso
     * @param {number} [options.width] - Ancho deseado
     * @param {number} [options.height] - Alto deseado
     * @param {string} [options.crop] - Tipo de crop ('fill', 'fit', etc.)
     * @param {string} [options.quality='auto'] - Calidad de la imagen
     * @returns {string} URL segura con transformaciones aplicadas
     * 
     * @example
     * const url = fileService.getSecureUrl('profile_123', {
     *   width: 200,
     *   height: 200,
     *   crop: 'fill'
     * });
     */
    getSecureUrl(public_id, options = {}) {
        const {
            resource_type = 'image',
            width,
            height,
            crop,
            quality = 'auto'
        } = options;

        const transformations = [];
        if (width) transformations.push({ width });
        if (height) transformations.push({ height });
        if (crop) transformations.push({ crop });
        transformations.push({ quality });

        return this.cloudinary.url(public_id, {
            secure: true,
            resource_type,
            transformation: transformations
        });
    }

    /**
     * @method getValidationMiddleware
     * @description Devuelve middleware Multer configurado solo para validación
     * @param {string} fieldName - Nombre del campo del formulario
     * @param {Object} [options] - Opciones adicionales
     * @param {number} [options.maxSize=50] - Tamaño máximo en MB
     * @returns {Function} Middleware de Multer para validación
     */
    getValidationMiddleware(fieldName = 'media', options = {}) {
        const maxSizeMB = options.maxSize || 50;
        const maxSizeBytes = maxSizeMB * 1024 * 1024;
        const type = options.type || 'media';
        const maxFiles = options.maxFiles || 1;

        return multer({
            storage: multer.memoryStorage(), // Almacena en memoria sin subir
            limits: {
                fileSize: maxSizeBytes,
                files: maxFiles
            },
            fileFilter: (req, file, cb) => {
                // Verificar tamaño
                if (file.size > maxSizeBytes) {
                    return cb(new AppError(
                        `El archivo excede el tamaño máximo de ${maxSizeMB}MB`,
                        413,
                        'FILE_TOO_LARGE',
                        {
                            fileName: file.originalname,
                            fileSize: file.size,
                            maxAllowed: maxSizeBytes
                        }
                    ));
                }

                // Verificar tipo de archivo
                const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif'];
                const allowedVideoTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo'];
                const allowedTextTypes = ['text/csv', 'application/vnd.ms-excel'];

                let allowedTypes;
                if (type === 'image') {
                    allowedTypes = allowedImageTypes;
                } else if (type === 'video') {
                    allowedTypes = allowedVideoTypes;
                } else if (type === 'text') {
                    allowedTypes = allowedTextTypes;
                } else { // 'media'
                    allowedTypes = [...allowedImageTypes, ...allowedVideoTypes, ...allowedTextTypes];
                }

                if (!allowedTypes.includes(file.mimetype)) {
                    return cb(new AppError(
                        'Tipo de archivo no permitido',
                        400,
                        'INVALID_FILE_TYPE',
                        {
                            mimeType: file.mimetype,
                            allowedTypes
                        }
                    ));
                }

                cb(null, true);
            }
        }).single(fieldName);
    }
}