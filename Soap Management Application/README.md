# 🧼 Aplicación de Gestión de Jabones Artesanales

Aplicación profesional de escritorio para la formulación, costeo y gestión de jabones artesanales.

## 📁 Estructura del Proyecto (Monorepo)

```
proyecto-jabones/
├─ apps/
│  ├─ web/                  # Frontend (React + Vite + Tailwind)
│  └─ api/                  # Backend (Node.js + Express + TypeScript)
├─ packages/
│  └─ shared/               # Tipos y lógica compartida
└─ docs/
```

## ✅ FASE 1, 2 Y 3 COMPLETADAS

### FASE 1 y 2: Backend API (Completado)

#### 📦 packages/shared/src/

1. **types/index.ts** - Definiciones TypeScript completas
2. **calculations/soapMath.ts** - Motor matemático de saponificación

#### 🔌 apps/api/src/

3. **controllers/inventory.controller.ts** - CRUD de ingredientes
4. **controllers/calculator.controller.ts** - Motor de cálculo de recetas
5. **index.ts** - Servidor Express con 11 endpoints

### FASE 3: Frontend Visual (Completado) ✨

#### 🎨 apps/web/src/app/

**Componentes:**
- **Dashboard.tsx** - Vista general con estadísticas y gráficos (Recharts)
- **Inventory.tsx** - Gestión completa de inventario con formularios
- **Calculator.tsx** - Calculadora interactiva de recetas
- **Recipes.tsx** - Biblioteca visual de recetas

**Servicios:**
- **services/api.ts** - Cliente HTTP para comunicación con backend

**Principal:**
- **App.tsx** - Aplicación principal con sistema de tabs y estado global

## 🚀 API Endpoints Disponibles

### Inventario

```http
GET    /api/inventory              # Obtener todos los ingredientes
GET    /api/inventory/:id          # Obtener ingrediente por ID
POST   /api/inventory              # Crear nuevo ingrediente
PUT    /api/inventory/:id          # Actualizar ingrediente
DELETE /api/inventory/:id          # Eliminar ingrediente
PATCH  /api/inventory/:id/adjust-stock  # Ajustar stock
```

#### Ejemplo: Crear Ingrediente

```json
POST /api/inventory
{
  "name": "Aceite de Almendras",
  "currentStock": 2000,
  "totalCost": 3500,
  "sapValue": 192
}
```

**Respuesta:**
```json
{
  "success": true,
  "message": "Ingrediente creado exitosamente",
  "data": {
    "id": "5",
    "name": "Aceite de Almendras",
    "currentStock": 2000,
    "totalCost": 3500,
    "costPerGram": 1.75,
    "sapValue": 192
  }
}
```

### Calculadora

```http
GET  /api/calculator/recipes       # Obtener todas las recetas
GET  /api/calculator/recipes/:id   # Obtener receta por ID
POST /api/calculator/calculate     # Calcular batch de jabón
POST /api/calculator/financial-summary  # Resumen financiero
POST /api/calculator/validate-recipe   # Validar receta
```

#### Ejemplo: Calcular Batch

```json
POST /api/calculator/calculate
{
  "recipeId": "2",
  "targetWeight": 1500
}
```

**Respuesta:**
```json
{
  "success": true,
  "calculation": {
    "recipe": { ... },
    "targetWeight": 1500,
    "oils": [
      {
        "ingredientId": "1",
        "name": "Aceite de Coco",
        "gramsNeeded": 292.5,
        "gramsAvailable": 5000,
        "hasEnoughStock": true,
        "gramsMissing": 0,
        "cost": 146.25
      },
      ...
    ],
    "lyeGrams": 138.45,
    "waterGrams": 289.67,
    "totalCost": 612.30,
    "canMakeBatch": true,
    "alerts": [
      "✅ Tienes suficiente stock para crear este batch"
    ]
  }
}
```

#### Ejemplo: Alerta de Stock Insuficiente

Si no hay suficiente stock:

