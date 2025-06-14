import express from 'express';

const app = express();
const PORT = 3001;

console.log('🔧 Создание минимального сервера...');

// Минимальный middleware
app.use(express.json());

// Простейший endpoint
app.get('/api/health', (req: any, res: any) => {
  console.log('🏥 Health check запрос получен');
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    server: 'minimal'
  });
});

app.get('/api/test', (req: any, res: any) => {
  console.log('🧪 Test endpoint запрос получен');
  res.json({ 
    message: 'Тестовый endpoint работает', 
    timestamp: new Date().toISOString()
  });
});

let server: any = null;

export async function startMinimalServer(): Promise<void> {
  console.log('🚀 Попытка запуска минимального сервера...');
  
  return new Promise((resolve, reject) => {
    try {
      server = app.listen(PORT, '127.0.0.1', () => {
        console.log(`✅ Минимальный сервер запущен на http://127.0.0.1:${PORT}`);
        console.log(`🏥 Health check: http://127.0.0.1:${PORT}/api/health`);
        console.log(`🧪 Test endpoint: http://127.0.0.1:${PORT}/api/test`);
        resolve();
      });

      server.on('error', (error: any) => {
        console.error('❌ Ошибка сервера при запуске:', error);
        if (error.code === 'EADDRINUSE') {
          reject(new Error(`Порт ${PORT} уже используется`));
        } else {
          reject(error);
        }
      });

      server.on('listening', () => {
        console.log('👂 Сервер слушает подключения');
      });

      // Проверяем статус через 1 секунду
      setTimeout(() => {
        if (server && server.listening) {
          console.log('✅ Сервер подтвержден как запущенный');
        } else {
          console.warn('⚠️ Сервер не отвечает');
        }
      }, 1000);

    } catch (error) {
      console.error('❌ Исключение при создании сервера:', error);
      reject(error);
    }
  });
}

export async function stopMinimalServer(): Promise<void> {
  return new Promise((resolve) => {
    if (server) {
      server.close(() => {
        console.log('🛑 Минимальный сервер остановлен');
        resolve();
      });
    } else {
      resolve();
    }
  });
} 