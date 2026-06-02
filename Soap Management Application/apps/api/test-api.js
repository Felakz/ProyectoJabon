/**
 * Script de prueba de integración para la Fase 1 del ERP de Jabones
 * Valida los endpoints de categorías y transacciones en el servidor Express.
 */

const http = require('http');
const { init: initDb } = require('./src/db/sqlite');

// Configuración de puertos de prueba
const PORT = 8035;
process.env.PORT = String(PORT);

// Inicializar base de datos e importar la app de express
initDb();
const app = require('./src/index').default;

let server;

function startServer() {
  return new Promise((resolve) => {
    server = app.listen(PORT, '127.0.0.1', () => {
      console.log(`[TEST] Servidor de pruebas iniciado en http://127.0.0.1:${PORT}`);
      resolve();
    });
  });
}

function stopServer() {
  if (server) {
    server.close();
    console.log('[TEST] Servidor de pruebas cerrado.');
  }
}

// Helper para hacer peticiones HTTP
function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: '127.0.0.1',
      port: PORT,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (body) {
      options.headers['Content-Length'] = Buffer.byteLength(JSON.stringify(body));
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            body: JSON.parse(data),
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
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
  console.log('--- INICIANDO PRUEBAS DE INTEGRACIÓN DE LA FASE 1 ---');
  let categoryId = '';
  let transactionId = '';

  try {
    // 1. Health check
    console.log('\n[TEST 1] Verificando Health Check...');
    const health = await request('GET', '/health');
    if (health.statusCode === 200 && health.body.status === 'OK') {
      console.log('✅ Health Check: CORRECTO');
    } else {
      throw new Error(`Health Check falló con estado ${health.statusCode}`);
    }

    // 2. Listar categorías (deberían estar las sembradas)
    console.log('\n[TEST 2] Verificando categorías sembradas por defecto...');
    const categories = await request('GET', '/api/categories');
    if (categories.statusCode === 200 && Array.isArray(categories.body.data)) {
      console.log(`✅ Listar categorías: CORRECTO (${categories.body.data.length} encontradas)`);
      const names = categories.body.data.map(c => c.name);
      console.log('   Categorías sembradas:', names.join(', '));
      if (!names.includes('Materia Prima') || !names.includes('Gastos Operativos')) {
        throw new Error('Faltan categorías fundamentales sembradas.');
      }
    } else {
      throw new Error('Error al listar categorías.');
    }

    // 3. Crear una nueva categoría
    console.log('\n[TEST 3] Creando nueva categoría de prueba...');
    const newCat = {
      name: 'Categoría de Prueba',
      description: 'Una categoría para validar el backend',
      type: 'transaction'
    };
    const createCat = await request('POST', '/api/categories', newCat);
    if (createCat.statusCode === 201 && createCat.body.success) {
      categoryId = createCat.body.data.id;
      console.log(`✅ Crear categoría: CORRECTO (ID: ${categoryId})`);
    } else {
      throw new Error(`Error creando categoría: ${JSON.stringify(createCat.body)}`);
    }

    // 4. Obtener la categoría creada por ID
    console.log('\n[TEST 4] Obteniendo categoría por ID...');
    const getCat = await request('GET', `/api/categories/${categoryId}`);
    if (getCat.statusCode === 200 && getCat.body.data.name === 'Categoría de Prueba') {
      console.log('✅ Obtener categoría: CORRECTO');
    } else {
      throw new Error('Error al recuperar la categoría por ID.');
    }

    // 5. Crear transacción vinculada a la nueva categoría
    console.log('\n[TEST 5] Creando transacción asociada a la categoría...');
    const newTx = {
      type: 'expense',
      amount: 150.50,
      description: 'Compra de esencias especiales para jabones',
      date: new Date().toISOString().split('T')[0],
      categoryId: categoryId
    };
    const createTx = await request('POST', '/api/transactions', newTx);
    if (createTx.statusCode === 201 && createTx.body.success) {
      transactionId = createTx.body.data.id;
      console.log(`✅ Crear transacción: CORRECTO (ID: ${transactionId})`);
    } else {
      throw new Error(`Error creando transacción: ${JSON.stringify(createTx.body)}`);
    }

    // 6. Listar transacciones y comprobar filtrado
    console.log('\n[TEST 6] Listando transacciones con filtros contables...');
    const txList = await request('GET', `/api/transactions?type=expense&categoryId=${categoryId}`);
    if (txList.statusCode === 200 && txList.body.data.length >= 1) {
      console.log('✅ Listar y filtrar transacciones: CORRECTO');
      console.log('   Transacción recuperada:', txList.body.data[0].description, `- $${txList.body.data[0].amount}`);
    } else {
      throw new Error('Error al listar o filtrar transacciones.');
    }

    // 7. Borrar la categoría y validar integridad (ON DELETE SET NULL)
    console.log('\n[TEST 7] Eliminando la categoría de prueba para validar ON DELETE SET NULL...');
    const delCat = await request('DELETE', `/api/categories/${categoryId}`);
    if (delCat.statusCode === 200 && delCat.body.success) {
      console.log('✅ Eliminar categoría: CORRECTO');
    } else {
      throw new Error('Error al eliminar categoría.');
    }

    // 8. Verificar que la transacción todavía existe pero su categoryId es nulo
    console.log('\n[TEST 8] Validando comportamiento ON DELETE SET NULL en transacción...');
    const getTx = await request('GET', `/api/transactions/${transactionId}`);
    if (getTx.statusCode === 200 && getTx.body.data) {
      const tx = getTx.body.data;
      if (tx.categoryId === null) {
        console.log('✅ Integridad referencial (ON DELETE SET NULL): CORRECTO (categoryId es null)');
      } else {
        throw new Error(`Integridad referencial falló: categoryId sigue siendo ${tx.categoryId}`);
      }
    } else {
      throw new Error('Error recuperando la transacción después de borrar la categoría.');
    }

    // 9. Borrar la transacción
    console.log('\n[TEST 9] Limpiando transacción de prueba...');
    const delTx = await request('DELETE', `/api/transactions/${transactionId}`);
    if (delTx.statusCode === 200 && delTx.body.success) {
      console.log('✅ Eliminar transacción: CORRECTO');
    } else {
      throw new Error('Error al limpiar la transacción.');
    }

    console.log('\n🌟 ¡TODAS LAS PRUEBAS SE COMPLETARON CON ÉXITO! 🌟');
  } catch (error) {
    console.error('\n❌ PRUEBA FALLIDA:', error.message);
    process.exitCode = 1;
  } finally {
    stopServer();
  }
}

// Ejecutar flujo
startServer().then(runTests);
