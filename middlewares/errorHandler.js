export const notFoundHandler = (req, res, next) => {
    const error = new Error(`Ruta no encontrada: ${req.originalUrl}`);
    error.status = 404;
    next(error); // Pasa el error al siguiente middleware
};

export const globalErrorHandler = (err, req, res, next) => {
    const statusCode = err.status || 500;

    res.status(statusCode).json({
        success: false,
        message: err.message,
        error: {
            code: statusCode,
            details: statusCode === 404 ? 'Ruta no existe' : 'Error interno',
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        }
    });
};
