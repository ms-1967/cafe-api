import express from 'express';
import { Connector } from '@google-cloud/sql-connector';
import mysql from 'mysql2/promise';

const app = express();
app.use(express.json());

const {
  DB_USER = 'app_user',
  DB_PASSWORD = 'app_password',
  DB_NAME = 'cafe_demo',
  INSTANCE_CONNECTION_NAME = 'PROJECT:REGION:INSTANCE',
  PORT = 8080
} = process.env;

// Cloud SQL Connector
const connector = new Connector();

async function createPool() {
  const clientOpts = await connector.getOptions({
    instanceConnectionName: INSTANCE_CONNECTION_NAME,
    ipType: 'PUBLIC'
  });

  return mysql.createPool({
    ...clientOpts,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0
  });
}

let pool;
(async () => {
  pool = await createPool();
})();

// Health check
app.get('/health', (req, res) => res.json({ ok: true }));

// List products
app.get('/products', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT product_id, name, price FROM Products');
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to load products' });
  }
});

// Create order
app.post('/orders', async (req, res) => {
  try {
    const { customer_name = 'Walk-in' } = req.body;
    const [result] = await pool.query(
      'INSERT INTO Orders (customer_name, status) VALUES (?, ?)',
      [customer_name, 'pending']
    );
    res.json({ order_id: result.insertId });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

app.listen(PORT, () => {
  console.log(`API listening on port ${PORT}`);
});
