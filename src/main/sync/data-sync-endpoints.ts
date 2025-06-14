import { EventEmitter } from 'events';

interface SyncData {
  type: 'tasks' | 'inventory' | 'settings' | 'users' | 'mixed';
  version: string;
  timestamp: string;
  deviceId: string;
  data: any;
  checksum?: string;
  compressed?: boolean;
}

interface SyncResponse {
  success: boolean;
  message?: string;
  data?: any;
  conflicts?: SyncConflict[];
  nextSyncToken?: string;
}

interface SyncConflict {
  id: string;
  field: string;
  serverValue: any;
  deviceValue: any;
  resolved: boolean;
  resolution?: 'server' | 'device' | 'merge';
}

export class DataSyncEndpoints extends EventEmitter {
  private conflictResolver: ConflictResolver;
  private compressionEnabled = true;

  constructor() {
    super();
    this.conflictResolver = new ConflictResolver();
  }

  // Обработка входящих данных от устройств
  async processIncomingData(syncData: SyncData): Promise<SyncResponse> {
    try {
      console.log(`Обработка данных синхронизации от устройства ${syncData.deviceId}, тип: ${syncData.type}`);

      // Проверка контрольной суммы
      if (syncData.checksum && !this.verifyChecksum(syncData)) {
        return {
          success: false,
          message: 'Ошибка контрольной суммы данных'
        };
      }

      // Декомпрессия данных при необходимости
      let processedData = syncData.data;
      if (syncData.compressed) {
        processedData = await this.decompressData(syncData.data);
      }

      // Обработка по типу данных
      let response: SyncResponse;
      switch (syncData.type) {
        case 'tasks':
          response = await this.processTasks(syncData.deviceId, processedData);
          break;
        case 'inventory':
          response = await this.processInventory(syncData.deviceId, processedData);
          break;
        case 'settings':
          response = await this.processSettings(syncData.deviceId, processedData);
          break;
        case 'users':
          response = await this.processUsers(syncData.deviceId, processedData);
          break;
        case 'mixed':
          response = await this.processMixedData(syncData.deviceId, processedData);
          break;
        default:
          return {
            success: false,
            message: `Неизвестный тип данных: ${syncData.type}`
          };
      }

      this.emit('data_processed', {
        deviceId: syncData.deviceId,
        type: syncData.type,
        success: response.success,
        conflictsCount: response.conflicts?.length || 0
      });

      return response;

    } catch (error: any) {
      console.error('Ошибка обработки данных синхронизации:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  // Подготовка данных для отправки на устройство
  async prepareDataForDevice(deviceId: string, dataType: string, lastSyncToken?: string): Promise<SyncData> {
    try {
      console.log(`Подготовка данных для устройства ${deviceId}, тип: ${dataType}`);

      let data: any;
      switch (dataType) {
        case 'tasks':
          data = await this.getTasksForDevice(deviceId, lastSyncToken);
          break;
        case 'inventory':
          data = await this.getInventoryForDevice(deviceId, lastSyncToken);
          break;
        case 'settings':
          data = await this.getSettingsForDevice(deviceId);
          break;
        case 'users':
          data = await this.getUsersForDevice(deviceId);
          break;
        default:
          throw new Error(`Неизвестный тип данных: ${dataType}`);
      }

      // Сжатие данных если включено
      let processedData = data;
      let compressed = false;
      if (this.compressionEnabled && this.shouldCompress(data)) {
        processedData = await this.compressData(data);
        compressed = true;
      }

      const syncData: SyncData = {
        type: dataType as any,
        version: '1.0',
        timestamp: new Date().toISOString(),
        deviceId: 'server',
        data: processedData,
        checksum: this.calculateChecksum(processedData),
        compressed
      };

      this.emit('data_prepared', {
        deviceId,
        type: dataType,
        dataSize: JSON.stringify(processedData).length,
        compressed
      });

      return syncData;

    } catch (error: any) {
      console.error('Ошибка подготовки данных:', error);
      throw error;
    }
  }

  private async processTasks(deviceId: string, data: any): Promise<SyncResponse> {
    try {
      const { runSQL } = await import('../database/index');
      const conflicts: SyncConflict[] = [];

      for (const taskData of data.tasks || []) {
        // Проверяем существование задачи
        const existingTask = await runSQL(
          'SELECT * FROM pick_tasks WHERE id = ?',
          [taskData.id]
        );

        if (Array.isArray(existingTask) && existingTask.length > 0) {
          // Проверяем конфликты
          const existing = existingTask[0];
          const deviceConflicts = this.conflictResolver.detectTaskConflicts(existing, taskData);
          
          if (deviceConflicts.length > 0) {
            conflicts.push(...deviceConflicts);
            
            // Автоматическое разрешение конфликтов
            const resolved = await this.conflictResolver.resolveTaskConflicts(existing, taskData, deviceConflicts);
            
            // Обновляем задачу с разрешенными данными
            await this.updateTask(resolved);
          } else {
            // Простое обновление без конфликтов
            await this.updateTask(taskData);
          }
        } else {
          // Создание новой задачи
          await this.createTask(taskData);
        }
      }

      // Обработка элементов задач
      for (const itemData of data.items || []) {
        await this.processTaskItem(itemData);
      }

      return {
        success: true,
        message: `Обработано ${data.tasks?.length || 0} задач и ${data.items?.length || 0} элементов`,
        conflicts: conflicts.length > 0 ? conflicts : undefined,
        nextSyncToken: this.generateSyncToken(deviceId, 'tasks')
      };

    } catch (error: any) {
      console.error('Ошибка обработки задач:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  private async processInventory(deviceId: string, data: any): Promise<SyncResponse> {
    try {
      const { runSQL } = await import('../database/index');
      const conflicts: SyncConflict[] = [];

      for (const inventoryData of data.inventory || []) {
        // Проверяем существование записи инвентаря
        const existing = await runSQL(
          'SELECT * FROM inventory WHERE barcode = ?',
          [inventoryData.barcode]
        );

        if (Array.isArray(existing) && existing.length > 0) {
          // Проверяем конфликты количества
          const existingRecord = existing[0];
          if (existingRecord.quantity !== inventoryData.quantity) {
            const conflict: SyncConflict = {
              id: inventoryData.barcode,
              field: 'quantity',
              serverValue: existingRecord.quantity,
              deviceValue: inventoryData.quantity,
              resolved: false
            };

            // Автоматическое разрешение: берем наибольшее количество
            const resolvedQuantity = Math.max(existingRecord.quantity, inventoryData.quantity);
            conflict.resolution = resolvedQuantity === existingRecord.quantity ? 'server' : 'device';
            conflict.resolved = true;

            conflicts.push(conflict);

            // Обновляем с разрешенным значением
            await runSQL(
              'UPDATE inventory SET quantity = ?, last_updated = ? WHERE barcode = ?',
              [resolvedQuantity, new Date().toISOString(), inventoryData.barcode]
            );
          }
        } else {
          // Создание новой записи
          await runSQL(
            'INSERT INTO inventory (barcode, name, quantity, location, last_updated) VALUES (?, ?, ?, ?, ?)',
            [
              inventoryData.barcode,
              inventoryData.name,
              inventoryData.quantity,
              inventoryData.location,
              new Date().toISOString()
            ]
          );
        }
      }

      return {
        success: true,
        message: `Обработано ${data.inventory?.length || 0} записей инвентаря`,
        conflicts: conflicts.length > 0 ? conflicts : undefined,
        nextSyncToken: this.generateSyncToken(deviceId, 'inventory')
      };

    } catch (error: any) {
      console.error('Ошибка обработки инвентаря:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  private async processSettings(deviceId: string, data: any): Promise<SyncResponse> {
    try {
      const { runSQL } = await import('../database/index');

      // Обновляем настройки устройства
      for (const [key, value] of Object.entries(data.settings || {})) {
        await runSQL(
          'INSERT OR REPLACE INTO device_settings (device_id, setting_key, setting_value, updated_at) VALUES (?, ?, ?, ?)',
          [deviceId, key, JSON.stringify(value), new Date().toISOString()]
        );
      }

      return {
        success: true,
        message: `Обновлено ${Object.keys(data.settings || {}).length} настроек`,
        nextSyncToken: this.generateSyncToken(deviceId, 'settings')
      };

    } catch (error: any) {
      console.error('Ошибка обработки настроек:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  private async processUsers(deviceId: string, data: any): Promise<SyncResponse> {
    // Пользователи обычно синхронизируются только от сервера к устройству
    return {
      success: true,
      message: 'Данные пользователей получены',
      nextSyncToken: this.generateSyncToken(deviceId, 'users')
    };
  }

  private async processMixedData(deviceId: string, data: any): Promise<SyncResponse> {
    const results: SyncResponse[] = [];

    // Обрабатываем каждый тип данных отдельно
    if (data.tasks) {
      results.push(await this.processTasks(deviceId, { tasks: data.tasks, items: data.items }));
    }

    if (data.inventory) {
      results.push(await this.processInventory(deviceId, { inventory: data.inventory }));
    }

    if (data.settings) {
      results.push(await this.processSettings(deviceId, { settings: data.settings }));
    }

    // Объединяем результаты
    const allConflicts: SyncConflict[] = [];
    const messages: string[] = [];
    let allSuccess = true;

    for (const result of results) {
      if (!result.success) {
        allSuccess = false;
      }
      if (result.message) {
        messages.push(result.message);
      }
      if (result.conflicts) {
        allConflicts.push(...result.conflicts);
      }
    }

    return {
      success: allSuccess,
      message: messages.join('; '),
      conflicts: allConflicts.length > 0 ? allConflicts : undefined,
      nextSyncToken: this.generateSyncToken(deviceId, 'mixed')
    };
  }

  // Методы получения данных для отправки
  private async getTasksForDevice(deviceId: string, lastSyncToken?: string): Promise<any> {
    const { runSQL } = await import('../database/index');

    // Определяем дату последней синхронизации
    let lastSyncDate = '1970-01-01';
    if (lastSyncToken) {
      lastSyncDate = this.decodeSyncToken(lastSyncToken);
    }

    // Получаем задачи, назначенные на устройство или обновленные после последней синхронизации
    const tasks = await runSQL(`
      SELECT * FROM pick_tasks 
      WHERE assigned_device = ? OR updated_at > ?
      ORDER BY created_at DESC
    `, [deviceId, lastSyncDate]);

    // Получаем элементы для этих задач
    const taskIds = Array.isArray(tasks) ? tasks.map((task: any) => task.id) : [];
    let items: any[] = [];
    
    if (taskIds.length > 0) {
      const placeholders = taskIds.map(() => '?').join(',');
      const itemsResult = await runSQL(`
        SELECT * FROM pick_task_items 
        WHERE task_id IN (${placeholders})
      `, taskIds);
      items = Array.isArray(itemsResult) ? itemsResult : [];
    }

    return { tasks, items };
  }

  private async getInventoryForDevice(deviceId: string, lastSyncToken?: string): Promise<any> {
    const { runSQL } = await import('../database/index');

    let lastSyncDate = '1970-01-01';
    if (lastSyncToken) {
      lastSyncDate = this.decodeSyncToken(lastSyncToken);
    }

    const inventory = await runSQL(`
      SELECT * FROM inventory 
      WHERE last_updated > ?
      ORDER BY last_updated DESC
    `, [lastSyncDate]);

    return { inventory };
  }

  private async getSettingsForDevice(deviceId: string): Promise<any> {
    const { runSQL } = await import('../database/index');

    const settings = await runSQL(`
      SELECT setting_key, setting_value FROM device_settings 
      WHERE device_id = ? OR device_id = 'global'
    `, [deviceId]);

    const settingsObject: any = {};
    const settingsArray = Array.isArray(settings) ? settings : [];
    for (const setting of settingsArray) {
      try {
        settingsObject[setting.setting_key] = JSON.parse(setting.setting_value);
      } catch {
        settingsObject[setting.setting_key] = setting.setting_value;
      }
    }

    return { settings: settingsObject };
  }

  private async getUsersForDevice(deviceId: string): Promise<any> {
    const { runSQL } = await import('../database/index');

    const users = await runSQL(`
      SELECT id, username, full_name, role, active FROM users 
      WHERE active = 1
    `);

    return { users };
  }

  // Утилиты
  private async createTask(taskData: any): Promise<void> {
    const { runSQL } = await import('../database/index');
    
    await runSQL(`
      INSERT INTO pick_tasks (id, number, priority, status, assigned_device, deadline, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      taskData.id,
      taskData.number,
      taskData.priority,
      taskData.status,
      taskData.assigned_device,
      taskData.deadline,
      taskData.created_at || new Date().toISOString(),
      new Date().toISOString()
    ]);
  }

  private async updateTask(taskData: any): Promise<void> {
    const { runSQL } = await import('../database/index');
    
    await runSQL(`
      UPDATE pick_tasks 
      SET priority = ?, status = ?, assigned_device = ?, deadline = ?, updated_at = ?
      WHERE id = ?
    `, [
      taskData.priority,
      taskData.status,
      taskData.assigned_device,
      taskData.deadline,
      new Date().toISOString(),
      taskData.id
    ]);
  }

  private async processTaskItem(itemData: any): Promise<void> {
    const { runSQL } = await import('../database/index');
    
    await runSQL(`
      INSERT OR REPLACE INTO pick_task_items 
      (id, task_id, barcode, name, required_quantity, picked_quantity, location)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      itemData.id,
      itemData.task_id,
      itemData.barcode,
      itemData.name,
      itemData.required_quantity,
      itemData.picked_quantity || 0,
      itemData.location
    ]);
  }

  private verifyChecksum(syncData: SyncData): boolean {
    const calculated = this.calculateChecksum(syncData.data);
    return calculated === syncData.checksum;
  }

  private calculateChecksum(data: any): string {
    const crypto = require('crypto');
    const dataString = JSON.stringify(data);
    return crypto.createHash('sha256').update(dataString).digest('hex');
  }

  private async compressData(data: any): Promise<string> {
    const zlib = require('zlib');
    const dataString = JSON.stringify(data);
    return new Promise((resolve, reject) => {
      zlib.gzip(dataString, (err: any, compressed: Buffer) => {
        if (err) reject(err);
        else resolve(compressed.toString('base64'));
      });
    });
  }

  private async decompressData(compressedData: string): Promise<any> {
    const zlib = require('zlib');
    const buffer = Buffer.from(compressedData, 'base64');
    return new Promise((resolve, reject) => {
      zlib.gunzip(buffer, (err: any, decompressed: Buffer) => {
        if (err) reject(err);
        else resolve(JSON.parse(decompressed.toString()));
      });
    });
  }

  private shouldCompress(data: any): boolean {
    const dataSize = JSON.stringify(data).length;
    return dataSize > 1024; // Сжимаем данные больше 1KB
  }

  private generateSyncToken(deviceId: string, dataType: string): string {
    const timestamp = new Date().toISOString();
    const tokenData = { deviceId, dataType, timestamp };
    return Buffer.from(JSON.stringify(tokenData)).toString('base64');
  }

  private decodeSyncToken(token: string): string {
    try {
      const tokenData = JSON.parse(Buffer.from(token, 'base64').toString());
      return tokenData.timestamp;
    } catch {
      return '1970-01-01';
    }
  }
}

// Класс для разрешения конфликтов
class ConflictResolver {
  detectTaskConflicts(serverTask: any, deviceTask: any): SyncConflict[] {
    const conflicts: SyncConflict[] = [];

    // Проверяем различные поля
    const fieldsToCheck = ['status', 'priority', 'assigned_device', 'deadline'];
    
    for (const field of fieldsToCheck) {
      if (serverTask[field] !== deviceTask[field]) {
        conflicts.push({
          id: serverTask.id,
          field,
          serverValue: serverTask[field],
          deviceValue: deviceTask[field],
          resolved: false
        });
      }
    }

    return conflicts;
  }

  async resolveTaskConflicts(serverTask: any, deviceTask: any, conflicts: SyncConflict[]): Promise<any> {
    const resolved = { ...serverTask };

    for (const conflict of conflicts) {
      switch (conflict.field) {
        case 'status':
          // Приоритет отдаем более позднему статусу в рабочем процессе
          resolved[conflict.field] = this.resolveStatusConflict(conflict.serverValue, conflict.deviceValue);
          break;
        
        case 'priority':
          // Берем более высокий приоритет
          resolved[conflict.field] = Math.max(conflict.serverValue, conflict.deviceValue);
          break;
        
        case 'assigned_device':
          // Приоритет отдаем назначению с устройства
          resolved[conflict.field] = conflict.deviceValue;
          break;
        
        case 'deadline':
          // Берем более раннюю дату дедлайна
          const serverDate = new Date(conflict.serverValue);
          const deviceDate = new Date(conflict.deviceValue);
          resolved[conflict.field] = serverDate < deviceDate ? conflict.serverValue : conflict.deviceValue;
          break;
        
        default:
          // По умолчанию берем значение с сервера
          resolved[conflict.field] = conflict.serverValue;
      }

      conflict.resolved = true;
      conflict.resolution = resolved[conflict.field] === conflict.serverValue ? 'server' : 'device';
    }

    return resolved;
  }

  private resolveStatusConflict(serverStatus: string, deviceStatus: string): string {
    const statusPriority: { [key: string]: number } = {
      'pending': 1,
      'in_progress': 2,
      'completed': 3,
      'cancelled': 0,
      'on_hold': 1
    };

    const serverPriority = statusPriority[serverStatus] || 0;
    const devicePriority = statusPriority[deviceStatus] || 0;

    return devicePriority > serverPriority ? deviceStatus : serverStatus;
  }
}

export default DataSyncEndpoints;