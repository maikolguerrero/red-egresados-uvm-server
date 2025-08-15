/**
 * @fileoverview Script de inicialización para crear el primer usuario administrador
 * @module scripts/createAdmin
 * @requires mongoose - Para operaciones con MongoDB
 * @requires bcrypt - Para hashing de contraseñas
 * @requires dotenv - Manejo de variables de entorno
 * @requires ../models/User - Modelo de usuario
 * @requires ../config/db - Conexión a la base de datos
 * @requires ../config/logger - Logger personalizado
 * 
 * @description  
 * Script que:
 * - Crea el primer usuario administrador del sistema  
 * - Valida variables de entorno requeridas  
 * - Verifica unicidad de credenciales  
 * - Hashea la contraseña de forma segura  
 * - Maneja errores con logging detallado
 * 
 * @example
 * // Ejecución desde línea de comandos:
 * node src/scripts/createAdmin.js
 * 
 * // Requiere variables de entorno en .env:
 * FIRST_ADMIN_EMAIL
 * FIRST_ADMIN_USERNAME
 * FIRST_ADMIN_PASSWORD
 * FIRST_ADMIN_FULLNAME
 */

import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import User from '../models/User.js';
import connectDB from '../config/db.js';
import logger from '../config/logger.js';

dotenv.config();

/**
 * @constant {boolean} isProduction
 * @description Indica si el script se ejecuta en entorno de producción
 */
const isProduction = process.env.NODE_ENV === 'production';

/**
 * @constant {object} connectionOptions
 * @description Opciones de conexión mejoradas para MongoDB
 * @property {number} serverSelectionTimeoutMS - Tiempo de espera para selección de servidor (5s)
 * @property {number} socketTimeoutMS - Tiempo de espera de socket (10s)
 * @property {number} maxPoolSize - Tamaño máximo del pool de conexiones (1)
 */
const connectionOptions = {
    serverSelectionTimeoutMS: 5000,  // 5 segundos (suficiente para una conexión local)
    socketTimeoutMS: 10000,          // 10 segundos (tiempo para la operación)
    maxPoolSize: 1                   // Solo necesitamos una conexión
};

/**
 * Hashea la contraseña del administrador usando bcrypt
 * @async
 * @function getHashedPassword
 * @returns {Promise<string>} Contraseña hasheada
 * @throws {Error} Si falla el hashing
 * 
 * @example
 * const hashedPass = await getHashedPassword();
 */
async function getHashedPassword() {
    try {
        const hashedPassword = await bcrypt.hash(process.env.FIRST_ADMIN_PASSWORD, 10);
        logger.debug('Contraseña hasheada generada', { context: 'setup' });
        return hashedPassword;
    } catch (error) {
        logger.error('Error al hashear la contraseña', {
            context: 'setup',
            error: error.message,
            stack: !isProduction ? error.stack : undefined
        });
        throw error;
    }
}

/**
 * Verifica que email y username sean únicos en la base de datos
 * @async
 * @function checkUniqueCredentials
 * @param {string} email - Email a verificar
 * @param {string} username - Nombre de usuario a verificar
 * @returns {Promise<Object>} Objeto con resultados
 * @property {boolean} isUnique - Indica si las credenciales son únicas
 * @property {string} [field] - Campo duplicado (si aplica)
 * 
 * @example
 * const { isUnique } = await checkUniqueCredentials('admin@uvm.edu.ve', 'admin');
 */
async function checkUniqueCredentials(email, username) {
    const scriptLogger = logger.child({ module: 'createAdminScript' });

    try {
        scriptLogger.debug('Verificando unicidad de credenciales...', {
            email: email,
            username: username
        });

        // Verificar si el email ya existe
        const existingEmail = await User.findOne({ email: email });
        if (existingEmail) {
            scriptLogger.warn('El email ya está registrado', {
                existingEmail: email,
                existingUserId: existingEmail._id
            });
            return { isUnique: false, field: 'email' };
        }

        // Verificar si el username ya existe
        const existingUsername = await User.findOne({ username: username });
        if (existingUsername) {
            scriptLogger.warn('El username ya está registrado', {
                existingUsername: username,
                existingUserId: existingUsername._id
            });
            return { isUnique: false, field: 'username' };
        }

        scriptLogger.debug('Credenciales verificadas como únicas');
        return { isUnique: true };
    } catch (error) {
        scriptLogger.error('Error al verificar credenciales únicas', {
            error: error.message,
            stack: !isProduction ? error.stack : undefined
        });
        throw error;
    }
}

