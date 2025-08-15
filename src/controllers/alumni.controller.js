/**
 * @fileoverview Controlador para operaciones de egresados
 * @module controllers/alumni.controller
 * @requires stream
 * @requires readline
 * @requires ../models/User
 * @requires ../models/UserProfile
 * @requires ../models/EgresadoPregrado
 * @requires ../models/EgresadoPostgrado
 * @requires AppError
 */

import { Readable } from 'stream';
import { createInterface } from 'readline';
import User from '../models/User.js';
import UserProfile from '../models/UserProfile.js';
import EgresadoPregrado from '../models/EgresadoPregrado.js';
import EgresadoPostgrado from '../models/EgresadoPostgrado.js';
import AppError from '../middlewares/AppError.js';

/**
 * @classdesc Controlador para operaciones relacionadas con egresados
 * @class AlumniController
 * 
 * @description
 * Maneja todas las operaciones relacionadas con:
 * - Búsqueda y filtrado de egresados
 * - Obtención de perfiles públicos
 * 
 * @example
 * // Uso típico en rutas:
 * const alumniController = new AlumniController();
 * router.get('/search', alumniController.searchAlumni);
 */
export default class AlumniController {
    /**
    * @description Crea una instancia del controlador de autenticación
    * @param {FileService} fileService - Servicio de envío de archivos
    * @example
    * const fileService = new FileService();
    * const alumniController = new AlumniController(fileService);
    */
    constructor(fileService) {
        this.fileService = fileService;
    }

    /**
     * @method checkAlumni
     * @async
     * @description Verifica si una cédula corresponde a un egresado
     * @param {Object} req - Objeto de petición Express
     * @param {Object} res - Objeto de respuesta Express
     * @param {Function} next - Función para pasar al siguiente middleware
     * @returns {Promise<void>} No retorna directamente, envía respuesta JSON con el resultado
     */
    checkAlumni = async (req, res, next) => {
        try {
            const { cedula } = req.params;

            req.logger.debug('Verificando egresado', {
                cedula,
                ip: req.ip
            });

            // Buscar en pregrado y postgrado simultáneamente
            const [pregrados, postgrados] = await Promise.all([
                EgresadoPregrado.find({ cedula }),
                EgresadoPostgrado.find({ cedula })
            ]);

            if (pregrados.length === 0 && postgrados.length === 0) {
                return res.status(200).json({
                    success: true,
                    esEgresado: false,
                    mensaje: 'No se encontró egresado con esta cédula'
                });
            }

            // Obtener nombre del primer registro encontrado
            const nombreCompleto = pregrados[0]?.nombreCompleto || postgrados[0]?.nombreCompleto;

            // Formatear respuesta
            const response = {
                success: true,
                esEgresado: true,
                datos: {
                    nombreCompleto,
                    cedula,
                    carrerasPregrado: pregrados.map(p => ({
                        carrera: p.carrera,
                        fechaGrado: p.fechaGrado
                    })),
                    programasPostgrado: postgrados.map(p => ({
                        programa: p.programa,
                        fechaGrado: p.fechaGrado
                    }))
                }
            };

            res.json(response);

        } catch (error) {
            next(error);
        }
    }

