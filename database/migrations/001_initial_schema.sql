-- Migration: 001_initial_schema
-- Description: Initial database schema for warehouse management system
-- Date: 2024-06-08

-- Enable foreign key constraints
PRAGMA foreign_keys = ON;

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
    number TEXT NOT NULL UNIQUE,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled', 'on_hold')),
    priority INTEGER NOT NULL DEFAULT 1 CHECK (priority BETWEEN 1 AND 5),
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
    location TEXT NOT NULL,
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
    order_number TEXT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    cell_code TEXT NOT NULL,
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
    duration_ms INTEGER,
    sync_direction TEXT DEFAULT 'bidirectional' CHECK (sync_direction IN ('upload', 'download', 'bidirectional')),
    data_size_bytes INTEGER DEFAULT 0,
    FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
);

-- Basic indexes
CREATE INDEX IF NOT EXISTS idx_pick_tasks_status ON pick_tasks(status);
CREATE INDEX IF NOT EXISTS idx_pick_tasks_assigned_device ON pick_tasks(assigned_device);
CREATE INDEX IF NOT EXISTS idx_pick_tasks_created_at ON pick_tasks(created_at);

CREATE INDEX IF NOT EXISTS idx_pick_items_task_id ON pick_items(task_id);
CREATE INDEX IF NOT EXISTS idx_pick_items_part_number ON pick_items(part_number);
CREATE INDEX IF NOT EXISTS idx_pick_items_location ON pick_items(location);

CREATE INDEX IF NOT EXISTS idx_acceptance_log_timestamp ON acceptance_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_acceptance_log_part_number ON acceptance_log(part_number);

CREATE INDEX IF NOT EXISTS idx_sync_log_device_id ON sync_log(device_id);
CREATE INDEX IF NOT EXISTS idx_sync_log_timestamp ON sync_log(timestamp);

-- Record migration
INSERT INTO migrations (version, description) VALUES ('001', 'Initial database schema'); 