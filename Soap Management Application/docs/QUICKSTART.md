# 🚀 Guía de Inicio Rápido

## Ejecutar la Aplicación Completa

### Opción 1: Ejecución Manual (Recomendada para desarrollo)

**Terminal 1 - Backend API:**
```bash
cd apps/api
pnpm install
pnpm dev
```

El servidor API se iniciará en `http://localhost:3000`

**Terminal 2 - Frontend Web:**
```bash
# Desde la raíz del proyecto
pnpm install
pnpm dev
```

La aplicación web se iniciará y estará disponible en la vista previa.

### Verificar que Todo Funciona

1. **Backend**: Abre `http://localhost:3000/health` - Deberías ver:
   ```json
   {
     "status": "OK",
     "message": "API de Gestión de Jabones funcionando correctamente"
   }
   ```

2. **Frontend**: Abre la aplicación web - Deberías ver el Dashboard con:
   - 4 tarjetas de estadísticas
   - Gráficos de stock y distribución de valor
   - Navegación con tabs

## Funcionalidades Disponibles

### 📊 Dashboard
- Vista general del inventario
- Gráficos de stock por ingrediente
- Distribución de valor en inventario
- Estadísticas clave

### 📦 Inventario
- Agregar nuevos ingredientes
- Editar ingredientes existentes
- Eliminar ingredientes
- Ver costo por gramo calculado automáticamente
- Indicadores visuales de stock bajo/crítico

### 🧮 Calculadora
- Seleccionar receta predefinida
- Ingresar peso objetivo del batch
- Calcular cantidades exactas de:
  - Cada aceite
  - Sosa cáustica (NaOH)
  - Agua
- Ver costo total del batch
- Alertas de stock insuficiente

### 📖 Recetas
- Visualizar recetas guardadas
- Ver composición detallada
- Porcentajes de sobreengrasado y descuento de agua

## Datos de Prueba Precargados

La aplicación viene con datos de ejemplo:

**4 Ingredientes:**
- Aceite de Coco (5000g, $2500)
- Aceite de Oliva (10000g, $4000)
- Aceite de Palma (3000g, $1200)
- Manteca de Karité (2000g, $3000)

**3 Recetas:**
- Receta Clásica de Castilla (100% Oliva)
- Receta Balanceada Universal (mezcla equilibrada)
- Receta Premium Hidratante (alto contenido de manteca)

## Ejemplo de Uso Completo

### 1. Agregar un Nuevo Ingrediente

1. Ve a la pestaña **Inventario**
2. Haz clic en **"Agregar Ingrediente"**
3. Completa el formulario:
   - Nombre: "Aceite de Ricino"
   - Stock: 1500g
   - Costo Total: $2250
   - Valor SAP: 180
4. Haz clic en **"Guardar"**

El sistema calculará automáticamente el costo por gramo ($1.50/g).

### 2. Calcular un Batch

1. Ve a la pestaña **Calculadora**
2. Selecciona **"Receta Balanceada Universal"**
3. Ingresa el peso objetivo: **1500g**
4. Haz clic en **"Calcular Batch"**

Verás:
- ✅ Alerta de stock suficiente (o advertencia si falta)
- Cantidades exactas de cada aceite
- 276.9g de sosa cáustica (NaOH)
- 579.3g de agua
- Costo total: ~$918

### 3. Ver Composición de Recetas

1. Ve a la pestaña **Recetas**
2. Explora las 3 recetas precargadas
3. Observa las barras de progreso que muestran la composición

## Solución de Problemas

### Error: "Error al cargar los datos"

**Causa**: El backend API no está ejecutándose.

**Solución**:
```bash
cd apps/api
pnpm dev
```

Asegúrate de ver el mensaje:
```
🧼 Servidor API de Jabones ejecutándose en http://localhost:3000
```

### Error: "Cannot find module '@proyecto-jabones/shared'"

**Solución**:
```bash
# Desde la raíz del proyecto
pnpm install
```

### El frontend no carga

1. Verifica que el backend esté corriendo
2. Revisa la consola del navegador para errores
3. Verifica que `http://localhost:3000/health` responda correctamente

### CORS Error

Si ves errores de CORS en la consola:

1. Verifica que el backend tiene el middleware `cors` habilitado (ya está configurado)
2. Reinicia el servidor backend

## Próximos Pasos

- ✅ **FASE 1 y 2**: Backend completado
- ✅ **FASE 3**: Frontend visual completado
- 🚧 **FASE 4**: Persistencia en base de datos (próximamente)
- 🚧 **FASE 5**: Empaquetado desktop (próximamente)

## Recursos Útiles

- **Documentación API**: `docs/API_EXAMPLES.md`
- **Instalación detallada**: `docs/INSTALLATION.md`
- **README principal**: `README.md`

---

**¡Listo! Tu aplicación de gestión de jabones está completamente funcional. 🧼**
