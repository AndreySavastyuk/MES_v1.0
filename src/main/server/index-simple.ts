import express from 'express';
import cors from 'cors';
import { getTasks, getProducts, getInventoryLog, getDatabaseStatistics } from '../database/index-json';
import reportsRouter from './routes/reports-simple';

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Логирование запросов
app.use((req, res, next) => {
  console.log(`📡 ${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Основные API routes
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    database: 'json-storage',
    version: '1.0.0'
  });
});

// API для задач
app.get('/api/tasks', async (req, res) => {
  try {
    console.log('📋 Получение списка задач');
    const tasks = await getTasks();
    res.json({ tasks, total: tasks.length });
  } catch (error) {
    console.error('❌ Ошибка получения задач:', error);
    res.status(500).json({ error: 'Ошибка получения задач' });
  }
});

// API для товаров
app.get('/api/products', async (req, res) => {
  try {
    console.log('📦 Получение списка товаров');
    const products = await getProducts();
    res.json({ products, total: products.length });
  } catch (error) {
    console.error('❌ Ошибка получения товаров:', error);
    res.status(500).json({ error: 'Ошибка получения товаров' });
  }
});

// API для журнала операций
app.get('/api/inventory-log', async (req, res) => {
  try {
    console.log('📊 Получение журнала операций');
    const log = await getInventoryLog();
    res.json({ log, total: log.length });
  } catch (error) {
    console.error('❌ Ошибка получения журнала:', error);
    res.status(500).json({ error: 'Ошибка получения журнала' });
  }
});

// API для статистики
app.get('/api/statistics', (req, res) => {
  try {
    console.log('📈 Получение статистики');
    const stats = getDatabaseStatistics();
    res.json(stats);
  } catch (error) {
    console.error('❌ Ошибка получения статистики:', error);
    res.status(500).json({ error: 'Ошибка получения статистики' });
  }
});

// Подключаем роуты отчетов
app.use(reportsRouter);

// Обработка 404
app.use((req, res) => {
  console.log(`❓ 404 - Не найден путь: ${req.path}`);
  res.status(404).json({ 
    error: 'Путь не найден', 
    path: req.path,
    availableEndpoints: [
      '/api/health',
      '/api/tasks', 
      '/api/products',
      '/api/inventory-log',
      '/api/statistics',
      '/api/reports/test'
    ]
  });
});

// Обработка ошибок
app.use((error: any, req: any, res: any, next: any) => {
  console.error('🚨 Ошибка сервера:', error);
  res.status(500).json({ 
    error: 'Внутренняя ошибка сервера',
    message: error.message,
    timestamp: new Date().toISOString()
  });
});

let server: any = null;

export async function startServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      server = app.listen(PORT, () => {
        console.log(`🌐 Сервер запущен на порту ${PORT}`);
        console.log(`📡 API доступно по адресу: http://localhost:${PORT}/api`);
        console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
        resolve();
      });

      server.on('error', (error: any) => {
        if (error.code === 'EADDRINUSE') {
          console.warn(`⚠️ Порт ${PORT} занят, пробуем следующий...`);
          // Можно попробовать другой порт
          reject(new Error(`Порт ${PORT} уже используется`));
        } else {
          reject(error);
        }
      });
    } catch (error) {
      reject(error);
    }
  });
}

export async function stopServer(): Promise<void> {
  return new Promise((resolve) => {
    if (server) {
      server.close(() => {
        console.log('🛑 Сервер остановлен');
        resolve();
      });
    } else {
      resolve();
    }
  });
}

export function getServerStatus(): any {
  return {
    running: server !== null,
    port: PORT,
    url: `http://localhost:${PORT}`,
    endpoints: {
      health: '/api/health',
      tasks: '/api/tasks',
      products: '/api/products',
      inventoryLog: '/api/inventory-log',
      statistics: '/api/statistics',
      reports: '/api/reports/test'
    }
  };
} 