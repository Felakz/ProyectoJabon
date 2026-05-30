# 🎨 Guía Visual de la Interfaz

## Paleta de Colores

La aplicación usa una paleta profesional y calmante, ideal para una aplicación de jabonería artesanal:

- **Primario**: Emerald (Verde) - `#10b981`
- **Secundario**: Blue (Azul) - `#3b82f6`
- **Acento 1**: Purple (Púrpura) - `#8b5cf6`
- **Acento 2**: Amber (Ámbar) - `#f59e0b`
- **Peligro**: Red (Rojo) - `#ef4444`
- **Fondo**: Gradient `from-emerald-50 to-blue-50`

## Estructura de la Interfaz

```
┌─────────────────────────────────────────────────────────────┐
│  Header (Blanco con sombra)                                 │
│  ┌─────┐                                                    │
│  │ 🧼  │  Gestión de Jabones Artesanales                   │
│  └─────┘  Sistema profesional de formulación y costeo      │
│                                                             │
│  ┌──────────┬──────────┬──────────┬──────────┐            │
│  │Dashboard │Inventario│Calculator│ Recetas  │  (Tabs)    │
│  └──────────┴──────────┴──────────┴──────────┘            │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Main Content Area (Gradient Background)                   │
│  [Contenido dinámico según tab activo]                     │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  Footer (Blanco)                                           │
│  🧼 Sistema de Gestión de Jabones Artesanales v1.0         │
└─────────────────────────────────────────────────────────────┘
```

## 📊 Dashboard

### Tarjetas de Estadísticas (Grid 4 columnas)

```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ 📦           │  │ 🧪           │  │ 💰           │  │ 📈           │
│ Ingredientes │  │ Stock Total  │  │ Valor Total  │  │ Recetas      │
│ 4            │  │ 20,000g      │  │ $10,700      │  │ 3            │
│ tipos en inv.│  │ disponible   │  │ inversión    │  │ fórmulas     │
└──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘
```

### Gráficos (Grid 2 columnas)

