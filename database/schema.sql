-- Warehouse Management System Database Schema
-- SQLite Database for Desktop Application

-- Enable foreign key constraints
PRAGMA foreign_keys = ON;

-- Migration tracking table
CREATE TABLE IF NOT EXISTS migrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    version TEXT UNIQUE NOT NULL,
    description TEXT NOT NULL,
    executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Devices table - планшеты и другие устройства
CREATE TABLE IF NOT EXISTS devices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    ip_address TEXT,
    last_sync DATETIME,
    status TEXT NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'syncing', 'error')),
    device_type TEXT DEFAULT 'tablet' CHECK (device_type IN ('tablet', 'scanner', 'desktop')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Pick tasks table - задачи на сборку заказов
CREATE TABLE IF NOT EXISTS pick_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    number TEXT NOT NULL UNIQUE, -- номер задачи (например, "PICK-2024-001")
    description TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled', 'on_hold')),
    priority INTEGER NOT NULL DEFAULT 1 CHECK (priority BETWEEN 1 AND 5), -- 1 = низкий, 5 = критический
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    deadline DATETIME,
    assigned_device INTEGER,
    assigned_at DATETIME,
    completed_at DATETIME,
    total_items INTEGER DEFAULT 0,
    picked_items INTEGER DEFAULT 0,
    notes TEXT,
    created_by TEXT DEFAULT 'system',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (assigned_device) REFERENCES devices(id) ON DELETE SET NULL
);

-- Pick items table - элементы задач сборки
CREATE TABLE IF NOT EXISTS pick_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL,
    part_number TEXT NOT NULL,
    part_name TEXT NOT NULL,
    quantity_required INTEGER NOT NULL CHECK (quantity_required > 0),
    quantity_picked INTEGER DEFAULT 0 CHECK (quantity_picked >= 0),
    location TEXT NOT NULL, -- код локации на складе
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'picked', 'partial', 'not_found')),
    picked_at DATETIME,
    picked_by_device INTEGER,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES pick_tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (picked_by_device) REFERENCES devices(id) ON DELETE SET NULL
);

-- Acceptance log table - журнал приемки товаров
CREATE TABLE IF NOT EXISTS acceptance_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    part_number TEXT NOT NULL,
    part_name TEXT NOT NULL,
    order_number TEXT, -- номер заказа поставщика
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    cell_code TEXT NOT NULL, -- код ячейки куда размещен товар
    device_id INTEGER,
    operator_name TEXT,
    supplier_name TEXT,
    batch_number TEXT,
    expiry_date DATE,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE SET NULL
);

-- Sync log table - журнал синхронизации данных
CREATE TABLE IF NOT EXISTS sync_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id INTEGER NOT NULL,
    sync_type TEXT NOT NULL CHECK (sync_type IN ('full', 'incremental', 'tasks', 'acceptance', 'status')),
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT NOT NULL CHECK (status IN ('started', 'completed', 'failed', 'partial')),
    data_count INTEGER DEFAULT 0,
    error_message TEXT,
    duration_ms INTEGER, -- время синхронизации в миллисекундах
    sync_direction TEXT DEFAULT 'bidirectional' CHECK (sync_direction IN ('upload', 'download', 'bidirectional')),
    data_size_bytes INTEGER DEFAULT 0,
    FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
);

-- Inventory locations table - локации склада
CREATE TABLE IF NOT EXISTS locations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE, -- код локации (например, "A1-B2-C3")
    name TEXT NOT NULL,
    zone TEXT, -- зона склада
    type TEXT DEFAULT 'storage' CHECK (type IN ('storage', 'picking', 'receiving', 'shipping', 'staging')),
    capacity INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
    coordinates_x REAL,
    coordinates_y REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Parts catalog table - каталог запчастей
CREATE TABLE IF NOT EXISTS parts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    part_number TEXT NOT NULL UNIQUE,
    part_name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    unit_of_measure TEXT DEFAULT 'pcs',
    weight_kg REAL DEFAULT 0,
    dimensions_length REAL DEFAULT 0,
    dimensions_width REAL DEFAULT 0,
    dimensions_height REAL DEFAULT 0,
    min_stock_level INTEGER DEFAULT 0,
    max_stock_level INTEGER DEFAULT 0,
    cost_per_unit REAL DEFAULT 0,
    barcode TEXT UNIQUE,
    supplier_part_number TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Inventory table - текущие остатки
CREATE TABLE IF NOT EXISTS inventory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    part_number TEXT NOT NULL,
    location_code TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    reserved_quantity INTEGER DEFAULT 0 CHECK (reserved_quantity >= 0),
    available_quantity INTEGER GENERATED ALWAYS AS (quantity - reserved_quantity) VIRTUAL,
    last_counted_at DATETIME,
    last_movement_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (part_number) REFERENCES parts(part_number) ON DELETE CASCADE,
    FOREIGN KEY (location_code) REFERENCES locations(code) ON DELETE CASCADE,
    UNIQUE(part_number, location_code)
);

