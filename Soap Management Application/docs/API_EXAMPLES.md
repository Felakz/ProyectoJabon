# 📚 Ejemplos de Uso de la API

## 🧪 Pruebas con cURL

### 1. Health Check

```bash
curl http://localhost:3000/health
```

### 2. Obtener todos los ingredientes

```bash
curl http://localhost:3000/api/inventory
```

### 3. Crear un nuevo ingrediente

```bash
curl -X POST http://localhost:3000/api/inventory \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Aceite de Ricino",
    "currentStock": 1500,
    "totalCost": 2250,
    "sapValue": 180
  }'
```

### 4. Actualizar un ingrediente

```bash
curl -X PUT http://localhost:3000/api/inventory/1 \
  -H "Content-Type: application/json" \
  -d '{
    "currentStock": 6000,
    "totalCost": 3000
  }'
```

### 5. Ajustar stock (ej. después de hacer un batch)

```bash
curl -X PATCH http://localhost:3000/api/inventory/1/adjust-stock \
  -H "Content-Type: application/json" \
  -d '{
    "adjustment": -300,
    "reason": "Batch de jabón lavanda completado"
  }'
```

### 6. Calcular un batch de jabón

```bash
curl -X POST http://localhost:3000/api/calculator/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "recipeId": "2",
    "targetWeight": 1500
  }'
```

### 7. Obtener resumen financiero

```bash
curl -X POST http://localhost:3000/api/calculator/financial-summary \
  -H "Content-Type: application/json" \
  -d '{
    "totalCost": 612.30,
    "soapsPerBatch": 15,
    "desiredProfitMargin": 50
  }'
```

### 8. Validar una receta

```bash
curl -X POST http://localhost:3000/api/calculator/validate-recipe \
  -H "Content-Type: application/json" \
  -d '{
    "id": "test-recipe",
    "name": "Mi Receta",
    "description": "Receta de prueba",
    "targetWeight": 1000,
    "ingredients": [
      {"ingredientId": "1", "percentage": 50},
      {"ingredientId": "2", "percentage": 50}
    ],
    "overfattingPercentage": 5,
    "waterDiscountPercentage": 10
  }'
```

## 🧮 Ejemplo Completo de Flujo de Trabajo

### Paso 1: Verificar inventario disponible

```bash
curl http://localhost:3000/api/inventory
```

### Paso 2: Seleccionar una receta

```bash
curl http://localhost:3000/api/calculator/recipes/2
```

### Paso 3: Calcular el batch

```bash
curl -X POST http://localhost:3000/api/calculator/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "recipeId": "2",
    "targetWeight": 2000
  }'
```

**Respuesta esperada:**

```json
{
  "success": true,
  "calculation": {
    "recipe": {
      "id": "2",
      "name": "Receta Balanceada Universal",
      "ingredients": [...]
    },
    "targetWeight": 2000,
    "oils": [
      {
        "ingredientId": "1",
        "name": "Aceite de Coco",
        "gramsNeeded": 390,
        "gramsAvailable": 5000,
        "hasEnoughStock": true,
        "gramsMissing": 0,
        "cost": 195
      },
      {
        "ingredientId": "2",
        "name": "Aceite de Oliva",
        "gramsNeeded": 520,
        "gramsAvailable": 10000,
        "hasEnoughStock": true,
        "gramsMissing": 0,
        "cost": 208
      },
      {
        "ingredientId": "3",
        "name": "Aceite de Palma",
        "gramsNeeded": 260,
        "gramsAvailable": 3000,
        "hasEnoughStock": true,
        "gramsMissing": 0,
        "cost": 104
      },
      {
        "ingredientId": "4",
        "name": "Manteca de Karité",
        "gramsNeeded": 130,
        "gramsAvailable": 2000,
        "hasEnoughStock": true,
        "gramsMissing": 0,
        "cost": 195
      }
    ],
    "lyeGrams": 184.6,
    "waterGrams": 386.23,
    "totalCost": 704.79,
    "canMakeBatch": true,
    "alerts": [
      "✅ Tienes suficiente stock para crear este batch"
    ]
  }
}
```

