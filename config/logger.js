import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Configuración de rutas ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cargar variables de entorno
dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';
const LOG_DIR = process.env.LOG_DIR || path.join(__dirname, '../logs');

// Definición de niveles y colores
const logLevels = {
    fatal: 0,
    error: 1,
    warn: 2,
    info: 3,
    http: 4,
    debug: 5
};

const logColors = {
    fatal: 'red',
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'blue'
};

winston.addColors(logColors);

// 1. Definir el orden deseado de campos
const FIELD_ORDER = [
    'timestamp',
    'service',
    'level',
    'message',
    'requestId',
    'code',
    'context',
    'userId',
    'ip',
    'userAgent',
    'role',
    'path',
    'method',
    'stack',
    'durationMs'
];

// 2. Formateador JSON con campos ordenados
const orderedJsonFormat = winston.format.printf((info) => {
    const orderedLog = {};
    const remainingFields = {};

    // Separar campos ordenados del resto
    Object.keys(info).forEach(key => {
        if (FIELD_ORDER.includes(key)) {
            orderedLog[key] = info[key];
        } else if (!['timestamp', 'level', 'message'].includes(key)) {
            remainingFields[key] = info[key];
        }
    });

    // Construir objeto con orden exacto
    const result = {};
    FIELD_ORDER.forEach(field => {
        if (orderedLog[field] !== undefined) {
            result[field] = orderedLog[field];
        }
    });

    // Agregar campos restantes
    Object.assign(result, remainingFields);

    return JSON.stringify(result);
});

// Formateador que incluye requestId automáticamente
const requestAwareFormat = winston.format((info) => {
    // Verificar si viene de un child logger con requestId
    if (info.requestId) {
        return info;
    }

    // Buscar requestId en varios lugares posibles
    const requestId = info.req?.requestId ||
        info.metadata?.req?.requestId ||
        info.metadata?.requestId;

    if (requestId) {
        info.requestId = requestId;
    }

    return info;
});

// 3. Formato para consola (legible para humanos)
const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message, ...metadata }) => {
        let msg = `${timestamp} [${level}]: ${message}`;
        if (Object.keys(metadata).length > 0) {
            msg += ` ${JSON.stringify(metadata)}`;
        }
        return msg;
    })
);

// 4. Formato para archivos (JSON ordenado)
const fileFormat = winston.format.combine(
    requestAwareFormat(),
    winston.format.timestamp(),
    winston.format((info) => {
        // Añadir servicio por defecto si no existe
        if (!info.service) {
            info.service = 'red-egresados-backend';
        }
        return info;
    })(),
    orderedJsonFormat
);

// Configuración común para archivos rotativos
const fileRotateOptions = (subfolder) => ({
    // dirname: LOG_DIR,
    dirname: path.join(LOG_DIR, subfolder),
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '30d',
    format: fileFormat,
    createSymlink: true,
    symlinkName: 'current.log'
});

// Configuración de transports
const transports = [
    // Consola (solo en desarrollo con más detalle)
    new winston.transports.Console({
        level: isProduction ? 'warn' : 'debug', // En producción solo warnings y superiores
        format: consoleFormat,
        silent: isProduction && process.env.DISABLE_CONSOLE_LOG === 'true' // Opcional: deshabilitar completamente en producción
    }),

    // Archivo de aplicación general (solo en producción)
    ...(isProduction ? [
        new DailyRotateFile({
            ...fileRotateOptions('application'),
            filename: 'application-%DATE%.log',
            level: 'info',
            maxFiles: '30d'
        })
    ] : []),

    // Archivo de errores (más detallado en desarrollo)
    new DailyRotateFile({
        ...fileRotateOptions('error'),
        filename: 'error-%DATE%.log',
        level: isProduction ? 'error' : 'warn', // En desarrollo capturamos también warnings
        maxFiles: isProduction ? '90d' : '7d' // En producción guardamos por más tiempo
    }),

    // Archivo HTTP (solo en producción)
    ...(isProduction ? [
        new DailyRotateFile({
            ...fileRotateOptions('http'),
            filename: 'http-%DATE%.log',
            level: 'http'
        })
    ] : []),

    // Archivo de seguridad (activo en ambos entornos pero con diferente retención)
    new DailyRotateFile({
        ...fileRotateOptions('security'),
        filename: 'security-%DATE%.log',
        level: 'warn',
        filter: (log) => log.context === 'security',
        maxFiles: isProduction ? '180d' : '30d'
    }),

    // Archivo de validación (activo en ambos entornos pero con diferente retención)
    new DailyRotateFile({
        ...fileRotateOptions('validation'),
        filename: 'validation-%DATE%.log',
        level: 'warn',
        filter: (log) => log.context === 'validation',
        maxFiles: isProduction ? '180d' : '30d'
    })
];

// Crear el logger principal
const logger = winston.createLogger({
    levels: logLevels,
    transports,
    exceptionHandlers: [
        new DailyRotateFile({
            ...fileRotateOptions('exceptions'),
            filename: 'exceptions/exceptions-%DATE%.log',
            level: 'error',
            maxFiles: isProduction ? '90d' : '7d'
        })
    ],
    rejectionHandlers: [
        new DailyRotateFile({
            ...fileRotateOptions('rejections'),
            filename: 'rejections/rejections-%DATE%.log',
            level: 'error',
            maxFiles: isProduction ? '90d' : '7d'
        })
    ],
    exitOnError: false
});

logger.morganStream = {
    write: (message) => {
        const regex = /^(\S+) \S+ \S+ \[([^\]]+)\] "(\S+) (\S+) HTTP\/[^"]+" (\d+) (\d+) "([^"]*)" "([^"]*)"(?: (\d+)ms)?$/;
        const matches = message.trim().match(regex);

        if (matches) {
            const [ip, , method, url, status, length, referrer, userAgent, responseTime] = matches;
            logger.http('Solicitud HTTP', {
                ip,
                method,
                path: url,
                status: parseInt(status),
                length: parseInt(length),
                ...(responseTime && { responseTime: parseInt(responseTime) }),
                userAgent: userAgent !== '-' ? userAgent : undefined,
                referrer: referrer !== '-' ? referrer : undefined,
                ...(req?.requestId && { requestId: req.requestId })
            });
        } else {
            logger.http(message.trim());
        }
    }
};

export default logger;