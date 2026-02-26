const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'users.db');
const db = new sqlite3.Database(dbPath);

const testUserId = 1; // <-- replace with a real user id from your users table
const customerName = 'Test Customer';
const customerPhone = '0801234567';
const dueDate = '2026-02-25';

db.run(
  `INSERT INTO pickups (userId, customerName, customerPhone, dueDate) VALUES (?, ?, ?, ?)`,
  [testUserId, customerName, customerPhone, dueDate],
  function(err) {
    if (err) {
      console.error('Insert failed:', err.message);
    } else {
      console.log('Insert successful! Pickup ID:', this.lastID);
    }
    db.close();
  }
);