import { Router } from 'express';

const router = Router();

// Простые заглушки для API отчетов
router.get('/api/reports/test', (req, res) => {
  res.json({ 
    message: 'Reports API работает', 
    timestamp: new Date().toISOString(),
    status: 'ok'
  });
});

router.get('/api/reports/status', (req, res) => {
  res.json({
    exportService: 'available',
    scheduler: 'available', 
    emailService: 'available',
    database: 'json-storage'
  });
});

// Заглушка для мгновенной генерации отчетов
router.post('/api/reports/generate', (req, res) => {
  console.log('📊 Запрос на генерацию отчета:', req.body);
  
  // Имитируем генерацию отчета
  setTimeout(() => {
    res.json({
      success: true,
      message: 'Отчет сгенерирован (демо-режим)',
      filePath: '/demo/report.xlsx',
      generatedAt: new Date().toISOString()
    });
  }, 1000);
});

// Заглушка для скачивания файлов
router.get('/api/reports/download/:filename', (req, res) => {
  const filename = req.params.filename;
  console.log('📥 Запрос на скачивание файла:', filename);
  
  res.json({
    error: 'Скачивание файлов пока не реализовано (демо-режим)',
    filename,
    message: 'Эта функция будет доступна после полной настройки системы экспорта'
  });
});

// Заглушка для запланированных отчетов
router.get('/api/reports/scheduled', (req, res) => {
  res.json({
    reports: [
      {
        id: '1',
        name: 'Ежедневный отчет задач',
        schedule: '0 9 * * *',
        active: true,
        lastRun: new Date().toISOString()
      }
    ],
    total: 1
  });
});

router.post('/api/reports/scheduled', (req, res) => {
  console.log('📅 Создание запланированного отчета:', req.body);
  res.json({
    success: true,
    id: Date.now().toString(),
    message: 'Запланированный отчет создан (демо-режим)'
  });
});

// Заглушка для истории
router.get('/api/reports/history', (req, res) => {
  res.json({
    history: [
      {
        id: '1',
        reportName: 'Тестовый отчет',
        status: 'success',
        generatedAt: new Date().toISOString(),
        filePath: '/demo/test-report.xlsx'
      }
    ],
    total: 1
  });
});

export default router; 