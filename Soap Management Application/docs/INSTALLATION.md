# 📦 Guía de Instalación

## Requisitos Previos

- **Node.js**: v18.0.0 o superior
- **pnpm**: v8.0.0 o superior (gestor de paquetes)
- **TypeScript**: v5.0.0 o superior (se instala automáticamente)

## Instalación de Herramientas

### 1. Instalar Node.js

Descarga e instala desde: https://nodejs.org/

Verifica la instalación:

```bash
node --version  # Debe ser v18 o superior
```

### 2. Instalar pnpm

```bash
npm install -g pnpm
```

Verifica:

```bash
pnpm --version
```

## Configuración del Proyecto

### 1. Instalar Dependencias

Desde la raíz del proyecto ejecuta:

```bash
pnpm install
```

Este comando instalará todas las dependencias de:
- `packages/shared`
- `apps/api`
- `apps/web` (cuando esté implementado)

### 2. Verificar TypeScript

Ejecuta la verificación de tipos:

```bash
# En packages/shared
cd packages/shared
pnpm type-check

# En apps/api
cd apps/api
pnpm type-check
```

## Ejecutar el Servidor API

### Modo Desarrollo

```bash
cd apps/api
pnpm dev
```

El servidor se iniciará en `http://localhost:3000`

Deberías ver:

```
🧼 Servidor API de Jabones ejecutándose en http://localhost:3000
📊 Health check disponible en http://localhost:3000/health
```

### Probar el Health Check

En otra terminal:

```bash
curl http://localhost:3000/health
```

Respuesta esperada:

```json
{
  "status": "OK",
  "message": "API de Gestión de Jabones funcionando correctamente",
  "timestamp": "2026-05-29T16:30:00.000Z"
}
```

## Estructura de Dependencias

```
apps/api
├─ express (Framework web)
├─ cors (Middleware de CORS)
└─ @proyecto-jabones/shared (Paquete local compartido)

packages/shared
└─ Sin dependencias externas (solo TypeScript)
```

## Scripts Disponibles

### packages/shared

```bash
pnpm type-check  # Verificar tipos sin compilar
```

### apps/api

```bash
pnpm dev         # Modo desarrollo con hot-reload
pnpm build       # Compilar a JavaScript
pnpm start       # Ejecutar versión compilada
pnpm type-check  # Verificar tipos
```

## Variables de Entorno

Crea un archivo `.env` en `apps/api/`:

```env
PORT=3000
NODE_ENV=development
```

## Solución de Problemas

### Error: "Cannot find module '@proyecto-jabones/shared'"

**Solución:**

```bash
# Desde la raíz del proyecto
pnpm install
```

### Error: "Port 3000 is already in use"

**Solución 1**: Cambiar puerto

```bash
PORT=3001 pnpm dev
```

**Solución 2**: Encontrar y terminar proceso

```bash
# Linux/Mac
lsof -ti:3000 | xargs kill -9

# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

### Error: "pnpm: command not found"

**Solución:**

```bash
npm install -g pnpm
```

### Errores de TypeScript

**Limpiar y reinstalar:**

```bash
# Limpiar node_modules
pnpm clean-all  # Si existe el script
# O manualmente:
rm -rf node_modules packages/*/node_modules apps/*/node_modules

# Reinstalar
pnpm install
```

## Desarrollo con Hot-Reload

El servidor API usa `ts-node-dev` que automáticamente reinicia al detectar cambios en:

- Archivos `.ts` en `apps/api/src/`
- Archivos en `packages/shared/src/`

No necesitas reiniciar manualmente el servidor durante el desarrollo.

## Próximos Pasos

1. ✅ Verificar que el servidor API funciona
2. 📖 Revisar `docs/API_EXAMPLES.md` para ejemplos de uso
3. 🧪 Probar los endpoints con cURL o Postman
4. 🚀 Continuar con FASE 3: Frontend React

---

**Estado**: ✅ Backend completamente funcional
