import morgan from 'morgan';
import logger from '../config/logger.js';

const isProduction = process.env.NODE_ENV === 'production';

// Formato personalizado para Morgan
const format = () => {
    return isProduction
        ? ':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent"'
        : ':method :url :status :response-time ms - :res[content-length]';
};

// Stream de Morgan que usa Winston
const stream = {
    write: (message) => logger.http(message.trim())
};

// Filtro para excluir rutas salud
const skip = (req, res) => {
    return req.path === '/healthcheck';
};

const httpLogger = morgan(format(), { stream, skip });

export default httpLogger;