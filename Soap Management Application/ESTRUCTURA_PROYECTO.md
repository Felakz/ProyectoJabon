# 📁 Estructura Completa del Proyecto

```
proyecto-jabones/
│
├─── 📦 PACKAGES (Código Compartido)
│    └─── shared/
│         ├─── src/
│         │    ├─── types/
│         │    │    └─── index.ts          (8 interfaces TypeScript)
│         │    ├─── calculations/
│         │    │    └─── soapMath.ts       (5 funciones matemáticas)
│         │    └─── index.ts               (Exports centralizados)
│         ├─── package.json
│         └─── tsconfig.json
│
├─── 🔌 APPS (Aplicaciones)
│    │
│    ├─── api/ (Backend - Node.js + Express + TypeScript)
│    │    ├─── src/
│    │    │    ├─── controllers/
│    │    │    │    ├─── inventory.controller.ts    (CRUD Inventario)
│    │    │    │    └─── calculator.controller.ts   (Cálculos de Recetas)
│    │    │    └─── index.ts                        (Servidor Express)
│    │    ├─── package.json
│    │    └─── tsconfig.json
│    │
│    └─── web/ (Frontend - React + Vite + Tailwind)
│         └─── src/
│              └─── app/
│                   ├─── components/
│                   │    ├─── Dashboard.tsx          (Vista principal)
│                   │    ├─── Inventory.tsx          (Gestión inventario)
│                   │    ├─── Calculator.tsx         (Calculadora)
│                   │    └─── Recipes.tsx            (Biblioteca recetas)
│                   ├─── services/
│                   │    └─── api.ts                 (Cliente HTTP)
│                   └─── App.tsx                     (App principal)
│
├─── 📚 DOCS (Documentación)
│    ├─── README.md                      (Documentación principal)
│    ├─── QUICKSTART.md                  (Guía de inicio rápido)
│    ├─── INSTALLATION.md                (Instalación detallada)
│    ├─── API_EXAMPLES.md                (Ejemplos de API con cURL)
│    ├─── UI_GUIDE.md                    (Guía visual de la interfaz)
│    └─── ESTRUCTURA_PROYECTO.md         (Este archivo)
│
└─── ⚙️ CONFIGURACIÓN
     ├─── package.json                   (Dependencias raíz)
     ├─── pnpm-workspace.yaml            (Configuración monorepo)
     ├─── tsconfig.json                  (TypeScript raíz)
     ├─── vite.config.ts                 (Configuración Vite)
     └─── postcss.config.mjs             (PostCSS + Tailwind)
```

## 📊 Estadísticas del Proyecto

### Archivos Creados
- **Backend**: 3 archivos principales (+ config)
- **Shared**: 2 archivos principales (+ config)
- **Frontend**: 5 componentes React
- **Documentación**: 5 archivos MD completos
- **Total líneas de código**: ~2,500 líneas

### Tecnologías Utilizadas

#### Backend
- **Node.js** 18+
- **Express.js** - Framework web
- **TypeScript** - Tipado fuerte
- **CORS** - Cross-origin requests

#### Frontend
- **React** 18.3.1
- **Vite** 6.3.5 - Build tool
- **Tailwind CSS** 4.1.12 - Estilos
- **Lucide React** - Iconos
- **Recharts** - Gráficos
- **TypeScript** - Tipado fuerte

#### Shared
- **TypeScript** puro
- Sin dependencias externas

## 🔄 Flujo de Datos

```
┌─────────────┐
│   Browser   │
│  (Frontend) │
└──────┬──────┘
       │
       │ HTTP Requests (fetch)
       │
       ▼
┌─────────────────┐
│   API Service   │  (src/app/services/api.ts)
└────────┬────────┘
         │
         │ HTTP/JSON
         │
         ▼
┌──────────────────────┐
│   Express Server     │  (apps/api/src/index.ts)
│   Port 3000          │
└──────────┬───────────┘
           │
           │ Routes
           │
    ┌──────┴──────┐
    │             │
    ▼             ▼
┌─────────┐  ┌──────────┐
│Inventory│  │Calculator│
│Controller│  │Controller│
└────┬────┘  └────┬─────┘
     │            │
     │            │ Uses
     │            │
     ▼            ▼
┌──────────────────────┐
│  packages/shared     │
│  - Types             │
│  - Calculations      │
│  - Business Logic    │
└──────────────────────┘
```

## 🎯 Endpoints Disponibles

### Inventario (6 endpoints)
```
GET    /api/inventory              → Listar todos
GET    /api/inventory/:id          → Obtener uno
POST   /api/inventory              → Crear nuevo
PUT    /api/inventory/:id          → Actualizar
DELETE /api/inventory/:id          → Eliminar
PATCH  /api/inventory/:id/adjust-stock → Ajustar stock
```

