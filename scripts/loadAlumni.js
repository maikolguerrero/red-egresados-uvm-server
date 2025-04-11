import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from '../config/db.js';
import Alumni from '../models/Alumni.js';
import fs from 'fs';
import { createInterface } from 'readline';

dotenv.config();

await connectDB({
    serverSelectionTimeoutMS: 60000,
    socketTimeoutMS: 120000,
    maxPoolSize: 100
});

const CSV_PATH = process.env.CSV_PATH;
const BATCH_SIZE = 500;
const REPORT_INTERVAL = 1000;

// Estadísticas detalladas
const stats = {
    totalLines: 0,
    processed: 0,
    inserted: 0,
    validationErrors: 0,
    duplicates: 0,
    otherErrors: 0,
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

// Procesamiento del archivo
console.time('⏱️  Tiempo total');
console.log('🚀 Procesando CSV con stream...');

const fileStream = fs.createReadStream(CSV_PATH);
const rl = createInterface({
    input: fileStream,
    crlfDelay: Infinity
});

let batch = [];
let firstLine = true;

for await (const line of rl) {
    stats.totalLines++;

    // Saltar encabezado
    if (firstLine) {
        firstLine = false;
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
                content: line.substring(0, 100)
            });
            continue;
        }

        batch.push(data);
        stats.processed++;

        // Procesar lote completo
        if (batch.length >= BATCH_SIZE) {
            await processBatch(batch);
            batch = [];
        }

        // Reporte periódico
        if (stats.processed % REPORT_INTERVAL === 0) {
            console.log(`📊 Procesados: ${stats.processed} | Insertados: ${stats.inserted} | Errores: ${stats.validationErrors + stats.otherErrors}`);
        }
    } catch (error) {
        stats.otherErrors++;
        stats.errorDetails.push({
            line: stats.totalLines,
            error: error.message,
            content: line.substring(0, 100)
        });
    }
}

// Procesar último lote
if (batch.length > 0) {
    await processBatch(batch);
}

// Resultados finales
console.timeEnd('⏱️  Tiempo total');
printFinalStats();
await mongoose.disconnect();

// Función para procesar lotes
async function processBatch(batch) {
    try {
        // Intento de inserción masiva
        const result = await Alumni.insertMany(batch, {
            ordered: false,
            rawResult: true
        });

        stats.inserted += result.insertedCount;

        // Manejar errores de inserción
        if (result.writeErrors) {
            for (const error of result.writeErrors) {
                if (error.code === 11000) {
                    stats.duplicates++;
                } else {
                    stats.otherErrors++;
                }

                stats.errorDetails.push({
                    line: 'No aplica (error durante procesamiento por lotes)',
                    error: error.errmsg,
                    content: JSON.stringify(batch[error.index])
                });
            }
        }
    } catch (error) {
        console.error('❌ Error crítico al procesar el lote:', error.message);
        // Si falla el lote (batch), intentar uno por uno
        await insertOneByOne(batch);
    }
}

// Función para insertar registros individualmente
async function insertOneByOne(records) {
    for (const record of records) {
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
        } catch (error) {
            if (error.code === 11000) {
                stats.duplicates++;
            } else {
                stats.otherErrors++;
                stats.errorDetails.push({
                    line: 'No aplica (error durante inserción individual)',
                    error: error.message,
                    content: JSON.stringify(record)
                });
            }
        }
    }
}

// Función para mostrar estadísticas finales
function printFinalStats() {
    console.log('\n🔍 ESTADÍSTICAS DETALLADAS:');
    console.log(`📄 Total líneas en CSV: ${stats.totalLines}`);
    console.log(`🔄 Registros procesados: ${stats.processed}`);
    console.log(`🟢 Insertados exitosamente: ${stats.inserted}`);
    console.log(`🔴 Fallidos: ${stats.validationErrors + stats.duplicates + stats.otherErrors}`);
    console.log(`  ├─ Errores validación: ${stats.validationErrors}`);
    console.log(`  ├─ Duplicados: ${stats.duplicates}`);
    console.log(`  └─ Otros errores: ${stats.otherErrors}`);
    console.log(`\n💾 Total en base de datos: ${stats.inserted}`);

    // Mostrar ejemplos de errores
    if (stats.errorDetails.length > 0) {
        console.log('\n📝 Primeros 5 errores:');
        stats.errorDetails.slice(0, 5).forEach(err => {
            console.log(`Línea ${err.line}: ${err.error}`);
            if (err.details) console.log(`   Detalles: ${err.details.join('; ')}`);
            console.log(`   Contenido: ${err.content}\n`);
        });
    }
}

// Función para parsear líneas CSV
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

// Función para parsear fechas con manejo de errores
function parseDate(dateStr) {
    if (!dateStr) return null;

    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date;
}