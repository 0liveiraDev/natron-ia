const mysql2 = require('mysql2/promise');

// CONFIGURAÇÕES DA ORIGEM (HOSTINGER)
// --- ATENÇÃO: Ajuste o 'host' se for diferente do srv1549 ---
const HOSTINGER = {
  host: 'srv1549.hstgr.io', 
  port: 3306,
  user: 'u710961292_NatronBD', 
  password: 'NatronIA2026!',
  database: 'u710961292_Natron',
  ssl: { rejectUnauthorized: false }, 
  connectTimeout: 20000,
};

// CONFIGURAÇÕES DO DESTINO (SEU VPS)
const VPS = {
  host: '2.24.84.26', 
  port: 3307, // Porta exclusiva do Natron
  user: 'natron_user', 
  password: 'NatronPassword2026',
  database: 'natron_db', 
  connectTimeout: 20000,
};

// Tabelas do sistema Natron para migrar
const TABLES = ['User', 'Habit', 'HabitLog', 'Task', 'Transaction', 'ActivityLog', 'FinancialConfig', 'PasswordReset'];

async function getColumns(conn, table) {
  try {
    const [cols] = await conn.query(`SHOW COLUMNS FROM \`${table}\``);
    return cols.map(c => c.Field);
  } catch { return null; }
}

async function migrate() {
  console.log('🔌 Iniciando migração do Natron...');
  let src, dst;
  
  try {
    src = await mysql2.createConnection(HOSTINGER);
    dst = await mysql2.createConnection(VPS);
    console.log('✅ Conexão estabelecida entre Hostinger e VPS!\n');
  } catch (err) {
    console.error('❌ Erro de conexão:', err.message);
    console.log('\n💡 DICA: Verifique se o Host da Hostinger está correto e se o IP do seu computador está liberado no firewall do MySQL na Hostinger.');
    return;
  }

  let totalMigrado = 0;

  for (const table of TABLES) {
    try {
      const srcCols = await getColumns(src, table);
      if (!srcCols) { console.log(`  ⬜ ${table}: não encontrada na origem`); continue; }

      const [rows] = await src.query(`SELECT * FROM \`${table}\``);
      if (!rows || rows.length === 0) { console.log(`  ⬜ ${table}: sem dados para migrar`); continue; }

      console.log(`\n📦 Migrando ${table}: ${rows.length} registros...`);

      await dst.query('SET FOREIGN_KEY_CHECKS=0');
      await dst.query(`DELETE FROM \`${table}\``);

      let inserido = 0;
      for (const row of rows) {
        const cols = Object.keys(row).map(k => `\`${k}\``).join(', ');
        const placeholders = Object.keys(row).map(() => '?').join(', ');
        const vals = Object.values(row);

        try {
          await dst.query(`INSERT INTO \`${table}\` (${cols}) VALUES (${placeholders})`, vals);
          inserido++;
        } catch (e) {
          console.log(`    ⚠ Erro no registro: ${e.message.substring(0, 100)}`);
        }
      }

      await dst.query('SET FOREIGN_KEY_CHECKS=1');
      totalMigrado += inserido;
      console.log(`  ✅ ${table}: ${inserido}/${rows.length} migrados`);

    } catch (err) {
      console.log(`  ❌ Erro em ${table}: ${err.message}`);
    }
  }

  await src.end();
  await dst.end();

  console.log('\n\n🎉 MIGRAÇÃO CONCLUÍDA!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ Total de registros movidos: ${totalMigrado}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

migrate().catch(err => { console.error('❌ Erro fatal:', err.message); });