### Calculadora (5 endpoints)
```
GET    /api/calculator/recipes              → Listar recetas
GET    /api/calculator/recipes/:id          → Obtener receta
POST   /api/calculator/calculate            → Calcular batch
POST   /api/calculator/financial-summary    → Resumen financiero
POST   /api/calculator/validate-recipe      → Validar receta
```

### Utilidad (1 endpoint)
```
GET    /health                              → Estado del servidor
```

## 🧪 Datos de Ejemplo Precargados

### Ingredientes (4)
1. Aceite de Coco - 5000g, $2500 (SAP: 257)
2. Aceite de Oliva - 10000g, $4000 (SAP: 190)
3. Aceite de Palma - 3000g, $1200 (SAP: 199)
4. Manteca de Karité - 2000g, $3000 (SAP: 180)

### Recetas (3)
1. Receta Clásica de Castilla (100% Oliva)
2. Receta Balanceada Universal (mix equilibrado)
3. Receta Premium Hidratante (alto karité)

## 🚀 Comandos Útiles

### Desarrollo
```bash
# Backend
cd apps/api && pnpm dev

# Frontend
pnpm dev

# Type checking
pnpm type-check
```

### Producción (futuro)
```bash
# Build backend
cd apps/api && pnpm build

# Build frontend
pnpm build
```

## 📈 Próximas Fases

### FASE 4: Base de Datos
- [ ] Integrar PostgreSQL o SQLite
- [ ] Crear migraciones de esquema
- [ ] Implementar ORM (Prisma/TypeORM)
- [ ] Historial de batches creados
- [ ] Usuarios y autenticación

### FASE 5: Desktop App
- [ ] Empaquetado para Windows
- [ ] Empaquetado para macOS
- [ ] Empaquetado para Linux
- [ ] Auto-updates
- [ ] Instaladores

### FASE 6: Mejoras
- [ ] Exportar reportes a PDF
- [ ] Importar/Exportar datos (CSV/JSON)
- [ ] Sistema de respaldo automático
- [ ] Multi-idioma (i18n)
- [ ] Modo oscuro
- [ ] Gráficos avanzados

## 🎨 Decisiones de Diseño

### ¿Por qué un Monorepo?
- **Compartir código** entre frontend y backend
- **Tipos unificados** - mismas interfaces en ambos lados
- **Desarrollo coherente** - cambios sincronizados
- **Reutilización de lógica** de negocio

### ¿Por qué TypeScript?
- **Type safety** - menos errores en runtime
- **IntelliSense** - mejor DX
- **Refactoring seguro** - cambios con confianza
- **Documentación viva** - tipos como docs

### ¿Por qué Tailwind CSS?
- **Desarrollo rápido** - utility-first
- **Consistencia visual** - design system built-in
- **Bundle optimizado** - solo estilos usados
- **Responsivo** - mobile-first por defecto

### ¿Por qué Express?
- **Simple y probado** - framework minimalista
- **Ecosistema maduro** - miles de middlewares
- **Fácil de escalar** - de simple a complejo
- **TypeScript support** - tipos oficiales

## 📝 Convenciones de Código

### Nomenclatura
- **Archivos**: camelCase.ts / PascalCase.tsx
- **Componentes**: PascalCase
- **Funciones**: camelCase
- **Constantes**: UPPER_SNAKE_CASE
- **Interfaces**: PascalCase

### Estructura de Componentes React
```tsx
// 1. Imports
import { ... } from '...';

// 2. Types/Interfaces
interface ComponentProps { ... }

// 3. Component
export function Component({ props }: ComponentProps) {
  // 3.1 State
  const [state, setState] = useState();
  
  // 3.2 Effects
  useEffect(() => { ... }, []);
  
  // 3.3 Handlers
  const handleEvent = () => { ... };
  
  // 3.4 Render
  return ( ... );
}

// 4. Sub-components (si aplica)
function SubComponent() { ... }
```

### Estructura de Controladores
```ts
// 1. Imports
import { Request, Response } from 'express';

// 2. Types
interface CustomType { ... }

// 3. Helpers (private)
function helperFunction() { ... }

// 4. Controllers (exported)
export const controllerFunction = (req, res) => {
  try {
    // Validación
    // Lógica de negocio
    // Respuesta
    res.status(200).json({ ... });
  } catch (error) {
    res.status(500).json({ ... });
  }
};
```

## 🔒 Seguridad

### Implementado
- ✅ CORS habilitado
- ✅ Validación de entrada en controladores
- ✅ Try-catch en todos los endpoints
- ✅ Tipado fuerte (TypeScript)

### Por Implementar (FASE 4)
- 🔲 Autenticación JWT
- 🔲 Rate limiting
- 🔲 Input sanitization
- 🔲 HTTPS en producción
- 🔲 Variables de entorno seguras

---

**Proyecto diseñado y desarrollado con precisión y profesionalismo** ✨
**Listo para producción de jabones artesanales** 🧼