-- Stock movements table - движения запасов
CREATE TABLE IF NOT EXISTS stock_movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    part_number TEXT NOT NULL,
    location_code TEXT NOT NULL,
    movement_type TEXT NOT NULL CHECK (movement_type IN ('receipt', 'pick', 'adjustment', 'transfer', 'return')),
    quantity_change INTEGER NOT NULL, -- может быть отрицательным для списания
    reference_id INTEGER, -- ID связанной записи (pick_task, acceptance_log, etc.)
    reference_type TEXT, -- тип связанной записи
    reason TEXT,
    operator_name TEXT,
    device_id INTEGER,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    batch_number TEXT,
    order_number TEXT,
    FOREIGN KEY (part_number) REFERENCES parts(part_number) ON DELETE CASCADE,
    FOREIGN KEY (location_code) REFERENCES locations(code) ON DELETE CASCADE,
    FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE SET NULL
);

-- Configuration table - настройки системы
CREATE TABLE IF NOT EXISTS configuration (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT NOT NULL UNIQUE,
    value TEXT,
    description TEXT,
    category TEXT DEFAULT 'general',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_pick_tasks_status ON pick_tasks(status);
CREATE INDEX IF NOT EXISTS idx_pick_tasks_assigned_device ON pick_tasks(assigned_device);
CREATE INDEX IF NOT EXISTS idx_pick_tasks_created_at ON pick_tasks(created_at);
CREATE INDEX IF NOT EXISTS idx_pick_tasks_deadline ON pick_tasks(deadline);

CREATE INDEX IF NOT EXISTS idx_pick_items_task_id ON pick_items(task_id);
CREATE INDEX IF NOT EXISTS idx_pick_items_part_number ON pick_items(part_number);
CREATE INDEX IF NOT EXISTS idx_pick_items_location ON pick_items(location);
CREATE INDEX IF NOT EXISTS idx_pick_items_status ON pick_items(status);

CREATE INDEX IF NOT EXISTS idx_acceptance_log_timestamp ON acceptance_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_acceptance_log_part_number ON acceptance_log(part_number);
CREATE INDEX IF NOT EXISTS idx_acceptance_log_device_id ON acceptance_log(device_id);

CREATE INDEX IF NOT EXISTS idx_sync_log_device_id ON sync_log(device_id);
CREATE INDEX IF NOT EXISTS idx_sync_log_timestamp ON sync_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_sync_log_status ON sync_log(status);

CREATE INDEX IF NOT EXISTS idx_inventory_part_number ON inventory(part_number);
CREATE INDEX IF NOT EXISTS idx_inventory_location_code ON inventory(location_code);
CREATE INDEX IF NOT EXISTS idx_inventory_quantity ON inventory(quantity);

CREATE INDEX IF NOT EXISTS idx_stock_movements_part_number ON stock_movements(part_number);
CREATE INDEX IF NOT EXISTS idx_stock_movements_location_code ON stock_movements(location_code);
CREATE INDEX IF NOT EXISTS idx_stock_movements_timestamp ON stock_movements(timestamp);
CREATE INDEX IF NOT EXISTS idx_stock_movements_reference ON stock_movements(reference_type, reference_id);

-- Triggers for automated updates
-- Update pick_tasks totals when pick_items change
CREATE TRIGGER IF NOT EXISTS update_pick_task_totals
AFTER INSERT ON pick_items
BEGIN
    UPDATE pick_tasks 
    SET total_items = (
        SELECT COUNT(*) FROM pick_items WHERE task_id = NEW.task_id
    ),
    picked_items = (
        SELECT COUNT(*) FROM pick_items WHERE task_id = NEW.task_id AND status = 'picked'
    ),
    updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.task_id;
END;

CREATE TRIGGER IF NOT EXISTS update_pick_task_totals_on_update
AFTER UPDATE ON pick_items
BEGIN
    UPDATE pick_tasks 
    SET picked_items = (
        SELECT COUNT(*) FROM pick_items WHERE task_id = NEW.task_id AND status = 'picked'
    ),
    updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.task_id;
END;

-- Update pick_task status when all items are picked
CREATE TRIGGER IF NOT EXISTS auto_complete_pick_task
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

-- Update inventory on stock movements
CREATE TRIGGER IF NOT EXISTS update_inventory_on_movement
AFTER INSERT ON stock_movements
BEGIN
    INSERT OR IGNORE INTO inventory (part_number, location_code, quantity, last_movement_at, updated_at)
    VALUES (NEW.part_number, NEW.location_code, 0, NEW.timestamp, CURRENT_TIMESTAMP);
    
    UPDATE inventory 
    SET quantity = quantity + NEW.quantity_change,
        last_movement_at = NEW.timestamp,
        updated_at = CURRENT_TIMESTAMP
    WHERE part_number = NEW.part_number AND location_code = NEW.location_code;
END;

-- Update timestamps automatically
CREATE TRIGGER IF NOT EXISTS update_devices_timestamp
AFTER UPDATE ON devices
BEGIN
    UPDATE devices SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_pick_tasks_timestamp
AFTER UPDATE ON pick_tasks
BEGIN
    UPDATE pick_tasks SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_pick_items_timestamp
AFTER UPDATE ON pick_items
BEGIN
    UPDATE pick_items SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_locations_timestamp
AFTER UPDATE ON locations
BEGIN
    UPDATE locations SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_parts_timestamp
AFTER UPDATE ON parts
BEGIN
    UPDATE parts SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_inventory_timestamp
AFTER UPDATE ON inventory
BEGIN
    UPDATE inventory SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS update_configuration_timestamp
AFTER UPDATE ON configuration
BEGIN
    UPDATE configuration SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END; 