// fix-pickups.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'users.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("DB connection error:", err.message);
    return;
  }
  console.log("Connected to users.db");
});

// Add userId column safely
db.run("ALTER TABLE pickups ADD COLUMN userId INTEGER", (err) => {
  if (err) {
    if (err.message.includes("duplicate column name")) {
      console.log("userId column already exists");
    } else {
      console.error("Failed to add userId column:", err.message);
    }
  } else {
    console.log("userId column added successfully!");
  }
  db.close();
});