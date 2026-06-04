import http from 'http';
import { init as initDb } from './src/db/sqlite';

const PORT = 8037;
process.env.PORT = String(PORT);
process.env.HOST = '127.0.0.1';

// Inicializar base de datos y obtener instancia
const database = initDb();

async function startServer(): Promise<void> {
  await import('./src/index');
  console.log(`[TEST-INT-PROD] Servidor de pruebas iniciado en el puerto ${PORT}`);
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
  console.log('--- INICIANDO PRUEBAS DE PRODUCCIÓN INTERACTIVA DINÁMICA ---');

  const tempIng1Id = 'ing-int-coco';
  const tempIng2Id = 'ing-int-oliva';
  const productName = 'Jabón Interactivo Lavanda';
  const finalProdName = 'Jabón Interactivo Lavanda - 100g';

  try {
    // 0. Preparar datos limpios de prueba directamente en la DB
    database.exec(`DELETE FROM ingredients WHERE id IN ('${tempIng1Id}', '${tempIng2Id}')`);
    database.exec(`DELETE FROM finished_products WHERE name = '${finalProdName}'`);
    database.exec("DELETE FROM movements WHERE reason LIKE '%Producción Lote Interactivo%'");
    database.exec("DELETE FROM transactions WHERE description LIKE '%Mano de Obra - Lote Interactivo%'");

    // Inserción de ingredientes de prueba
    database.prepare(`
      INSERT INTO ingredients (id, name, currentStock, totalCost, costPerGram, sapValue, categoryId)
      VALUES (?, ?, ?, ?, ?, ?, 'cat-mat-prima')
    `).run(tempIng1Id, 'Test Aceite de Coco Int', 5000, 100, 0.02, 257);

    database.prepare(`
      INSERT INTO ingredients (id, name, currentStock, totalCost, costPerGram, sapValue, categoryId)
      VALUES (?, ?, ?, ?, ?, ?, 'cat-mat-prima')
    `).run(tempIng2Id, 'Test Aceite de Oliva Int', 5000, 250, 0.05, 190);

    console.log('✅ Base de datos configurada para las pruebas interactiva.');

    // 1. Fabricar lote interactivo exitosamente (10 unidades de 100g = 1000g totales)
    // Ingrediente 1: Coco (30% -> 300g used) -> Costo: 300g * 0.02 = S/ 6.00
    // Ingrediente 2: Oliva (70% -> 700g used) -> Costo: 700g * 0.05 = S/ 35.00
    // Costo Materia Prima = S/ 41.00
    // Labor Cost = S/ 15.00
    // Costo Total = S/ 56.00
    // PVP Aprobado = S/ 25.00 unitario
    console.log('\n[TEST 1] Fabricando lote interactivo...');
    const payload = {
      productName,
      unitWeight: 100,
      unitsProduced: 10,
      laborCost: 15.0,
      approvedPvp: 25.0,
      ingredients: [
        { id: tempIng1Id, gramsUsed: 300 },
        { id: tempIng2Id, gramsUsed: 700 }
      ]
    };

    const makeResult = await request('POST', '/api/production/make-batch-interactive', payload);
    if (makeResult.statusCode === 200 && makeResult.body.success) {
      console.log('✅ API fabricación interactiva respondió con éxito.');
      const data = makeResult.body.data;
      console.log(`   Batch ID: ${data.batchId}`);
      console.log(`   Costo materia prima: S/ ${data.rawMaterialCost} (Esperado: S/ 41.00)`);
      console.log(`   Costo total producción: S/ ${data.totalProductionCost} (Esperado: S/ 56.00)`);

      if (data.rawMaterialCost !== 41.00) throw new Error('Costo de materia prima incorrecto');
      if (data.totalProductionCost !== 56.00) throw new Error('Costo total de producción incorrecto');

      // Consultar ingredientes en la DB
      const ing1 = database.prepare('SELECT currentStock FROM ingredients WHERE id = ?').get(tempIng1Id) as any;
      const ing2 = database.prepare('SELECT currentStock FROM ingredients WHERE id = ?').get(tempIng2Id) as any;

      console.log(`   Stock restante Coco: ${ing1.currentStock}g (Esperado: 4700g)`);
      console.log(`   Stock restante Oliva: ${ing2.currentStock}g (Esperado: 4300g)`);

      if (ing1.currentStock !== 4700) throw new Error('Deducción de stock incorrecta para Coco');
      if (ing2.currentStock !== 4300) throw new Error('Deducción de stock incorrecta para Oliva');

      // Consultar Almacén Final (finished_products)
      const finishedProduct = database.prepare('SELECT * FROM finished_products WHERE name = ?').get(finalProdName) as any;
      if (!finishedProduct) throw new Error('No se creó el producto terminado en finished_products');
      
      console.log(`   Producto terminado: "${finishedProduct.name}" | Stock: ${finishedProduct.stock} (Esperado: 10) | PVP: S/ ${finishedProduct.price} (Esperado: 25.0)`);
      if (finishedProduct.stock !== 10) throw new Error('Stock del producto final incorrecto');
      if (finishedProduct.price !== 25.0) throw new Error('Precio PVP del producto final incorrecto');

      // Consultar transacciones contables (Mano de obra)
      const transList = database.prepare('SELECT * FROM transactions WHERE referenceId = ?').all(data.batchId) as any[];
      if (transList.length !== 1 || transList[0].amount !== 15.0) {
        throw new Error('No se registró la transacción de gasto por mano de obra correctamente');
      }
      console.log(`   Transacción contable registrada: S/ ${transList[0].amount} (Gasto de Mano de Obra)`);

      console.log('✅ Prueba de Lote Interactivo Exitoso: CORRECTO');
    } else {
      throw new Error(`Fabricación de lote interactivo falló: ${JSON.stringify(makeResult.body)}`);
    }

    // 2. Fabricar lote con stock insuficiente (para validar Rollback)
    console.log('\n[TEST 2] Verificando Rollback ante stock insuficiente en lote interactivo...');
    const failPayload = {
      productName,
      unitWeight: 100,
      unitsProduced: 10,
      laborCost: 10.0,
      approvedPvp: 20.0,
      ingredients: [
        { id: tempIng1Id, gramsUsed: 8000 } // Supera stock disponible
      ]
    };

    const failResult = await request('POST', '/api/production/make-batch-interactive', failPayload);
    if (failResult.statusCode !== 200) {
      console.log('✅ API rechazó la solicitud (esperado).');

      // Verificar que los stocks no variaron
      const ing1 = database.prepare('SELECT currentStock FROM ingredients WHERE id = ?').get(tempIng1Id) as any;
      const finishedProduct = database.prepare('SELECT stock FROM finished_products WHERE name = ?').get(finalProdName) as any;

      console.log(`   Stock Coco después de fallo: ${ing1.currentStock}g (Esperado: 4700g)`);
      console.log(`   Stock Producto Terminado después de fallo: ${finishedProduct.stock} uds (Esperado: 10 uds)`);

      if (ing1.currentStock !== 4700) throw new Error('El rollback falló. Se alteró el stock de insumos.');
      if (finishedProduct.stock !== 10) throw new Error('El rollback falló. Se alteró el stock de productos terminados.');

      console.log('✅ Transacción y Rollback Interactivo: CORRECTOS (Atómico)');
    } else {
      throw new Error('La API respondió con éxito a pesar del stock insuficiente. Rollback fallido.');
    }

    // Limpieza
    database.exec(`DELETE FROM ingredients WHERE id IN ('${tempIng1Id}', '${tempIng2Id}')`);
    database.exec(`DELETE FROM finished_products WHERE name = '${finalProdName}'`);
    database.exec("DELETE FROM movements WHERE reason LIKE '%Producción Lote Interactivo%'");
    database.exec("DELETE FROM transactions WHERE description LIKE '%Mano de Obra - Lote Interactivo%'");

    console.log('\n🌟 ¡TODAS LAS PRUEBAS DE PRODUCCIÓN INTERACTIVA FINALIZARON CON ÉXITO! 🌟');
  } catch (error: any) {
    console.error('\n❌ PRUEBA DE PRODUCCIÓN INTERACTIVA FALLIDA:', error.message);
    process.exitCode = 1;
  } finally {
    process.exit(process.exitCode || 0);
  }
}

startServer().then(runTests);