**Izquierda**: Gráfico de barras - Stock por Ingrediente
- Eje X: Nombres de ingredientes
- Eje Y: Gramos
- Color: Verde emerald (#10b981)
- Barras con bordes redondeados superiores

**Derecha**: Gráfico de pastel - Distribución de Valor
- Colores: Verde, Azul, Púrpura, Ámbar, Rojo
- Labels: Nombres de ingredientes
- Tooltip: Muestra valor en hover

### Banner de Bienvenida
```
┌──────────────────────────────────────────────────────────┐
│ 🧼 Bienvenido a tu Sistema de Gestión de Jabones        │
│ Administra tu inventario, calcula recetas con precisión  │
│ química y controla tus costos de producción.             │
└──────────────────────────────────────────────────────────┘
```
Color: Gradient emerald-50 to blue-50, border emerald-200

## 📦 Inventario

### Header
```
Inventario de Ingredientes               [➕ Agregar Ingrediente]
```

### Formulario de Agregar/Editar (cuando está visible)
```
┌──────────────────────────────────────────────────────────┐
│ Nuevo Ingrediente / Editar Ingrediente                   │
├──────────────────────────────────────────────────────────┤
│ Nombre                    Stock (gramos)                 │
│ [Ej: Aceite de Lavanda]   [1000]                         │
│                                                           │
│ Costo Total ($)           Valor SAP (KOH)                │
│ [500.00]                  [190]                          │
│                                                           │
│ [Guardar] [Cancelar]                                     │
└──────────────────────────────────────────────────────────┘
```

### Tabla de Ingredientes
```
┌─────────────────┬──────────┬────────────┬──────────┬─────┬─────────┐
│ Ingrediente     │ Stock    │ Costo Total│ Costo/g  │ SAP │ Acciones│
├─────────────────┼──────────┼────────────┼──────────┼─────┼─────────┤
│ 📦 Aceite Coco  │ 5000g 📈 │ $2,500.00  │ $0.500   │ 257 │ ✏️ 🗑️  │
│ 📦 Aceite Oliva │ 10000g 📈│ $4,000.00  │ $0.400   │ 190 │ ✏️ 🗑️  │
│ 📦 Aceite Palma │ 3000g 📈 │ $1,200.00  │ $0.400   │ 199 │ ✏️ 🗑️  │
│ 📦 Mant. Karité │ 2000g 📈 │ $3,000.00  │ $1.500   │ 180 │ ✏️ 🗑️  │
└─────────────────┴──────────┴────────────┴──────────┴─────┴─────────┘
```

**Indicadores de Stock:**
- 📈 Verde (>1000g): Stock bueno
- 📉 Ámbar (500-1000g): Stock bajo - advertencia
- 📉 Rojo (<500g): Stock crítico

## 🧮 Calculadora

### Layout (2 columnas)

**Columna Izquierda - Configuración:**
```
┌──────────────────────────────────────┐
│ 🧮 Configuración del Batch           │
├──────────────────────────────────────┤
│ Selecciona una Receta                │
│ [▼ Receta Balanceada Universal]      │
│                                      │
│ ┌────────────────────────────────┐  │
│ │ Receta Balanceada Universal    │  │
│ │ Mezcla equilibrada para uso...│  │
│ │ Sobreengrasado: 7%             │  │
│ │ Descuento agua: 10%            │  │
│ └────────────────────────────────┘  │
│                                      │
│ Peso Objetivo del Batch (gramos)    │
│ [1000]                               │
│                                      │
│ [🧮 Calcular Batch]                  │
└──────────────────────────────────────┘
```

**Columna Derecha - Resultados:**
```
┌──────────────────────────────────────┐
│ Resultados del Cálculo               │
├──────────────────────────────────────┤
│ ✅ Tienes suficiente stock para      │
│    crear este batch                  │
│                                      │
│ ┌────────────┐  ┌────────────┐      │
│ │ 💧 Agua    │  │ 🧪 Sosa    │      │
│ │ 289.67g    │  │ 138.45g    │      │
│ └────────────┘  └────────────┘      │
│                                      │
│ Aceites Requeridos:                  │
│ ┌────────────────────────────────┐  │
│ │ Aceite de Coco   292.5g ($146) │  │
│ │ Aceite de Oliva  390.0g ($156) │  │
│ │ Aceite de Palma  195.0g ($78)  │  │
│ │ Manteca Karité   97.5g ($146)  │  │
│ └────────────────────────────────┘  │
│                                      │
│ Costo Total del Batch: $612.30      │
└──────────────────────────────────────┘
```

**Estado Sin Resultados:**
```
┌──────────────────────────────────────┐
│         🧮                           │
│ Selecciona una receta y el peso      │
│ objetivo para calcular tu batch      │
└──────────────────────────────────────┘
```

## 📖 Recetas

### Grid de Tarjetas (2 columnas)

```
┌─────────────────────────────────────┐  ┌─────────────────────────────────────┐
│ ┌─────────────────────────────────┐ │  │ ┌─────────────────────────────────┐ │
│ │ Receta Clásica de Castilla      │ │  │ │ Receta Balanceada Universal     │ │
│ │ 100% aceite de oliva...         │ │  │ │ Mezcla equilibrada...           │ │
│ └─────────────────────────────────┘ │  │ └─────────────────────────────────┘ │
│ (Gradiente emerald to blue)         │  │ (Gradiente emerald to blue)         │
│                                     │  │                                     │
│ ✨ Sobreengrasado  💧 Desc. Agua   │  │ ✨ Sobreengrasado  💧 Desc. Agua   │
│    5%                 0%            │  │    7%                 10%           │
│                                     │  │                                     │
│ Composición:                        │  │ Composición:                        │
│ Aceite de Oliva    [████████] 100% │  │ Aceite de Coco     [███░░░░░] 30%  │
│                                     │  │ Aceite de Oliva    [████░░░░] 40%  │
│                                     │  │ Aceite de Palma    [██░░░░░░] 20%  │
│                                     │  │ Manteca de Karité  [█░░░░░░░] 10%  │
│                                     │  │                                     │
│ Peso por defecto: 1000g             │  │ Peso por defecto: 1000g             │
└─────────────────────────────────────┘  └─────────────────────────────────────┘
```

**Barras de Progreso:**
- Color: Gradient emerald-400 to emerald-500
- Altura: 8px
- Bordes redondeados
- Fondo: gray-200

## 🎨 Componentes Comunes

### Botones

**Primario (Emerald):**
```
[➕ Agregar Ingrediente]
```
- Background: emerald-500
- Hover: emerald-600
- Texto: white
- Padding: px-4 py-2
- Border radius: rounded-lg

**Secundario (Gray):**
```
[Cancelar]
```
- Background: gray-200
- Hover: gray-300
- Texto: gray-700

**Disabled:**
- Background: gray-300
- No hover effect
- Cursor: not-allowed

### Inputs

```
┌────────────────────────────────────────┐
│ Nombre del ingrediente                 │
└────────────────────────────────────────┘
```
- Border: gray-300 (1px)
- Focus: ring-2 ring-emerald-500
- Padding: px-3 py-2
- Border radius: rounded-lg

### Cards

```
┌─────────────────────────────────────┐
│ Contenido de la tarjeta             │
└─────────────────────────────────────┘
```
- Background: white
- Border radius: rounded-xl
- Shadow: shadow-md
- Hover: shadow-lg (opcional)

### Alertas

**Success (Verde):**
```
┌─────────────────────────────────────┐
│ ✅ Tienes suficiente stock          │
└─────────────────────────────────────┘
```
- Background: emerald-50
- Text: emerald-700
- Border: none
- Padding: p-3
- Border radius: rounded-lg

**Warning (Ámbar):**
```
┌─────────────────────────────────────┐
│ ⚠️ Te faltan 150g de Aceite de Coco│
└─────────────────────────────────────┘
```
- Background: amber-50
- Text: amber-700

## 📱 Responsividad

### Desktop (>1024px)
- Dashboard: Grid 4 columnas para stats
- Gráficos: 2 columnas
- Inventario: Tabla completa
- Calculadora: 2 columnas (config + resultados)
- Recetas: 2 columnas

### Tablet (768px - 1024px)
- Dashboard: Grid 2 columnas para stats
- Gráficos: Apilados verticalmente
- Calculadora: 2 columnas
- Recetas: 2 columnas

### Mobile (<768px)
- Todo apilado en 1 columna
- Tabla de inventario con scroll horizontal
- Formularios en columna única
- Navegación de tabs scrollable

## 🎭 Estados Especiales

### Loading (Cargando datos)
```
┌─────────────────────────────────────┐
│                                     │
│        ⟳  (spinner animado)        │
│     Cargando aplicación...          │
│                                     │
└─────────────────────────────────────┘
```
- Fondo: Gradient emerald-50 to blue-50
- Spinner: emerald-500

### Error de Conexión
```
┌─────────────────────────────────────┐
│             ⚠️                      │
│      Error de Conexión              │
│                                     │
│ Error al cargar los datos...        │
│                                     │
│      [Reintentar]                   │
└─────────────────────────────────────┘
```
- Fondo: Gradient red-50 to orange-50
- Card: white con shadow-lg

---

**Diseñado con amor para artesanos del jabón** 🧼
