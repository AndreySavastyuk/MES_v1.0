-- Seed data for warehouse management system
-- Test data for development and demonstration

-- Insert sample devices
INSERT OR IGNORE INTO devices (name, ip_address, status, device_type) VALUES 
('Планшет-001', '192.168.1.100', 'online', 'tablet'),
('Планшет-002', '192.168.1.101', 'offline', 'tablet'),
('Сканер-001', '192.168.1.150', 'online', 'scanner'),
('Рабочая-станция', '192.168.1.200', 'online', 'desktop');

-- Insert sample pick tasks
INSERT OR IGNORE INTO pick_tasks (number, description, status, priority, deadline, assigned_device, created_by) VALUES 
('PICK-2024-001', 'Заказ для клиента А-123', 'pending', 3, datetime('now', '+2 days'), 1, 'admin'),
('PICK-2024-002', 'Срочный заказ Б-456', 'in_progress', 5, datetime('now', '+1 day'), 1, 'admin'),
('PICK-2024-003', 'Плановый заказ В-789', 'completed', 2, datetime('now', '-1 day'), 2, 'admin'),
('PICK-2024-004', 'Экспорт заказ Г-101', 'pending', 4, datetime('now', '+3 days'), NULL, 'admin');

-- Insert sample pick items
INSERT OR IGNORE INTO pick_items (task_id, part_number, part_name, quantity_required, quantity_picked, location, status) VALUES 
-- Items for PICK-2024-001
(1, 'P001', 'Болт М8x20', 50, 0, 'A1-B2-C3', 'pending'),
(1, 'P002', 'Гайка М8', 50, 0, 'A1-B2-C4', 'pending'),
(1, 'P003', 'Шайба 8мм', 100, 0, 'A1-B3-C1', 'pending'),

-- Items for PICK-2024-002 (in progress)
(2, 'P004', 'Втулка 12мм', 25, 20, 'A2-B1-C2', 'partial'),
(2, 'P005', 'Подшипник 608', 10, 10, 'A2-B1-C3', 'picked'),
(2, 'P006', 'Уплотнитель', 5, 0, 'A2-B2-C1', 'pending'),

-- Items for PICK-2024-003 (completed)
(3, 'P007', 'Фланец 50мм', 2, 2, 'A3-B1-C1', 'picked'),
(3, 'P008', 'Прокладка резиновая', 4, 4, 'A3-B1-C2', 'picked'),

-- Items for PICK-2024-004
(4, 'P009', 'Муфта соединительная', 8, 0, 'A4-B1-C1', 'pending'),
(4, 'P010', 'Хомут стальной', 16, 0, 'A4-B1-C2', 'pending');

-- Insert sample acceptance log entries
INSERT OR IGNORE INTO acceptance_log (part_number, part_name, order_number, quantity, cell_code, device_id, operator_name, supplier_name, batch_number) VALUES 
('P001', 'Болт М8x20', 'ORD-2024-001', 1000, 'A1-B2-C3', 1, 'Иванов И.И.', 'Метизы-Поставка', 'BATCH-001'),
('P002', 'Гайка М8', 'ORD-2024-001', 1000, 'A1-B2-C4', 1, 'Иванов И.И.', 'Метизы-Поставка', 'BATCH-002'),
('P003', 'Шайба 8мм', 'ORD-2024-002', 2000, 'A1-B3-C1', 2, 'Петров П.П.', 'Метизы-Поставка', 'BATCH-003'),
('P004', 'Втулка 12мм', 'ORD-2024-003', 500, 'A2-B1-C2', 1, 'Сидоров С.С.', 'Втулки-Опт', 'BATCH-004'),
('P005', 'Подшипник 608', 'ORD-2024-004', 200, 'A2-B1-C3', 2, 'Козлов К.К.', 'Подшипники-РФ', 'BATCH-005');

-- Insert sample sync log entries
INSERT OR IGNORE INTO sync_log (device_id, sync_type, status, data_count, duration_ms, sync_direction, data_size_bytes) VALUES 
(1, 'full', 'completed', 150, 2500, 'bidirectional', 15360),
(1, 'incremental', 'completed', 25, 800, 'upload', 2048),
(2, 'tasks', 'completed', 10, 1200, 'download', 4096),
(2, 'full', 'failed', 0, 5000, 'bidirectional', 0),
(3, 'status', 'completed', 5, 300, 'upload', 512);

-- Update pick_tasks totals based on pick_items
UPDATE pick_tasks SET 
  total_items = (SELECT COUNT(*) FROM pick_items WHERE task_id = pick_tasks.id),
  picked_items = (SELECT COUNT(*) FROM pick_items WHERE task_id = pick_tasks.id AND status = 'picked')
WHERE id IN (1, 2, 3, 4);

-- Sample legacy data for compatibility
INSERT OR IGNORE INTO categories (name, description) VALUES 
('Крепеж', 'Болты, гайки, шайбы'),
('Подшипники', 'Шариковые и роликовые подшипники'),
('Уплотнения', 'Прокладки и уплотнители');

INSERT OR IGNORE INTO suppliers (name, contact_person, email, phone) VALUES 
('Метизы-Поставка', 'Иванов Иван', 'ivanov@metiz.ru', '+7-495-123-45-67'),
('Втулки-Опт', 'Петров Петр', 'petrov@vtulki.ru', '+7-495-234-56-78'),
('Подшипники-РФ', 'Сидоров Сидор', 'sidorov@bearing.ru', '+7-495-345-67-89');

INSERT OR IGNORE INTO locations (code, name, zone, location_type) VALUES 
('A1-B2-C3', 'Стеллаж А1, ряд Б2, полка С3', 'Зона А', 'storage'),
('A1-B2-C4', 'Стеллаж А1, ряд Б2, полка С4', 'Зона А', 'storage'),
('A1-B3-C1', 'Стеллаж А1, ряд Б3, полка С1', 'Зона А', 'storage'),
('A2-B1-C2', 'Стеллаж А2, ряд Б1, полка С2', 'Зона А', 'storage'),
('A2-B1-C3', 'Стеллаж А2, ряд Б1, полка С3', 'Зона А', 'storage');

-- Update device last sync times
UPDATE devices SET last_sync = datetime('now', '-' || (id * 30) || ' minutes') WHERE status != 'offline'; 