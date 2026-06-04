import http from 'http';
import { init as initDb, createRecipe } from './src/db/sqlite';

const PORT = 8036;
process.env.PORT = String(PORT);
process.env.HOST = '127.0.0.1';

// Inicializar base de datos y obtener instancia
const database = initDb();

async function startServer(): Promise<void> {
  // Importamos dinámicamente el index para que cargue con el puerto 8036 ya configurado
  await import('./src/index');
  console.log(`[TEST-PROD] Servidor de pruebas iniciado en el puerto ${PORT}`);
}

function request(method: string, path: string, body: any = null): Promise<{ statusCode: number; body: any }> {
  return new Promise((resolve, reject) => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (body) {
      headers['Content-Length'] = String(Buffer.byteLength(JSON.stringify(body)));
    }

    const options: http.RequestOptions = {
      hostname: '127.0.0.1',
      port: PORT,
      path: path,
      method: method,
      headers: headers,
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode || 0,
            body: JSON.parse(data),
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode || 0,
            body: data,
          });
        }
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  console.log('--- INICIANDO PRUEBAS DE PRODUCCIÓN Y FORMULACIÓN ---');

  const tempRecipeId = 'recipe-test-carb';
  const tempIng1Id = 'ing-test-coco';
  const tempIng2Id = 'ing-test-oliva';
  const finalProdName = 'Jabón de Carbón Activado - 50g';

  try {
    // 0. Preparar datos limpios de prueba directamente en la DB
    database.exec("DELETE FROM recipe_ingredients WHERE recipeId = 'recipe-test-carb'");
    database.exec("DELETE FROM recipes WHERE id = 'recipe-test-carb'");
    database.exec(`DELETE FROM ingredients WHERE id IN ('${tempIng1Id}', '${tempIng2Id}')`);
    database.exec(`DELETE FROM finished_products WHERE name = '${finalProdName}'`);
    database.exec("DELETE FROM movements WHERE reason LIKE '%Producción Lote%'");
    database.exec("DELETE FROM production_batches WHERE recipeId = 'recipe-test-carb'");

    // Inserción de ingredientes de prueba
    database.prepare(`
      INSERT INTO ingredients (id, name, currentStock, totalCost, costPerGram, sapValue, categoryId)
      VALUES (?, ?, ?, ?, ?, ?, 'cat-mat-prima')
    `).run(tempIng1Id, 'Test Aceite de Coco', 10000, 200, 0.02, 257);

    database.prepare(`
      INSERT INTO ingredients (id, name, currentStock, totalCost, costPerGram, sapValue, categoryId)
      VALUES (?, ?, ?, ?, ?, ?, 'cat-mat-prima')
    `).run(tempIng2Id, 'Test Aceite de Oliva', 10000, 500, 0.05, 190);

    // Inserción de receta de prueba
    const testRecipe = {
      id: tempRecipeId,
      name: 'Test Receta Carbón Activado',
      description: 'Receta para pruebas automatizadas',
      targetWeight: 1000,
      ingredients: [
        { ingredientId: tempIng1Id, percentage: 30 }, // 30% Coco
        { ingredientId: tempIng2Id, percentage: 70 }  // 70% Oliva
      ],
      overfattingPercentage: 5,
      waterDiscountPercentage: 0,
      defaultLaborCost: 10.0
    };

    // Usar la función de negocio para crear y que registre en recipe_ingredients
    createRecipe(testRecipe);

    console.log('✅ Base de datos configurada para las pruebas.');

    // 1. Health check de API
    console.log('\n[TEST 1] Verificando Health Check...');
    const health = await request('GET', '/health');
    if (health.statusCode === 200 && health.body.status === 'OK') {
      console.log('✅ Health Check: CORRECTO');
    } else {
      throw new Error(`Health Check falló con estado ${health.statusCode}`);
    }

    // 2. Calcular costo de lote
    console.log('\n[TEST 2] Verificando costeo y PVP sugerido de lote...');
    const calcPayload = {
      recipeId: tempRecipeId,
      totalGrams: 1000,
      laborCost: 10.0,
      gainFactor: 4.0
    };

    const calcResult = await request('POST', '/api/production/calculate', calcPayload);
    if (calcResult.statusCode === 200 && calcResult.body.success) {
      const data = calcResult.body.data;
      console.log('✅ API respondió correctamente.');
      console.log(`   Costo materia prima: S/ ${data.rawMaterialCost} (Esperado: S/ 41.00)`);
      console.log(`   Costo mano de obra: S/ ${data.laborCost} (Esperado: S/ 10.00)`);
      console.log(`   Costo de producción total: S/ ${data.totalProductionCost} (Esperado: S/ 51.00)`);
      console.log(`   PVP sugerido por gramo: S/ ${data.suggestedPvpPerGram} (Esperado: S/ 0.204)`);

      if (data.rawMaterialCost !== 41.00) throw new Error('Costo de materia prima incorrecto');
      if (data.totalProductionCost !== 51.00) throw new Error('Costo total de producción incorrecto');
      if (data.suggestedPvpPerGram !== 0.204) throw new Error('PVP sugerido por gramo incorrecto');
      if (!data.canProduce) throw new Error('Debería poder producir con 10,000g en stock');
      console.log('✅ Costeo y PVP sugerido: CORRECTOS');
    } else {
      throw new Error(`Cálculo de costo de lote falló: ${JSON.stringify(calcResult.body)}`);
    }

    // 3. Costeo con stock insuficiente
    console.log('\n[TEST 3] Verificando bandera de stock insuficiente...');
    const calcInsufPayload = {
      recipeId: tempRecipeId,
      totalGrams: 50000 // Requiere 15,000g de Coco y 35,000g de Oliva (solo hay 10,000g)
    };
    const calcInsufResult = await request('POST', '/api/production/calculate', calcInsufPayload);
    if (calcInsufResult.statusCode === 200 && calcInsufResult.body.success) {
      if (calcInsufResult.body.data.canProduce === false) {
        console.log('✅ Bandera canProduce = false para stock insuficiente: CORRECTO');
      } else {
        throw new Error('Permitió producir a pesar de stock insuficiente');
      }
    } else {
      throw new Error('Error al costear lote con stock insuficiente');
    }

    // 4. Fabricar lote exitosamente
    console.log('\n[TEST 4] Fabricando lote de prueba (1000g -> 20 jabones de 50g a S/ 10.2 c/u)...');
    const makePayload = {
      recipeId: tempRecipeId,
      totalGrams: 1000,
      laborCost: 10.0,
      outputs: [
        { name: finalProdName, quantity: 20, price: 10.2 }
      ]
    };

    const makeResult = await request('POST', '/api/production/make-batch', makePayload);
    if (makeResult.statusCode === 200 && makeResult.body.success) {
      console.log('✅ API fabricación respondió con éxito.');
      
      // Consultar ingredientes en la DB
      const ing1 = database.prepare('SELECT currentStock, totalCost FROM ingredients WHERE id = ?').get(tempIng1Id) as any;
      const ing2 = database.prepare('SELECT currentStock, totalCost FROM ingredients WHERE id = ?').get(tempIng2Id) as any;

      console.log(`   Stock restante Coco: ${ing1.currentStock}g (Esperado: 9700g)`);
      console.log(`   Stock restante Oliva: ${ing2.currentStock}g (Esperado: 9300g)`);

      if (ing1.currentStock !== 9700) throw new Error('No se dedujo correctamente el stock del Ingrediente 1');
      if (ing2.currentStock !== 9300) throw new Error('No se dedujo correctamente el stock del Ingrediente 2');

      // Consultar Almacén Final (finished_products)
      const finishedProduct = database.prepare('SELECT * FROM finished_products WHERE name = ?').get(finalProdName) as any;
      if (!finishedProduct) throw new Error('No se creó el producto terminado en finished_products');
      
      console.log(`   Producto terminado: "${finishedProduct.name}" | Stock: ${finishedProduct.stock} (Esperado: 20) | Precio: S/ ${finishedProduct.price} (Esperado: 10.2)`);
      if (finishedProduct.stock !== 20) throw new Error('Stock del producto final incorrecto');
      if (finishedProduct.price !== 10.2) throw new Error('Precio del producto final incorrecto');

      // Consultar movimientos
      const movements = database.prepare('SELECT COUNT(*) as count FROM movements WHERE reason LIKE ?').get(`%Producción Lote - Receta: ${testRecipe.name}%`) as any;
      if (movements.count !== 2) throw new Error(`Se esperaban 2 movimientos de egreso, se encontraron ${movements.count}`);

      // Consultar batches e historial de producción
      const batchList = database.prepare('SELECT * FROM production_batches WHERE recipeId = ?').all(tempRecipeId) as any[];
      if (batchList.length !== 1) throw new Error('No se registró la orden de lote en production_batches');
      const batchId = batchList[0].id;
      
      const outputsList = database.prepare('SELECT * FROM production_batch_outputs WHERE batchId = ?').all(batchId) as any[];
      if (outputsList.length !== 1 || outputsList[0].quantity !== 20) throw new Error('No se registraron las salidas del batch en production_batch_outputs');

      console.log('✅ Transacción Fabricar Lote: CORRECTA');
    } else {
      throw new Error(`Fabricación de lote falló: ${JSON.stringify(makeResult.body)}`);
    }

    // 5. Fabricar lote fallido (para validar Rollback)
    console.log('\n[TEST 5] Validando transaccionalidad atómica y Rollback ante stock insuficiente...');
    const failMakePayload = {
      recipeId: tempRecipeId,
      totalGrams: 50000, // Stock insuficiente
      laborCost: 10.0,
      outputs: [
        { name: finalProdName, quantity: 1, price: 10.2 }
      ]
    };

    const failMakeResult = await request('POST', '/api/production/make-batch', failMakePayload);
    if (failMakeResult.statusCode !== 200) {
      console.log('✅ API rechazó la solicitud (esperado).');

      // Verificar que los stocks no variaron
      const ing1 = database.prepare('SELECT currentStock FROM ingredients WHERE id = ?').get(tempIng1Id) as any;
      const finishedProduct = database.prepare('SELECT stock FROM finished_products WHERE name = ?').get(finalProdName) as any;

      console.log(`   Stock Coco después de fallo: ${ing1.currentStock}g (Esperado: 9700g)`);
      console.log(`   Stock Producto Terminado después de fallo: ${finishedProduct.stock} uds (Esperado: 20 uds)`);

      if (ing1.currentStock !== 9700) throw new Error('El rollback falló. Se alteró el stock de insumos.');
      if (finishedProduct.stock !== 20) throw new Error('El rollback falló. Se alteró el stock de productos terminados.');

      console.log('✅ Transacción y Rollback: CORRECTOS (Atómico)');
    } else {
      throw new Error('La API respondió con éxito a pesar del stock insuficiente. Rollback fallido.');
    }

    // Limpieza
    database.exec("DELETE FROM recipe_ingredients WHERE recipeId = 'recipe-test-carb'");
    database.exec("DELETE FROM recipes WHERE id = 'recipe-test-carb'");
    database.exec(`DELETE FROM ingredients WHERE id IN ('${tempIng1Id}', '${tempIng2Id}')`);
    database.exec(`DELETE FROM finished_products WHERE name = '${finalProdName}'`);
    database.exec("DELETE FROM movements WHERE reason LIKE '%Producción Lote%'");
    database.exec("DELETE FROM production_batches WHERE recipeId = 'recipe-test-carb'");

    console.log('\n🌟 ¡TODAS LAS PRUEBAS DE PRODUCCIÓN FINALIZARON CON ÉXITO! 🌟');
  } catch (error: any) {
    console.error('\n❌ PRUEBA DE PRODUCCIÓN FALLIDA:', error.message);
    process.exitCode = 1;
  } finally {
    process.exit(process.exitCode || 0);
  }
}

startServer().then(runTests);
