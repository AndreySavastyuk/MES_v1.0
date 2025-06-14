# API Документация - Система управления складом

## Базовый URL
```
http://localhost:3001/api
```

## Общие принципы

### Формат ответов
Все API endpoints возвращают JSON в следующем формате:

**Успешный ответ:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Сообщение (опционально)"
}
```

**Ответ с ошибкой:**
```json
{
  "success": false,
  "error": "Описание ошибки",
  "message": "Детальное сообщение (опционально)"
}
```

### Пагинация
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": false
  }
}
```

## Задачи (Tasks)

### GET /api/tasks
Получить список задач с фильтрацией и пагинацией.

**Параметры запроса:**
- `page` (number, optional) - номер страницы (по умолчанию: 1)
- `limit` (number, optional) - количество записей на странице (по умолчанию: 20)
- `status` (string, optional) - фильтр по статусу (pending,in_progress,completed,cancelled,on_hold)
- `priority` (string, optional) - фильтр по приоритету (1,2,3,4,5)
- `assigned_device` (number, optional) - фильтр по назначенному устройству
- `date_from` (string, optional) - дата начала (ISO format)
- `date_to` (string, optional) - дата окончания (ISO format)
- `search` (string, optional) - поиск по номеру и описанию задачи

**Пример запроса:**
```
GET /api/tasks?page=1&limit=10&status=pending,in_progress&priority=3,4,5
```

**Пример ответа:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "number": "PICK-2024-001",
      "description": "Заказ для клиента А-123",
      "status": "pending",
      "priority": 3,
      "created_at": "2024-06-08T10:00:00Z",
      "deadline": "2024-06-10T18:00:00Z",
      "assigned_device": null,
      "total_items": 3,
      "picked_items": 0,
      "created_by": "admin"
    }
  ],
  "pagination": { ... }
}
```

### POST /api/tasks
Создать новую задачу.

**Тело запроса:**
```json
{
  "number": "PICK-2024-005",
  "description": "Описание задачи",
  "status": "pending",
  "priority": 3,
  "deadline": "2024-06-15T18:00:00Z",
  "assigned_device": null,
  "created_by": "api",
  "items": [
    {
      "part_number": "P001",
      "part_name": "Болт М8x20",
      "quantity_required": 50,
      "location": "A1-B2-C3"
    }
  ]
}
```

**Ответ:**
```json
{
  "success": true,
  "data": {
    "task": { ... },
    "items": [ ... ]
  },
  "message": "Задача успешно создана"
}
```

### PUT /api/tasks/:id
Обновить задачу.

**Параметры:**
- `id` (number) - ID задачи

**Тело запроса:**
```json
{
  "description": "Обновленное описание",
  "priority": 4,
  "deadline": "2024-06-12T18:00:00Z"
}
```

### DELETE /api/tasks/:id
Удалить задачу.

**Параметры:**
- `id` (number) - ID задачи

**Ограничения:**
- Нельзя удалить задачу в статусе `in_progress`

### POST /api/tasks/import
Импорт задач из Excel/CSV файла.

**Content-Type:** `multipart/form-data`

**Поля формы:**
- `file` (file) - Excel (.xlsx, .xls) или CSV (.csv) файл

**Формат файла:**
| number | part_number | part_name | quantity_required | location | description | priority | deadline |
|--------|-------------|-----------|-------------------|----------|-------------|----------|----------|
| PICK-001 | P001 | Болт М8x20 | 50 | A1-B2-C3 | Заказ клиента | 3 | 2024-06-15 |

**Ответ:**
```json
{
  "success": true,
  "data": {
    "created": 25,
    "errors": [
      "Строка 5: отсутствуют обязательные поля"
    ]
  },
  "message": "Импорт завершен. Создано элементов: 25, ошибок: 1"
}
```

### POST /api/tasks/:id/send
Отправить задачу на устройство.

**Параметры:**
- `id` (number) - ID задачи

**Тело запроса:**
```json
{
  "device_id": 1
}
```

**Ответ:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Задача отправлена на устройство Планшет-001"
}
```

### GET /api/tasks/:id/progress
Получить прогресс выполнения задачи.

**Параметры:**
- `id` (number) - ID задачи

