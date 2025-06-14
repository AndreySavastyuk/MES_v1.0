# Схема базы данных системы управления складом

## Обзор

Система управления складом использует SQLite базу данных с следующими основными таблицами:

- `devices` - устройства (планшеты, сканеры)
- `pick_tasks` - задачи на сборку заказов
- `pick_items` - элементы задач сборки
- `acceptance_log` - журнал приемки товаров
- `sync_log` - журнал синхронизации

## Структура таблиц

### devices
Таблица устройств для работы на складе.

```sql
CREATE TABLE devices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,           -- Название устройства
    ip_address TEXT,                     -- IP адрес
    last_sync DATETIME,                  -- Время последней синхронизации
    status TEXT NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'syncing', 'error')),
    device_type TEXT DEFAULT 'tablet' CHECK (device_type IN ('tablet', 'scanner', 'desktop')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Статусы устройств:**
- `online` - устройство онлайн
- `offline` - устройство отключено
- `syncing` - идет синхронизация
- `error` - ошибка соединения

**Типы устройств:**
- `tablet` - планшет для сборки
- `scanner` - сканер штрих-кодов
- `desktop` - рабочая станция

### pick_tasks
Таблица задач на сборку заказов.

```sql
CREATE TABLE pick_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    number TEXT NOT NULL UNIQUE,         -- Номер задачи (PICK-2024-001)
    description TEXT,                    -- Описание задачи
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled', 'on_hold')),
    priority INTEGER NOT NULL DEFAULT 1 CHECK (priority BETWEEN 1 AND 5), -- Приоритет 1-5
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    deadline DATETIME,                   -- Срок выполнения
    assigned_device INTEGER,             -- Назначенное устройство
    assigned_at DATETIME,               -- Время назначения
    completed_at DATETIME,              -- Время завершения
    total_items INTEGER DEFAULT 0,      -- Общее количество позиций
    picked_items INTEGER DEFAULT 0,     -- Собрано позиций
    notes TEXT,                         -- Заметки
    created_by TEXT DEFAULT 'system',   -- Кто создал
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (assigned_device) REFERENCES devices(id) ON DELETE SET NULL
);
```

**Статусы задач:**
- `pending` - ожидает выполнения
- `in_progress` - в процессе
- `completed` - выполнено
- `cancelled` - отменено
- `on_hold` - приостановлено

**Приоритеты:**
- 1 - низкий
- 2 - обычный
- 3 - средний
- 4 - высокий
- 5 - критический

### pick_items
Таблица элементов задач сборки.

```sql
CREATE TABLE pick_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL,            -- ID задачи
    part_number TEXT NOT NULL,           -- Артикул товара
    part_name TEXT NOT NULL,             -- Название товара
    quantity_required INTEGER NOT NULL CHECK (quantity_required > 0), -- Требуемое количество
    quantity_picked INTEGER DEFAULT 0 CHECK (quantity_picked >= 0),   -- Собранное количество
    location TEXT NOT NULL,              -- Локация товара
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'picked', 'partial', 'not_found')),
    picked_at DATETIME,                  -- Время сборки
    picked_by_device INTEGER,            -- Устройство, которым собрано
    notes TEXT,                          -- Заметки
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES pick_tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (picked_by_device) REFERENCES devices(id) ON DELETE SET NULL
);
```

**Статусы элементов:**
- `pending` - ожидает сборки
- `picked` - собрано полностью
- `partial` - собрано частично
- `not_found` - не найдено

### acceptance_log
Журнал приемки товаров на склад.

```sql
CREATE TABLE acceptance_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP, -- Время приемки
    part_number TEXT NOT NULL,           -- Артикул
    part_name TEXT NOT NULL,             -- Название
    order_number TEXT,                   -- Номер заказа поставщика
    quantity INTEGER NOT NULL CHECK (quantity > 0), -- Количество
    cell_code TEXT NOT NULL,             -- Код ячейки размещения
    device_id INTEGER,                   -- Устройство приемки
    operator_name TEXT,                  -- Имя оператора
    supplier_name TEXT,                  -- Поставщик
    batch_number TEXT,                   -- Номер партии
    expiry_date DATE,                    -- Срок годности
    notes TEXT,                          -- Заметки
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE SET NULL
);
```

### sync_log
Журнал синхронизации данных между устройствами.

```sql
CREATE TABLE sync_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id INTEGER NOT NULL,          -- ID устройства
    sync_type TEXT NOT NULL CHECK (sync_type IN ('full', 'incremental', 'tasks', 'acceptance', 'status')),
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT NOT NULL CHECK (status IN ('started', 'completed', 'failed', 'partial')),
    data_count INTEGER DEFAULT 0,        -- Количество записей
    error_message TEXT,                  -- Сообщение об ошибке
    duration_ms INTEGER,                 -- Длительность в мс
    sync_direction TEXT DEFAULT 'bidirectional' CHECK (sync_direction IN ('upload', 'download', 'bidirectional')),
    data_size_bytes INTEGER DEFAULT 0,   -- Размер данных
    FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
);
```

**Типы синхронизации:**
- `full` - полная синхронизация
- `incremental` - инкрементальная
- `tasks` - только задачи
- `acceptance` - только приемка
- `status` - только статусы

**Направления синхронизации:**
- `upload` - загрузка на сервер
- `download` - скачивание с сервера
- `bidirectional` - в обе стороны

## Индексы

Созданы следующие индексы для оптимизации производительности:

```sql
-- Pick tasks
CREATE INDEX idx_pick_tasks_status ON pick_tasks(status);
CREATE INDEX idx_pick_tasks_assigned_device ON pick_tasks(assigned_device);
CREATE INDEX idx_pick_tasks_created_at ON pick_tasks(created_at);
CREATE INDEX idx_pick_tasks_deadline ON pick_tasks(deadline);

