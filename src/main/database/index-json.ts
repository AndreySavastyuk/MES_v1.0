import JSONStorage from './json-storage';

let jsonDb: JSONStorage | null = null;

export async function initDatabase(): Promise<void> {
  try {
    console.log('🔧 Инициализация JSON базы данных...');
    jsonDb = new JSONStorage();
    
    // Создаем тестовые данные если база пустая
    await initializeTestData();
    
    console.log('✅ JSON база данных инициализирована успешно');
  } catch (error) {
    console.error('❌ Ошибка инициализации JSON базы данных:', error);
    throw error;
  }
}

async function initializeTestData(): Promise<void> {
  if (!jsonDb) return;

  const stats = jsonDb.getStatistics();
  
  // Если база данных пустая, добавляем тестовые данные
  if (stats.totalTasks === 0) {
    console.log('📊 Создание тестовых данных...');
    
    // Добавляем тестовые задачи
    await jsonDb.insertTask({
      title: 'Приемка товара партия №123',
      description: 'Принять и разместить товар согласно накладной',
      status: 'completed',
      priority: 'high',
      assigned_to: 'device_001',
      completed_at: new Date().toISOString()
    });

    await jsonDb.insertTask({
      title: 'Инвентаризация склада А',
      description: 'Провести полную инвентаризацию склада А',
      status: 'in_progress',
      priority: 'medium',
      assigned_to: 'device_002'
    });

    await jsonDb.insertTask({
      title: 'Отгрузка заказа №456',
      description: 'Подготовить и отгрузить заказ клиента',
      status: 'pending',
      priority: 'high',
      assigned_to: null
    });

    // Добавляем тестовые товары
    await jsonDb.insertProduct({
      name: 'Товар тестовый А',
      sku: 'TEST-001',
      category: 'Тестовая категория',
      price: 100.50,
      quantity: 50,
      location: 'Склад А, стеллаж 1'
    });

    await jsonDb.insertProduct({
      name: 'Товар тестовый Б',
      sku: 'TEST-002',
      category: 'Тестовая категория',
      price: 75.25,
      quantity: 30,
      location: 'Склад А, стеллаж 2'
    });

    // Добавляем журнал операций
    await jsonDb.insertInventoryLog({
      product_id: '1',
      action: 'receipt',
      quantity_change: 50,
      previous_quantity: 0,
      new_quantity: 50,
      user_id: 'user_001',
      notes: 'Первоначальная приемка товара'
    });

    await jsonDb.insertInventoryLog({
      product_id: '2',
      action: 'receipt',
      quantity_change: 30,
      previous_quantity: 0,
      new_quantity: 30,
      user_id: 'user_001',
      notes: 'Первоначальная приемка товара'
    });

    console.log('✅ Тестовые данные созданы');
  }
}

// Эмулируем SQL функции

export async function runSQL(query: string, params: any[] = []): Promise<{ id?: string; changes: number }> {
  if (!jsonDb) {
    throw new Error('JSON база данных не инициализирована');
  }
  return await jsonDb.runSQL(query, params);
}

export async function getSQL(query: string, params: any[] = []): Promise<any> {
  if (!jsonDb) {
    throw new Error('JSON база данных не инициализирована');
  }
  return await jsonDb.getSQL(query, params);
}

export async function allSQL(query: string, params: any[] = []): Promise<any[]> {
  if (!jsonDb) {
    throw new Error('JSON база данных не инициализирована');
  }
  return await jsonDb.allSQL(query, params);
}

// Удобные методы для работы с данными

export async function getTasks(): Promise<any[]> {
  if (!jsonDb) return [];
  return await jsonDb.getTasks();
}

export async function getTaskById(id: string): Promise<any | undefined> {
  if (!jsonDb) return undefined;
  return await jsonDb.getTaskById(id);
}

export async function insertTask(taskData: any): Promise<string> {
  if (!jsonDb) {
    throw new Error('JSON база данных не инициализирована');
  }
  return await jsonDb.insertTask(taskData);
}

export async function updateTask(id: string, updates: any): Promise<boolean> {
  if (!jsonDb) return false;
  return await jsonDb.updateTask(id, updates);
}

export async function getProducts(): Promise<any[]> {
  if (!jsonDb) return [];
  return await jsonDb.getProducts();
}

export async function insertProduct(productData: any): Promise<string> {
  if (!jsonDb) {
    throw new Error('JSON база данных не инициализирована');
  }
  return await jsonDb.insertProduct(productData);
}

export async function getInventoryLog(): Promise<any[]> {
  if (!jsonDb) return [];
  return await jsonDb.getInventoryLog();
}

export async function insertInventoryLog(logData: any): Promise<string> {
  if (!jsonDb) {
    throw new Error('JSON база данных не инициализирована');
  }
  return await jsonDb.insertInventoryLog(logData);
}

export async function getScheduledReports(): Promise<any[]> {
  if (!jsonDb) return [];
  return await jsonDb.getScheduledReports();
}

export async function insertScheduledReport(reportData: any): Promise<string> {
  if (!jsonDb) {
    throw new Error('JSON база данных не инициализирована');
  }
  return await jsonDb.insertScheduledReport(reportData);
}

export async function updateScheduledReport(id: string, updates: any): Promise<boolean> {
  if (!jsonDb) return false;
  return await jsonDb.updateScheduledReport(id, updates);
}

export async function deleteScheduledReport(id: string): Promise<boolean> {
  if (!jsonDb) return false;
  return await jsonDb.deleteScheduledReport(id);
}

export async function getReportHistory(): Promise<any[]> {
  if (!jsonDb) return [];
  return await jsonDb.getReportHistory();
}

export async function insertReportHistory(historyData: any): Promise<string> {
  if (!jsonDb) {
    throw new Error('JSON база данных не инициализирована');
  }
  return await jsonDb.insertReportHistory(historyData);
}

// Получение статистики базы данных
export function getDatabaseStatistics(): any {
  if (!jsonDb) {
    return {
      totalTasks: 0,
      totalProducts: 0,
      totalInventoryLogs: 0,
      totalScheduledReports: 0,
      totalReportHistory: 0,
      status: 'не инициализирована'
    };
  }
  return jsonDb.getStatistics();
}

// Получение экземпляра базы данных (эмулируем sqlite3.Database)
export function getDatabase(): any {
  return jsonDb;
}

// Закрытие соединения с базой данных
export async function closeDatabase(): Promise<void> {
  if (jsonDb) {
    console.log('✅ JSON база данных закрыта');
    jsonDb = null;
  }
}

// Экспорт и импорт данных
export function exportDatabaseData(): any {
  if (!jsonDb) {
    throw new Error('JSON база данных не инициализирована');
  }
  return jsonDb.exportData();
}

export function importDatabaseData(data: any): void {
  if (!jsonDb) {
    throw new Error('JSON база данных не инициализирована');
  }
  jsonDb.importData(data);
}

// Очистка всех данных
export async function clearAllData(): Promise<void> {
  if (!jsonDb) {
    throw new Error('JSON база данных не инициализирована');
  }
  await jsonDb.clearAllData();
} 