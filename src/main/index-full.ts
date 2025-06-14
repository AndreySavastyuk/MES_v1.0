import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { initDatabase, closeDatabase } from './database/index-json';
import { setupSync } from './sync';
import { setupServer } from './server';

// Настройка детального логирования
const log = {
  info: (message: string, ...args: any[]) => {
    console.log(`[INFO] ${new Date().toISOString()} - ${message}`, ...args);
  },
  error: (message: string, error?: any) => {
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`);
    if (error) {
      console.error('Stack trace:', error.stack || error);
      console.error('Error details:', error);
    }
  },
  warn: (message: string, ...args: any[]) => {
    console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, ...args);
  },
  debug: (message: string, ...args: any[]) => {
    console.log(`[DEBUG] ${new Date().toISOString()} - ${message}`, ...args);
  }
};

class WarehouseApp {
  private mainWindow: BrowserWindow | null = null;
  private isDev = process.env.NODE_ENV === 'development';

  constructor() {
    log.info('🚀 Инициализация Warehouse Desktop приложения...');
    this.setupGlobalErrorHandlers();
    this.init().catch(error => {
      log.error('❌ Критическая ошибка при инициализации приложения', error);
      this.showErrorDialog('Ошибка инициализации', error.message);
    });
  }

  private setupGlobalErrorHandlers() {
    // Обработка необработанных исключений
    process.on('uncaughtException', (error) => {
      log.error('🚨 Необработанное исключение в main процессе', error);
      this.showErrorDialog('Критическая ошибка', error.message);
    });

    // Обработка отклоненных промисов
    process.on('unhandledRejection', (reason, promise) => {
      log.error('🚨 Необработанный отказ промиса', reason);
      console.error('Promise:', promise);
    });

    // Обработка предупреждений
    process.on('warning', (warning) => {
      log.warn('⚠️ Предупреждение системы', warning.message);
    });
  }

  private async init() {
    log.info('⏳ Ожидание готовности Electron...');
    
    // Ждем готовности Electron
    await app.whenReady();
    log.info('✅ Electron готов');
    
    try {
      // Проверяем системную информацию
      log.info('📊 Системная информация:');
      log.info(`   Platform: ${process.platform}`);
      log.info(`   Architecture: ${process.arch}`);
      log.info(`   Node version: ${process.version}`);
      log.info(`   Electron version: ${process.versions.electron}`);
      log.info(`   Working directory: ${process.cwd()}`);

      // Инициализация компонентов по одному с детальным логированием
      await this.initializeDatabase();
      await this.initializeSync();
      await this.initializeServer();

      // Создание главного окна
      log.info('🖥️ Создание главного окна...');
      this.createMainWindow();
      
      // Настройка событий
      log.info('⚙️ Настройка обработчиков событий...');
      this.setupEventHandlers();
      this.setupIpcHandlers();

      log.info('🎉 Warehouse Desktop запущен успешно!');
    } catch (error) {
      log.error('❌ Ошибка инициализации приложения', error);
      this.handleInitializationError(error);
    }
  }

  private async initializeDatabase() {
    try {
      log.info('🔧 Начинаем инициализацию JSON базы данных...');
      
      await initDatabase();
      log.info('✅ База данных инициализирована успешно');
    } catch (error) {
      log.error('❌ Ошибка инициализации базы данных', error);
      
      // Попробуем продолжить без базы данных
      log.warn('⚠️ Продолжаем работу без базы данных (режим только для отображения)');
    }
  }

  private async initializeSync() {
    try {
      log.info('🔧 Настройка системы синхронизации...');
      setupSync();
      log.info('✅ Система синхронизации настроена');
    } catch (error) {
      log.error('❌ Ошибка настройки синхронизации', error);
      log.warn('⚠️ Продолжаем работу без синхронизации');
    }
  }

  private async initializeServer() {
    try {
      log.info('🔧 Запуск веб-сервера...');
      await setupServer();
      log.info('✅ Веб-сервер запущен');
    } catch (error) {
      log.error('❌ Ошибка запуска веб-сервера', error);
      log.warn('⚠️ Продолжаем работу без веб-сервера');
    }
  }

  private handleInitializationError(error: any) {
    log.error('🚨 Критическая ошибка инициализации, запускаем в безопасном режиме', error);
    
    // Создаем окно с сообщением об ошибке вместо закрытия приложения
    this.createErrorWindow(error);
  }

  private createMainWindow() {
    try {
      log.info('🖥️ Создание главного окна приложения...');
      
      this.mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1000,
        minHeight: 700,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          preload: path.join(__dirname, '../preload/preload.js'),
        },
        show: false,
        titleBarStyle: 'default',
        icon: path.join(__dirname, '../../assets/icon.png'), // если есть иконка
      });

      log.info('🌐 Загрузка интерфейса...');

      // Загрузка интерфейса
      if (this.isDev) {
        log.info('🔧 Режим разработки: загружаем с dev сервера');
        this.mainWindow.loadURL('http://localhost:3000');
        this.mainWindow.webContents.openDevTools();
      } else {
        log.info('📦 Продакшн режим: загружаем статические файлы');
        this.mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
      }

      // Показать окно когда готово
      this.mainWindow.once('ready-to-show', () => {
        log.info('✅ Интерфейс приложения загружен');
        this.mainWindow?.show();
        this.mainWindow?.focus();
      });

      // Обработка закрытия окна
      this.mainWindow.on('closed', () => {
        log.info('👋 Главное окно закрыто');
        this.mainWindow = null;
      });

      // Обработка ошибок загрузки
      this.mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
        log.error(`❌ Ошибка загрузки интерфейса: ${errorCode} - ${errorDescription}`);
        this.showFallbackPage();
      });

      log.info('✅ Главное окно создано успешно');
    } catch (error) {
      log.error('❌ Ошибка создания главного окна', error);
      throw error;
    }
  }

  private createErrorWindow(error: any) {
    log.info('🚨 Создание окна с сообщением об ошибке...');
    
    const errorWindow = new BrowserWindow({
      width: 800,
      height: 600,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
      show: true,
      titleBarStyle: 'default',
    });

    const errorHTML = this.generateErrorHTML(error);
    errorWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(errorHTML));
  }

  private generateErrorHTML(error: any): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Warehouse Desktop - Ошибка запуска</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
              margin: 0;
              padding: 40px;
              background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
              color: white;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              text-align: center;
            }
            .container {
              background: rgba(255,255,255,0.1);
              padding: 40px;
              border-radius: 15px;
              backdrop-filter: blur(10px);
              box-shadow: 0 8px 32px rgba(0,0,0,0.3);
              max-width: 600px;
            }
            h1 { font-size: 2.5em; margin-bottom: 20px; }
            .error-details {
              background: rgba(0,0,0,0.2);
              padding: 20px;
              border-radius: 8px;
              margin: 20px 0;
              text-align: left;
              font-family: monospace;
              font-size: 0.9em;
              max-height: 200px;
              overflow-y: auto;
            }
            .instructions {
              background: rgba(33, 150, 243, 0.2);
              border: 1px solid rgba(33, 150, 243, 0.5);
              padding: 15px;
              border-radius: 8px;
              margin: 20px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>🚨 Ошибка запуска</h1>
            <p>Произошла ошибка при инициализации Warehouse Desktop приложения.</p>
            
            <div class="error-details">
              <strong>Ошибка:</strong><br>
              ${error.message}<br><br>
              <strong>Stack trace:</strong><br>
              ${error.stack || 'Не доступен'}
            </div>
            
            <div class="instructions">
              <h3>🔧 Возможные решения:</h3>
              <ul style="text-align: left;">
                <li>Перезапустите приложение</li>
                <li>Убедитесь, что все зависимости установлены: <code>npm install</code></li>
                <li>Пересоберите нативные модули: <code>npm run rebuild</code></li>
                <li>Проверьте консоль для дополнительной информации</li>
              </ul>
            </div>
            
            <p style="margin-top: 30px; opacity: 0.8; font-size: 0.9em;">
              Время ошибки: ${new Date().toLocaleString('ru-RU')}
            </p>
          </div>
        </body>
      </html>
    `;
  }

  private showFallbackPage() {
    if (!this.mainWindow) return;

    log.info('📄 Показываем резервную страницу...');

    const fallbackHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Warehouse Desktop - Загрузка</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
              margin: 0;
              padding: 40px;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              text-align: center;
            }
            .container {
              background: rgba(255,255,255,0.1);
              padding: 40px;
              border-radius: 15px;
              backdrop-filter: blur(10px);
              box-shadow: 0 8px 32px rgba(0,0,0,0.3);
              max-width: 500px;
            }
            h1 {
              font-size: 2.5em;
              margin-bottom: 20px;
              text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
            }
            .status {
              background: rgba(255, 193, 7, 0.2);
              border: 1px solid rgba(255, 193, 7, 0.5);
              padding: 15px;
              border-radius: 8px;
              margin: 20px 0;
            }
            .info {
              background: rgba(33, 150, 243, 0.2);
              border: 1px solid rgba(33, 150, 243, 0.5);
              padding: 15px;
              border-radius: 8px;
              margin: 20px 0;
            }
            .feature-list {
              text-align: left;
              margin: 20px 0;
            }
            .feature-list li {
              margin: 8px 0;
              padding-left: 20px;
              position: relative;
            }
            .feature-list li:before {
              content: "⚠️";
              position: absolute;
              left: 0;
              font-weight: bold;
            }
            .loading {
              display: inline-block;
              width: 20px;
              height: 20px;
              border: 3px solid rgba(255,255,255,.3);
              border-radius: 50%;
              border-top-color: #fff;
              animation: spin 1s ease-in-out infinite;
            }
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>🏭 Warehouse Desktop</h1>
            
            <div class="status">
              <div class="loading"></div>
              <strong>Система запускается в безопасном режиме</strong>
            </div>
            
            <div class="info">
              <h3>📊 Статус компонентов:</h3>
              <ul class="feature-list">
                <li>База данных - ошибка инициализации</li>
                <li>Веб-сервер API - проверяется</li>
                <li>Система синхронизации - ограниченный режим</li>
                <li>Интерфейс пользователя - резервный режим</li>
              </ul>
            </div>
            
            <div class="info">
              <h3>🔧 Проверьте консоль для деталей</h3>
              <p>Откройте консоль разработчика (F12) для просмотра подробной информации об ошибках.</p>
            </div>
            
            <p style="margin-top: 30px; opacity: 0.8; font-size: 0.9em;">
              Warehouse Management System v1.0.0<br>
              Время запуска: ${new Date().toLocaleString('ru-RU')}
            </p>
          </div>
        </body>
      </html>
    `;

    this.mainWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(fallbackHTML));
  }

  private showErrorDialog(title: string, message: string) {
    log.error(`🚨 Показываем диалог ошибки: ${title} - ${message}`);
    
    // В реальном приложении здесь был бы dialog.showErrorBox
    // Но пока просто выводим в консоль
    console.error(`ERROR DIALOG: ${title}\n${message}`);
  }

  private setupEventHandlers() {
    try {
      log.info('⚙️ Настройка обработчиков событий приложения...');

      // Закрытие приложения
      app.on('window-all-closed', () => {
        if (process.platform !== 'darwin') {
          log.info('🛑 Все окна закрыты, выходим из приложения');
          this.shutdown();
        }
      });

      // Активация приложения на macOS
      app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
          log.info('🔄 Активация приложения, создаем новое окно');
          this.createMainWindow();
        }
      });

      // Обработка выхода
      app.on('before-quit', async (event) => {
        log.info('🔄 Подготовка к завершению работы...');
        event.preventDefault();
        await this.shutdown();
        app.exit();
      });

      log.info('✅ Обработчики событий настроены');
    } catch (error) {
      log.error('❌ Ошибка настройки обработчиков событий', error);
    }
  }

  private setupIpcHandlers() {
    try {
      log.info('📡 Настройка IPC обработчиков...');

      // Обработчики IPC для связи с рендерером
      
      // Получение версии приложения
      ipcMain.handle('app-version', () => {
        const version = app.getVersion();
        log.debug('📦 Запрошена версия приложения:', version);
        return version;
      });

      // Управление окном
      ipcMain.handle('window-minimize', () => {
        log.debug('🔽 Минимизация окна');
        this.mainWindow?.minimize();
      });

      ipcMain.handle('window-maximize', () => {
        if (this.mainWindow?.isMaximized()) {
          log.debug('🔼 Восстановление окна');
          this.mainWindow.unmaximize();
        } else {
          log.debug('🔼 Максимизация окна');
          this.mainWindow?.maximize();
        }
      });

      ipcMain.handle('window-close', () => {
        log.debug('❌ Закрытие окна');
        this.mainWindow?.close();
      });

      // Системная информация
      ipcMain.handle('get-system-info', () => {
        const systemInfo = {
          platform: process.platform,
          arch: process.arch,
          nodeVersion: process.version,
          electronVersion: process.versions.electron,
          appVersion: app.getVersion()
        };
        log.debug('ℹ️ Запрошена системная информация:', systemInfo);
        return systemInfo;
      });

      // Получение статуса приложения
      ipcMain.handle('get-app-status', () => {
        const status = {
          database: 'checking',
          server: 'checking',
          sync: 'checking',
          uptime: process.uptime()
        };
        log.debug('📊 Запрошен статус приложения:', status);
        return status;
      });

      log.info('✅ IPC обработчики настроены');
    } catch (error) {
      log.error('❌ Ошибка настройки IPC обработчиков', error);
    }
  }

  private async shutdown() {
    try {
      log.info('🔄 Завершение работы приложения...');
      
      // Закрытие соединения с базой данных
      try {
        await closeDatabase();
        log.info('✅ База данных закрыта');
      } catch (error) {
        log.error('❌ Ошибка закрытия базы данных', error);
      }
      
      log.info('👋 Приложение завершено');
      
    } catch (error) {
      log.error('❌ Ошибка при завершении работы', error);
    }
  }
}

// Создание экземпляра приложения
log.info('🚀 Запуск Warehouse Desktop...');
new WarehouseApp(); 