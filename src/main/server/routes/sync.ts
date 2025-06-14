import { Router, Request, Response } from 'express';
import WiFiSyncService from '../../sync/wifi-sync-service';

const router = Router();
let syncService: WiFiSyncService | null = null;

// Инициализация сервиса синхронизации
export function initializeSyncService(): void {
  if (!syncService) {
    syncService = new WiFiSyncService(8080);
    syncService.start().catch(console.error);
  }
}

// Получение экземпляра сервиса
function getSyncService(): WiFiSyncService {
  if (!syncService) {
    initializeSyncService();
  }
  return syncService!;
}

// GET /api/sync/status - Статус сервиса синхронизации
router.get('/status', (req: Request, res: Response) => {
  try {
    const service = getSyncService();
    const statistics = service.getQueueStatistics();
    const connectedDevices = service.getConnectedDevices();

    res.json({
      success: true,
      data: {
        isRunning: true,
        connectedDevices: connectedDevices.length,
        devices: connectedDevices.map(device => ({
          id: device.id,
          name: device.name,
          type: device.type,
          status: device.status,
          lastSeen: device.lastSeen,
          lastSync: device.lastSync,
          ip: device.ip
        })),
        queueStatistics: statistics
      }
    });
  } catch (error: any) {
    console.error('Ошибка получения статуса синхронизации:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// POST /api/sync/devices/:deviceId/sync - Запуск синхронизации для устройства
router.post('/devices/:deviceId/sync', async (req: Request, res: Response) => {
  try {
    const { deviceId } = req.params;
    const { type = 'incremental', priority = 1 } = req.body;

    const service = getSyncService();
    const syncJob = await service.queueSyncJob(deviceId, type, priority);

    res.json({
      success: true,
      data: {
        jobId: syncJob.id,
        message: 'Синхронизация поставлена в очередь',
        position: await service.queueManager.getJobPosition(syncJob.id)
      }
    });
  } catch (error: any) {
    console.error('Ошибка запуска синхронизации:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// POST /api/sync/devices/:deviceId/force-sync - Принудительная полная синхронизация
router.post('/devices/:deviceId/force-sync', async (req: Request, res: Response) => {
  try {
    const { deviceId } = req.params;

    const service = getSyncService();
    const syncJob = await service.forceSyncDevice(deviceId);

    res.json({
      success: true,
      data: {
        jobId: syncJob.id,
        message: 'Принудительная синхронизация запущена',
        type: 'full',
        priority: 10
      }
    });
  } catch (error: any) {
    console.error('Ошибка принудительной синхронизации:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// GET /api/sync/devices - Список подключенных устройств
router.get('/devices', (req: Request, res: Response) => {
  try {
    const service = getSyncService();
    const devices = service.getConnectedDevices();

    res.json({
      success: true,
      data: devices.map(device => ({
        id: device.id,
        name: device.name,
        type: device.type,
        status: device.status,
        lastSeen: device.lastSeen,
        lastSync: device.lastSync,
        ip: device.ip,
        port: device.port,
        capabilities: device.capabilities,
        version: device.version
      }))
    });
  } catch (error: any) {
    console.error('Ошибка получения списка устройств:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// GET /api/sync/devices/:deviceId - Информация о конкретном устройстве
router.get('/devices/:deviceId', (req: Request, res: Response) => {
  try {
    const { deviceId } = req.params;
    const service = getSyncService();
    const device = service.getDevice(deviceId);

    if (!device) {
      return res.status(404).json({
        success: false,
        message: 'Устройство не найдено'
      });
    }

    res.json({
      success: true,
      data: {
        id: device.id,
        name: device.name,
        type: device.type,
        status: device.status,
        lastSeen: device.lastSeen,
        lastSync: device.lastSync,
        ip: device.ip,
        port: device.port,
        capabilities: device.capabilities,
        version: device.version
      }
    });
  } catch (error: any) {
    console.error('Ошибка получения информации об устройстве:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// GET /api/sync/jobs - Список заданий синхронизации
router.get('/jobs', (req: Request, res: Response) => {
  try {
    const { deviceId, status, limit = '50' } = req.query;
    const service = getSyncService();
    
    // Здесь нужно получить задания из очереди
    // Пока возвращаем статистику
    const statistics = service.getQueueStatistics();

    res.json({
      success: true,
      data: {
        statistics,
        // В реальной реализации здесь должен быть список заданий
        jobs: []
      }
    });
  } catch (error: any) {
    console.error('Ошибка получения списка заданий:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// GET /api/sync/jobs/:jobId - Информация о конкретном задании
router.get('/jobs/:jobId', (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const service = getSyncService();
    
    // Получаем задание из очереди
    const job = service.queueManager.getJob(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Задание не найдено'
      });
    }

    res.json({
      success: true,
      data: {
        id: job.id,
        deviceId: job.deviceId,
        type: job.type,
        status: job.status,
        priority: job.priority,
        progress: job.progress,
        createdAt: job.createdAt,
        attempts: job.attempts,
        maxAttempts: job.maxAttempts,
        error: job.error
      }
    });
  } catch (error: any) {
    console.error('Ошибка получения информации о задании:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// DELETE /api/sync/jobs/:jobId - Отмена задания синхронизации
router.delete('/jobs/:jobId', async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const service = getSyncService();
    
    const cancelled = await service.queueManager.cancelJob(jobId);

    if (!cancelled) {
      return res.status(404).json({
        success: false,
        message: 'Задание не найдено или не может быть отменено'
      });
    }

    res.json({
      success: true,
      message: 'Задание отменено'
    });
  } catch (error: any) {
    console.error('Ошибка отмены задания:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// POST /api/sync/discovery/refresh - Обновление поиска устройств
router.post('/discovery/refresh', async (req: Request, res: Response) => {
  try {
    const service = getSyncService();
    await service.deviceDiscovery.refreshDiscovery();

    res.json({
      success: true,
      message: 'Поиск устройств обновлен'
    });
  } catch (error: any) {
    console.error('Ошибка обновления поиска устройств:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// GET /api/sync/discovery/devices - Обнаруженные устройства
router.get('/discovery/devices', (req: Request, res: Response) => {
  try {
    const service = getSyncService();
    const discoveredDevices = service.deviceDiscovery.getDiscoveredDevices();

    res.json({
      success: true,
      data: discoveredDevices.map(device => ({
        id: device.id,
        name: device.name,
        type: device.type,
        ip: device.ip,
        port: device.port,
        lastSeen: device.lastSeen,
        protocol: device.protocol,
        txtRecord: device.txtRecord
      }))
    });
  } catch (error: any) {
    console.error('Ошибка получения обнаруженных устройств:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// POST /api/sync/discovery/devices/:deviceId/ping - Проверка доступности устройства
router.post('/discovery/devices/:deviceId/ping', async (req: Request, res: Response) => {
  try {
    const { deviceId } = req.params;
    const service = getSyncService();
    
    const isAvailable = await service.deviceDiscovery.pingDevice(deviceId);

    res.json({
      success: true,
      data: {
        deviceId,
        available: isAvailable,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    console.error('Ошибка проверки доступности устройства:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// GET /api/sync/statistics - Общая статистика синхронизации
router.get('/statistics', (req: Request, res: Response) => {
  try {
    const service = getSyncService();
    const queueStats = service.getQueueStatistics();
    const discoveryStats = service.deviceDiscovery.getStatistics();
    const retryStats = service.retryManager.getRetryStatistics();
    const progressStats = service.progressTracker.getStatistics();

    res.json({
      success: true,
      data: {
        queue: queueStats,
        discovery: discoveryStats,
        retry: retryStats,
        progress: progressStats,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    console.error('Ошибка получения статистики синхронизации:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// POST /api/sync/data - Endpoint для приема данных от устройств
router.post('/data', async (req: Request, res: Response) => {
  try {
    const syncData = req.body;
    const service = getSyncService();
    
    const result = await service.dataSyncEndpoints.processIncomingData(syncData);

    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error: any) {
    console.error('Ошибка обработки данных синхронизации:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// GET /api/sync/data/:deviceId/:dataType - Получение данных для устройства
router.get('/data/:deviceId/:dataType', async (req: Request, res: Response) => {
  try {
    const { deviceId, dataType } = req.params;
    const { lastSyncToken } = req.query;
    const service = getSyncService();
    
    const syncData = await service.dataSyncEndpoints.prepareDataForDevice(
      deviceId, 
      dataType, 
      lastSyncToken as string
    );

    res.json({
      success: true,
      data: syncData
    });
  } catch (error: any) {
    console.error('Ошибка подготовки данных для устройства:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// POST /api/sync/configure - Настройка параметров синхронизации
router.post('/configure', async (req: Request, res: Response) => {
  try {
    const { maxConcurrentJobs, retryPolicies, compressionEnabled } = req.body;
    
    // Здесь можно добавить логику обновления конфигурации
    // Например, обновление политик повторных попыток
    
    res.json({
      success: true,
      message: 'Конфигурация обновлена'
    });
  } catch (error: any) {
    console.error('Ошибка обновления конфигурации:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// WebSocket endpoint информация
router.get('/websocket-info', (req: Request, res: Response) => {
  const host = req.get('host')?.split(':')[0] || 'localhost';
  
  res.json({
    success: true,
    data: {
      websocketUrl: `ws://${host}:8081`,
      protocol: 'warehouse-sync-v1',
      supportedMessageTypes: [
        'register',
        'heartbeat', 
        'sync_request',
        'sync_data',
        'sync_complete'
      ]
    }
  });
});

export default router; 