    /**
     * @method searchAlumni
     * @async
     * @description Busca egresados según criterios especificados (todos los filtros se aplican simultáneamente)
     * @param {Object} req - Objeto de petición Express
     * @param {Object} res - Objeto de respuesta Express
     * @param {Function} next - Función para pasar al siguiente middleware
     * @returns {Promise<void>} No retorna directamente, envía respuesta JSON con resultados
     */
    searchAlumni = async (req, res, next) => {
        try {
            const { query, degree, graduationYear, location } = req.query;
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 10;
            const skip = (page - 1) * limit;

            req.logger.debug('Inicio búsqueda de egresados', {
                ip: req.ip,
                queryParams: req.query
            });

            // 1. Filtro base para usuarios egresados activos
            const userFilter = {
                role: 'egresado',
                isActive: true,
                isVerified: true
            };

            // 2. Obtener todos los IDs que cumplen con cada filtro individual
            const filterConditions = [];

            // Filtro por carrera/programa
            if (degree) {
                const [pregradoIds, postgradoIds] = await Promise.all([
                    EgresadoPregrado.find({ carrera: { $regex: degree, $options: 'i' } }).select('_id'),
                    EgresadoPostgrado.find({ programa: { $regex: degree, $options: 'i' } }).select('_id')
                ]);

                const degreeUserIds = await User.find({
                    $or: [
                        { pregrado: { $in: pregradoIds.map(doc => doc._id) } },
                        { postgrado: { $in: postgradoIds.map(doc => doc._id) } }
                    ]
                }).select('_id');

                filterConditions.push({ _id: { $in: degreeUserIds.map(u => u._id) } });
            }

            // Filtro por año de graduación
            if (graduationYear) {
                const startDate = new Date(`${graduationYear}-01-01 00:00:00`);
                const endDate = new Date(`${graduationYear}-12-31 23:59:59`);

                const [pregradoIds, postgradoIds] = await Promise.all([
                    EgresadoPregrado.find({ fechaGrado: { $gte: startDate, $lte: endDate } }).select('_id'),
                    EgresadoPostgrado.find({ fechaGrado: { $gte: startDate, $lte: endDate } }).select('_id')
                ]);

                const yearUserIds = await User.find({
                    $or: [
                        { pregrado: { $in: pregradoIds.map(doc => doc._id) } },
                        { postgrado: { $in: postgradoIds.map(doc => doc._id) } }
                    ]
                }).select('_id');

                filterConditions.push({ _id: { $in: yearUserIds.map(u => u._id) } });
            }

            // Filtro por ubicación
            if (location) {
                const profiles = await UserProfile.find({
                    'personalData.location': { $regex: location, $options: 'i' }
                }).select('user');
                filterConditions.push({ _id: { $in: profiles.map(p => p.user) } });
            }

            // Filtro por texto general (nombre, email, username, título profesional)
            if (query) {
                const [pregradoIds, postgradoIds, emailProfiles] = await Promise.all([
                    EgresadoPregrado.find({ nombreCompleto: { $regex: query, $options: 'i' } }).select('_id'),
                    EgresadoPostgrado.find({ nombreCompleto: { $regex: query, $options: 'i' } }).select('_id'),
                    UserProfile.find({
                        $or: [
                            { 'contact.alternateEmail': { $regex: query, $options: 'i' } },
                            { 'professional.title': { $regex: query, $options: 'i' } }
                        ]
                    }).select('user')
                ]);

                const textUserIds = await User.find({
                    $or: [
                        { pregrado: { $in: pregradoIds.map(doc => doc._id) } },
                        { postgrado: { $in: postgradoIds.map(doc => doc._id) } },
                        { _id: { $in: emailProfiles.map(p => p.user) } },
                        { username: { $regex: query, $options: 'i' } }
                    ]
                }).select('_id');

                filterConditions.push({ _id: { $in: textUserIds.map(u => u._id) } });
            }

            // 3. Construir el filtro final que debe cumplir TODAS las condiciones
            const finalFilter = {
                ...userFilter,
                ...(filterConditions.length > 0 ? { $and: filterConditions } : {})
            };

            // 4. Ejecutar consulta final con paginación
            const [total, users] = await Promise.all([
                User.countDocuments(finalFilter),
                User.find(finalFilter)
                    .populate({
                        path: 'pregrado',
                        select: 'nombreCompleto carrera fechaGrado -_id',
                        options: { sort: { fechaGrado: -1 } }
                    })
                    .populate({
                        path: 'postgrado',
                        select: 'nombreCompleto programa fechaGrado -_id',
                        options: { sort: { fechaGrado: -1 } }
                    })
                    .populate({
                        path: 'profile',
                        select: 'personalData.location socialMedia professional -_id'
                    })
                    .select('-password -__v')
                    .skip(skip)
                    .limit(limit)
                    .sort({ 'pregrado.nombreCompleto': 1 })
            ]);

            // 5. Formatear resultados
            const formattedResults = users.map(user => {
                const carrerasPregrado = user.pregrado?.sort((a, b) => new Date(b.fechaGrado) - new Date(a.fechaGrado)) || [];
                const programasPostgrado = user.postgrado?.sort((a, b) => new Date(b.fechaGrado) - new Date(a.fechaGrado)) || [];

                const nombreCompleto = carrerasPregrado[0]?.nombreCompleto ||
                    programasPostgrado[0]?.nombreCompleto ||
                    user.username;

                return {
                    id: user._id,
                    username: user.username,
                    profilePicture: user.profilePicture,
                    lastLogin: user.lastLogin,
                    nombreCompleto,
                    ubicacion: user.profile?.personalData?.location,
                    carrerasPregrado: carrerasPregrado.map(p => ({
                        carrera: p.carrera,
                        fechaGrado: p.fechaGrado
                    })),
                    programasPostgrado: programasPostgrado.map(p => ({
                        programa: p.programa,
                        fechaGrado: p.fechaGrado
                    })),
                    tituloProfesional: user.profile?.professional?.title,
                    redesSociales: user.profile?.socialMedia
                };
            });

            res.json({
                success: true,
                pagination: {
                    total,
                    page,
                    pages: Math.ceil(total / limit),
                    limit
                },
                data: formattedResults
            });

        } catch (error) {
            next(error);
        }
    }