```json
{
  "alerts": [
    "⚠️ No hay suficiente stock para completar este batch:",
    "   • Te faltan 150g de Aceite de Coco (disponible: 100g, necesario: 250g)",
    "   • Te faltan 75g de Manteca de Karité (disponible: 50g, necesario: 125g)"
  ],
  "canMakeBatch": false
}
```

## 🧪 Ingredientes Precargados

| ID | Nombre | Stock | Costo Total | Costo/g | SAP Value |
|----|--------|-------|-------------|---------|-----------|
| 1  | Aceite de Coco | 5000g | $2500 | $0.50 | 257 |
| 2  | Aceite de Oliva | 10000g | $4000 | $0.40 | 190 |
| 3  | Aceite de Palma | 3000g | $1200 | $0.40 | 199 |
| 4  | Manteca de Karité | 2000g | $3000 | $1.50 | 180 |

## 📋 Recetas Precargadas

### 1. Receta Clásica de Castilla
- 100% Aceite de Oliva
- Sobreengrasado: 5%
- Descuento de agua: 0%

### 2. Receta Balanceada Universal
- 30% Aceite de Coco
- 40% Aceite de Oliva
- 20% Aceite de Palma
- 10% Manteca de Karité
- Sobreengrasado: 7%
- Descuento de agua: 10%

### 3. Receta Premium Hidratante
- 25% Aceite de Coco
- 35% Aceite de Oliva
- 40% Manteca de Karité
- Sobreengrasado: 8%
- Descuento de agua: 15%

## 🔬 Fórmulas Matemáticas Implementadas

### Cálculo de Sosa Cáustica (NaOH)

```
SAP_NaOH = SAP_KOH × 0.713
Sosa_Necesaria = Σ(Gramos_Aceite × SAP_NaOH / 1000)
Sosa_Final = Sosa_Necesaria × (1 - Sobreengrasado%)
```

### Cálculo de Agua

```
Agua_Base = Sosa × 2.33
Agua_Final = Agua_Base × (1 - Descuento_Agua%)
```

### Ajuste de Peso Objetivo

```
Peso_Total = Aceites + Sosa + Agua
Factor_Ajuste = Peso_Objetivo / Peso_Total
[Todos los ingredientes se multiplican por el Factor_Ajuste]
```

## 🚀 Inicio Rápido

### Ejecutar Backend
```bash
cd apps/api
pnpm install
pnpm dev
```

### Ejecutar Frontend
```bash
# Desde la raíz
pnpm install
pnpm dev
```

Ver guía completa en: **`docs/QUICKSTART.md`**

## 🛠️ Próximos Pasos (FASE 4 y 5)

1. **Persistencia de Datos**
   - Integrar base de datos (SQLite/PostgreSQL)
   - Migraciones de esquemas
   - Historial de batches creados

2. **Empaquetado Desktop**
  - Build para Windows/Mac/Linux
  - Instaladores y distribución

## 📝 Notas Técnicas

- **Redondeo**: Todos los valores se redondean a 2 decimales para precisión
- **Validaciones**: Los porcentajes de recetas deben sumar exactamente 100%
- **Stock negativo**: No se permite por validaciones
- **SAP Values**: Basados en valores estándar de saponificación

## 🤝 Contribuir

Este es un proyecto en desarrollo. Las fases se construyen incrementalmente para mantener el contexto limpio.

## 🎨 Características Visuales

- ✅ Dashboard con gráficos interactivos (Recharts)
- ✅ Sistema de navegación con tabs
- ✅ Formularios de inventario con validación
- ✅ Calculadora en tiempo real
- ✅ Alertas visuales de stock
- ✅ Diseño responsivo con Tailwind CSS
- ✅ Iconos profesionales (Lucide React)
- ✅ Temas de color personalizados para jabonería

---

**Estado Actual**: ✅ FASE 1, 2 y 3 completadas - **Aplicación Totalmente Funcional**
**Siguiente**: FASE 4 - Base de datos persistente
