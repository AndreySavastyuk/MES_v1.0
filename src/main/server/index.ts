import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import { allSQL, getSQL, runSQL } from '../database';

// Импорт роутов
import tasksRouter from './routes/tasks';
import devicesRouter from './routes/devices';
import syncRouter, { initializeSyncService } from './routes/sync';

const app = express();
const server = createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// API Routes
app.use('/api/tasks', tasksRouter);
app.use('/api/devices', devicesRouter);
app.use('/api/sync', syncRouter);

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Products API
app.get('/api/products', async (req, res) => {
  try {
    const products = await allSQL(`
      SELECT p.*, c.name as category_name, s.name as supplier_name 
      FROM products p 
      LEFT JOIN categories c ON p.category_id = c.id 
      LEFT JOIN suppliers s ON p.supplier_id = s.id
    `);
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка получения товаров' });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const product = await getSQL('SELECT * FROM products WHERE id = ?', [req.params.id]);
    if (!product) {
      return res.status(404).json({ error: 'Товар не найден' });
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка получения товара' });
  }
});

app.post('/api/products', async (req, res) => {
  try {
    const { sku, name, description, price, cost, category_id, supplier_id } = req.body;
    const result = await runSQL(`
      INSERT INTO products (sku, name, description, price, cost, category_id, supplier_id) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [sku, name, description, price, cost, category_id, supplier_id]);
    
    // Уведомление через WebSocket
    io.emit('product_created', { id: (result as any).lastInsertRowid, ...req.body });
    
    res.status(201).json({ id: (result as any).lastInsertRowid, message: 'Товар создан' });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка создания товара' });
  }
});

app.put('/api/products/:id', async (req, res) => {
  try {
    const { sku, name, description, price, cost, category_id, supplier_id } = req.body;
    await runSQL(`
      UPDATE products 
      SET sku = ?, name = ?, description = ?, price = ?, cost = ?, 
          category_id = ?, supplier_id = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `, [sku, name, description, price, cost, category_id, supplier_id, req.params.id]);
    
    // Уведомление через WebSocket
    io.emit('product_updated', { id: req.params.id, ...req.body });
    
    res.json({ message: 'Товар обновлен' });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка обновления товара' });
  }
});

// Inventory API
app.get('/api/inventory', async (req, res) => {
  try {
    const inventory = await allSQL(`
      SELECT i.*, p.sku, p.name as product_name, l.code as location_code, l.name as location_name
      FROM inventory i
      JOIN products p ON i.product_id = p.id
      LEFT JOIN locations l ON i.location_id = l.id
    `);
    res.json(inventory);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка получения остатков' });
  }
});

app.post('/api/inventory/movement', async (req, res) => {
  try {
    const { product_id, location_id, movement_type, quantity, reference_type, reference_id, notes } = req.body;
    
    // Записываем движение
    await runSQL(`
      INSERT INTO stock_movements 
      (product_id, location_id, movement_type, quantity, reference_type, reference_id, notes) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [product_id, location_id, movement_type, quantity, reference_type, reference_id, notes]);
    
    // Обновляем остатки
    const quantityChange = movement_type === 'in' ? quantity : -quantity;
    await runSQL(`
      INSERT OR REPLACE INTO inventory (product_id, location_id, quantity, last_updated)
      VALUES (?, ?, 
        COALESCE((SELECT quantity FROM inventory WHERE product_id = ? AND location_id = ?), 0) + ?,
        CURRENT_TIMESTAMP)
    `, [product_id, location_id, product_id, location_id, quantityChange]);
    
    // Уведомление через WebSocket
    io.emit('inventory_updated', { product_id, location_id, movement_type, quantity });
    
    res.status(201).json({ message: 'Движение записано' });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка записи движения' });
  }
});

// Categories API
app.get('/api/categories', async (req, res) => {
  try {
    const categories = await allSQL('SELECT * FROM categories ORDER BY name');
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка получения категорий' });
  }
});

// Locations API
app.get('/api/locations', async (req, res) => {
  try {
    const locations = await allSQL('SELECT * FROM locations WHERE is_active = 1 ORDER BY code');
    res.json(locations);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка получения локаций' });
  }
});

// WebSocket connections
io.on('connection', (socket) => {
  console.log('Клиент подключен:', socket.id);
  
  socket.on('disconnect', () => {
    console.log('Клиент отключен:', socket.id);
  });
  
  socket.on('sync_request', (deviceId) => {
    console.log('Запрос синхронизации от устройства:', deviceId);
    // Обработка синхронизации с планшетами
    handleSyncRequest(socket, deviceId);
  });
});

async function handleSyncRequest(socket: any, deviceId: string) {
  try {
    // Получаем несинхронизированные изменения
    const changes = await allSQL(`
      SELECT * FROM sync_log 
      WHERE device_id != ? AND synced = 0 
      ORDER BY created_at
    `, [deviceId]);
    
    socket.emit('sync_data', changes);
  } catch (error) {
    socket.emit('sync_error', { error: 'Ошибка синхронизации' });
  }
}

export async function startServer(): Promise<void> {
  // Инициализация сервиса WiFi синхронизации
  initializeSyncService();
  
  return new Promise((resolve) => {
    server.listen(PORT, () => {
      console.log(`Сервер API запущен на порту ${PORT}`);
      console.log(`WiFi Sync Service доступен на портах 8080 (HTTP) и 8081 (WebSocket)`);
      resolve();
    });
  });
}

export { io };

export async function setupServer(): Promise<void> {
  console.log('🌐 Веб-сервер готов к настройке');
  // Базовая настройка сервера
  // В будущем здесь будет полноценный Express сервер
} 