### Paso 4: Calcular precio de venta

```bash
curl -X POST http://localhost:3000/api/calculator/financial-summary \
  -H "Content-Type: application/json" \
  -d '{
    "totalCost": 704.79,
    "soapsPerBatch": 20,
    "desiredProfitMargin": 50
  }'
```

**Respuesta esperada:**

```json
{
  "success": true,
  "data": {
    "costPerSoap": 35.24,
    "suggestedPrice": 70.48,
    "profitMargin": 50,
    "breakEvenQuantity": 20
  }
}
```

### Paso 5: Ajustar stock después de crear el batch

```bash
# Reducir Aceite de Coco en 390g
curl -X PATCH http://localhost:3000/api/inventory/1/adjust-stock \
  -H "Content-Type: application/json" \
  -d '{"adjustment": -390, "reason": "Batch Universal 2kg"}'

# Reducir Aceite de Oliva en 520g
curl -X PATCH http://localhost:3000/api/inventory/2/adjust-stock \
  -H "Content-Type: application/json" \
  -d '{"adjustment": -520, "reason": "Batch Universal 2kg"}'

# Reducir Aceite de Palma en 260g
curl -X PATCH http://localhost:3000/api/inventory/3/adjust-stock \
  -H "Content-Type: application/json" \
  -d '{"adjustment": -260, "reason": "Batch Universal 2kg"}'

# Reducir Manteca de Karité en 130g
curl -X PATCH http://localhost:3000/api/inventory/4/adjust-stock \
  -H "Content-Type: application/json" \
  -d '{"adjustment": -130, "reason": "Batch Universal 2kg"}'
```

## 🔴 Casos de Error Comunes

### Stock Insuficiente

Si intentas calcular un batch muy grande:

```bash
curl -X POST http://localhost:3000/api/calculator/calculate \
  -H "Content-Type: application/json" \
  -d '{
    "recipeId": "3",
    "targetWeight": 50000
  }'
```

**Respuesta:**

```json
{
  "success": true,
  "calculation": {
    "canMakeBatch": false,
    "alerts": [
      "⚠️ No hay suficiente stock para completar este batch:",
      "   • Te faltan 10250g de Manteca de Karité (disponible: 2000g, necesario: 12250g)",
      "⚠️ El peso objetivo es muy alto. Verifica que sea correcto."
    ]
  }
}
```

### Receta con porcentajes incorrectos

```bash
curl -X POST http://localhost:3000/api/calculator/validate-recipe \
  -H "Content-Type: application/json" \
  -d '{
    "id": "invalid",
    "name": "Receta Inválida",
    "ingredients": [
      {"ingredientId": "1", "percentage": 50},
      {"ingredientId": "2", "percentage": 30}
    ],
    "overfattingPercentage": 5,
    "waterDiscountPercentage": 10
  }'
```

**Respuesta:**

```json
{
  "success": false,
  "valid": false,
  "errors": [
    "Los porcentajes deben sumar 100%. Suma actual: 80.00%"
  ]
}
```

## 📊 Interpretación de Resultados

### Campos Importantes en el Cálculo

- **lyeGrams**: Gramos exactos de sosa cáustica (NaOH) necesarios
- **waterGrams**: Gramos de agua destilada necesarios
- **canMakeBatch**: `true` si hay suficiente stock, `false` si falta algún ingrediente
- **alerts**: Mensajes informativos sobre el batch

### Valores SAP Típicos

| Aceite | SAP Value (KOH) |
|--------|-----------------|
| Coco | 257 |
| Oliva | 190 |
| Palma | 199 |
| Karité | 180 |
| Ricino | 180 |
| Almendras | 192 |

### Rangos Recomendados

- **Sobreengrasado**: 5-8% (piel normal), 8-12% (piel sensible)
- **Descuento de agua**: 0-15% (principiantes), 15-38% (avanzados)
- **Ratio Agua:Sosa**: 2.33:1 (estándar), hasta 1.5:1 (descuento máximo)

---

**Nota**: Todos los ejemplos asumen que el servidor está corriendo en `http://localhost:3000`
