import { Router } from 'express';
import * as path from 'path';
import * as fs from 'fs';
import ExportService from '../services/export-service';
import ReportScheduler from '../services/report-scheduler';
import EmailService from '../services/email-service';

const router = Router();

// Инициализация сервисов
const exportService = new ExportService();

// Конфигурация email (в реальном приложении загружается из настроек)
const emailConfig = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || ''
  },
  fromEmail: process.env.FROM_EMAIL || 'noreply@warehouse.local',
  fromName: process.env.FROM_NAME || 'Складская система'
};

const emailService = new EmailService(emailConfig);
const reportScheduler = new ReportScheduler(exportService, emailService);

// Мгновенная генерация отчета
router.post('/generate', async (req, res) => {
  try {
    const { reportType, format, includeCharts, dateRange, filters } = req.body;

    // Получение данных для отчета
    const data = await fetchReportData(reportType, dateRange, filters);
    
    const options = {
      format,
      includeCharts,
      dateRange,
      filters
    };

    let filePaths: string[] = [];

    // Генерация отчета в зависимости от типа
    switch (reportType) {
      case 'acceptance_log':
        if (format === 'both') {
          const excelPath = await exportService.exportAcceptanceLogToExcel(data.acceptanceLog, { ...options, format: 'excel' });
          filePaths.push(excelPath);
        } else {
          const filePath = await exportService.exportAcceptanceLogToExcel(data.acceptanceLog, options);
          filePaths.push(filePath);
        }
        break;

      case 'tasks_summary':
        if (format === 'both') {
          const pdfPath = await exportService.generateTasksPDFReport(data.tasks, data.statistics, { ...options, format: 'pdf' });
          const excelPath = await exportService.generateSummaryReport(data, { ...options, format: 'excel' });
          filePaths.push(pdfPath, excelPath);
        } else if (format === 'pdf') {
          const filePath = await exportService.generateTasksPDFReport(data.tasks, data.statistics, options);
          filePaths.push(filePath);
        } else {
          const filePath = await exportService.generateSummaryReport(data, options);
          filePaths.push(filePath);
        }
        break;

      case 'full_report':
        if (format === 'both') {
          const excelPath = await exportService.generateSummaryReport(data, { ...options, format: 'excel' });
          const pdfPath = await exportService.generateSummaryReport(data, { ...options, format: 'pdf' });
          filePaths.push(excelPath, pdfPath);
        } else {
          const filePath = await exportService.generateSummaryReport(data, options);
          filePaths.push(filePath);
        }
        break;

      default:
        return res.status(400).json({ error: 'Неизвестный тип отчета' });
    }

    res.json({
      success: true,
      filePaths,
      message: 'Отчет успешно сгенерирован'
    });

  } catch (error) {
    console.error('Ошибка генерации отчета:', error);
    res.status(500).json({
      error: 'Ошибка генерации отчета',
      details: error instanceof Error ? error.message : 'Неизвестная ошибка'
    });
  }
});

// Скачивание файла отчета
router.get('/download', (req, res) => {
  try {
    const filePath = req.query.path as string;
    
    if (!filePath) {
      return res.status(400).json({ error: 'Путь к файлу не указан' });
    }

    // Проверка безопасности - файл должен быть в папке exports
    const exportsDir = path.join(process.cwd(), 'exports');
    const resolvedPath = path.resolve(filePath);
    
    if (!resolvedPath.startsWith(exportsDir)) {
      return res.status(403).json({ error: 'Доступ к файлу запрещен' });
    }

    if (!fs.existsSync(resolvedPath)) {
      return res.status(404).json({ error: 'Файл не найден' });
    }

    // Определение Content-Type
    const extension = path.extname(resolvedPath).toLowerCase();
    let contentType = 'application/octet-stream';
    
    if (extension === '.xlsx') {
      contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    } else if (extension === '.pdf') {
      contentType = 'application/pdf';
    }

    const filename = path.basename(resolvedPath);
    
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    const fileStream = fs.createReadStream(resolvedPath);
    fileStream.pipe(res);

  } catch (error) {
    console.error('Ошибка скачивания файла:', error);
    res.status(500).json({ error: 'Ошибка скачивания файла' });
  }
});

// Получение списка запланированных отчетов
router.get('/scheduled', (req, res) => {
  try {
    const reports = reportScheduler.getScheduledReports();
    res.json(reports);
  } catch (error) {
    console.error('Ошибка получения запланированных отчетов:', error);
    res.status(500).json({ error: 'Ошибка получения данных' });
  }
});