/**
 * Función principal que orquesta la creación del administrador
 * @async
 * @function createFirstAdmin
 * @description  
 * Flujo de ejecución:
 * 1. Conecta a la base de datos  
 * 2. Valida variables de entorno requeridas  
 * 3. Verifica unicidad de credenciales  
 * 4. Hashea la contraseña  
 * 5. Crea el usuario administrador  
 * 6. Desconecta de la base de datos
 * 
 * @throws {Error} 
 * - Si faltan variables de entorno  
 * - Si las credenciales ya existen  
 * - Si falla la conexión a la base de datos
 * 
 * @example
 * // Ejecución directa (desde línea de comandos):
 * node src/scripts/createAdmin.js
 */
async function createFirstAdmin() {
    // Crear un logger específico para este script
    const scriptLogger = logger.child({ module: 'createAdminScript' });
    try {
        scriptLogger.info('Iniciando creación de usuario administrador...');

        // Conectar a la BD
        scriptLogger.debug('Conectando a la base de datos...');
        await connectDB(connectionOptions);

        // Validar variables de entorno
        const requiredEnvVars = [
            'FIRST_ADMIN_EMAIL',
            'FIRST_ADMIN_USERNAME',
            'FIRST_ADMIN_PASSWORD',
            'FIRST_ADMIN_FULLNAME'
        ];

        const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
        if (missingVars.length > 0) {
            scriptLogger.error('Faltan variables de entorno requeridas', {
                missingVariables: missingVars,
                context: 'configuration'
            });
            throw new Error(`Faltan variables de entorno: ${missingVars.join(', ')}`);
        }

        // Verificar unicidad de credenciales
        const uniquenessCheck = await checkUniqueCredentials(
            process.env.FIRST_ADMIN_EMAIL,
            process.env.FIRST_ADMIN_USERNAME
        );

        if (!uniquenessCheck.isUnique) {
            scriptLogger.error('No se puede crear admin: credenciales no únicas', {
                duplicateField: uniquenessCheck.field,
                email: process.env.FIRST_ADMIN_EMAIL,
                username: process.env.FIRST_ADMIN_USERNAME
            });
            throw new Error(`El ${uniquenessCheck.field} ya está registrado`);
        }

        // Datos del admin desde variables de entorno
        const adminData = {
            fullName: process.env.FIRST_ADMIN_FULLNAME,
            username: process.env.FIRST_ADMIN_USERNAME,
            email: process.env.FIRST_ADMIN_EMAIL,
            password: await getHashedPassword(),
            role: 'superadmin',
            isVerified: true, // El admin no necesita verificación
            isActive: true // El admin está activo
        };

        // Verificar si ya existe un admin (superadmin)
        scriptLogger.debug('Buscando administradores existentes...');
        const existingAdmin = await User.findOne({ role: 'superadmin' });
        if (existingAdmin) {
            scriptLogger.warn('Ya existe un administrador en el sistema', {
                existingAdminEmail: existingAdmin.email,
                adminId: existingAdmin._id,
                context: 'setup'
            });
        } else {
            // Crear admin
            scriptLogger.info('Creando nuevo usuario administrador...', {
                email: adminData.email,
                username: adminData.username
            });
            await User.create(adminData);
            scriptLogger.info('Administrador principal creado exitosamente', {
                adminId: adminData._id,
                email: adminData.email,
                username: adminData.username,
                context: 'setup'
            });
        }

        scriptLogger.debug('Desconectando de la base de datos...');
        await mongoose.disconnect();
        scriptLogger.info('Proceso completado exitosamente');
    } catch (error) {
        scriptLogger.error('Error durante la creación del administrador', {
            error: error.message,
            stack: !isProduction ? error.stack : undefined,
            context: 'setup',
            severity: 'critical'
        });
        process.exit(1);
    }
}

// Ejecutar el script
createFirstAdmin();