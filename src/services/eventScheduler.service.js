import Event from '../models/Event.js';
import NotificationService from './notification.service.js';
import logger from '../config/logger.js';

const isProduction = process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV === 'development';
const isTesting = process.env.NODE_ENV === 'testing';

class EventScheduler {
    /**
     * @method constructor
     * @description Constructor de la clase EventScheduler
     */
    constructor(io) {
        this.notificationService = new NotificationService(io, logger);
        this.checkInterval = isTesting ? 30 * 1000 : 24 * 60 * 60 * 1000;  // Si es testing, el intervalo es de 30 segundos, si no, es de 24 horas
        this.reminderTimes = {
            days: [7, 3, 1],
            hours: [12, 6, 1]
        };
        this.scheduledHour = 8;  // Hora fija: 8 AM
    }

    /**
     * @method checkUpcomingEvents
     * @description Busca eventos próximos y envía recordatorios
     */
    async checkUpcomingEvents() {
        try {
            const now = new Date();
            logger.debug('Buscando eventos próximos...', { now });

            // Buscar eventos que comienzan entre 1 minuto y 7 días desde ahora
            const upcomingEvents = await Event.find({
                startDate: {
                    $gte: new Date(now.getTime() + 1 * 60 * 1000), // +1 minuto
                    $lte: new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000) // +7 días
                },
                isActive: true
            }).select('title startDate savedByUsers');

            logger.debug(`Encontrados ${upcomingEvents.length} eventos próximos`);

            for (const event of upcomingEvents) {
                const minutesUntil = Math.ceil((event.startDate - now) / (60 * 1000));
                const hoursUntil = Math.floor(minutesUntil / 60);
                const daysUntil = Math.floor(hoursUntil / 24);

                // Verificar recordatorios programados
                const shouldNotifyDays = this.reminderTimes.days.includes(daysUntil);
                const shouldNotifyHours = hoursUntil < 24 &&
                    this.reminderTimes.hours.includes(hoursUntil);

                if (shouldNotifyDays || shouldNotifyHours) {
                    logger.debug(`Enviando recordatorios para el evento ${event._id}`);

                    // Enviar recordatorio a cada usuario que haya guardado el evento
                    for (const userId of event.savedByUsers) {
                        try {
                            await this.notificationService.sendEventReminder({
                                userId,
                                event,
                                daysUntil: shouldNotifyDays ? daysUntil : null,
                                minutesUntil: shouldNotifyHours ? minutesUntil : null
                            });
                        } catch (error) {
                            logger.error(`Error enviando recordatorio a usuario ${userId}`, {
                                error: error.message,
                                stack: !isProduction ? error.stack : undefined
                            });
                        }
                    }
                }
            }
        } catch (error) {
            logger.error('Error en el scheduler de eventos:', {
                error: error.message,
                stack: !isProduction ? error.stack : undefined
            });
        }
    }

    /**
     * @method start
     * @description Inicia el scheduler
     */
    start() {
        if (isProduction || isDevelopment) {
            // Calcular tiempo hasta las 8:00 AM o la hora programada
            const now = new Date();
            const targetTime = new Date(
                now.getFullYear(),
                now.getMonth(),
                now.getDate(),
                this.scheduledHour, 0, 0
            );

            // Si ya pasó las 8 AM hoy, programar para mañana
            if (now > targetTime) {
                targetTime.setDate(targetTime.getDate() + 1);
            }

            const initialDelay = targetTime - now;

            setTimeout(() => {
                this.checkUpcomingEvents();
                this.interval = setInterval(
                    () => this.checkUpcomingEvents(),
                    this.checkInterval
                );
            }, initialDelay);

            logger.info(`Event Scheduler (Recordatorios de eventos) programado para ejecutarse diariamente a las ${this.scheduledHour}:00 AM (en ${Math.round(initialDelay / 1000 / 60 / 60)} horas)`);
        } else {
            // Desarrollo: ejecutar cada 30 segundos
            this.interval = setInterval(
                () => this.checkUpcomingEvents(),
                this.checkInterval
            );
        }
    }

    /**
     * @method stop
     * @description Detiene el scheduler
     */
    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            logger.info('Event Scheduler detenido');
        }
    }
}

export default EventScheduler;