const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

async function initDB() {
  const db = await open({ filename: './data/db.sqlite', driver: sqlite3.Database });

  // Buat tabel jika belum ada
  await db.exec(`
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT
    );

    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nis TEXT UNIQUE,
      name TEXT,
      kelas TEXT,
      alamat TEXT,
      phone TEXT
    );

    CREATE TABLE IF NOT EXISTS teachers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nidn TEXT UNIQUE,
      name TEXT,
      subject TEXT,
      phone TEXT
    );
  `);

  // Jika belum ada admin, buat admin default (username: admin, password: admin123)
  const row = await db.get('SELECT COUNT(*) as cnt FROM admins');
  if (!row || row.cnt === 0) {
    const bcrypt = require('bcrypt');
    const hash = await bcrypt.hash('admin123', 10);
    await db.run('INSERT INTO admins (username, password) VALUES (?, ?)', ['admin', hash]);
    console.log('Default admin dibuat -> username: admin, password: admin123');
  }

  return db;
}

module.exports = initDB;