// Создание запланированного отчета
router.post('/schedule', async (req, res) => {
  try {
    const reportConfig = req.body;
    
    // Валидация обязательных полей
    if (!reportConfig.name || !reportConfig.cronExpression || !reportConfig.reportType) {
      return res.status(400).json({ error: 'Не все обязательные поля заполнены' });
    }

    const reportId = await reportScheduler.createScheduledReport(reportConfig);
    
    res.json({
      success: true,
      reportId,
      message: 'Запланированный отчет создан успешно'
    });

  } catch (error) {
    console.error('Ошибка создания запланированного отчета:', error);
    res.status(500).json({
      error: 'Ошибка создания отчета',
      details: error instanceof Error ? error.message : 'Неизвестная ошибка'
    });
  }
});

// Обновление запланированного отчета
router.patch('/schedule/:reportId', async (req, res) => {
  try {
    const { reportId } = req.params;
    const updates = req.body;

    await reportScheduler.updateScheduledReport(reportId, updates);
    
    res.json({
      success: true,
      message: 'Отчет обновлен успешно'
    });

  } catch (error) {
    console.error('Ошибка обновления отчета:', error);
    res.status(500).json({
      error: 'Ошибка обновления отчета',
      details: error instanceof Error ? error.message : 'Неизвестная ошибка'
    });
  }
});

// Удаление запланированного отчета
router.delete('/schedule/:reportId', async (req, res) => {
  try {
    const { reportId } = req.params;

    await reportScheduler.deleteScheduledReport(reportId);
    
    res.json({
      success: true,
      message: 'Отчет удален успешно'
    });

  } catch (error) {
    console.error('Ошибка удаления отчета:', error);
    res.status(500).json({
      error: 'Ошибка удаления отчета',
      details: error instanceof Error ? error.message : 'Неизвестная ошибка'
    });
  }
});

// Ручная генерация запланированного отчета
router.post('/schedule/:reportId/generate', async (req, res) => {
  try {
    const { reportId } = req.params;

    const generation = await reportScheduler.generateReportNow(reportId);
    
    res.json({
      success: true,
      generation,
      message: 'Отчет сгенерирован успешно'
    });

  } catch (error) {
    console.error('Ошибка генерации отчета:', error);
    res.status(500).json({
      error: 'Ошибка генерации отчета',
      details: error instanceof Error ? error.message : 'Неизвестная ошибка'
    });
  }
});

// Получение истории генерации отчетов
router.get('/history', (req, res) => {
  try {
    const { reportId } = req.query;
    const history = reportScheduler.getGenerationHistory(reportId as string);
    res.json(history);
  } catch (error) {
    console.error('Ошибка получения истории:', error);
    res.status(500).json({ error: 'Ошибка получения данных' });
  }
});

// Получение статистики планировщика
router.get('/statistics', (req, res) => {
  try {
    const stats = reportScheduler.getSchedulerStatistics();
    res.json(stats);
  } catch (error) {
    console.error('Ошибка получения статистики:', error);
    res.status(500).json({ error: 'Ошибка получения данных' });
  }
});

// Получение конфигурации email (без паролей)
router.get('/email-config', (req, res) => {
  try {
    const config = emailService.getConfig();
    res.json(config);
  } catch (error) {
    console.error('Ошибка получения конфигурации email:', error);
    res.status(500).json({ error: 'Ошибка получения данных' });
  }
});

// Тестовая отправка email
router.post('/test-email', async (req, res) => {
  try {
    const { recipient } = req.body;
    
    if (!recipient) {
      return res.status(400).json({ error: 'Email получателя не указан' });
    }

    await emailService.sendTestEmail(recipient);
    
    res.json({
      success: true,
      message: 'Тестовое письмо отправлено успешно'
    });

  } catch (error) {
    console.error('Ошибка отправки тестового письма:', error);
    res.status(500).json({
      error: 'Ошибка отправки письма',
      details: error instanceof Error ? error.message : 'Неизвестная ошибка'
    });
  }
});

// Получение списка экспортированных файлов
router.get('/files', (req, res) => {
  try {
    const files = exportService.getExportedFiles();
    const filesInfo = files.map(filePath => {
      const stats = fs.statSync(filePath);
      return {
        path: filePath,
        name: path.basename(filePath),
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime
      };
    });
    
    res.json(filesInfo);
  } catch (error) {
    console.error('Ошибка получения списка файлов:', error);
    res.status(500).json({ error: 'Ошибка получения данных' });
  }
});