**Ответ:**
```json
{
  "success": true,
  "data": {
    "task_id": 1,
    "task_number": "PICK-2024-001",
    "status": "in_progress",
    "items_progress": {
      "total": 10,
      "picked": 6,
      "partial": 2,
      "not_found": 1,
      "pending": 1,
      "percentage": 60
    },
    "quantity_progress": {
      "total_required": 500,
      "total_picked": 350,
      "percentage": 70
    },
    "time_metrics": {
      "started_at": "2024-06-08T10:00:00Z",
      "time_elapsed_minutes": 120,
      "estimated_time_remaining_minutes": 30,
      "deadline": "2024-06-10T18:00:00Z"
    },
    "items_details": [
      {
        "id": 1,
        "part_number": "P001",
        "part_name": "Болт М8x20",
        "location": "A1-B2-C3",
        "quantity_required": 50,
        "quantity_picked": 50,
        "status": "picked",
        "picked_at": "2024-06-08T11:30:00Z",
        "progress_percentage": 100
      }
    ],
    "last_updated": "2024-06-08T12:00:00Z"
  }
}
```

### GET /api/tasks/:id
Получить конкретную задачу с элементами.

**Параметры:**
- `id` (number) - ID задачи

## Устройства (Devices)

### GET /api/devices
Получить все устройства.

**Ответ:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Планшет-001",
      "ip_address": "192.168.1.100",
      "status": "online",
      "device_type": "tablet",
      "last_sync": "2024-06-08T12:00:00Z",
      "created_at": "2024-06-01T09:00:00Z",
      "updated_at": "2024-06-08T12:00:00Z"
    }
  ]
}
```

### GET /api/devices/online
Получить только онлайн устройства.

### GET /api/devices/:id
Получить устройство по ID.

**Параметры:**
- `id` (number) - ID устройства

### POST /api/devices
Создать новое устройство.

**Тело запроса:**
```json
{
  "name": "Планшет-003",
  "ip_address": "192.168.1.102",
  "device_type": "tablet",
  "status": "offline"
}
```

**Статусы устройств:**
- `online` - устройство в сети
- `offline` - устройство отключено
- `syncing` - идет синхронизация
- `error` - ошибка соединения

**Типы устройств:**
- `tablet` - планшет для сборки
- `scanner` - сканер штрих-кодов
- `desktop` - рабочая станция

### PUT /api/devices/:id
Обновить устройство.

**Параметры:**
- `id` (number) - ID устройства

### POST /api/devices/:id/status
Обновить статус устройства.

**Параметры:**
- `id` (number) - ID устройства

**Тело запроса:**
```json
{
  "status": "online"
}
```

### POST /api/devices/:id/sync
Обновить время последней синхронизации.

**Параметры:**
- `id` (number) - ID устройства

### DELETE /api/devices/:id
Удалить устройство.

**Параметры:**
- `id` (number) - ID устройства

**Ограничения:**
- Нельзя удалить устройство в статусе `online`

## Системные endpoints

### GET /api/health
Проверка состояния сервера.

**Ответ:**
```json
{
  "status": "OK",
  "timestamp": "2024-06-08T12:00:00Z"
}
```

## Коды ошибок

- `200` - Успешный запрос
- `201` - Ресурс создан
- `400` - Некорректный запрос
- `404` - Ресурс не найден
- `500` - Внутренняя ошибка сервера

## Примеры использования

### Создание задачи с элементами
```bash
curl -X POST http://localhost:3001/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "number": "PICK-2024-010",
    "description": "Срочный заказ",
    "priority": 5,
    "deadline": "2024-06-09T18:00:00Z",
    "items": [
      {
        "part_number": "P001",
        "part_name": "Болт М8x20",
        "quantity_required": 100,
        "location": "A1-B2-C3"
      },
      {
        "part_number": "P002",
        "part_name": "Гайка М8",
        "quantity_required": 100,
        "location": "A1-B2-C4"
      }
    ]
  }'
```

### Поиск задач по фильтрам
```bash
curl "http://localhost:3001/api/tasks?status=pending&priority=4,5&search=срочный"
```

### Отправка задачи на устройство
```bash
curl -X POST http://localhost:3001/api/tasks/1/send \
  -H "Content-Type: application/json" \
  -d '{"device_id": 1}'
```

### Импорт задач из CSV
```bash
curl -X POST http://localhost:3001/api/tasks/import \
  -F "file=@tasks.csv"
```

## WebSocket события

Сервер поддерживает real-time уведомления через WebSocket:

### События задач
- `task_updated` - задача обновлена
- `new_task` - новая задача создана
- `task_completed` - задача завершена

### События устройств
- `device_updated` - устройство обновлено

### Подписка на события
```javascript
// Подписка на обновления задачи
socket.emit('join_task_room', '1');

// Подписка на обновления устройства
socket.emit('join_device_room', '1');
``` 