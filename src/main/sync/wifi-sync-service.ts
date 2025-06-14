import WebSocket from 'ws';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import * as cron from 'node-cron';
import { DeviceDiscoveryService } from './device-discovery';
import { SyncQueueManager } from './sync-queue';
import { DataSyncEndpoints } from './data-sync-endpoints';
import { SyncProgressTracker } from './sync-progress-tracker';
import { RetryManager } from './retry-manager';

export interface ConnectedDevice {
  id: string;
  name: string;
  ip: string;
  port: number;
  type: 'tablet' | 'scanner' | 'desktop';
  status: 'online' | 'syncing' | 'offline' | 'error';
  lastSeen: Date;
  lastSync: Date | null;
  websocket?: WebSocket;
  capabilities: string[];
  version?: string;
}

export interface SyncJob {
  id: string;
  deviceId: string;
  type: 'full' | 'incremental' | 'tasks_only' | 'inventory_only';
  priority: number;
  createdAt: Date;
  attempts: number;
  maxAttempts: number;
  data?: any;
  progress: {
    total: number;
    completed: number;
    percentage: number;
    currentOperation?: string;
  };
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  error?: string;
}

export class WiFiSyncService extends EventEmitter {
  private wss: WebSocket.Server;
  private connectedDevices: Map<string, ConnectedDevice> = new Map();
  public deviceDiscovery: DeviceDiscoveryService;
  public queueManager: SyncQueueManager;
  public dataSyncEndpoints: DataSyncEndpoints;
  public progressTracker: SyncProgressTracker;
  public retryManager: RetryManager;
  private isRunning = false;
  private syncPort: number;

  constructor(port: number = 8080) {
    super();
    this.syncPort = port;
    
    // Инициализация WebSocket сервера
    this.wss = new WebSocket.Server({ 
      port: port + 1, // WebSocket на порту 8081
      perMessageDeflate: false
    });

    // Инициализация сервисов
    this.deviceDiscovery = new DeviceDiscoveryService();
    this.queueManager = new SyncQueueManager();
    this.progressTracker = new SyncProgressTracker();
    this.retryManager = new RetryManager();
    this.dataSyncEndpoints = new DataSyncEndpoints();

    this.setupWebSocketServer();
    this.setupEventHandlers();
    this.setupPeriodicTasks();
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('WiFi Sync Service уже запущен');
      return;
    }