// Очистка старых файлов
router.post('/cleanup', (req, res) => {
  try {
    const { daysOld = 7 } = req.body;
    const deletedCount = exportService.cleanupOldFiles(daysOld);
    
    res.json({
      success: true,
      deletedCount,
      message: `Удалено ${deletedCount} файлов старше ${daysOld} дней`
    });
  } catch (error) {
    console.error('Ошибка очистки файлов:', error);
    res.status(500).json({ error: 'Ошибка очистки файлов' });
  }
});

// Массовая отправка отчета по email
router.post('/send-email', async (req, res) => {
  try {
    const { recipients, reportName, description, filePaths, statistics } = req.body;
    
    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ error: 'Список получателей не указан' });
    }

    if (!filePaths || !Array.isArray(filePaths) || filePaths.length === 0) {
      return res.status(400).json({ error: 'Файлы для отправки не указаны' });
    }

    const result = await emailService.sendReportToMultipleRecipients(
      recipients,
      reportName || 'Отчет складской системы',
      description || '',
      filePaths,
      statistics
    );
    
    res.json({
      success: true,
      result,
      message: `Отчет отправлен ${result.successful.length} получателям. Ошибки: ${result.failed.length}`
    });

  } catch (error) {
    console.error('Ошибка отправки отчета:', error);
    res.status(500).json({
      error: 'Ошибка отправки отчета',
      details: error instanceof Error ? error.message : 'Неизвестная ошибка'
    });
  }
});

// Функция для получения данных отчета (моковые данные)
async function fetchReportData(reportType: string, dateRange?: any, filters?: any): Promise<any> {
  // В реальном приложении здесь будут запросы к базе данных
  
  const mockTasks = [
    {
      id: 'task1',
      title: 'Приемка товара партия №123',
      status: 'completed',
      priority: 'high',
      assignedDevice: 'Tablet-001',
      assignedUser: 'Иванов И.И.',
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      itemsTotal: 50,
      itemsProcessed: 50,
      estimatedTime: 120,
      actualTime: 115
    },
    {
      id: 'task2',
      title: 'Инвентаризация склада А',
      status: 'in_progress',
      priority: 'medium',
      assignedDevice: 'Scanner-002',
      assignedUser: 'Петров П.П.',
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      itemsTotal: 200,
      itemsProcessed: 120,
      estimatedTime: 300,
      actualTime: null
    }
  ];

  const mockStatistics = {
    totalTasks: 10,
    completedTasks: 8,
    totalItems: 500,
    averageTime: 90,
    efficiency: 80,
    deviceStats: {
      'Tablet-001': { tasksCompleted: 5, efficiency: 85 },
      'Scanner-002': { tasksCompleted: 3, efficiency: 75 }
    },
    hourlyStats: [
      { hour: '09:00', completed: 2 },
      { hour: '10:00', completed: 3 },
      { hour: '11:00', completed: 1 }
    ]
  };

  const mockAcceptanceLog = [
    {
      id: 'log1',
      timestamp: new Date().toISOString(),
      taskId: 'task1',
      taskTitle: 'Приемка товара',
      deviceName: 'Tablet-001',
      userName: 'Иванов И.И.',
      itemsProcessed: 50,
      itemsTotal: 50,
      duration: 115,
      status: 'completed' as const
    },
    {
      id: 'log2',
      timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      taskId: 'task2',
      taskTitle: 'Инвентаризация',
      deviceName: 'Scanner-002',
      userName: 'Петров П.П.',
      itemsProcessed: 120,
      itemsTotal: 200,
      duration: 180,
      status: 'in_progress' as const
    }
  ];

  // Применение фильтров по дате, если указаны
  let filteredTasks = mockTasks;
  let filteredLog = mockAcceptanceLog;
  
  if (dateRange?.from && dateRange?.to) {
    const fromDate = new Date(dateRange.from);
    const toDate = new Date(dateRange.to);
    toDate.setHours(23, 59, 59, 999); // Включаем весь день "до"
    
    filteredTasks = mockTasks.filter(task => {
      const taskDate = new Date(task.createdAt);
      return taskDate >= fromDate && taskDate <= toDate;
    });
    
    filteredLog = mockAcceptanceLog.filter(log => {
      const logDate = new Date(log.timestamp);
      return logDate >= fromDate && logDate <= toDate;
    });
  }

  return {
    tasks: filteredTasks,
    statistics: {
      ...mockStatistics,
      totalTasks: filteredTasks.length,
      completedTasks: filteredTasks.filter(t => t.status === 'completed').length
    },
    acceptanceLog: filteredLog
  };
}

export default router;