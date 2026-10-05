const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function main() {
  const rootConn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '123456',
    multipleStatements: true,
  });

  console.log('Connected to MySQL root');
  await rootConn.query(`DROP DATABASE IF EXISTS hotel_management;`);
  await rootConn.query(`CREATE DATABASE hotel_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
  console.log('Database hotel_management recreated cleanly.');

  try {
    await rootConn.query(`CREATE USER IF NOT EXISTS 'hotel_user'@'localhost' IDENTIFIED BY 'hotel123';`);
    await rootConn.query(`ALTER USER 'hotel_user'@'localhost' IDENTIFIED BY 'hotel123';`);
    await rootConn.query(`GRANT ALL PRIVILEGES ON hotel_management.* TO 'hotel_user'@'localhost';`);
    await rootConn.query(`FLUSH PRIVILEGES;`);
    console.log('hotel_user created and granted privileges.');
  } catch (e) {
    console.warn('User setup note:', e.message);
  }
  await rootConn.end();

  const dbConn = await mysql.createConnection({
    host: 'localhost',
    user: 'hotel_user',
    password: 'hotel123',
    database: 'hotel_management',
    multipleStatements: true,
  });
  console.log('Connected as hotel_user to hotel_management');

  const files = [
    path.resolve(__dirname, '../../database/schema.sql'),
    path.resolve(__dirname, '../../database/seed.sql'),
    path.resolve(__dirname, '../../database/migrations/001_chain_schema.sql'),
    path.resolve(__dirname, '../../database/migrations/002_hotel_search_demo_rooms.sql'),
    path.resolve(__dirname, '../../database/migrations/003_actor_role_consolidation.sql'),
    path.resolve(__dirname, '../../database/migrations/004_city_location_hotel_search.sql'),
    path.resolve(__dirname, '../../database/migrations/005_tour_car_unified_order.sql'),
    path.resolve(__dirname, '../../database/migrations/006_demo_tour_car_orders.sql'),
  ];

  for (const filePath of files) {
    if (fs.existsSync(filePath)) {
      console.log(`Running: ${path.basename(filePath)}...`);
      const sql = fs.readFileSync(filePath, 'utf8');
      try {
        await dbConn.query(sql);
        console.log(`Finished ${path.basename(filePath)}`);
      } catch (e) {
        process.stdout.write(`\n=== ERROR in ${path.basename(filePath)} ===\n`);
        process.stdout.write(`CODE: ${e.code}\n`);
        process.stdout.write(`ERRNO: ${e.errno}\n`);
        process.stdout.write(`SQLSTATE: ${e.sqlState}\n`);
        process.stdout.write(`MESSAGE: ${e.message}\n`);
        process.exit(1);
      }
    }
  }

  await dbConn.end();
  console.log('✅ All schemas, seeds, and migrations executed successfully!');
}

main().catch(err => {
  console.error('Setup failed:', err);
  process.exit(1);
});