    try {
      console.log('Запуск WiFi Sync Service...');
      
      // Запуск обнаружения устройств
      await this.deviceDiscovery.start();
      
      // Запуск менеджера очередей
      await this.queueManager.start();
      
      // Запуск менеджера повторных попыток
      await this.retryManager.start();

      this.isRunning = true;
      
      console.log(`WiFi Sync Service запущен на портах ${this.syncPort} (HTTP) и ${this.syncPort + 1} (WebSocket)`);
      this.emit('started');
      
    } catch (error) {
      console.error('Ошибка запуска WiFi Sync Service:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    console.log('Остановка WiFi Sync Service...');

    // Закрытие WebSocket соединений
    this.wss.clients.forEach(ws => {
      ws.close(1000, 'Service stopping');
    });

    // Остановка сервисов
    await this.deviceDiscovery.stop();
    await this.queueManager.stop();
    await this.retryManager.stop();

    // Закрытие WebSocket сервера
    this.wss.close();

    this.isRunning = false;
    console.log('WiFi Sync Service остановлен');
    this.emit('stopped');
  }

  private setupWebSocketServer(): void {
    this.wss.on('connection', (ws, request) => {
      const clientIp = request.socket.remoteAddress;
      console.log(`WebSocket подключение от ${clientIp}`);

      ws.on('message', async (data) => {
        try {
          const message = JSON.parse(data.toString());
          await this.handleWebSocketMessage(ws, message);
        } catch (error) {
          console.error('Ошибка обработки WebSocket сообщения:', error);
          ws.send(JSON.stringify({
            type: 'error',
            message: 'Неверный формат сообщения'
          }));
        }
      });

      ws.on('close', (code, reason) => {
        console.log(`WebSocket соединение закрыто: ${code} ${reason}`);
        this.handleDeviceDisconnect(ws);
      });

      ws.on('error', (error) => {
        console.error('WebSocket ошибка:', error);
        this.handleDeviceDisconnect(ws);
      });

      // Пинг для поддержания соединения
      const pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.ping();
        } else {
          clearInterval(pingInterval);
        }
      }, 30000); // Пинг каждые 30 секунд
    });
  }

  private async handleWebSocketMessage(ws: WebSocket, message: any): Promise<void> {
    switch (message.type) {
      case 'register':
        await this.handleDeviceRegistration(ws, message);
        break;
      
      case 'heartbeat':
        await this.handleHeartbeat(ws, message);
        break;
      
      case 'sync_request':
        await this.handleSyncRequest(ws, message);
        break;
      
      case 'sync_data':
        await this.handleSyncData(ws, message);
        break;
      
      case 'sync_complete':
        await this.handleSyncComplete(ws, message);
        break;
      
      default:
        ws.send(JSON.stringify({
          type: 'error',
          message: `Неизвестный тип сообщения: ${message.type}`
        }));
    }
  }

  private async handleDeviceRegistration(ws: WebSocket, message: any): Promise<void> {
    const { deviceId, name, type, capabilities, version } = message;
    
    if (!deviceId || !name || !type) {
      ws.send(JSON.stringify({
        type: 'registration_failed',
        message: 'Отсутствуют обязательные поля'
      }));
      return;
    }

    const device: ConnectedDevice = {
      id: deviceId,
      name,
      ip: (ws as any)._socket.remoteAddress,
      port: this.syncPort,
      type,
      status: 'online',
      lastSeen: new Date(),
      lastSync: null,
      websocket: ws,
      capabilities: capabilities || [],
      version
    };

    this.connectedDevices.set(deviceId, device);
    
    // Обновление в базе данных
    await this.updateDeviceInDatabase(device);

    ws.send(JSON.stringify({
      type: 'registration_success',
      deviceId,
      serverCapabilities: ['tasks', 'inventory', 'incremental_sync'],
      syncEndpoint: `http://${this.getServerIP()}:${this.syncPort}/sync`
    }));

    this.emit('device_connected', device);
    this.broadcastDeviceStatus();

    console.log(`Устройство зарегистрировано: ${name} (${deviceId})`);
  }

  private async handleHeartbeat(ws: WebSocket, message: any): Promise<void> {
    const { deviceId } = message;
    const device = this.connectedDevices.get(deviceId);
    
    if (device) {
      device.lastSeen = new Date();
      device.status = 'online';
      
      ws.send(JSON.stringify({
        type: 'heartbeat_ack',
        timestamp: new Date().toISOString()
      }));
    }
  }

  private async handleSyncRequest(ws: WebSocket, message: any): Promise<void> {
    const { deviceId, syncType = 'incremental', priority = 1 } = message;
    
    try {
      const syncJob = await this.queueSyncJob(deviceId, syncType, priority);
      
      ws.send(JSON.stringify({
        type: 'sync_queued',
        jobId: syncJob.id,
        position: await this.queueManager.getJobPosition(syncJob.id)
      }));
      
    } catch (error: any) {
      ws.send(JSON.stringify({
        type: 'sync_failed',
        message: error.message
      }));
    }
  }

  private async handleSyncData(ws: WebSocket, message: any): Promise<void> {
    const { jobId, data, chunk, totalChunks } = message;
    
    try {
      await this.progressTracker.updateProgress(jobId, {
        completed: chunk || 1,
        total: totalChunks || 1,
        currentOperation: 'Получение данных'
      });

      // Обработка полученных данных
      await this.dataSyncEndpoints.processIncomingData(data);
      
      ws.send(JSON.stringify({
        type: 'sync_data_ack',
        jobId,
        chunk
      }));
      
    } catch (error: any) {
      ws.send(JSON.stringify({
        type: 'sync_data_error',
        jobId,
        message: error.message
      }));
    }
  }

  private async handleSyncComplete(ws: WebSocket, message: any): Promise<void> {
    const { jobId, success, error } = message;
    
    try {
      await this.queueManager.completeJob(jobId, success, error);
      
      if (success) {
        const device = Array.from(this.connectedDevices.values())
          .find(d => d.websocket === ws);
        
        if (device) {
          device.lastSync = new Date();
          await this.updateDeviceInDatabase(device);
        }
      }
      
    } catch (err) {
      console.error('Ошибка завершения синхронизации:', err);
    }
  }

  private handleDeviceDisconnect(ws: WebSocket): void {
    // Находим устройство по WebSocket соединению
    const device = Array.from(this.connectedDevices.values())
      .find(d => d.websocket === ws);
    
    if (device) {
      device.status = 'offline';
      device.websocket = undefined;
      
      this.emit('device_disconnected', device);
      this.broadcastDeviceStatus();
      
      console.log(`Устройство отключено: ${device.name} (${device.id})`);
    }
  }

  private setupEventHandlers(): void {
    // Обработка обнаруженных устройств
    this.deviceDiscovery.on('device_discovered', (deviceInfo) => {
      console.log('Обнаружено устройство:', deviceInfo);
      this.emit('device_discovered', deviceInfo);
    });

    // Обработка завершения заданий синхронизации
    this.queueManager.on('job_completed', async (job: SyncJob) => {
      const device = this.connectedDevices.get(job.deviceId);
      if (device && device.websocket) {
        device.websocket.send(JSON.stringify({
          type: 'sync_result',
          jobId: job.id,
          success: job.status === 'completed',
          error: job.error
        }));
      }
    });

    // Обработка ошибок синхронизации
    this.queueManager.on('job_failed', async (job: SyncJob) => {
      // Добавление в очередь повторных попыток
      await this.retryManager.scheduleRetry(job);
    });
  }

  private setupPeriodicTasks(): void {
    // Очистка неактивных устройств каждые 5 минут
    cron.schedule('*/5 * * * *', () => {
      this.cleanupInactiveDevices();
    });

    // Проверка статуса синхронизации каждую минуту
    cron.schedule('* * * * *', () => {
      this.checkSyncStatus();
    });

    // Отправка статистики каждые 30 секунд
    cron.schedule('*/30 * * * * *', () => {
      this.broadcastSyncStatistics();
    });
  }

  private cleanupInactiveDevices(): void {
    const inactiveThreshold = 5 * 60 * 1000; // 5 минут
    const now = new Date();

    for (const [deviceId, device] of this.connectedDevices) {
      if (now.getTime() - device.lastSeen.getTime() > inactiveThreshold) {
        if (device.status !== 'offline') {
          device.status = 'offline';
          this.emit('device_timeout', device);
        }
      }
    }
  }

  private checkSyncStatus(): void {
    // Проверка застрявших заданий синхронизации
    this.queueManager.checkStuckJobs();
  }

  private broadcastDeviceStatus(): void {
    const devices = Array.from(this.connectedDevices.values())
      .map(device => ({
        id: device.id,
        name: device.name,
        type: device.type,
        status: device.status,
        lastSeen: device.lastSeen,
        lastSync: device.lastSync
      }));

    this.broadcastToClients({
      type: 'device_status_update',
      devices
    });
  }

  private broadcastSyncStatistics(): void {
    const stats = this.queueManager.getStatistics();
    
    this.broadcastToClients({
      type: 'sync_statistics',
      statistics: stats
    });
  }

  private broadcastToClients(message: any): void {
    this.wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  }

  // Публичные методы для API
  async queueSyncJob(deviceId: string, type: string, priority: number = 1, data?: any): Promise<SyncJob> {
    const device = this.connectedDevices.get(deviceId);
    if (!device) {
      throw new Error('Устройство не найдено');
    }

    if (device.status !== 'online') {
      throw new Error('Устройство не в сети');
    }

    const job: SyncJob = {
      id: uuidv4(),
      deviceId,
      type: type as any,
      priority,
      createdAt: new Date(),
      attempts: 0,
      maxAttempts: 3,
      data,
      progress: {
        total: 100,
        completed: 0,
        percentage: 0
      },
      status: 'pending'
    };

    await this.queueManager.addJob(job);
    return job;
  }

  getConnectedDevices(): ConnectedDevice[] {
    return Array.from(this.connectedDevices.values());
  }

  getDevice(deviceId: string): ConnectedDevice | undefined {
    return this.connectedDevices.get(deviceId);
  }

  async forceSyncDevice(deviceId: string): Promise<SyncJob> {
    return this.queueSyncJob(deviceId, 'full', 10); // Высокий приоритет
  }

  getQueueStatistics() {
    return this.queueManager.getStatistics();
  }

  private getServerIP(): string {
    // Простое получение IP адреса сервера
    const os = require('os');
    const interfaces = os.networkInterfaces();
    
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          return iface.address;
        }
      }
    }
    
    return 'localhost';
  }

  private async updateDeviceInDatabase(device: ConnectedDevice): Promise<void> {
    try {
      const { runSQL } = await import('../database/index');
      
      await runSQL(`
        INSERT OR REPLACE INTO devices (id, name, ip_address, device_type, status, last_sync)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        device.id,
        device.name,
        device.ip,
        device.type,
        device.status,
        device.lastSync?.toISOString() || null
      ]);
      
    } catch (error) {
      console.error('Ошибка обновления устройства в БД:', error);
    }
  }
}

export default WiFiSyncService;