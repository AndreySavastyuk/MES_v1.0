import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import * as http from 'http';

class SimpleWarehouseApp {
  private mainWindow: BrowserWindow | null = null;
  private server: http.Server | null = null;
  private readonly PORT = 3001;

  constructor() {
    console.log('🚀 Запуск Simple Warehouse Desktop...');
    this.init();
  }

  private async init() {
    await app.whenReady();
    
    try {
      console.log('🌐 Запуск простого API сервера...');
      await this.startSimpleServer();
      
      console.log('🖥️ Создание главного окна...');
      this.createMainWindow();
      
      this.setupEventHandlers();
      
      console.log('🎉 Приложение запущено успешно!');
    } catch (error) {
      console.error('❌ Ошибка при запуске:', error);
      this.showErrorDialog(error);
    }
  }

  private async startSimpleServer(): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log(`📍 Создание HTTP сервера на порту ${this.PORT}...`);
      
      this.server = http.createServer((req, res) => {
        // Настройка CORS
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        
        if (req.method === 'OPTIONS') {
          res.writeHead(200);
          res.end();
          return;
        }

        console.log(`📥 ${req.method} ${req.url}`);

        // Простые API endpoints
        if (req.url === '/api/health') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            status: 'ok',
            message: 'Simple server is running',
            timestamp: new Date().toISOString(),
            version: '1.0.0'
          }));
          return;
        }

        if (req.url === '/api/test') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            message: 'Test endpoint working',
            data: { test: true, random: Math.random() },
            timestamp: new Date().toISOString()
          }));
          return;
        }

        if (req.url === '/api/status') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            server: 'Simple HTTP Server',
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            platform: process.platform,
            version: process.version
          }));
          return;
        }

        if (req.url?.startsWith('/api/tasks')) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            tasks: [
              { id: '1', title: 'Приемка товара партия №123', status: 'completed' },
              { id: '2', title: 'Инвентаризация склада А', status: 'in_progress' },
              { id: '3', title: 'Отгрузка заказа №456', status: 'pending' }
            ]
          }));
          return;
        }

        if (req.url?.startsWith('/api/products')) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            products: [
              { id: '1', name: 'Товар тестовый А', sku: 'TEST-001', quantity: 50 },
              { id: '2', name: 'Товар тестовый Б', sku: 'TEST-002', quantity: 30 }
            ]
          }));
          return;
        }

        if (req.url?.startsWith('/api/reports')) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            message: 'Reports system is working',
            available_formats: ['excel', 'pdf'],
            status: 'ready'
          }));
          return;
        }

        // API для управления заданиями
        if (req.url === '/api/tasks' && req.method === 'GET') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: true,
            tasks: [
              {
                id: 'T001',
                title: 'Приемка товара партия №123',
                description: 'Приемка товаров по накладной №123',
                priority: 'high',
                status: 'in_progress',
                type: 'receive',
                created: new Date().toISOString(),
                updated: new Date().toISOString(),
                progress: 65,
                sentToTablet: true
              },
              {
                id: 'T002',
                title: 'Инвентаризация склада А',
                description: 'Плановая инвентаризация',
                priority: 'medium',
                status: 'pending',
                type: 'inventory',
                created: new Date().toISOString(),
                updated: new Date().toISOString(),
                progress: 0,
                sentToTablet: false
              }
            ]
          }));
          return;
        }

        if (req.url === '/api/tasks' && req.method === 'POST') {
          let body = '';
          req.on('data', chunk => body += chunk);
          req.on('end', () => {
            try {
              const taskData = JSON.parse(body);
              res.writeHead(201, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                success: true,
                message: 'Задание создано',
                task: {
                  id: 'T' + Date.now(),
                  ...taskData,
                  created: new Date().toISOString(),
                  updated: new Date().toISOString()
                }
              }));
            } catch (error) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: false, error: 'Invalid JSON' }));
            }
          });
          return;
        }

        if (req.url?.match(/^\/api\/tasks\/(.+)$/) && req.method === 'PUT') {
          const taskId = req.url.match(/^\/api\/tasks\/(.+)$/)?.[1];
          let body = '';
          req.on('data', chunk => body += chunk);
          req.on('end', () => {
            try {
              const updateData = JSON.parse(body);
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({
                success: true,
                message: 'Задание обновлено',
                taskId: taskId,
                updated: new Date().toISOString()
              }));
            } catch (error) {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: false, error: 'Invalid JSON' }));
            }
          });
          return;
        }

        if (req.url?.match(/^\/api\/tasks\/(.+)$/) && req.method === 'DELETE') {
          const taskId = req.url.match(/^\/api\/tasks\/(.+)$/)?.[1];
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: true,
            message: 'Задание удалено',
            taskId: taskId
          }));
          return;
        }

        // 404 для неизвестных endpoints
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          error: 'Endpoint not found',
          url: req.url,
          method: req.method
        }));
      });

      this.server.on('error', (error: any) => {
        console.error('❌ Ошибка сервера:', error);
        reject(error);
      });

      this.server.on('listening', () => {
        console.log('👂 Сервер слушает подключения');
        const address = this.server?.address();
        console.log('📍 Адрес сервера:', address);
      });

      this.server.listen(this.PORT, '127.0.0.1', () => {
        console.log(`✅ Простой HTTP сервер запущен на http://127.0.0.1:${this.PORT}`);
        console.log(`🏥 Health check: http://127.0.0.1:${this.PORT}/api/health`);
        resolve();
      });
    });
  }

  private createMainWindow() {
    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 800,
      minHeight: 600,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, '../preload/preload.js'),
      },
      show: false,
      titleBarStyle: 'default',
    });

    // Загрузка HTML файла
    const htmlPath = path.join(__dirname, '../renderer/tasks-manager.html');
    console.log('📄 Загрузка HTML:', htmlPath);
    
    this.mainWindow.loadFile(htmlPath).catch(error => {
      console.error('❌ Ошибка загрузки HTML:', error);
      // Пробуем загрузить основной интерфейс
      const fallbackPath = path.join(__dirname, '../renderer/index.html');
      this.mainWindow?.loadFile(fallbackPath).catch(fallbackError => {
        console.error('❌ Ошибка загрузки резервного HTML:', fallbackError);
        // Создаем простую страницу в памяти
        const simpleHTML = `
          <!DOCTYPE html>
          <html>
            <head><title>Warehouse Desktop</title></head>
            <body style="font-family: Arial; padding: 20px; background: #f0f0f0;">
              <h1>🏭 Warehouse Desktop</h1>
              <p>Простая версия запущена успешно!</p>
              <p>API сервер: <a href="http://127.0.0.1:${this.PORT}/api/health" target="_blank">http://127.0.0.1:${this.PORT}/api/health</a></p>
              <p>Время запуска: ${new Date().toLocaleString('ru-RU')}</p>
            </body>
          </html>
        `;
        this.mainWindow?.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(simpleHTML));
      });
    });

    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow?.show();
      console.log('✅ Главное окно показано');
    });

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });
  }

  private showErrorDialog(error: any) {
    console.error('🚨 Критическая ошибка:', error);
    
    const errorWindow = new BrowserWindow({
      width: 600,
      height: 400,
      webPreferences: { nodeIntegration: true, contextIsolation: false }
    });

    const errorHTML = `
      <!DOCTYPE html>
      <html>
        <head><title>Ошибка запуска</title></head>
        <body style="font-family: Arial; padding: 20px; background: #f44336; color: white;">
          <h1>🚨 Ошибка запуска приложения</h1>
          <p><strong>Описание:</strong> ${error.message || error}</p>
          <p><strong>Детали:</strong></p>
          <pre style="background: rgba(0,0,0,0.2); padding: 10px; border-radius: 4px;">${error.stack || 'Не доступно'}</pre>
        </body>
      </html>
    `;
    
    errorWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(errorHTML));
  }

  private setupEventHandlers() {
    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        console.log('🛑 Завершение работы...');
        if (this.server) {
          this.server.close();
        }
        app.quit();
      }
    });

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        this.createMainWindow();
      }
    });

    // IPC обработчики
    ipcMain.handle('app-version', () => app.getVersion());
    ipcMain.handle('app-quit', () => app.quit());
  }
}

// Запуск приложения
new SimpleWarehouseApp(); 