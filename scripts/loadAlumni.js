import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from '../config/db.js';
import Alumni from '../models/Alumni.js';
import fs from 'fs';
import { createInterface } from 'readline';
import logger from '../config/logger.js';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

// Configurar logger específico para este script
const scriptLogger = logger.child({ module: 'loadAlumniScript' });

// Configuración de conexión mejorada
const connectionOptions = {
    serverSelectionTimeoutMS: 60000,
    socketTimeoutMS: 120000,
    maxPoolSize: 100
};

// Estadísticas detalladas con más métricas
const stats = {
    startTime: new Date(),
    totalLines: 0,
    processed: 0,
    inserted: 0,
    validationErrors: 0,
    duplicates: 0,
    otherErrors: 0,
    batchesProcessed: 0,
    individualRetries: 0,
    errorDetails: []
};

// Función para validar un registro contra el esquema
async function validateRecord(record) {
    try {
        const alumni = new Alumni(record);
        await alumni.validate();
        return { valid: true };
    } catch (error) {
        return {
            valid: false,
            errors: error.errors
        };
    }
}

// Función principal
async function loadAlumniData() {
    try {
        scriptLogger.info('Iniciando carga de datos de egresados', {
            csvPath: process.env.CSV_PATH,
            batchSize: process.env.BATCH_SIZE || 500
        });

        await connectDB(connectionOptions);
        scriptLogger.info('Conexión a MongoDB establecida');

        const CSV_PATH = process.env.CSV_PATH;
        const BATCH_SIZE = parseInt(process.env.BATCH_SIZE) || 500;
        const REPORT_INTERVAL = parseInt(process.env.REPORT_INTERVAL) || 1000;

        if (!CSV_PATH) {
            throw new Error('La variable CSV_PATH no está definida en .env');
        }

        scriptLogger.info('Procesando archivo CSV', { filePath: CSV_PATH });

        const fileStream = fs.createReadStream(CSV_PATH);
        const rl = createInterface({
            input: fileStream,
            crlfDelay: Infinity
        });

        let batch = [];
        let firstLine = true;

        scriptLogger.debug('Iniciando lectura del archivo');
        for await (const line of rl) {
            stats.totalLines++;

            // Saltar encabezado
            if (firstLine) {
                firstLine = false;
                scriptLogger.debug('Encabezado del CSV omitido');
                continue;
            }

            try {
                const data = parseCSVLine(line);
                const validation = await validateRecord(data);

                if (!validation.valid) {
                    stats.validationErrors++;
                    stats.errorDetails.push({
                        line: stats.totalLines,
                        error: 'Validación fallida',
                        details: Object.values(validation.errors).map(e => e.message),
                        content: line.substring(0, 100) + '...'
                    });
                    continue;
                }

                batch.push(data);
                stats.processed++;

                // Procesar lote completo
                if (batch.length >= BATCH_SIZE) {
                    await processBatch(batch, BATCH_SIZE);
                    batch = [];
                    stats.batchesProcessed++;
                }

                // Reporte periódico
                if (stats.processed % REPORT_INTERVAL === 0) {
                    scriptLogger.info('Progreso de carga', {
                        processed: stats.processed,
                        inserted: stats.inserted,
                        errors: stats.validationErrors + stats.otherErrors,
                        duplicates: stats.duplicates,
                        throughput: `${Math.round(stats.processed / ((new Date() - stats.startTime) / 1000))} registros/segundo`
                    });
                }
            } catch (error) {
                stats.otherErrors++;
                stats.errorDetails.push({
                    line: stats.totalLines,
                    error: error.message,
                    content: line.substring(0, 100) + '...'
                });
            }
        }

        // Procesar último lote
        if (batch.length > 0) {
            await processBatch(batch, batch.length);
            stats.batchesProcessed++;
        }

        // Resultados finales
        await logFinalStats();
        await mongoose.disconnect();
        scriptLogger.info('Proceso completado exitosamente');

    } catch (error) {
        scriptLogger.error('Error crítico en el proceso de carga', {
            error: error.message,
            stack: !isProduction ? error.stack : undefined,
            stats: stats,
            severity: 'critical'
        });
        process.exit(1);
    }
}

