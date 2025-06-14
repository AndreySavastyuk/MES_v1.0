import { EventEmitter } from 'events';
import * as bonjour from 'bonjour';

export interface DiscoveredDevice {
  id: string;
  name: string;
  type: string;
  ip: string;
  port: number;
  txtRecord: any;
  lastSeen: Date;
  protocol: 'tcp' | 'udp';
}

export class DeviceDiscoveryService extends EventEmitter {
  private bonjourInstance: any;
  private browser: any;
  private advertiser: any;
  private discoveredDevices: Map<string, DiscoveredDevice> = new Map();
  private isRunning = false;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.bonjourInstance = bonjour.default();
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('Device Discovery Service уже запущен');
      return;
    }

    try {
      console.log('Запуск Device Discovery Service...');

      // Публикуем наш сервис
      await this.advertiseService();

      // Запускаем поиск устройств
      await this.startDiscovery();

      // Запускаем периодическую очистку
      this.startPeriodicCleanup();

      this.isRunning = true;
      console.log('Device Discovery Service запущен');
      this.emit('started');

    } catch (error) {
      console.error('Ошибка запуска Device Discovery Service:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    console.log('Остановка Device Discovery Service...');

    // Остановка браузера
    if (this.browser) {
      this.browser.stop();
      this.browser = null;
    }

    // Остановка рекламы сервиса
    if (this.advertiser) {
      this.advertiser.stop();
      this.advertiser = null;
    }

    // Остановка периодической очистки
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    this.isRunning = false;
    console.log('Device Discovery Service остановлен');
    this.emit('stopped');
  }

  private async advertiseService(): Promise<void> {
    try {
      const os = require('os');
      const hostname = os.hostname();
      
      this.advertiser = this.bonjourInstance.publish({
        name: `WarehouseServer-${hostname}`,
        type: 'warehouse-sync',
        port: 8080,
        txt: {
          version: '1.0',
          capabilities: 'tasks,inventory,sync',
          serverType: 'desktop',
          protocol: 'http'
        }
      });

      this.advertiser.on('up', () => {
        console.log('Сервис опубликован через mDNS');
      });

      this.advertiser.on('error', (err: any) => {
        console.error('Ошибка публикации сервиса:', err);
      });

    } catch (error) {
      console.error('Ошибка настройки рекламы сервиса:', error);
      throw error;
    }
  }

  private async startDiscovery(): Promise<void> {
    try {
      // Поиск устройств склада
      this.browser = this.bonjourInstance.find({ type: 'warehouse-sync' }, (service: any) => {
        this.handleDiscoveredService(service);
      });

      // Поиск Android устройств
      this.bonjourInstance.find({ type: 'android-tablet' }, (service: any) => {
        this.handleDiscoveredService(service);
      });

      // Поиск сканеров
      this.bonjourInstance.find({ type: 'barcode-scanner' }, (service: any) => {
        this.handleDiscoveredService(service);
      });

      // Общий поиск HTTP сервисов
      this.bonjourInstance.find({ type: 'http' }, (service: any) => {
        // Фильтруем только релевантные сервисы
        if (this.isWarehouseDevice(service)) {
          this.handleDiscoveredService(service);
        }
      });

      console.log('Поиск устройств запущен');

    } catch (error) {
      console.error('Ошибка запуска поиска устройств:', error);
      throw error;
    }
  }

  private handleDiscoveredService(service: any): void {
    try {
      // Извлекаем информацию об устройстве
      const deviceInfo = this.extractDeviceInfo(service);
      
      if (!deviceInfo) {
        return;
      }

      const existingDevice = this.discoveredDevices.get(deviceInfo.id);
      
      if (existingDevice) {
        // Обновляем время последнего обнаружения
        existingDevice.lastSeen = new Date();
        this.emit('device_updated', existingDevice);
      } else {
        // Новое устройство
        this.discoveredDevices.set(deviceInfo.id, deviceInfo);
        console.log(`Обнаружено новое устройство: ${deviceInfo.name} (${deviceInfo.ip}:${deviceInfo.port})`);
        this.emit('device_discovered', deviceInfo);
      }

    } catch (error) {
      console.error('Ошибка обработки обнаруженного сервиса:', error);
    }
  }

  private extractDeviceInfo(service: any): DiscoveredDevice | null {
    try {
      // Определяем IP адрес
      let ip = '';
      if (service.addresses && service.addresses.length > 0) {
        // Предпочитаем IPv4 адреса
        ip = service.addresses.find((addr: string) => {
          return addr.includes('.') && !addr.startsWith('127.');
        }) || service.addresses[0];
      }

      if (!ip || ip.startsWith('127.')) {
        return null; // Пропускаем localhost
      }

      // Генерируем уникальный ID
      const deviceId = this.generateDeviceId(service.name, ip, service.port);

      // Определяем тип устройства
      const deviceType = this.determineDeviceType(service);

      const device: DiscoveredDevice = {
        id: deviceId,
        name: service.name || `Device-${ip}`,
        type: deviceType,
        ip: ip,
        port: service.port || 80,
        txtRecord: service.txt || {},
        lastSeen: new Date(),
        protocol: 'tcp' // По умолчанию TCP
      };

      return device;

    } catch (error) {
      console.error('Ошибка извлечения информации об устройстве:', error);
      return null;
    }
  }

  private generateDeviceId(name: string, ip: string, port: number): string {
    // Создаем стабильный ID на основе имени и IP
    const crypto = require('crypto');
    const data = `${name}-${ip}-${port}`;
    return crypto.createHash('md5').update(data).digest('hex').substring(0, 8);
  }

  private determineDeviceType(service: any): string {
    const name = (service.name || '').toLowerCase();
    const type = (service.type || '').toLowerCase();
    const txt = service.txt || {};

    // Анализируем тип на основе различных критериев
    if (type.includes('tablet') || name.includes('tablet') || txt.deviceType === 'tablet') {
      return 'tablet';
    }

    if (type.includes('scanner') || name.includes('scanner') || txt.deviceType === 'scanner') {
      return 'scanner';
    }

    if (type.includes('warehouse') || name.includes('warehouse') || txt.app === 'warehouse') {
      return 'warehouse';
    }

    if (name.includes('android') || txt.platform === 'android') {
      return 'tablet'; // Предполагаем что Android устройства - планшеты
    }

    return 'unknown';
  }

  private isWarehouseDevice(service: any): boolean {
    const name = (service.name || '').toLowerCase();
    const txt = service.txt || {};

    // Проверяем признаки устройства склада
    return (
      name.includes('warehouse') ||
      name.includes('picker') ||
      name.includes('scanner') ||
      txt.app === 'warehouse' ||
      txt.type === 'warehouse-device' ||
      txt.capabilities?.includes('barcode')
    );
  }

  private startPeriodicCleanup(): void {
    // Очистка устаревших устройств каждые 2 минуты
    this.cleanupInterval = setInterval(() => {
      this.cleanupStaleDevices();
    }, 2 * 60 * 1000);
  }

  private cleanupStaleDevices(): void {
    const staleThreshold = 5 * 60 * 1000; // 5 минут
    const now = new Date();

    for (const [deviceId, device] of this.discoveredDevices) {
      if (now.getTime() - device.lastSeen.getTime() > staleThreshold) {
        console.log(`Удаление устаревшего устройства: ${device.name} (${device.id})`);
        this.discoveredDevices.delete(deviceId);
        this.emit('device_lost', device);
      }
    }
  }

  // Публичные методы
  getDiscoveredDevices(): DiscoveredDevice[] {
    return Array.from(this.discoveredDevices.values());
  }

  getDevice(deviceId: string): DiscoveredDevice | undefined {
    return this.discoveredDevices.get(deviceId);
  }

  async refreshDiscovery(): Promise<void> {
    if (!this.isRunning) {
      throw new Error('Service not running');
    }

    console.log('Обновление поиска устройств...');

    // Перезапускаем браузер
    if (this.browser) {
      this.browser.stop();
    }

    await this.startDiscovery();
    this.emit('discovery_refreshed');
  }

  async pingDevice(deviceId: string): Promise<boolean> {
    const device = this.discoveredDevices.get(deviceId);
    if (!device) {
      return false;
    }

    try {
      // Простая проверка доступности через HTTP запрос
      const http = require('http');
      
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          resolve(false);
        }, 5000);

        const req = http.get({
          hostname: device.ip,
          port: device.port,
          path: '/health',
          timeout: 5000
        }, (res: any) => {
          clearTimeout(timeout);
          resolve(res.statusCode === 200);
        });

        req.on('error', () => {
          clearTimeout(timeout);
          resolve(false);
        });

        req.on('timeout', () => {
          req.destroy();
          clearTimeout(timeout);
          resolve(false);
        });
      });

    } catch (error) {
      console.error(`Ошибка пинга устройства ${deviceId}:`, error);
      return false;
    }
  }

  getStatistics() {
    const devices = Array.from(this.discoveredDevices.values());
    
    return {
      totalDevices: devices.length,
      devicesByType: {
        tablet: devices.filter(d => d.type === 'tablet').length,
        scanner: devices.filter(d => d.type === 'scanner').length,
        warehouse: devices.filter(d => d.type === 'warehouse').length,
        unknown: devices.filter(d => d.type === 'unknown').length
      },
      recentlyActive: devices.filter(d => {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        return d.lastSeen > fiveMinutesAgo;
      }).length
    };
  }
}

export default DeviceDiscoveryService; 