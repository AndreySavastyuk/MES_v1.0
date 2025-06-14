# Warehouse Desktop - Система управления складом

Настольное приложение для управления складскими операциями, построенное на Electron + React + TypeScript с использованием SAP UI5 Web Components.

## Особенности

- 🖥️ **Electron** - Кроссплатформенное настольное приложение
- ⚛️ **React + TypeScript** - Современный UI с типизацией
- 🎨 **SAP UI5 Web Components** - Профессиональный дизайн в стиле Fiori
- 🗄️ **SQLite** - Локальная база данных
- 🌐 **Express API** - RESTful API для работы с данными
- 🔄 **WebSocket** - Реальное время и синхронизация
- 📱 **Синхронизация с планшетами** - Обмен данными с мобильными устройствами

## Структура проекта

```
warehouse-desktop/
├── src/
│   ├── main/              # Electron главный процесс
│   │   ├── index.ts       # Точка входа приложения
│   │   ├── database/      # SQLite операции
│   │   ├── server/        # Express сервер для API
│   │   └── sync/          # Синхронизация с планшетами
│   ├── renderer/          # React приложение
│   │   ├── App.tsx        # Главный компонент
│   │   ├── pages/         # Страницы приложения
│   │   ├── components/    # UI компоненты
│   │   ├── services/      # API сервисы
│   │   └── store/         # State management (Zustand)
│   └── shared/            # Общие типы и утилиты
├── package.json
├── tsconfig.json
├── webpack.config.js
└── README.md
```

## Установка и запуск

### Предварительные требования

- Node.js 18+ 
- npm или yarn

### Установка зависимостей

```bash
npm install
```

### Разработка

```bash
# Запуск в режиме разработки
npm run dev
```

### Сборка

```bash
# Сборка для продакшена
npm run build

# Создание установочного пакета
npm run dist
```

## Функциональность

### Управление товарами
- Добавление, редактирование и удаление товаров
- Категоризация товаров
- Управление поставщиками
- Ценообразование

### Управление складом
- Контроль остатков
- Управление локациями (зоны, стеллажи, полки)
- Отслеживание движений товаров
- Уведомления о низких остатках

### Синхронизация
- Двусторонняя синхронизация с планшетными устройствами
- Разрешение конфликтов данных
- Офлайн режим работы
- WebSocket для реального времени

### Отчетность
- Отчеты по остаткам
- История движений
- Аналитика по товарам
- Экспорт данных

## API Endpoints

### Товары
- `GET /api/products` - Список товаров
- `POST /api/products` - Создание товара
- `PUT /api/products/:id` - Обновление товара
- `DELETE /api/products/:id` - Удаление товара

### Остатки
- `GET /api/inventory` - Складские остатки
- `POST /api/inventory/movement` - Регистрация движения

### Локации
- `GET /api/locations` - Список локаций
- `POST /api/locations` - Создание локации

### Синхронизация
- WebSocket подключение на `ws://localhost:3001`
- События: `sync_update`, `sync_status`, `sync_error`

## База данных

Приложение использует SQLite для хранения данных со следующими основными таблицами:

- `products` - Товары
- `categories` - Категории
- `suppliers` - Поставщики
- `inventory` - Остатки
- `locations` - Локации
- `stock_movements` - Движения товаров
- `sync_log` - Журнал синхронизации

## Технологии

- **Frontend**: React 18, TypeScript, SAP UI5 Web Components
- **Backend**: Electron, Express.js, SQLite
- **State Management**: Zustand
- **Build Tools**: Webpack, TypeScript Compiler
- **Real-time**: WebSocket (ws)

## Разработка

### Добавление новых функций

1. Создайте новые компоненты в `src/renderer/components/`
2. Добавьте API endpoints в `src/main/server/`
3. Обновите схему базы данных в `src/main/database/`
4. Добавьте типы в `src/shared/types.ts`

### Отладка

- Главный процесс: используйте `console.log` или Node.js debugger
- Renderer процесс: откройте DevTools в Electron

## Лицензия

MIT License

## Поддержка

Для вопросов и поддержки создайте issue в репозитории проекта. 