import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import User from '../models/User.js'; // Asegúrate de que la ruta sea correcta
import connectDB from '../config/db.js'; // Importa la conexión como en loadAlumni.js
import logger from '../config/logger.js';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

// Configuración de conexión
const connectionOptions = {
    serverSelectionTimeoutMS: 5000,  // 5 segundos (suficiente para una conexión local)
    socketTimeoutMS: 10000,          // 10 segundos (tiempo para la operación)
    maxPoolSize: 1                   // Solo necesitamos una conexión
};

// Función para hashear la contraseña
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

// Función para verificar unicidad de credenciales
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

// Función principal para crear el administrador
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

        // const hashedPassword = await bcrypt.hash(process.env.FIRST_ADMIN_PASSWORD, 10);

        // Datos del admin desde variables de entorno
        const adminData = {
            fullName: process.env.FIRST_ADMIN_FULLNAME,
            username: process.env.FIRST_ADMIN_USERNAME,
            email: process.env.FIRST_ADMIN_EMAIL,
            password: await getHashedPassword(),
            role: 'admin',
            isVerified: true, // El admin no necesita verificación
            isActive: true // El admin está activo
        };

        // Verificar si ya existe un admin
        scriptLogger.debug('Buscando administradores existentes...');
        const existingAdmin = await User.findOne({ role: 'admin' });
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
                // console.log('✅ Administrador principal creado exitosamente:', adminData.email);
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