import * as sqlite3 from 'sqlite3';
import * as path from 'path';
import { app } from 'electron';

let db: sqlite3.Database | null = null;

export async function initDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    const dbPath = path.join(app.getPath('userData'), 'warehouse.db');
    
    db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Ошибка подключения к базе данных:', err);
        reject(err);
        return;
      }
      
      console.log('Подключение к базе данных установлено');
      initTables().then(resolve).catch(reject);
    });
  });
}

async function initTables(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('База данных не инициализирована'));
      return;
    }

    // Создание основных таблиц
    const createTables = `
      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'pending',
        priority TEXT DEFAULT 'medium',
        assigned_to TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME
      );

      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        sku TEXT UNIQUE,
        category TEXT,
        price DECIMAL(10,2),
        quantity INTEGER DEFAULT 0,
        location TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS inventory_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER,
        action TEXT NOT NULL,
        quantity_change INTEGER,
        previous_quantity INTEGER,
        new_quantity INTEGER,
        user_id TEXT,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id)
      );

      CREATE TABLE IF NOT EXISTS sync_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        device_id TEXT NOT NULL,
        table_name TEXT NOT NULL,
        operation TEXT NOT NULL,
        record_id INTEGER,
        data TEXT,
        synced INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS scheduled_reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        report_type TEXT NOT NULL,
        schedule_expression TEXT NOT NULL,
        parameters TEXT,
        email_recipients TEXT,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS report_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        scheduled_report_id INTEGER,
        execution_time DATETIME,
        status TEXT NOT NULL,
        file_path TEXT,
        error_message TEXT,
        execution_duration INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (scheduled_report_id) REFERENCES scheduled_reports(id)
      );
    `;

    db.exec(createTables, (err) => {
      if (err) {
        console.error('Ошибка создания таблиц:', err);
        reject(err);
        return;
      }
      
      console.log('Таблицы базы данных созданы успешно');
      resolve();
    });
  });
}

// Функция для выполнения SQL запросов (INSERT, UPDATE, DELETE)
export async function runSQL(query: string, params: any[] = []): Promise<sqlite3.RunResult> {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('База данных не инициализирована'));
      return;
    }

    db.run(query, params, function(err: Error | null) {
      if (err) {
        console.error('Ошибка выполнения SQL запроса:', err, { query, params });
        reject(err);
        return;
      }
      resolve(this);
    });
  });
}

// Функция для получения одной записи (SELECT)
export async function getSQL(query: string, params: any[] = []): Promise<any> {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('База данных не инициализирована'));
      return;
    }

    db.get(query, params, (err: Error | null, row: any) => {
      if (err) {
        console.error('Ошибка выполнения SQL запроса:', err, { query, params });
        reject(err);
        return;
      }
      resolve(row);
    });
  });
}

// Функция для получения всех записей (SELECT)
export async function allSQL(query: string, params: any[] = []): Promise<any[]> {
  return new Promise((resolve, reject) => {
    if (!db) {
      reject(new Error('База данных не инициализирована'));
      return;
    }

    db.all(query, params, (err: Error | null, rows: any[]) => {
      if (err) {
        console.error('Ошибка выполнения SQL запроса:', err, { query, params });
        reject(err);
        return;
      }
      resolve(rows || []);
    });
  });
}

// Получение экземпляра базы данных
export function getDatabase(): sqlite3.Database | null {
  return db;
}

// Закрытие соединения с базой данных
export async function closeDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!db) {
      resolve();
      return;
    }

    db.close((err) => {
      if (err) {
        console.error('Ошибка закрытия базы данных:', err);
        reject(err);
        return;
      }
      
      console.log('Соединение с базой данных закрыто');
      db = null;
      resolve();
    });
  });
} 