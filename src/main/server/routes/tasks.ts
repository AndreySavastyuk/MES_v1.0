import { Router, Request, Response } from 'express';
import multer from 'multer';
import * as XLSX from 'xlsx';
import * as csv from 'csv-parser';
import { Readable } from 'stream';

// Расширение типа Request для поддержки multer
interface MulterRequest extends Request {
  file?: Express.Multer.File;
}
import { 
  PickTaskAPI, 
  PickItemAPI, 
  DeviceAPI 
} from '../../database/warehouse-api';
import { PickTask, PickItem } from '../../../shared/types';

const router = Router();

// Настройка multer для загрузки файлов
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// Интерфейс для фильтров задач
interface TaskQuery {
  page?: string;
  limit?: string;
  status?: string;
  priority?: string;
  assigned_device?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
}

// GET /api/tasks - получить список задач с фильтрацией и пагинацией
router.get('/', async (req: Request<{}, {}, {}, TaskQuery>, res: Response) => {
  try {
    const {
      page = '1',
      limit = '20',
      status,
      priority,
      assigned_device,
      date_from,
      date_to,
      search
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    // Построение WHERE условий
    const conditions: string[] = [];
    const params: any[] = [];

    if (status) {
      const statuses = status.split(',');
      const placeholders = statuses.map(() => '?').join(',');
      conditions.push(`status IN (${placeholders})`);
      params.push(...statuses);
    }

    if (priority) {
      const priorities = priority.split(',').map(p => parseInt(p));
      const placeholders = priorities.map(() => '?').join(',');
      conditions.push(`priority IN (${placeholders})`);
      params.push(...priorities);
    }

    if (assigned_device) {
      conditions.push('assigned_device = ?');
      params.push(parseInt(assigned_device));
    }

    if (date_from) {
      conditions.push('created_at >= ?');
      params.push(date_from);
    }

    if (date_to) {
      conditions.push('created_at <= ?');
      params.push(date_to);
    }

    if (search) {
      conditions.push('(number LIKE ? OR description LIKE ?)');
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
    }

    // Выполнение запроса с фильтрами
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (pageNum - 1) * limitNum;

    const { allSQL, getSQL } = await import('../../database/index');

    const tasks = await allSQL(
      `SELECT * FROM pick_tasks ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, limitNum, offset]
    );

    const totalResult = await getSQL(
      `SELECT COUNT(*) as count FROM pick_tasks ${whereClause}`,
      params
    );

    const total = totalResult.count;
    const totalPages = Math.ceil(total / limitNum);

    res.json({
      success: true,
      data: tasks,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasNext: pageNum < totalPages,
        hasPrev: pageNum > 1
      }
    });

  } catch (error: any) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка получения списка задач',
      message: error.message
    });
  }
});

// POST /api/tasks - создать новую задачу
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      number,
      description,
      status = 'pending',
      priority = 1,
      deadline,
      assigned_device,
      created_by = 'api',
      items = []
    } = req.body;

    // Валидация обязательных полей
    if (!number) {
      return res.status(400).json({
        success: false,
        error: 'Номер задачи обязателен'
      });
    }

    // Создание задачи
    const taskResult = await PickTaskAPI.create({
      number,
      description,
      status,
      priority,
      deadline,
      assigned_device,
      created_by
    });

    if (!taskResult.success) {
      return res.status(400).json(taskResult);
    }

    const taskId = taskResult.data?.id;

    // Добавление элементов задачи, если они есть
    if (items.length > 0 && taskId) {
      for (const item of items) {
        await PickItemAPI.create({
          task_id: taskId,
          part_number: item.part_number,
          part_name: item.part_name,
          quantity_required: item.quantity_required,
          quantity_picked: 0,
          location: item.location,
          status: 'pending'
        });
      }
    }

    // Получение полной задачи с элементами
    const fullTask = await PickTaskAPI.getWithItems(taskId!);

    res.status(201).json({
      success: true,
      data: fullTask,
      message: 'Задача успешно создана'
    });

  } catch (error: any) {
    console.error('Error creating task:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка создания задачи',
      message: error.message
    });
  }
});

// PUT /api/tasks/:id - обновить задачу
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const taskId = parseInt(req.params.id);
    const updates = req.body;

    // Проверка существования задачи
    const existingTask = await PickTaskAPI.getById(taskId);
    if (!existingTask) {
      return res.status(404).json({
        success: false,
        error: 'Задача не найдена'
      });
    }

    // Обновление задачи
    const result = await PickTaskAPI.update(taskId, updates);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json({
      success: true,
      data: result.data,
      message: 'Задача успешно обновлена'
    });

  } catch (error: any) {
    console.error('Error updating task:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка обновления задачи',
      message: error.message
    });
  }
});

// DELETE /api/tasks/:id - удалить задачу
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const taskId = parseInt(req.params.id);

    // Проверка существования задачи
    const existingTask = await PickTaskAPI.getById(taskId);
    if (!existingTask) {
      return res.status(404).json({
        success: false,
        error: 'Задача не найдена'
      });
    }

    // Проверка, можно ли удалить задачу (например, не удалять выполняющиеся)
    if (existingTask.status === 'in_progress') {
      return res.status(400).json({
        success: false,
        error: 'Нельзя удалить задачу в процессе выполнения'
      });
    }

    // Удаление задачи (элементы удалятся автоматически по CASCADE)
    const { runSQL } = await import('../../database/index');
    await runSQL('DELETE FROM pick_tasks WHERE id = ?', [taskId]);

    res.json({
      success: true,
      message: 'Задача успешно удалена'
    });

  } catch (error: any) {
    console.error('Error deleting task:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка удаления задачи',
      message: error.message
    });
  }
});

// POST /api/tasks/import - импорт задач из Excel/CSV
router.post('/import', upload.single('file'), async (req: MulterRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'Файл не загружен'
      });
    }

    const { buffer, originalname } = req.file;
    const isExcel = originalname.endsWith('.xlsx') || originalname.endsWith('.xls');
    const isCsv = originalname.endsWith('.csv');

    if (!isExcel && !isCsv) {
      return res.status(400).json({
        success: false,
        error: 'Поддерживаются только файлы Excel (.xlsx, .xls) и CSV (.csv)'
      });
    }

    let data: any[] = [];

    if (isExcel) {
      // Обработка Excel файла
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      data = XLSX.utils.sheet_to_json(worksheet);
    } else if (isCsv) {
      // Обработка CSV файла
      data = await new Promise((resolve, reject) => {
        const results: any[] = [];
        const stream = Readable.from(buffer);
        
        stream
          .pipe(csv.default())
          .on('data', (row: any) => results.push(row))
          .on('end', () => resolve(results))
          .on('error', reject);
      });
    }

    if (data.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Файл пуст или имеет неверный формат'
      });
    }

    // Валидация и создание задач
    const results = {
      created: 0,
      errors: [] as string[]
    };

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowNum = i + 1;

      try {
        // Валидация обязательных полей
        if (!row.number || !row.part_number || !row.part_name || !row.quantity_required || !row.location) {
          results.errors.push(`Строка ${rowNum}: отсутствуют обязательные поля`);
          continue;
        }

        // Поиск существующей задачи по номеру
        const { allSQL } = await import('../../database/index');
        const existingTasks = await allSQL('SELECT * FROM pick_tasks WHERE number = ?', [row.number]);
        
        let task: PickTask;
        
        if (existingTasks.length === 0) {
          // Создание новой задачи
          const priority = Math.min(Math.max(parseInt(row.priority) || 1, 1), 5) as 1 | 2 | 3 | 4 | 5;
          
          const taskResult = await PickTaskAPI.create({
            number: row.number,
            description: row.description || '',
            status: 'pending',
            priority: priority,
            deadline: row.deadline,
            created_by: 'import'
          });

          if (!taskResult.success) {
            results.errors.push(`Строка ${rowNum}: ошибка создания задачи - ${taskResult.error}`);
            continue;
          }

          task = taskResult.data!;
        } else {
          task = existingTasks[0];
        }

        // Создание элемента задачи
        await PickItemAPI.create({
          task_id: task.id,
          part_number: row.part_number,
          part_name: row.part_name,
          quantity_required: parseInt(row.quantity_required),
          quantity_picked: 0,
          location: row.location,
          status: 'pending'
        });

        results.created++;

      } catch (error: any) {
        results.errors.push(`Строка ${rowNum}: ${error.message}`);
      }
    }

    res.json({
      success: true,
      data: results,
      message: `Импорт завершен. Создано элементов: ${results.created}, ошибок: ${results.errors.length}`
    });

  } catch (error: any) {
    console.error('Error importing tasks:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка импорта задач',
      message: error.message
    });
  }
});

// POST /api/tasks/:id/send - отправить задачу на устройство
router.post('/:id/send', async (req: Request, res: Response) => {
  try {
    const taskId = parseInt(req.params.id);
    const { device_id } = req.body;

    if (!device_id) {
      return res.status(400).json({
        success: false,
        error: 'ID устройства обязателен'
      });
    }

    // Проверка существования задачи
    const task = await PickTaskAPI.getById(taskId);
    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Задача не найдена'
      });
    }

    // Проверка существования устройства
    const device = await DeviceAPI.getById(device_id);
    if (!device) {
      return res.status(404).json({
        success: false,
        error: 'Устройство не найдено'
      });
    }

    // Проверка статуса устройства
    if (device.status !== 'online') {
      return res.status(400).json({
        success: false,
        error: 'Устройство не в сети'
      });
    }

    // Проверка статуса задачи
    if (task.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: 'Задача уже назначена или выполнена'
      });
    }

    // Назначение задачи на устройство
    const result = await PickTaskAPI.assignToDevice(taskId, device_id);

    if (!result.success) {
      return res.status(400).json(result);
    }

    // В реальном приложении здесь была бы отправка уведомления на устройство
    // через WebSocket или другой механизм

    res.json({
      success: true,
      data: result.data,
      message: `Задача отправлена на устройство ${device.name}`
    });

  } catch (error: any) {
    console.error('Error sending task to device:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка отправки задачи на устройство',
      message: error.message
    });
  }
});

// GET /api/tasks/:id/progress - получить прогресс выполнения задачи
router.get('/:id/progress', async (req: Request, res: Response) => {
  try {
    const taskId = parseInt(req.params.id);

    // Получение задачи с элементами
    const taskWithItems = await PickTaskAPI.getWithItems(taskId);
    
    if (!taskWithItems) {
      return res.status(404).json({
        success: false,
        error: 'Задача не найдена'
      });
    }

    const { task, items } = taskWithItems;

    // Вычисление прогресса
    const totalItems = items.length;
    const pickedItems = items.filter(item => item.status === 'picked').length;
    const partialItems = items.filter(item => item.status === 'partial').length;
    const notFoundItems = items.filter(item => item.status === 'not_found').length;
    const pendingItems = items.filter(item => item.status === 'pending').length;

    const progressPercentage = totalItems > 0 ? Math.round((pickedItems / totalItems) * 100) : 0;

    // Вычисление общего количества
    const totalQuantityRequired = items.reduce((sum, item) => sum + item.quantity_required, 0);
    const totalQuantityPicked = items.reduce((sum, item) => sum + item.quantity_picked, 0);
    const quantityProgressPercentage = totalQuantityRequired > 0 
      ? Math.round((totalQuantityPicked / totalQuantityRequired) * 100) 
      : 0;

    // Статистика по времени
    const startTime = task.assigned_at ? new Date(task.assigned_at) : null;
    const currentTime = new Date();
    const timeElapsed = startTime ? Math.round((currentTime.getTime() - startTime.getTime()) / 1000 / 60) : 0; // в минутах

    // Estimated time remaining (простая оценка)
    const itemsPerMinute = timeElapsed > 0 ? pickedItems / timeElapsed : 0;
    const estimatedTimeRemaining = itemsPerMinute > 0 ? Math.round(pendingItems / itemsPerMinute) : null;

    const progress = {
      task_id: taskId,
      task_number: task.number,
      status: task.status,
      
      // Прогресс по позициям
      items_progress: {
        total: totalItems,
        picked: pickedItems,
        partial: partialItems,
        not_found: notFoundItems,
        pending: pendingItems,
        percentage: progressPercentage
      },

      // Прогресс по количеству
      quantity_progress: {
        total_required: totalQuantityRequired,
        total_picked: totalQuantityPicked,
        percentage: quantityProgressPercentage
      },

      // Временные метрики
      time_metrics: {
        started_at: task.assigned_at,
        time_elapsed_minutes: timeElapsed,
        estimated_time_remaining_minutes: estimatedTimeRemaining,
        deadline: task.deadline
      },

      // Детали по элементам
      items_details: items.map(item => ({
        id: item.id,
        part_number: item.part_number,
        part_name: item.part_name,
        location: item.location,
        quantity_required: item.quantity_required,
        quantity_picked: item.quantity_picked,
        status: item.status,
        picked_at: item.picked_at,
        progress_percentage: Math.round((item.quantity_picked / item.quantity_required) * 100)
      })),

      // Последняя активность
      last_updated: task.updated_at
    };

    res.json({
      success: true,
      data: progress
    });

  } catch (error: any) {
    console.error('Error getting task progress:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка получения прогресса задачи',
      message: error.message
    });
  }
});

// GET /api/tasks/:id - получить конкретную задачу с элементами
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const taskId = parseInt(req.params.id);

    const taskWithItems = await PickTaskAPI.getWithItems(taskId);
    
    if (!taskWithItems) {
      return res.status(404).json({
        success: false,
        error: 'Задача не найдена'
      });
    }

    res.json({
      success: true,
      data: taskWithItems
    });

  } catch (error: any) {
    console.error('Error getting task:', error);
    res.status(500).json({
      success: false,
      error: 'Ошибка получения задачи',
      message: error.message
    });
  }
});

export default router; 