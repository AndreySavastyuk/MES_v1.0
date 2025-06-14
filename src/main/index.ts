import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { initDatabase, closeDatabase } from './database/index-json';
import { setupSync } from './sync';
import { startBasicServer as startServer, stopBasicServer as stopServer } from './server/basic-server';

class WarehouseApp {
  private mainWindow: BrowserWindow | null = null;
  private isDev = process.env.NODE_ENV === 'development';

  constructor() {
    this.init();
  }

  private async init() {
    console.log('🚀 Запуск Warehouse Desktop...');
    await app.whenReady();
    
    try {
      // Инициализация базы данных
      console.log('🔧 Инициализация JSON базы данных...');
      await initDatabase();
      console.log('✅ База данных инициализирована');
      
      // Настройка синхронизации
      console.log('🔧 Настройка синхронизации...');
      setupSync();
      console.log('✅ Синхронизация настроена');
      
      // Запуск сервера API
      console.log('🌐 Запуск API сервера...');
      try {
        await startServer();
        console.log('✅ API сервер запущен');
      } catch (serverError) {
        console.error('❌ Ошибка запуска API сервера:', serverError);
        console.warn('⚠️ Продолжаем работу без API сервера');
      }
      
      // Создание главного окна
      console.log('🖥️ Создание главного окна...');
      this.createMainWindow();
      
      this.setupEventHandlers();
      console.log('🎉 Приложение запущено успешно!');
    } catch (error) {
      console.error('❌ Ошибка при запуске приложения:', error);
      this.showErrorDialog(error);
    }
  }
  
  private showErrorDialog(error: any) {
    console.error('🚨 Критическая ошибка:', error);
    // Создаем простое окно с ошибкой
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
          <p><em>Проверьте консоль для дополнительной информации.</em></p>
        </body>
      </html>
    `;
    
    errorWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(errorHTML));
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
      icon: path.join(__dirname, '../../assets/icon.png'),
    });

    // Открываем окно в полноэкранном режиме при запуске
    this.mainWindow.maximize();

    // Загрузка renderer процесса
    if (this.isDev) {
      this.mainWindow.loadURL('http://localhost:3000');
      this.mainWindow.webContents.openDevTools();
    } else {
      this.mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
    }

    // Показать окно когда готово
    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow?.show();
    });

    // Обработка закрытия окна
    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });
  }

  private setupEventHandlers() {
    // Закрытие приложения
    app.on('window-all-closed', async () => {
      if (process.platform !== 'darwin') {
        console.log('🛑 Завершение работы приложения...');
        try {
          await stopServer();
          await closeDatabase();
        } catch (error) {
          console.error('❌ Ошибка при завершении:', error);
        }
        app.quit();
      }
    });

    // Активация приложения на macOS
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        this.createMainWindow();
      }
    });

    // IPC обработчики
    ipcMain.handle('app-version', () => {
      return app.getVersion();
    });

    ipcMain.handle('app-quit', () => {
      app.quit();
    });

    ipcMain.handle('window-minimize', () => {
      this.mainWindow?.minimize();
    });

    ipcMain.handle('window-maximize', () => {
      if (this.mainWindow?.isMaximized()) {
        this.mainWindow.unmaximize();
      } else {
        this.mainWindow?.maximize();
      }
    });

    ipcMain.handle('window-close', () => {
      this.mainWindow?.close();
    });
  }
}

// Создание экземпляра приложения
new WarehouseApp(); 