    /**
 * @method getAlumniProfileByUsername
 * @async
 * @description Obtiene el perfil público de un egresado incluyendo información de UserProfile
 * @param {Object} req - Objeto de petición Express
 * @param {Object} res - Objeto de respuesta Express
 * @param {Function} next - Función para pasar al siguiente middleware
 * @returns {Promise<void>} No retorna directamente, envía respuesta JSON con el perfil completo
 */
    getAlumniProfileByUsername = async (req, res, next) => {
        try {
            const { username } = req.params;

            req.logger.debug('Buscando perfil público de egresado', {
                action: 'get_public_profile',
                username,
                ip: req.ip
            });

            // Buscar usuario con todos los datos relacionados
            const user = await User.findOne({
                username: username.toLowerCase()
            })
                .select('-password -verificationToken -verificationTokenExpires -verificationDate -verificationAttempts -lastVerificationAttempt -resetPasswordToken -resetPasswordExpires -__v -profilePicture.uploadedAt')
                .populate({
                    path: 'profile',
                    select: '-__v -user -createdAt -updatedAt'
                });

            if (user.role === 'egresado') {
                user.pregrado = await EgresadoPregrado.find({ user: user._id })
                    .select('nombreCompleto cedula carrera fechaGrado -_id')
                    .sort({ fechaGrado: -1 });

                user.postgrado = await EgresadoPostgrado.find({ user: user._id })
                    .select('nombreCompleto cedula programa fechaGrado -_id')
                    .sort({ fechaGrado: -1 });
            }

            if (!user) {
                throw new AppError('Usuario no encontrado', 404, 'USER_NOT_FOUND', {
                    action: 'get_public_profile',
                    username,
                    ip: req.ip
                });
            }

            // Verificar que tenga al menos una carrera de pregrado o postgrado
            if (user.role === 'egresado' && (!user.pregrado || user.pregrado.length === 0) && (!user.postgrado || user.postgrado.length === 0)) {
                throw new AppError('Datos académicos no encontrados', 404, 'ACADEMIC_DATA_NOT_FOUND', {
                    action: 'get_public_profile',
                    username,
                    userId: user._id,
                    ip: req.ip
                });
            }

            // Obtener datos básicos del primer registro de pregrado o postgrado (el más reciente por el sort)
            const primerRegistro = user.pregrado?.[0] || user.postgrado?.[0];
            const datosBasicos = {
                nombreCompleto: primerRegistro?.nombreCompleto,
                cedula: primerRegistro?.cedula
            };

            // Convertir a objetos
            const userData = user.toObject();
            const profileData = user.profile?.toObject() || {};

            // Estructurar respuesta
            const response = {
                ...datosBasicos,
                user: {
                    id: userData.id,
                    username: userData.username,
                    fullName: userData.fullName,
                    profilePicture: userData.profilePicture,
                    role: userData.role,
                    lastLogin: userData.lastLogin,
                },
                carrerasPregrado: user.pregrado?.map(p => ({
                    carrera: p.carrera,
                    fechaGrado: p.fechaGrado,
                    numeroAsignado: p.numeroAsignado
                })) || [],
                programasPostgrado: user.postgrado?.map(p => ({
                    programa: p.programa,
                    fechaGrado: p.fechaGrado,
                    numeroAsignado: p.numeroAsignado
                })) || [],
                profile: profileData
            };

            req.logger.info('Perfil público obtenido exitosamente', {
                action: 'get_public_profile_success',
                username,
                userId: user._id,
                ip: req.ip
            });

            res.json({
                success: true,
                data: response
            });
        } catch (error) {
            next(error);
        }
    }

