import mongoose from 'mongoose';

const connectDB = async () => {
  // =============================================
  // 1. Validaciones iniciales (fase temprana)
  // =============================================
  const MONGODB_URI = process.env.MONGODB_URI;

  if (!MONGODB_URI) {
    console.error('❌ [Configuración] Falta la variable MONGODB_URI en .env');
    process.exit(1);
  }

  if (!MONGODB_URI.match(/^mongodb(\+srv)?:\/\//)) {
    console.error('❌ [Configuración] Formato de URI inválido. Use mongodb:// o mongodb+srv://');
    process.exit(1);
  }

  // =============================================
  // 2. Configuración de eventos (para monitoreo)
  // =============================================
  mongoose.connection.on('connected', () => {
    console.log(`✅ [Conexión] Conectado a MongoDB (Host: ${mongoose.connection.host})`);
  });

  mongoose.connection.on('disconnected', () => {
    console.log('⚠️  [Conexión] Desconectado de MongoDB');
  });

  mongoose.connection.on('error', (err) => {
    console.error(`❌ [Error] ${err.message}`);
  });

  // =============================================
  // 3. Manejo de cierre elegante
  // =============================================
  const handleShutdown = async (signal) => {
    console.log(`\n🛑 [Sistema] Recibida señal ${signal}. Cerrando conexión...`);
    await mongoose.connection.close().catch(() => { });
    console.log('✅ [Sistema] Conexión a MongoDB cerrada correctamente');
    process.exit(0);
  };

  process.on('SIGINT', () => handleShutdown('SIGINT'));  // Ctrl+C
  process.on('SIGTERM', () => handleShutdown('SIGTERM')); // Kill command

  // =============================================
  // 4. Conexión principal
  // =============================================
  try {
    console.log('🔌 [Sistema] Intentando conectar a MongoDB...');

    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 3000,  // 3s
      socketTimeoutMS: 30000,         // 30s
      maxPoolSize: 5
    });

    // Verificación opcional (solo en producción)
    if (process.env.NODE_ENV === 'production') {
      await mongoose.connection.db.admin().ping();
      console.log('🩺 [Salud] Ping a MongoDB exitoso');
    }

  } catch (error) {
    console.error('❌ [Fallo] Error crítico al conectar:', error.message);
    console.error('💡 [Solución] Verifique:');
    console.error('1. Si el servidor MongoDB está activo');
    console.error('2. Credenciales y permisos');
    console.error('3. Acceso a la red universitaria');
    process.exit(1);
  }
};

export default connectDB;