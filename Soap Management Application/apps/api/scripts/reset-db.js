const fs = require('fs');
const path = require('path');

// Resolve database file and backup paths
const DATA_DIR = path.resolve(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'jabones.sqlite');
const INGREDIENTS_JSON = path.join(DATA_DIR, 'ingredients.json');
const RECIPES_JSON = path.join(DATA_DIR, 'recipes.json');
const CURRENT_INVOICE_JSON = path.join(DATA_DIR, 'current-invoice.json');
const INVOICE_JSON = path.join(DATA_DIR, 'invoice.json');

console.log('--- INICIANDO RESTABLECIMIENTO DE DATOS ---');
console.log('Ruta DB:', DB_FILE);

try {
  // 1. Load better-sqlite3
  const Database = require('better-sqlite3');
  const db = new Database(DB_FILE);

  console.log('Conectado exitosamente a la base de datos.');

  // 2. Clear tables (preserving categories)
  db.transaction(() => {
    console.log('Limpiando tablas contables y de catálogo...');
    db.prepare('DELETE FROM product_packs').run();
    db.prepare('DELETE FROM product_variants').run();
    db.prepare('DELETE FROM products').run();
    db.prepare('DELETE FROM movements').run();
    db.prepare('DELETE FROM transactions').run();
    db.prepare('DELETE FROM recipes').run();
    db.prepare('DELETE FROM ingredients').run();
    db.prepare('DELETE FROM current_invoice').run();

    console.log('Restableciendo contador de boletas a cero...');
    // Reset invoice numbers under B001 to 0
    const checkState = db.prepare('SELECT lastNumber FROM invoice_state WHERE series = ?').get('B001');
    if (checkState) {
      db.prepare('UPDATE invoice_state SET lastNumber = 0 WHERE series = ?').run('B001');
    } else {
      db.prepare('INSERT INTO invoice_state (series, lastNumber) VALUES (?, ?)').run('B001', 0);
    }
  })();

  console.log('¡Base de datos limpiada con éxito! (Categorías preservadas intactas)');

} catch (err) {
  console.error('Error al manipular la base de datos:', err);
}

// 3. Clear JSON backups so they do not seed default items on next server boot
try {
  console.log('Depurando copias de seguridad JSON...');
  fs.writeFileSync(INGREDIENTS_JSON, '[]', 'utf8');
  fs.writeFileSync(RECIPES_JSON, '[]', 'utf8');
  fs.writeFileSync(CURRENT_INVOICE_JSON, '{}', 'utf8');
  fs.writeFileSync(INVOICE_JSON, '{"series":"B001","lastNumber":0}', 'utf8');
  console.log('¡Respaldos JSON depurados con éxito!');
} catch (err) {
  console.error('Error al depurar respaldos JSON:', err);
}

console.log('--- RESTABLECIMIENTO COMPLETADO ---');