    /**
     * @method updateProfile
     * @async
     * @description Actualiza el perfil del usuario autenticado
     * @param {Object} req - Objeto de petición Express
     * @param {Object} res - Objeto de respuesta Express
     * @param {Function} next - Función para pasar al siguiente middleware
     * @returns {Promise<void>} No retorna directamente, envía respuesta JSON
     * @throws {AppError} Con errores específicos:
     *  - 404 si no se encuentra el perfil
     *  - 500 si hay error al actualizar
     */
    updateProfile = async (req, res, next) => {
        try {
            const userId = req.user.id;
            const updateData = req.body;

            req.logger.debug('Inicio de actualización de perfil', {
                action: 'profile_update',
                userId,
                ip: req.ip,
                updateFields: Object.keys(updateData)
            });

            // Buscar el perfil del usuario
            const userProfile = await UserProfile.findOne({ user: userId });

            if (!userProfile) {
                throw new AppError(
                    'Perfil no encontrado',
                    404,
                    'PROFILE_NOT_FOUND',
                    {
                        action: 'profile_update',
                        userId,
                        ip: req.ip
                    }
                );
            }

            // Función para actualizar arrays con items manteniendo los IDs
            const updateArrayWithVisibility = (fieldName, idField = '_id') => {
                if (updateData[fieldName]) {
                    // Actualizar isPublic si viene en el payload
                    if (updateData[fieldName].isPublic !== undefined) {
                        userProfile[fieldName].isPublic = updateData[fieldName].isPublic;
                    }

                    // Actualizar items si vienen en el payload
                    if (updateData[fieldName].items) {
                        userProfile[fieldName].items = updateData[fieldName].items.map(item => {
                            // Si el item tiene ID, buscarlo en el array existente para mantenerlo
                            if (item[idField]) {
                                const existingItem = userProfile[fieldName].items.find(
                                    existing => existing[idField].toString() === item[idField].toString()
                                );
                                if (existingItem) {
                                    return { ...existingItem.toObject(), ...item };
                                }
                            }
                            return item;
                        });
                    }
                }
            };

            // Actualizar datos personales
            if (updateData.personalData) {
                userProfile.personalData = {
                    ...userProfile.personalData,
                    ...updateData.personalData
                };
            }

            // Actualizar datos de contacto
            if (updateData.contact) {
                userProfile.contact = {
                    ...userProfile.contact,
                    ...updateData.contact
                };
            }

            // Actualizar datos de redes sociales
            if (updateData.socialMedia) {
                userProfile.socialMedia = {
                    ...userProfile.socialMedia,
                    ...updateData.socialMedia
                };
            }

            // Actualizar datos profesionales
            if (updateData.professional) {
                // Actualizar campos simples (title, summary)
                if (updateData.professional.title) {
                    userProfile.professional.title = {
                        ...userProfile.professional.title,
                        ...updateData.professional.title
                    };
                }

                if (updateData.professional.summary) {
                    userProfile.professional.summary = {
                        ...userProfile.professional.summary,
                        ...updateData.professional.summary
                    };
                }

                // Manejar skills
                if (updateData.professional.skills) {
                    userProfile.professional.skills = {
                        values: [...new Set(updateData.professional.skills.values || [])],
                        isPublic: updateData.professional.skills.isPublic !== undefined
                            ? updateData.professional.skills.isPublic
                            : userProfile.professional.skills?.isPublic ?? true
                    };
                }

                // Manejar interests
                if (updateData.professional.interests) {
                    userProfile.professional.interests = {
                        values: [...new Set(updateData.professional.interests.values || [])],
                        isPublic: updateData.professional.interests.isPublic !== undefined
                            ? updateData.professional.interests.isPublic
                            : userProfile.professional.interests?.isPublic ?? true
                    };
                }
            }

            // Manejar experiencia laboral
            if (updateData.experience) {
                updateArrayWithVisibility('experience');

                // Validar que cada experiencia tenga los campos requeridos
                userProfile.experience.items.forEach(exp => {
                    if (!exp.position || !exp.company || !exp.startDate) {
                        throw new AppError(
                            'Experiencia laboral incompleta. Se requieren puesto, empresa y fecha de inicio',
                            400,
                            'INVALID_EXPERIENCE_DATA',
                            {
                                action: 'profile_update',
                                userId,
                                ip: req.ip
                            }
                        );
                    }
                });
            }

            // Manejar educación
            if (updateData.education) {
                updateArrayWithVisibility('education');

                // Validar campos requeridos
                userProfile.education.items.forEach(edu => {
                    if (!edu.institution) {
                        throw new AppError(
                            'Educación incompleta. Se requiere institución',
                            400,
                            'INVALID_EDUCATION_DATA',
                            {
                                action: 'profile_update',
                                userId,
                                ip: req.ip
                            }
                        );
                    }
                });
            }

            // Manejar certificaciones
            if (updateData.certifications) {
                updateArrayWithVisibility('certifications');

                // Validar campos requeridos
                userProfile.certifications.items.forEach(cert => {
                    if (!cert.name || !cert.issuingOrganization) {
                        throw new AppError(
                            'Certificación incompleta. Se requiere nombre y organización emisora',
                            400,
                            'INVALID_CERTIFICATION_DATA',
                            {
                                action: 'profile_update',
                                userId,
                                ip: req.ip
                            }
                        );
                    }
                });
            }

            // Guardar cambios
            const updatedProfile = await userProfile.save();

            req.logger.info('Perfil actualizado exitosamente', {
                action: 'profile_update_success',
                userId,
                updatedFields: Object.keys(updateData),
                ip: req.ip
            });

            res.json({
                success: true,
                message: 'Perfil actualizado correctamente',
                data: updatedProfile
            });

        } catch (error) {
            next(error);
        }
    }

