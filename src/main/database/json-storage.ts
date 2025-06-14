import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

interface DatabaseRecord {
  id: string;
  [key: string]: any;
}

interface DatabaseTable {
  records: DatabaseRecord[];
  nextId: number;
}

interface DatabaseSchema {
  [tableName: string]: DatabaseTable;
}

class JSONStorage {
  private dataPath: string;
  private dbFile: string;
  private schema: DatabaseSchema = {};

  constructor() {
    this.dataPath = path.join(app.getPath('userData'), 'warehouse-data');
    this.dbFile = path.join(this.dataPath, 'database.json');
    this.ensureDataDirectory();
    this.loadDatabase();
  }

  private ensureDataDirectory(): void {
    if (!fs.existsSync(this.dataPath)) {
      fs.mkdirSync(this.dataPath, { recursive: true });
      console.log(`📁 Создана директория для данных: ${this.dataPath}`);
    }
  }

  private loadDatabase(): void {
    try {
      if (fs.existsSync(this.dbFile)) {
        const data = fs.readFileSync(this.dbFile, 'utf8');
        this.schema = JSON.parse(data);
        console.log('✅ База данных JSON загружена успешно');
      } else {
        this.initializeSchema();
        console.log('✅ Создана новая база данных JSON');
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки базы данных JSON:', error);
      this.initializeSchema();
    }
  }

  private initializeSchema(): void {
    this.schema = {
      tasks: { records: [], nextId: 1 },
      products: { records: [], nextId: 1 },
      inventory_log: { records: [], nextId: 1 },
      sync_log: { records: [], nextId: 1 },
      scheduled_reports: { records: [], nextId: 1 },
      report_history: { records: [], nextId: 1 }
    };
    this.saveDatabase();
  }

  private saveDatabase(): void {
    try {
      const data = JSON.stringify(this.schema, null, 2);
      fs.writeFileSync(this.dbFile, data, 'utf8');
    } catch (error) {
      console.error('❌ Ошибка сохранения базы данных JSON:', error);
      throw error;
    }
  }

  private generateId(tableName: string): string {
    if (!this.schema[tableName]) {
      this.schema[tableName] = { records: [], nextId: 1 };
    }
    const id = this.schema[tableName].nextId++;
    this.saveDatabase();
    return id.toString();
  }

  // Эмулируем SQL операции

  async runSQL(query: string, params: any[] = []): Promise<{ id?: string; changes: number }> {
    const normalizedQuery = query.toLowerCase().trim();
    
    if (normalizedQuery.startsWith('insert into')) {
      return this.handleInsert(query, params);
    } else if (normalizedQuery.startsWith('update')) {
      return this.handleUpdate(query, params);
    } else if (normalizedQuery.startsWith('delete from')) {
      return this.handleDelete(query, params);
    } else {
      throw new Error(`Неподдерживаемый тип запроса: ${query}`);
    }
  }

  async getSQL(query: string, params: any[] = []): Promise<any> {
    const result = await this.allSQL(query, params);
    return result.length > 0 ? result[0] : undefined;
  }

  async allSQL(query: string, params: any[] = []): Promise<any[]> {
    const normalizedQuery = query.toLowerCase().trim();
    
    if (normalizedQuery.startsWith('select')) {
      return this.handleSelect(query, params);
    } else {
      throw new Error(`Неподдерживаемый тип запроса для выборки: ${query}`);
    }
  }

  private handleInsert(query: string, params: any[]): { id: string; changes: number } {
    // Простая обработка INSERT запросов
    const tableMatch = query.match(/insert into (\w+)/i);
    if (!tableMatch) {
      throw new Error('Не удалось определить таблицу для INSERT');
    }

    const tableName = tableMatch[1];
    const id = this.generateId(tableName);
    
    // Парсим поля и значения (упрощенная версия)
    const valuesMatch = query.match(/values\s*\((.*)\)/i);
    if (!valuesMatch) {
      throw new Error('Не удалось найти VALUES в INSERT запросе');
    }

    const fieldsMatch = query.match(/\((.*?)\)\s*values/i);
    if (!fieldsMatch) {
      throw new Error('Не удалось найти поля в INSERT запросе');
    }

    const fields = fieldsMatch[1].split(',').map(f => f.trim());
    const record: DatabaseRecord = { id };

    // Простое сопоставление параметров с полями
    fields.forEach((field, index) => {
      if (index < params.length) {
        record[field] = params[index];
      }
    });

    // Добавляем временные метки
    record.created_at = new Date().toISOString();
    record.updated_at = new Date().toISOString();

    this.schema[tableName].records.push(record);
    this.saveDatabase();

    return { id, changes: 1 };
  }

  private handleUpdate(query: string, params: any[]): { changes: number } {
    // Упрощенная обработка UPDATE
    const tableMatch = query.match(/update (\w+)/i);
    if (!tableMatch) {
      throw new Error('Не удалось определить таблицу для UPDATE');
    }

    const tableName = tableMatch[1];
    let changes = 0;

    // Простая логика: обновляем все записи (для демонстрации)
    this.schema[tableName].records.forEach(record => {
      record.updated_at = new Date().toISOString();
      changes++;
    });

    this.saveDatabase();
    return { changes };
  }

  private handleDelete(query: string, params: any[]): { changes: number } {
    // Упрощенная обработка DELETE
    const tableMatch = query.match(/delete from (\w+)/i);
    if (!tableMatch) {
      throw new Error('Не удалось определить таблицу для DELETE');
    }

    const tableName = tableMatch[1];
    const initialLength = this.schema[tableName].records.length;
    
    // Простая логика: удаляем записи по условию (упрощенно)
    this.schema[tableName].records = this.schema[tableName].records.filter(record => {
      // Здесь должна быть логика фильтрации по WHERE условию
      // Пока просто оставляем все записи
      return true;
    });

    const changes = initialLength - this.schema[tableName].records.length;
    this.saveDatabase();
    return { changes };
  }

  private handleSelect(query: string, params: any[]): any[] {
    // Упрощенная обработка SELECT
    const tableMatch = query.match(/from (\w+)/i);
    if (!tableMatch) {
      throw new Error('Не удалось определить таблицу для SELECT');
    }

    const tableName = tableMatch[1];
    
    if (!this.schema[tableName]) {
      return [];
    }

    // Возвращаем все записи (упрощенная версия)
    return this.schema[tableName].records.map(record => ({ ...record }));
  }

  // Добавляем удобные методы для работы с данными

  async insertTask(taskData: any): Promise<string> {
    const id = this.generateId('tasks');
    const task = {
      id,
      ...taskData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    this.schema.tasks.records.push(task);
    this.saveDatabase();
    return id;
  }

  async getTasks(): Promise<any[]> {
    return this.schema.tasks?.records || [];
  }

  async getTaskById(id: string): Promise<any | undefined> {
    return this.schema.tasks?.records.find(task => task.id === id);
  }

  async updateTask(id: string, updates: any): Promise<boolean> {
    const taskIndex = this.schema.tasks.records.findIndex(task => task.id === id);
    if (taskIndex === -1) {
      return false;
    }

    this.schema.tasks.records[taskIndex] = {
      ...this.schema.tasks.records[taskIndex],
      ...updates,
      updated_at: new Date().toISOString()
    };

    this.saveDatabase();
    return true;
  }

  async insertProduct(productData: any): Promise<string> {
    const id = this.generateId('products');
    const product = {
      id,
      ...productData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    this.schema.products.records.push(product);
    this.saveDatabase();
    return id;
  }

  async getProducts(): Promise<any[]> {
    return this.schema.products?.records || [];
  }

  async insertInventoryLog(logData: any): Promise<string> {
    const id = this.generateId('inventory_log');
    const log = {
      id,
      ...logData,
      created_at: new Date().toISOString()
    };

    this.schema.inventory_log.records.push(log);
    this.saveDatabase();
    return id;
  }

  async getInventoryLog(): Promise<any[]> {
    return this.schema.inventory_log?.records || [];
  }

  // Методы для scheduled_reports
  async insertScheduledReport(reportData: any): Promise<string> {
    const id = this.generateId('scheduled_reports');
    const report = {
      id,
      ...reportData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    this.schema.scheduled_reports.records.push(report);
    this.saveDatabase();
    return id;
  }

  async getScheduledReports(): Promise<any[]> {
    return this.schema.scheduled_reports?.records || [];
  }

  async updateScheduledReport(id: string, updates: any): Promise<boolean> {
    const reportIndex = this.schema.scheduled_reports.records.findIndex(report => report.id === id);
    if (reportIndex === -1) {
      return false;
    }

    this.schema.scheduled_reports.records[reportIndex] = {
      ...this.schema.scheduled_reports.records[reportIndex],
      ...updates,
      updated_at: new Date().toISOString()
    };

    this.saveDatabase();
    return true;
  }

  async deleteScheduledReport(id: string): Promise<boolean> {
    const initialLength = this.schema.scheduled_reports.records.length;
    this.schema.scheduled_reports.records = this.schema.scheduled_reports.records.filter(
      report => report.id !== id
    );

    const deleted = this.schema.scheduled_reports.records.length < initialLength;
    if (deleted) {
      this.saveDatabase();
    }
    return deleted;
  }

  // Методы для report_history
  async insertReportHistory(historyData: any): Promise<string> {
    const id = this.generateId('report_history');
    const history = {
      id,
      ...historyData,
      created_at: new Date().toISOString()
    };

    this.schema.report_history.records.push(history);
    this.saveDatabase();
    return id;
  }

  async getReportHistory(): Promise<any[]> {
    return this.schema.report_history?.records || [];
  }

  // Получение статистики
  getStatistics(): any {
    return {
      totalTasks: this.schema.tasks?.records.length || 0,
      totalProducts: this.schema.products?.records.length || 0,
      totalInventoryLogs: this.schema.inventory_log?.records.length || 0,
      totalScheduledReports: this.schema.scheduled_reports?.records.length || 0,
      totalReportHistory: this.schema.report_history?.records.length || 0,
      databaseFile: this.dbFile,
      lastModified: fs.existsSync(this.dbFile) ? fs.statSync(this.dbFile).mtime : null
    };
  }

  // Очистка данных
  async clearAllData(): Promise<void> {
    this.initializeSchema();
    console.log('🗑️ Все данные очищены');
  }

  // Экспорт данных
  exportData(): any {
    return {
      schema: this.schema,
      exportedAt: new Date().toISOString(),
      version: '1.0.0'
    };
  }

  // Импорт данных
  importData(data: any): void {
    try {
      if (data.schema) {
        this.schema = data.schema;
        this.saveDatabase();
        console.log('✅ Данные импортированы успешно');
      } else {
        throw new Error('Неверный формат данных для импорта');
      }
    } catch (error) {
      console.error('❌ Ошибка импорта данных:', error);
      throw error;
    }
  }
}

export default JSONStorage; 