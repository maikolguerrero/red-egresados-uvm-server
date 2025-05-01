export default class AppError extends Error {
  constructor(message, statusCode = 500, code = 'APP_ERROR', metadata = {}) {
    super(message);
    this.status = statusCode;
    this.code = code;
    this.metadata = metadata; // Objeto para datos adicionales
  }
}