-- Pick items
CREATE INDEX idx_pick_items_task_id ON pick_items(task_id);
CREATE INDEX idx_pick_items_part_number ON pick_items(part_number);
CREATE INDEX idx_pick_items_location ON pick_items(location);
CREATE INDEX idx_pick_items_status ON pick_items(status);

-- Acceptance log
CREATE INDEX idx_acceptance_log_timestamp ON acceptance_log(timestamp);
CREATE INDEX idx_acceptance_log_part_number ON acceptance_log(part_number);
CREATE INDEX idx_acceptance_log_device_id ON acceptance_log(device_id);

-- Sync log
CREATE INDEX idx_sync_log_device_id ON sync_log(device_id);
CREATE INDEX idx_sync_log_timestamp ON sync_log(timestamp);
CREATE INDEX idx_sync_log_status ON sync_log(status);
```

## Триггеры

### Автоматическое обновление счетчиков задач

```sql
-- Обновление totals при добавлении элементов
CREATE TRIGGER update_pick_task_totals
AFTER INSERT ON pick_items
BEGIN
    UPDATE pick_tasks 
    SET total_items = (SELECT COUNT(*) FROM pick_items WHERE task_id = NEW.task_id),
        picked_items = (SELECT COUNT(*) FROM pick_items WHERE task_id = NEW.task_id AND status = 'picked'),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.task_id;
END;

-- Обновление totals при изменении статуса элементов
CREATE TRIGGER update_pick_task_totals_on_update
AFTER UPDATE ON pick_items
BEGIN
    UPDATE pick_tasks 
    SET picked_items = (SELECT COUNT(*) FROM pick_items WHERE task_id = NEW.task_id AND status = 'picked'),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.task_id;
END;

