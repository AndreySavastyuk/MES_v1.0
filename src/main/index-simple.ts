import { app, BrowserWindow } from 'electron';
import * as path from 'path';

class WarehouseApp {
  private mainWindow: BrowserWindow | null = null;
  private isDev = process.env.NODE_ENV === 'development';

  constructor() {
    this.init();
  }

  private async init() {
    await app.whenReady();
    this.createMainWindow();
    this.setupEventHandlers();
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
      },
      show: false,
      titleBarStyle: 'default',
    });

    // Показываем простую страницу
    this.mainWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Warehouse Desktop</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 20px;
              background: #f5f5f5;
            }
            .container {
              max-width: 800px;
              margin: 0 auto;
              background: white;
              padding: 30px;
              border-radius: 8px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            h1 {
              color: #333;
              text-align: center;
              margin-bottom: 30px;
            }
            .status {
              background: #e8f5e8;
              border: 1px solid #4caf50;
              color: #2e7d32;
              padding: 15px;
              border-radius: 4px;
              margin: 20px 0;
              text-align: center;
              font-weight: bold;
            }
            .info {
              background: #f0f8ff;
              border: 1px solid #2196f3;
              color: #1976d2;
              padding: 15px;
              border-radius: 4px;
              margin: 10px 0;
            }
            .feature {
              margin: 15px 0;
              padding: 10px;
              border-left: 4px solid #2196f3;
              background: #f8f9fa;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>🏭 Warehouse Desktop Application</h1>
            <div class="status">
              ✅ Приложение успешно запущено и готово к работе!
            </div>
            
            <div class="info">
              <h3>📋 Информация о системе</h3>
              <p><strong>Название:</strong> Система управления складом</p>
              <p><strong>Версия:</strong> 1.0.0</p>
              <p><strong>Статус:</strong> Активна</p>
              <p><strong>Время запуска:</strong> ${new Date().toLocaleString('ru-RU')}</p>
            </div>
            
            <div class="feature">
              <h4>🚀 Доступные функции:</h4>
              <ul>
                <li>Управление задачами складских операций</li>
                <li>Мониторинг выполнения работ</li>
                <li>Синхронизация с мобильными устройствами</li>
                <li>Генерация отчетов (в разработке)</li>
                <li>Интеграция с принтерами</li>
              </ul>
            </div>
            
            <div class="feature">
              <h4>🔧 Следующие шаги:</h4>
              <p>Для полноценной работы необходимо:</p>
              <ol>
                <li>Настроить подключение к базе данных</li>
                <li>Активировать UI5 компоненты</li>
                <li>Настроить синхронизацию</li>
                <li>Подключить систему отчетов</li>
              </ol>
            </div>
          </div>
        </body>
      </html>
    `));

    // Показать окно когда готово
    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow?.show();
      console.log('🎉 Warehouse Desktop запущен успешно!');
      console.log('📱 Окно приложения открыто');
    });

    // Обработка закрытия окна
    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
      console.log('👋 Приложение закрыто');
    });
  }

  private setupEventHandlers() {
    // Закрытие приложения
    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        console.log('🛑 Выход из приложения');
        app.quit();
      }
    });

    // Активация приложения на macOS
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        this.createMainWindow();
      }
    });
  }
}

// Создание экземпляра приложения
new WarehouseApp(); 