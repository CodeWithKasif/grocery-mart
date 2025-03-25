const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Database connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'K123n45as12',
    database: 'ecommerce'
});

db.connect(err => {
    if (err) {
        console.error('Database connection failed:', err);
    } else {
        console.log('Connected to MySQL database');
    }
});

// Place Order API (Combined)
app.post('/place-order', (req, res) => {
    const { name, email, address, phone, items, totalAmount, paymentMethod, upiTransactionId } = req.body;

    if (!name || !email || !address || !phone || !items.length || !totalAmount || !paymentMethod) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    // Determine payment status
    let paymentStatus = paymentMethod === 'upi' && upiTransactionId ? 'Completed' : 'Pending';

    const orderQuery = `
        INSERT INTO orders (name, email, address, phone, total_amount, payment_method, payment_status, upi_transaction_id) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(orderQuery, 
        [name, email, address, phone, totalAmount, paymentMethod, paymentStatus, upiTransactionId || null], 
        (err, result) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: 'Database error' });
            }

            const orderId = result.insertId;
            let itemQuery = 'INSERT INTO order_items (order_id, product_name, quantity, price) VALUES ?';
            let itemValues = items.map(item => [orderId, item.name, item.quantity, item.price]);

            db.query(itemQuery, [itemValues], (err) => {
                if (err) {
                    console.error(err);
                    return res.status(500).json({ error: 'Error inserting order items' });
                }
                res.json({ success: true, orderId, paymentStatus });
            });
        }
    );
});

// Order Details API
app.get('/order-details/:orderId', (req, res) => {
    const orderId = req.params.orderId;

    // Fetch order
    db.query('SELECT * FROM orders WHERE id = ?', [orderId], (err, orderResults) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Database error' });
        }

        if (orderResults.length === 0) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Fetch items
        db.query('SELECT product_name, quantity, price FROM order_items WHERE order_id = ?', [orderId], 
            (err, itemResults) => {
                if (err) {
                    console.error(err);
                    return res.status(500).json({ error: 'Database error' });
                }

                const orderData = {
                    ...orderResults[0],
                    items: itemResults,
                    shipping_date: new Date(Date.now() + 3*86400000).toISOString().split('T')[0] // Add 3 days
                };

                res.json(orderData);
            }
        );
    });
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});