import { Router, Request, Response } from 'express';
import { DeviceAPI } from '../../database/warehouse-api';
import { Device } from '../../../shared/types';

const router = Router();

// GET /api/devices - получить все устройства
router.get('/', async (req: Request, res: Response) => {
  try {
    const devices = await DeviceAPI.getAll();
    
    res.json({
      success: true,
      data: devices
    });
  } catch (error: any) {
    console.error('Error fetching devices:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка получения списка устройств',
      message: error.message
    });
  }
});

// GET /api/devices/online - получить только онлайн устройства
router.get('/online', async (req: Request, res: Response) => {
  try {
    const devices = await DeviceAPI.getOnlineDevices();
    
    res.json({
      success: true,
      data: devices
    });
  } catch (error: any) {
    console.error('Error fetching online devices:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка получения онлайн устройств',
      message: error.message
    });
  }
});

// GET /api/devices/:id - получить устройство по ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const deviceId = parseInt(req.params.id);
    const device = await DeviceAPI.getById(deviceId);
    
    if (!device) {
      return res.status(404).json({
        success: false,
        error: 'Устройство не найдено'
      });
    }
    
    res.json({
      success: true,
      data: device
    });
  } catch (error: any) {
    console.error('Error fetching device:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка получения устройства',
      message: error.message
    });
  }
});

// POST /api/devices - создать новое устройство
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, ip_address, device_type, status = 'offline' } = req.body;
    
    // Валидация
    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Название устройства обязательно'
      });
    }
    
    if (!device_type || !['tablet', 'scanner', 'desktop'].includes(device_type)) {
      return res.status(400).json({
        success: false,
        error: 'Некорректный тип устройства'
      });
    }
    
    const result = await DeviceAPI.create({
      name,
      ip_address,
      device_type,
      status
    });
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    res.status(201).json({
      success: true,
      data: result.data,
      message: 'Устройство успешно создано'
    });
    
  } catch (error: any) {
    console.error('Error creating device:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка создания устройства',
      message: error.message
    });
  }
});

// PUT /api/devices/:id - обновить устройство
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const deviceId = parseInt(req.params.id);
    const updates = req.body;
    
    // Проверка существования устройства
    const existingDevice = await DeviceAPI.getById(deviceId);
    if (!existingDevice) {
      return res.status(404).json({
        success: false,
        error: 'Устройство не найдено'
      });
    }
    
    const result = await DeviceAPI.update(deviceId, updates);
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    res.json({
      success: true,
      data: result.data,
      message: 'Устройство успешно обновлено'
    });
    
  } catch (error: any) {
    console.error('Error updating device:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка обновления устройства',
      message: error.message
    });
  }
});

// POST /api/devices/:id/status - обновить статус устройства
router.post('/:id/status', async (req: Request, res: Response) => {
  try {
    const deviceId = parseInt(req.params.id);
    const { status } = req.body;
    
    if (!status || !['online', 'offline', 'syncing', 'error'].includes(status)) {
      return res.status(400).json({
        success: false,
        error: 'Некорректный статус устройства'
      });
    }
    
    const result = await DeviceAPI.updateStatus(deviceId, status);
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    res.json({
      success: true,
      data: result.data,
      message: `Статус устройства изменен на ${status}`
    });
    
  } catch (error: any) {
    console.error('Error updating device status:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка обновления статуса устройства',
      message: error.message
    });
  }
});

// POST /api/devices/:id/sync - обновить время последней синхронизации
router.post('/:id/sync', async (req: Request, res: Response) => {
  try {
    const deviceId = parseInt(req.params.id);
    
    const result = await DeviceAPI.updateLastSync(deviceId);
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    res.json({
      success: true,
      data: result.data,
      message: 'Время синхронизации обновлено'
    });
    
  } catch (error: any) {
    console.error('Error updating device sync time:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка обновления времени синхронизации',
      message: error.message
    });
  }
});

// DELETE /api/devices/:id - удалить устройство
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const deviceId = parseInt(req.params.id);
    
    // Проверка существования устройства
    const existingDevice = await DeviceAPI.getById(deviceId);
    if (!existingDevice) {
      return res.status(404).json({
        success: false,
        error: 'Устройство не найдено'
      });
    }
    
    // Проверка, можно ли удалить устройство
    if (existingDevice.status === 'online') {
      return res.status(400).json({
        success: false,
        error: 'Нельзя удалить устройство, которое находится в сети'
      });
    }
    
    const result = await DeviceAPI.delete(deviceId);
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    res.json({
      success: true,
      message: 'Устройство успешно удалено'
    });
    
  } catch (error: any) {
    console.error('Error deleting device:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка удаления устройства',
      message: error.message
    });
  }
});

export default router; 