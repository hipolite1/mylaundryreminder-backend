const express = require('express');
const twilio = require('twilio');
const bcrypt = require('bcrypt'); 
require('dotenv').config();
const crypto = require('crypto');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const accountSid = process.env.accountSid;
const authToken = process.env.authToken;
const client = twilio(accountSid, authToken);
const TWILIO_NUMBER = process.env.TWILIO_NUMBER;

const app = express();
app.use(express.json());
app.use(cors());

// --- SQLite database ---
const dbPath = path.resolve(__dirname, 'users.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error('DB connection error', err.message);
  else console.log('Connected to users.db');
});

// --- Users table ---
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    loginId TEXT UNIQUE,
    password TEXT,
    phone TEXT UNIQUE,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`, (err) => {
  if (err) console.error('Error creating users table', err.message);
  else console.log('Users table ready');
});

// --- Pickups table ---
db.run(`
  CREATE TABLE IF NOT EXISTS pickups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customerName TEXT,
    customerPhone TEXT,
    dueDate TEXT,
    pickedUp INTEGER DEFAULT 0,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`, (err) => {
  if (err) console.error('Error creating pickups table', err.message);
  else console.log('Pickups table ready');
});

// --- Test route ---
app.get('/', (req, res) => {
  res.send("MyLaundryReminder Backend Running");
});

// --- Create login endpoint ---
app.post('/create-login', async (req, res) => {
  const phone = req.body.phone;
  if (!phone) return res.status(400).json({ error: "Phone required" });

  db.get(`SELECT * FROM users WHERE phone = ?`, [phone], async (err, row) => {
    if (err) return res.status(500).json({ error: "DB error" });
    if (row) return res.status(400).json({ error: "Phone already registered" });

    const loginId = "MLR" + Math.floor(100000 + Math.random() * 900000);
    const plainPassword = crypto.randomBytes(4).toString('hex');
    const password = await bcrypt.hash(plainPassword, 10);

    db.run(`INSERT INTO users (loginId, password, phone) VALUES (?, ?, ?)`,
      [loginId, password, phone],
      async function(err) {
        if (err) return res.status(500).json({ error: "Could not save user" });
        
        console.log(`NEW USER: ${phone}, ${loginId}, ${plainPassword}`);

        // Twilio SMS simulation (trial: must verify your number)
        try {
          await client.messages.create({
            body: `Login ID: ${loginId}\nPassword: ${plainPassword}`,
            from: TWILIO_NUMBER,
            to: `+${phone}`
          });
        } catch(e) {
          console.error("Error sending SMS:", e.message);
        }

        res.json({ success: true, loginId, password: plainPassword });
      }
    );
  });
});

// --- Login endpoint ---
app.post('/login', async (req, res) => {
  const { phone, password } = req.body;
  if (!phone || !password) return res.status(400).json({ error: "Phone & password required" });

  db.get(`SELECT * FROM users WHERE phone = ?`, [phone], async (err, user) => {
    if (err) return res.status(500).json({ error: "DB error" });
    if (!user) return res.status(400).json({ error: "User not found" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ error: "Invalid password" });

    res.json({ success: true, loginId: user.loginId, message: "Login successful" });
  });
});

// --- Create Pickup ---
app.post('/api/pickups', (req, res) => {
  const { customerName, customerPhone, dueDate } = req.body;
  if (!customerName || !customerPhone || !dueDate) return res.status(400).json({ error: "All fields required" });

  db.run(`INSERT INTO pickups (customerName, customerPhone, dueDate) VALUES (?, ?, ?)`,
    [customerName, customerPhone, dueDate],
    function(err) {
      if (err) return res.status(500).json({ error: "Could not create pickup" });
      res.json({ success: true, pickupId: this.lastID });
    }
  );
});

// --- Mark Picked Up ---
app.post('/api/pickups/:id/picked', (req, res) => {
  const pickupId = req.params.id;
  db.run(`UPDATE pickups SET pickedUp = 1 WHERE id = ?`, [pickupId], function(err) {
    if (err) return res.status(500).json({ error: "Could not mark picked" });
    res.json({ success: true });
  });
});

// --- Server start ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on port", PORT));