    /**
     * @method updateProfilePicture
     * @async
     * @description Actualiza la foto de perfil del usuario autenticado
     * @param {Object} req - Objeto de petición Express
     * @param {Object} res - Objeto de respuesta Express
     * @param {Function} next - Función para pasar al siguiente middleware
     * @returns {Promise<void>} No retorna directamente, envía respuesta JSON
     * @throws {AppError} Con errores específicos:
     *  - 404 si no se encuentra el perfil
     *  - 500 si hay error al actualizar
     */
    updateProfilePicture = async (req, res, next) => {
        try {
            const { file } = req;
            const userId = req.user.id;

            req.logger.debug('Inicio actualización de foto de perfil', {
                userId,
                ip: req.ip
            });

            if (!file) {
                throw new AppError('Archivo no encontrado', 404, 'FILE_NOT_FOUND');
            }

            // 1. Validación ya realizada por el middleware
            const user = await User.findById(userId);
            if (!user) {
                throw new AppError('Usuario no encontrado', 404, 'USER_NOT_FOUND');
            }

            // 2. Convertir buffer a base64
            const fileBase64 = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;

            // 3. Eliminar imagen anterior si existe
            if (user.profilePicture.publicId) {
                await this.fileService.deleteFile(user.profilePicture.publicId);
                req.logger.info('Imagen anterior eliminada', {
                    action: 'updateProfilePicture',
                    userId,
                    publicId: user.profilePicture.publicId
                });
            }

            // 4. Subir nueva imagen
            const uploadResult = await this.fileService.uploadImage(
                fileBase64,
                userId,
                {
                    width: 300,
                    height: 300,
                    crop: 'fill',
                    gravity: 'face',
                    quality: 'auto:best',
                    format: 'webp',
                    folder: 'users/profile-pictures',
                    originalName: file.originalname
                }
            );

            if (!uploadResult.success) {
                throw new AppError('Error al procesar la imagen', 500, 'UPLOAD_FAILED', {
                    userId,
                    errorDetails: uploadResult.error
                });
            }

            const newProfilePicture = {
                url: uploadResult.url,
                publicId: uploadResult.publicId,
                format: uploadResult.format,
                dimensions: {
                    width: uploadResult.width,
                    height: uploadResult.height
                }
            };

            // 5. Actualizar usuario
            const updatedUser = await User.findByIdAndUpdate(
                userId,
                {
                    profilePicture: newProfilePicture
                },
                { new: true, runValidators: true }
            ).select('-__v -password -verificationToken -resetPasswordToken');

            if (!updatedUser) {
                throw new AppError('No se pudo actualizar la foto de perfil', 500, 'USER_NOT_FOUND');
            }

            req.logger.info('Foto de perfil actualizada', {
                action: 'updateProfilePicture',
                userId,
                newPublicId: uploadResult.publicId
            });

            // 6. Respuesta mejorada
            res.status(200).json({
                success: true,
                data: {
                    profilePicture: newProfilePicture
                }
            });

        } catch (error) {
            next(error);
        }
    };


