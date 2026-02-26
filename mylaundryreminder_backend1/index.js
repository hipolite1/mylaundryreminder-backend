const express = require('express');
const twilio = require('twilio');
const bcrypt = require('bcrypt');
require('dotenv').config();
const crypto = require('crypto');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const cron = require('node-cron');

// -----------------------------
// TWILIO SETUP
// -----------------------------
const accountSid = process.env.accountSid;
const authToken = process.env.authToken;
const client = twilio(accountSid, authToken);
const TWILIO_NUMBER = process.env.TWILIO_NUMBER;

// MASTER SWITCH
const SEND_SMS = false;

// CRON REMINDER SWITCH
const RUN_REMINDERS = false;

// -----------------------------
// EXPRESS SETUP
// -----------------------------
const app = express();

app.use(express.json());
app.use(cors());

/* CRITICAL — SERVE FRONTEND FILES */
app.use(express.static(path.join(__dirname, 'frontend')));


// -----------------------------
// DATABASE SETUP
// -----------------------------
const dbPath = path.resolve(__dirname, 'users.db');

const db = new sqlite3.Database(dbPath, (err) => {

  if (err) console.error('DB connection error', err.message);

  else console.log('Connected to users.db');

});


// -----------------------------
// USERS TABLE
// -----------------------------
db.run(`

CREATE TABLE IF NOT EXISTS users (

  id INTEGER PRIMARY KEY AUTOINCREMENT,

  loginId TEXT UNIQUE,

  password TEXT,

  phone TEXT UNIQUE,

  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP

)

`, (err) => {

  if (err) console.error('Users table error', err.message);

  else console.log('Users table ready');

});



// -----------------------------
// PICKUPS TABLE
// -----------------------------
db.run(`

CREATE TABLE IF NOT EXISTS pickups (

  id INTEGER PRIMARY KEY AUTOINCREMENT,

  userId INTEGER,

  customerName TEXT,

  customerPhone TEXT,

  dueDate TEXT,

  pickedUp INTEGER DEFAULT 0,

  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP

)

`, (err) => {

  if (err) console.error('Pickups table error', err.message);

  else console.log('Pickups table ready');

});



// -----------------------------
// ROOT → LOGIN PAGE
// -----------------------------
app.get('/', (req, res) => {

  res.sendFile(path.join(__dirname, 'frontend', 'login.html'));

});




// -----------------------------
// GET PICKUPS
// -----------------------------
app.get('/api/pickups', (req, res) => {

  const userId = req.query.userId;

  if (!userId)

    return res.status(400).json({ error: "userId required" });



  db.all(

    `SELECT * FROM pickups WHERE userId = ? ORDER BY id DESC`,

    [userId],

    (err, rows) => {

      if (err)

        return res.status(500).json({ error: "Fetch failed" });



      res.json(rows);

    }

  );

});




// -----------------------------
// CREATE PICKUP
// -----------------------------
app.post('/api/pickups', (req, res) => {

  const { customerName, customerPhone, dueDate, userId } = req.body;



  if (!customerName || !customerPhone || !dueDate || !userId)

    return res.status(400).json({ error: "All fields required" });



  db.run(

    `INSERT INTO pickups (userId, customerName, customerPhone, dueDate)

     VALUES (?, ?, ?, ?)`,

    [userId, customerName, customerPhone, dueDate],



    function(err) {

      if (err)

        return res.status(500).json({ error: "Insert failed" });



      res.json({

        success: true,

        pickupId: this.lastID

      });

    }

  );

});




// -----------------------------
// MARK PICKED UP
// -----------------------------
app.post('/api/pickups/:id/picked', (req, res) => {

  const pickupId = req.params.id;

  const userId = req.body.userId;



  db.run(

    `UPDATE pickups

     SET pickedUp = 1

     WHERE id = ? AND userId = ?`,



    [pickupId, userId],



    function(err) {

      if (err)

        return res.status(500).json({ error: "Update failed" });



      res.json({ success: true });

    }

  );

});




// -----------------------------
// CREATE LOGIN
// -----------------------------
app.post('/create-login', async (req, res) => {

  const phone = req.body.phone;



  if (!phone)

    return res.status(400).json({ error: "Phone required" });



  db.get(

    `SELECT * FROM users WHERE phone = ?`,

    [phone],



    async (err, user) => {



      if (user)

        return res.status(400).json({ error: "Phone exists" });



      const loginId =

        "MLR" +

        Math.floor(

          100000 + Math.random() * 900000

        );



      const plainPassword =

        crypto.randomBytes(4).toString('hex');



      const hashed =

        await bcrypt.hash(plainPassword, 10);



      db.run(

        `INSERT INTO users (loginId, password, phone)

         VALUES (?, ?, ?)`,



        [loginId, hashed, phone],



        async function(err) {



          if (err)

            return res.status(500).json({

              error: "User save failed"

            });



          console.log(

            "NEW USER:",

            phone,

            plainPassword

          );



          if (SEND_SMS) {

            await client.messages.create({

              body:

                `Login Password: ${plainPassword}`,

              from: TWILIO_NUMBER,

              to: `+${phone}`

            });

          }

          else {

            console.log("(SMS disabled)");

          }



          res.json({

            success: true,

            password: plainPassword

          });

        }

      );



    }

  );

});




// -----------------------------
// LOGIN
// -----------------------------
app.post('/login', async (req, res) => {

  const { phone, password } = req.body;



  db.get(

    `SELECT * FROM users WHERE phone = ?`,

    [phone],



    async (err, user) => {



      if (!user)

        return res.status(400).json({

          error: "User not found"

        });



      const match =

        await bcrypt.compare(

          password,

          user.password

        );



      if (!match)

        return res.status(400).json({

          error: "Wrong password"

        });



      res.json({

        success: true,

        userId: user.id

      });

    }

  );

});




// -----------------------------
// REMINDER CRON
// -----------------------------
cron.schedule(

  '0 * * * * *',

  async () => {



    if (!RUN_REMINDERS)

      return;



    console.log(

      "Reminder job running"

    );



    db.all(

      `SELECT * FROM pickups

       WHERE pickedUp = 0`,



      [],



      async (err, rows) => {



        for (const pickup of rows) {



          if (SEND_SMS) {

            await client.messages.create({

              body:

                `Reminder: ${pickup.customerName}, laundry ready.`,



              from:

                TWILIO_NUMBER,



              to:

                pickup.customerPhone

            });

          }

          else {

            console.log(

              "(SMS OFF)",

              pickup.customerName

            );

          }



        }



      }

    );



  }

);




// -----------------------------
// START SERVER
// -----------------------------
const PORT = process.env.PORT || 3000;

app.listen(

  PORT,

  () => {

    console.log(

      "Server running on port",

      PORT

    );

  }

);