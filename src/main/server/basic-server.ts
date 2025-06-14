import * as http from 'http';
import * as url from 'url';

const PORT = 3001;
let server: http.Server | null = null;

export async function startBasicServer(): Promise<void> {
  console.log('🚀 Создание базового HTTP сервера...');
  console.log(`📍 Попытка привязки к порту ${PORT} на 127.0.0.1`);
  
  return new Promise((resolve, reject) => {
    try {
      console.log('🔧 Создание HTTP сервера...');
      server = http.createServer((req, res) => {
        // Настройка CORS
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        res.setHeader('Content-Type', 'application/json');

        const parsedUrl = url.parse(req.url || '', true);
        const path = parsedUrl.pathname;

        console.log(`📡 ${new Date().toISOString()} - ${req.method} ${path}`);

        // Обработка маршрутов
        if (path === '/api/health' && req.method === 'GET') {
          console.log('🏥 Health check запрос получен');
          const response = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            server: 'basic-http',
            port: PORT,
            method: req.method,
            path: path
          };
          res.writeHead(200);
          res.end(JSON.stringify(response, null, 2));
          
        } else if (path === '/api/test' && req.method === 'GET') {
          console.log('🧪 Test endpoint запрос получен');
          const response = {
            message: 'Базовый HTTP сервер работает!',
            timestamp: new Date().toISOString(),
            server: 'basic-http'
          };
          res.writeHead(200);
          res.end(JSON.stringify(response, null, 2));
          
        } else if (path === '/api/status' && req.method === 'GET') {
          console.log('📊 Status endpoint запрос получен');
          const response = {
            server: 'running',
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            platform: process.platform,
            nodeVersion: process.version
          };
          res.writeHead(200);
          res.end(JSON.stringify(response, null, 2));
          
        } else {
          // 404 для неизвестных путей
          console.log(`❓ 404 - Путь не найден: ${path}`);
          const response = {
            error: 'Путь не найден',
            path: path,
            method: req.method,
            availableEndpoints: [
              '/api/health',
              '/api/test',
              '/api/status'
            ]
          };
          res.writeHead(404);
          res.end(JSON.stringify(response, null, 2));
        }
      });

      console.log('🎯 Попытка привязки к порту...');
      server.listen(PORT, '127.0.0.1', () => {
        console.log(`✅ Базовый HTTP сервер запущен на http://127.0.0.1:${PORT}`);
        console.log(`🏥 Health check: http://127.0.0.1:${PORT}/api/health`);
        console.log(`🧪 Test endpoint: http://127.0.0.1:${PORT}/api/test`);
        console.log(`📊 Status endpoint: http://127.0.0.1:${PORT}/api/status`);
        console.log('🎉 Сервер готов принимать запросы!');
        resolve();
      });

      server.on('error', (error: any) => {
        console.error('❌ Ошибка HTTP сервера:', error);
        console.error('📋 Детали ошибки:', {
          code: error.code,
          message: error.message,
          port: PORT,
          address: '127.0.0.1'
        });
        reject(error);
      });

      server.on('listening', () => {
        console.log('👂 HTTP сервер слушает подключения');
        const address = server?.address();
        console.log('📍 Адрес сервера:', address);
      });

    } catch (error) {
      console.error('❌ Исключение при создании HTTP сервера:', error);
      reject(error);
    }
  });
}

export async function stopBasicServer(): Promise<void> {
  return new Promise((resolve) => {
    if (server) {
      server.close(() => {
        console.log('🛑 Базовый HTTP сервер остановлен');
        server = null;
        resolve();
      });
    } else {
      resolve();
    }
  });
}

export function getBasicServerStatus(): any {
  return {
    running: server !== null,
    port: PORT,
    url: `http://127.0.0.1:${PORT}`,
    endpoints: [
      '/api/health',
      '/api/test', 
      '/api/status'
    ]
  };
} 