-- Автоматическое завершение задачи
CREATE TRIGGER auto_complete_pick_task
AFTER UPDATE ON pick_items
WHEN NEW.status = 'picked'
BEGIN
    UPDATE pick_tasks 
    SET status = CASE 
        WHEN (SELECT COUNT(*) FROM pick_items WHERE task_id = NEW.task_id AND status != 'picked') = 0 
        THEN 'completed'
        ELSE 'in_progress'
    END,
    completed_at = CASE 
        WHEN (SELECT COUNT(*) FROM pick_items WHERE task_id = NEW.task_id AND status != 'picked') = 0 
        THEN CURRENT_TIMESTAMP
        ELSE completed_at
    END,
    updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.task_id;
END;
```

### Автоматическое обновление timestamp

```sql
-- Обновление updated_at для всех основных таблиц
CREATE TRIGGER update_devices_timestamp
AFTER UPDATE ON devices
BEGIN
    UPDATE devices SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER update_pick_tasks_timestamp
AFTER UPDATE ON pick_tasks
BEGIN
    UPDATE pick_tasks SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER update_pick_items_timestamp
AFTER UPDATE ON pick_items
BEGIN
    UPDATE pick_items SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;
```

## Миграции

Система поддерживает миграции для обновления схемы базы данных:

### Таблица миграций
```sql
CREATE TABLE migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    version TEXT UNIQUE NOT NULL,
    description TEXT NOT NULL,
    executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Процесс миграции

1. При запуске приложения проверяется таблица `migrations`
2. Сравниваются доступные и выполненные миграции
3. Выполняются новые миграции в порядке версий
4. Записывается информация о выполненной миграции

## API методы

Созданы классы API для работы с данными:

- `DeviceAPI` - управление устройствами
- `PickTaskAPI` - управление задачами сборки
- `PickItemAPI` - управление элементами задач
- `AcceptanceLogAPI` - журнал приемки
- `SyncLogAPI` - журнал синхронизации
- `DashboardAPI` - статистика дашборда

### Примеры использования

```typescript
// Получить все устройства
const devices = await DeviceAPI.getAll();

// Создать новую задачу
const task = await PickTaskAPI.create({
    number: 'PICK-2024-001',
    description: 'Заказ для клиента',
    status: 'pending',
    priority: 3,
    deadline: '2024-12-31',
    created_by: 'admin'
});

// Обновить количество собранного товара
await PickItemAPI.updateQuantityPicked(itemId, 10, deviceId);

// Записать приемку
await AcceptanceLogAPI.create({
    timestamp: new Date().toISOString(),
    part_number: 'P001',
    part_name: 'Болт М8',
    quantity: 100,
    cell_code: 'A1-B2-C3',
    device_id: 1,
    operator_name: 'Иванов И.И.'
});
```

## Тестовые данные

Файл `database/seed-data.sql` содержит тестовые данные для разработки:

- 4 тестовых устройства
- 4 задачи сборки в разных статусах
- 10 элементов задач
- 5 записей приемки
- 5 записей синхронизации
- Справочные данные (категории, поставщики, локации)

## Производительность

### Рекомендации по оптимизации:

1. **Индексы**: все часто используемые поля проиндексированы
2. **Пагинация**: используйте LIMIT/OFFSET для больших выборок
3. **Фильтрация**: применяйте WHERE условия для уменьшения объема данных
4. **Группировка**: используйте GROUP BY для агрегации
5. **Регулярная очистка**: архивируйте старые данные sync_log

### Мониторинг:

```sql
-- Размер базы данных
SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size();

-- Статистика таблиц
SELECT name, COUNT(*) as rows FROM sqlite_master 
JOIN (SELECT name as table_name FROM sqlite_master WHERE type='table') 
ON name = table_name GROUP BY name;

-- Использование индексов
EXPLAIN QUERY PLAN SELECT * FROM pick_tasks WHERE status = 'pending';
```

## Файлы

- `database/schema.sql` - полная схема базы данных
- `database/seed-data.sql` - тестовые данные
- `database/migrations/001_initial_schema.sql` - начальная миграция
- `src/main/database/index.ts` - основные функции базы данных
- `src/main/database/warehouse-api.ts` - API методы
- `src/shared/types.ts` - TypeScript типы 