    /**
     * @method processCSVUpload
     * @async
     * @description Procesa un archivo CSV para cargar datos de egresados
     * @param {Object} req - Objeto de petición Express
     * @param {Object} res - Objeto de respuesta Express
     * @param {Function} next - Función para pasar al siguiente middleware
     * @returns {Promise<void>} No retorna directamente, envía respuesta JSON
     * @throws {AppError} Con errores específicos:
     *  - 400 si no se proporciona un archivo
     *  - 500 si hay error al procesar el archivo
     */
    processCSVUpload = async (req, res, next, modelConfig) => {
        try {
            const { file } = req;

            if (!file) {
                throw new AppError('No se proporcionó un archivo', 400, 'FILE_NOT_FOUND');
            }

            const stats = {
                total: 0,
                inserted: 0,
                duplicates: 0,
                validationErrors: 0,
                dbErrors: 0,
                errorDetails: []
            };

            // Procesar el archivo CSV
            const stream = Readable.from(file.buffer.toString());
            const rl = createInterface({
                input: stream,
                crlfDelay: Infinity
            });

            let batch = [];
            const BATCH_SIZE = 1;
            let firstLine = true;

            for await (const line of rl) {
                // Saltar encabezado
                if (firstLine) {
                    firstLine = false;
                    continue;
                }

                stats.total++;

                try {
                    // Parsear y validar el registro según la configuración
                    const record = this.parseCSVLine(line, modelConfig);
                    const validationError = this.validateRecord(record, modelConfig);

                    if (validationError) {
                        // throw new AppError(validationError, 400, 'VALIDATION_ERROR');
                        if (validationError.type === 'ERROR_VALIDACION') {
                            stats.validationErrors++;
                        } else {
                            stats.dbErrors++;
                        }

                        stats.errorDetails.push({
                            line: stats.total + 1,
                            error: validationError,
                            code: 'ERROR_VALIDACION',
                            record: line.substring(0, 100) + (line.length > 100 ? '...' : '')
                        });
                    }

                    batch.push(record);

                    // Procesar lote completo
                    if (batch.length >= BATCH_SIZE) {
                        const result = await this.processBatch(batch, modelConfig.Model);
                        this.updateStats(stats, result, batch.length);
                        batch = [];
                    }
                } catch (error) {
                    throw new AppError(error.message, 400, 'ERROR_VALIDACION');
                }
            }

            // Procesar último lote
            if (batch.length > 0) {
                const result = await this.processBatch(batch, modelConfig.Model);
                this.updateStats(stats, result, batch.length);
            }

            res.json({
                success: true,
                ...stats,
                totalErrors: stats.validationErrors + stats.dbErrors
            });

        } catch (error) {
            next(error);
        }
    }

    /**
     * @method uploadPregrado
     * @async
     * @description Procesa archivo CSV para pregrado
     * @param {Object} req - Objeto de petición Express
     * @param {Object} res - Objeto de respuesta Express
     * @param {Function} next - Función para pasar al siguiente middleware
     * @returns {Promise<void>} No retorna directamente, envía respuesta JSON
     */
    uploadPregrado = async (req, res, next) => {
        const modelConfig = {
            Model: EgresadoPregrado,
            typeField: 'carrera',
            parseFn: this.parsePregradoLine,
            validateFn: this.validatePregradoRecord
        };
        return this.processCSVUpload(req, res, next, modelConfig);
    }

    /**
     * @method uploadPostgrado
     * @async
     * @description Procesa archivo CSV para postgrado
     * @param {Object} req - Objeto de petición Express
     * @param {Object} res - Objeto de respuesta Express
     * @param {Function} next - Función para pasar al siguiente middleware
     * @returns {Promise<void>} No retorna directamente, envía respuesta JSON
     */
    uploadPostgrado = async (req, res, next) => {
        const modelConfig = {
            Model: EgresadoPostgrado,
            typeField: 'programa',
            parseFn: this.parsePostgradoLine,
            validateFn: this.validatePostgradoRecord
        };
        return this.processCSVUpload(req, res, next, modelConfig);
    }

    /**
    * @method parseCSVLine
    * @description Parsea una línea del CSV según la configuración
    * @param {string} line - Línea del CSV
    * @param {Object} config - Configuración del modelo
    * @returns {Object} Objeto con los campos parseados
    */
    parseCSVLine(line, config) {
        const [nombreCompleto, cedula, typeField, actaGrado, fechaGrado, numeroAsignado, tomo, folio] =
            line.split(';').map(field => field.trim());

        return {
            nombreCompleto,
            cedula,
            [config.typeField]: typeField,
            actaGrado,
            fechaGrado,
            numeroAsignado,
            tomo,
            folio
        };
    }

    /**
     * @method validateRecord
     * @description Valida un registro antes de insertarlo
     * @param {Object} record - Registro a validar
     * @param {Object} config - Configuración del modelo
     * @returns {string|null} Mensaje de error o null si es válido
     */
    validateRecord(record, config) {
        // Validar formato de cédula
        if (!/^[VE]-\d+$/.test(record.cedula)) {
            return `Formato de cédula inválido: ${record.cedula}. Debe ser V-12345678 o E-12345678`;
        }

        // Formato esperado: DD/MM/YYYY o MM/DD/YYYY
        const parts = record.fechaGrado.split('/');
        if (parts.length !== 3) return `Formato de fecha inválido: ${record.fechaGrado}`;

        // Formato DD/MM/YYYY
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = parseInt(parts[2], 10);

        const date = new Date(year, month, day);
        if (isNaN(date.getTime())) return `Fecha inválida: ${record.fechaGrado}`;

        // Validar fecha
        if (!/\d{1,2}\/\d{1,2}\/\d{4}/.test(record.fechaGrado)) {
            return `Formato de fecha inválido: ${record.fechaGrado}. Debe ser dd/mm/yyyy`;
        }

        // Parsear fecha 
        record.fechaGrado = this.parseDate(record.fechaGrado);

        // Validar otros campos requeridos
        const requiredFields = ['nombreCompleto', config.typeField, 'actaGrado', 'numeroAsignado', 'tomo', 'folio'];
        for (const field of requiredFields) {
            if (!record[field] || record[field].trim() === '') {
                return `Campo requerido faltante: ${field}`;
            }
        }

        return null;
    }

