import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { notFoundHandler, globalErrorHandler } from './middlewares/errorHandler.js';
import connectDB from './config/db.js';

// Cargar variables de entorno
dotenv.config();

// Crear la aplicación Express
const app = express();

// Middlewares
app.use(cors()); // Permitir solicitudes desde el frontend
app.use(express.json()); // Parsear JSON en las solicitudes
app.use(notFoundHandler); // Maneja rutas no encontradas
app.use(globalErrorHandler); // Maneja errores

// Conectar a MongoDB
connectDB();

// Iniciar el servidor
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});