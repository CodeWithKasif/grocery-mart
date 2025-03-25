const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
const PORT = 5000;
const SECRET_KEY = "your_secret_key";
const SALT_ROUNDS = 10;

// Middleware connectors
app.use(express.json());
app.use(express.urlencoded({ extended: true })); 
app.use(cors());

// db Connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'K123n45as12',
    database: 'grocery'
});

db.connect(err => {
    if (err) {
        console.error('Database connection failed:', err);
    } else {
        console.log('MySQL Connected');
    }
});

// Signup Route with Password Hashing
app.post('/signup', async (req, res) => {
    console.log("Received Data:", req.body);
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ message: "All fields are required" });
    }

    db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
        if (err) return res.status(500).json({ message: "Database error" });
        if (results.length > 0) return res.status(400).json({ message: "User already exists" });

        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
        db.query('INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
            [username, email, hashedPassword],
            (err, result) => {
                if (err) return res.status(500).json({ message: "Database error" });
                res.status(201).json({ message: "User registered successfully" });
            }
        );
    });
});

// Login Route with Password Verification
app.post('/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: "All fields are required" });
    }

    db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
        if (err) return res.status(500).json({ message: "Database error" });
        if (results.length === 0) return res.status(400).json({ message: "User not found" });

        const user = results[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

        const token = jwt.sign({ id: user.id }, SECRET_KEY, { expiresIn: "1h" });
        res.json({ token, user: { id: user.id, username: user.username, email: user.email } });
    });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