    /**
     * @method processBatch
     * @async
     * @description Procesa un lote de registros
     * @param {Array} batch - Lote de registros
     * @param {Model} Model - Modelo Mongoose
     * @returns {Promise<Object>} Resultado del procesamiento
     */
    async processBatch(batch, Model) {
        try {
            const uniqueRecords = [];
            const duplicatesInBatch = [];

            for (const record of batch) {
                try {
                    // Verificar si ya existe el registro académico
                    const academicRecordExists = await Model.exists({
                        cedula: record.cedula,
                        [Model.modelName === 'EgresadoPregrado' ? 'carrera' : 'programa']:
                            Model.modelName === 'EgresadoPregrado' ? record.carrera : record.programa,
                        fechaGrado: record.fechaGrado
                    });

                    if (academicRecordExists) {
                        duplicatesInBatch.push({
                            record,
                            error: 'Registro académico duplicado (misma cédula, misma carrera/programa y misma fecha de grado)'
                        });
                        continue;
                    }

                    // Buscar usuario existente por cédula
                    const user = await User.findOne({
                        cedula: record.cedula
                    });

                    // Si encontramos un usuario, relacionamos el registro
                    if (user) {
                        record.user = user._id;

                        // Guardar el registro académico
                        const savedRecord = await Model.create(record);

                        // Actualizar el array correspondiente en el usuario
                        if (Model.modelName === 'EgresadoPregrado') {
                            await User.findByIdAndUpdate(user._id, {
                                $addToSet: { pregrado: savedRecord._id }
                            });
                        } else {
                            await User.findByIdAndUpdate(user._id, {
                                $addToSet: { postgrado: savedRecord._id }
                            });
                        }

                        uniqueRecords.push(savedRecord);
                    } else {
                        // Si no hay usuario, solo guardamos el registro académico
                        uniqueRecords.push(record);
                    }
                } catch (error) {
                    duplicatesInBatch.push({
                        record,
                        error: error.message
                    });
                }
            }

            // Insertar solo registros únicos que no se hayan guardado antes
            const recordsToInsert = uniqueRecords.filter(r => !r._id);
            let insertResult = { insertedCount: 0 };

            if (recordsToInsert.length > 0) {
                insertResult = await Model.insertMany(recordsToInsert, {
                    ordered: false,
                    rawResult: true
                });
            }

            return {
                inserted: insertResult.insertedCount + (uniqueRecords.length - recordsToInsert.length),
                duplicates: duplicatesInBatch.length,
                errors: duplicatesInBatch.concat(insertResult.writeErrors || [])
            };
        } catch (error) {
            return this.processOneByOne(batch, Model);
        }
    }

    /**
     * @method updateStats
     * @description Actualiza las estadísticas con los resultados del lote
     * @param {Object} stats - Estadísticas actuales
     * @param {Object} batchResult - Resultado del procesamiento del lote
     * @param {number} batchSize - Tamaño del lote
     */
    updateStats(stats, batchResult, batchSize) {
        stats.inserted += batchResult.inserted;
        stats.duplicates += batchResult.duplicates;

        // Diferenciar entre errores de validación y de base de datos
        const dbErrors = batchResult.errors.filter(e => !e.error.includes('duplicado'));
        stats.dbErrors += dbErrors.length;

        if (batchResult.errors.length > 0) {
            stats.errorDetails.push(...batchResult.errors.map(err => ({
                // line: `Lote ${stats.total - batchSize + 1}-${stats.total}`, // con 500 en batchSize
                line: `${stats.total + 1}`, // con 1 en batchSize
                error: err.errmsg || err.error,
                code: err.code || (err.error.includes('duplicado') ? 'EGRESADO_DUPLICADO' : 'DB_ERROR'),
                record: err.record || JSON.stringify(err.op || {}).substring(0, 100) + '...'
            })));
        }
    }

