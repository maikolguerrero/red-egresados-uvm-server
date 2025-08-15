# =============================================
# Etapa de construcción
# =============================================

# Usar imagen de node
FROM node:20-alpine AS builder

# Establecer directorio de trabajo
WORKDIR /app

# Copiar package.json y package-lock.json
COPY package*.json ./

# Instalar dependencias
RUN npm ci

# Copiar el resto del código fuente
COPY . .

# Construir la aplicación
RUN npm run build

# =============================================
# Etapa de producción
# =============================================

# Usar imagen de node
FROM node:20-alpine

# Establecer directorio de trabajo
WORKDIR /app

# Crear el grupo y el usuario
RUN addgroup -S nodeuser && adduser -S nodeuser -G nodeuser

# Copia los archivos y cambiar el propietario
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
RUN chown -R nodeuser:nodeuser /app

# Establecer el usuario no-root para las siguientes instrucciones
USER nodeuser

# Exponer puerto
EXPOSE 3000

# Ejecutar la aplicación como el usuario no-root
CMD ["node", "dist/server.js"]