// Función para procesar lotes con logging detallado
async function processBatch(batch, batchSize) {
    try {
        scriptLogger.debug(`Procesando lote de ${batchSize} registros`);
        
        const result = await Alumni.insertMany(batch, {
            ordered: false,
            rawResult: true
        });

        stats.inserted += result.insertedCount;

        // Manejar errores de inserción
        if (result.writeErrors) {
            scriptLogger.warn('Errores en el procesamiento por lotes', {
                totalErrors: result.writeErrors.length,
                batchSize: batchSize
            });

            for (const error of result.writeErrors) {
                if (error.code === 11000) {
                    stats.duplicates++;
                } else {
                    stats.otherErrors++;
                }

                stats.errorDetails.push({
                    line: 'Batch processing',
                    error: error.errmsg,
                    errorCode: error.code,
                    content: JSON.stringify(batch[error.index]).substring(0, 100) + '...'
                });
            }
        }
    } catch (error) {
        scriptLogger.warn('Fallo en el procesamiento por lotes, intentando uno por uno', {
            error: error.message,
            batchSize: batchSize
        });
        stats.individualRetries += batch.length;
        await insertOneByOne(batch);
    }
}

// Función para insertar registros individualmente
async function insertOneByOne(records) {
    scriptLogger.debug('Iniciando inserción individual de registros', {
        recordsToProcess: records.length
    });

    for (const [index, record] of records.entries()) {
        try {
            // Verificar si ya existe
            const exists = await Alumni.findOne({
                $or: [
                    { idNumber: record.idNumber },
                    { studentId: record.studentId },
                    { email: record.email }
                ]
            });

            if (exists) {
                stats.duplicates++;
                continue;
            }

            // Insertar nuevo registro
            await Alumni.create(record);
            stats.inserted++;

            if ((index + 1) % 100 === 0) {
                scriptLogger.debug('Progreso inserción individual', {
                    processed: index + 1,
                    total: records.length
                });
            }
        } catch (error) {
            if (error.code === 11000) {
                stats.duplicates++;
            } else {
                stats.otherErrors++;
                stats.errorDetails.push({
                    line: 'Individual processing',
                    error: error.message,
                    errorCode: error.code,
                    content: JSON.stringify(record).substring(0, 100) + '...'
                });
            }
        }
    }
}

// Función para mostrar estadísticas finales
async function logFinalStats() {
    const duration = (new Date() - stats.startTime) / 1000;
    const recordsPerSecond = (stats.processed / duration).toFixed(2);

    scriptLogger.info('ESTADÍSTICAS FINALES DE CARGA', {
        duration: `${duration.toFixed(2)} segundos`,
        throughput: `${recordsPerSecond} registros/segundo`,
        totalLines: stats.totalLines,
        processed: stats.processed,
        inserted: stats.inserted,
        validationErrors: stats.validationErrors,
        duplicates: stats.duplicates,
        otherErrors: stats.otherErrors,
        batchesProcessed: stats.batchesProcessed,
        individualRetries: stats.individualRetries
    });

    // Log de errores representativos
    if (stats.errorDetails.length > 0) {
        const sampleErrors = stats.errorDetails.slice(0, 5);
        scriptLogger.warn('Muestra de errores encontrados', {
            totalErrors: stats.errorDetails.length,
            sampleErrors: sampleErrors
        });
    }

    // Verificar conteo final en base de datos
    try {
        const totalInDB = await Alumni.countDocuments();
        scriptLogger.info('Conteo final en base de datos', {
            totalRecords: totalInDB
        });
    } catch (error) {
        scriptLogger.error('Error al obtener conteo final', {
            error: error.message
        });
    }
}

// Funciones auxiliares (parseCSVLine y parseDate se mantienen igual)
function parseCSVLine(line) {
    const values = line.split(',').map(v => v.trim());

    if (values.length < 10) {
        throw new Error(`Faltan campos (${values.length} de 10)`);
    }

    return {
        idNumber: values[0],
        firstName: values[1],
        lastName: values[2],
        birthDate: parseDate(values[3]),
        email: values[4],
        location: values[5],
        degree: values[6],
        mention: values[7],
        studentId: values[8],
        graduationDate: parseDate(values[9])
    };
}

function parseDate(dateStr) {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date;
}

// Ejecutar el script
loadAlumniData();