    /**
     * @method processOneByOne
     * @async
     * @description Procesa registros individualmente como fallback
     * @param {Array} batch - Lote de registros
     * @param {Model} Model - Modelo Mongoose
     * @returns {Promise<Object>} Resultado del procesamiento
     */
    async processOneByOne(batch, Model) {
        const result = {
            inserted: 0,
            duplicates: 0,
            errors: []
        };

        for (const record of batch) {
            try {
                // Verificar si ya existe el registro académico
                const academicRecordExists = await Model.exists({
                    cedula: record.cedula,
                    [Model.modelName === 'EgresadoPregrado' ? 'carrera' : 'programa']:
                        Model.modelName === 'EgresadoPregrado' ? record.carrera : record.programa,
                    fechaGrado: record.fechaGrado
                });

                if (academicRecordExists) {
                    result.duplicates++;
                    continue;
                }

                // Buscar usuario existente por cédula
                const user = await User.findOne({
                    cedula: record.cedula
                });

                // Si encontramos un usuario, relacionamos el registro
                if (user) {
                    record.user = user._id;
                    const savedRecord = await Model.create(record);

                    // Actualizar el array correspondiente en el usuario
                    if (Model.modelName === 'EgresadoPregrado') {
                        await User.findByIdAndUpdate(user._id, {
                            $addToSet: { pregrado: savedRecord._id }
                        });
                    } else {
                        await User.findByIdAndUpdate(user._id, {
                            $addToSet: { postgrado: savedRecord._id }
                        });
                    }
                } else {
                    await Model.create(record);
                }

                result.inserted++;
            } catch (error) {
                if (error.code === 11000) {
                    result.duplicates++;
                } else {
                    result.errors.push({
                        error: error.message,
                        record: JSON.stringify(record)
                    });
                }
            }
        }

        return result;
    }

    /**
     * @method parsePregradoLine
     * @description Parsea una línea del CSV de pregrado
     * @param {string} line - Línea del CSV
     * @returns {Object} Objeto con los campos parseados
     */
    parsePregradoLine(line) {
        const [nombreCompleto, cedula, carrera, actaGrado, fechaGrado, numeroAsignado, tomo, folio] =
            line.split(';').map(field => field.trim());

        if (!nombreCompleto || !cedula || !carrera || !actaGrado || !fechaGrado || !numeroAsignado || !tomo || !folio) {
            throw new Error('Faltan campos obligatorios');
        }

        // Formatear cédula si no tiene el prefijo V/E
        let formattedCedula = cedula;
        if (!/^[VEve]-/.test(cedula)) {
            formattedCedula = `V-${cedula}`;
        }

        return {
            nombreCompleto,
            cedula: formattedCedula,
            carrera,
            actaGrado,
            fechaGrado: this.parseDate(fechaGrado),
            numeroAsignado,
            tomo,
            folio
        };
    }

    /**
     * @method parsePostgradoLine
     * @description Parsea una línea del CSV de postgrado
     * @param {string} line - Línea del CSV
     * @returns {Object} Objeto con los campos parseados
     */
    parsePostgradoLine(line) {
        const [nombreCompleto, cedula, programa, actaGrado, fechaGrado, numeroAsignado, tomo, folio] =
            line.split(';').map(field => field.trim());

        if (!nombreCompleto || !cedula || !programa || !actaGrado || !fechaGrado || !numeroAsignado || !tomo || !folio) {
            throw new Error('Faltan campos obligatorios');
        }

        // Formatear cédula si no tiene el prefijo V/E
        let formattedCedula = cedula;
        if (!/^[VEve]-/.test(cedula)) {
            formattedCedula = `V-${cedula}`;
        }

        return {
            nombreCompleto,
            cedula: formattedCedula,
            programa,
            actaGrado,
            fechaGrado: this.parseDate(fechaGrado),
            numeroAsignado,
            tomo,
            folio
        };
    }

    /**
     * @method parseDate
     * @description Convierte string de fecha a objeto Date
     * @param {string} dateStr - String de fecha
     * @returns {Date} Objeto Date
     */
    parseDate(dateStr) {
        // Formato esperado: DD/MM/YYYY o MM/DD/YYYY
        const parts = dateStr.split('/');
        if (parts.length !== 3) throw new Error(`Formato de fecha inválido: ${dateStr}`);

        // Asumimos formato DD/MM/YYYY
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const year = parseInt(parts[2], 10);

        const date = new Date(year, month, day);
        if (isNaN(date.getTime())) throw new Error(`Fecha inválida: ${dateStr}`);

        return date;
    }
}