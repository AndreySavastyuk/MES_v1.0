# SAP UI5 Web Components Setup Guide

Это руководство описывает настройку SAP UI5 Web Components с темой Fiori 3 (Quartz Light) для приложения управления складом.

## 🎨 Установленные компоненты

### UI5 Packages
- `@ui5/webcomponents` - основные UI компоненты
- `@ui5/webcomponents-react` - React интеграция
- `@ui5/webcomponents-fiori` - Fiori специфичные компоненты (ShellBar, Navigation)
- `@ui5/webcomponents-icons` - набор SAP иконок
- `@ui5/webcomponents-base` - базовые утилиты
- `@ui5/webcomponents-theming` - система тем

## 🎯 Настройка темы Fiori 3

### 1. HTML конфигурация (`src/renderer/index.html`)
```html
<!-- SAP UI5 Theme Configuration -->
<script>
  window["sap-ui-config"] = {
    theme: "sap_fiori_3",
    language: "ru",
    compatVersion: "edge",
    async: true
  };
</script>

<!-- SAP 72 Fonts -->
<link rel="preconnect" href="https://ui5.sap.com">
<link href="https://ui5.sap.com/resources/sap/ui/core/themes/sap_fiori_3/fonts/72-web.css" rel="stylesheet">
```

### 2. CSS переменные темы (`src/renderer/theme/ui5-theme.css`)
```css
:root {
  /* SAP Brand Colors */
  --sapBrandColor: #0070f2;
  --sapHighlightColor: #0070f2;
  --sapActiveColor: #0064d9;
  --sapHoverColor: #0080ff;
  
  /* Custom Warehouse App Colors */
  --warehouse-primary: #0070f2;
  --warehouse-secondary: #354a5f;
  --warehouse-accent: #e78c07;
  --warehouse-success: #107e3e;
  --warehouse-warning: #e78c07;
  --warehouse-error: #bb0000;
  --warehouse-info: #0070f2;
  
  /* Typography */
  --sapFontFamily: '72', 'Helvetica Neue', Arial, sans-serif;
  --sapFontSize: 0.875rem;
  --sapFontHeader1Size: 2.25rem;
  --sapFontHeader2Size: 1.5rem;
  --sapFontHeader3Size: 1.25rem;
}
```

## 🏗️ Архитектура компонентов

### 1. UI5Shell Component (`src/renderer/components/UI5Shell.tsx`)
Главная оболочка приложения с:
- Responsive ShellBar с логотипом и навигацией
- Боковая навигация
- Статус бар
- Fiori дизайн система

### 2. TypeScript типы (`src/shared/ui5-types.d.ts`)
Декларации типов для всех UI5 Web Components для TypeScript поддержки.

### 3. Dashboard с SAP стилями (`src/renderer/pages/Dashboard.tsx`)
Использует SAP CSS переменные и стили для:
- Карточки статистики
- Кнопки действий
- Список активности

## 🎛️ Используемые UI5 компоненты

### Fiori Components
- `ui5-shellbar` - верхняя панель навигации
- `ui5-side-navigation` - боковая навигация
- `ui5-side-navigation-item` - элементы навигации

### Base Components
- `ui5-card` / `ui5-card-header` - карточки контента
- `ui5-button` - кнопки с Fiori стилями
- `ui5-title` / `ui5-label` - типография
- `ui5-list` / `ui5-standard-list-item` - списки

### Form Components
- `ui5-input` - поля ввода
- `ui5-select` / `ui5-option` - выпадающие списки
- `ui5-textarea` - многострочный ввод
- `ui5-checkbox` / `ui5-radio-button` - чекбоксы и радиокнопки
- `ui5-date-picker` / `ui5-time-picker` - выбор даты/времени

## 🎨 Дизайн система

### Цветовая палитра
- **Primary**: `#0070f2` (SAP Blue)
- **Secondary**: `#354a5f` (SAP Shell Color)
- **Success**: `#107e3e` (SAP Green)
- **Warning**: `#e78c07` (SAP Orange)
- **Error**: `#bb0000` (SAP Red)

### Типография
- **Шрифт**: SAP 72 (фолбэк на Helvetica Neue, Arial)
- **Размеры**: 14px базовый, с переменными для заголовков
- **Отступы**: используются rem единицы

### Компоненты
- **Карточки**: белый фон, скругленные углы, тени
- **Кнопки**: SAP стили с hover эффектами
- **Навигация**: Fiori стандарты с активными состояниями

## 📱 Responsive дизайн

### Breakpoints
- **Desktop**: > 768px (полная функциональность)
- **Tablet**: 768px (адаптивная сетка)
- **Mobile**: < 768px (увеличенные touch элементы)

### Адаптивные особенности
- Сетка карточек автоматически адаптируется
- Навигация сворачивается на мобильных
- Шрифты увеличиваются для лучшей читаемости

## 🚀 Запуск и сборка

### Установка зависимостей
```bash
npm install
```

### Разработка
```bash
npm run dev
```

### Сборка
```bash
npm run build
```

## 🔧 Кастомизация

### Изменение брендовых цветов
Отредактируйте переменные в `src/renderer/theme/ui5-theme.css`:
```css
:root {
  --warehouse-primary: #your-color;
  --warehouse-secondary: #your-color;
}
```

### Добавление новых UI5 компонентов
1. Импортируйте компонент: `import '@ui5/webcomponents/dist/Component.js'`
2. Добавьте тип в `src/shared/ui5-types.d.ts`
3. Используйте как обычный HTML элемент

### Настройка темы
Измените тему в `src/renderer/index.html`:
```javascript
window["sap-ui-config"] = {
  theme: "sap_fiori_3_dark", // или другая тема
  language: "en" // или другой язык
};
```

## 📚 Полезные ссылки

- [SAP UI5 Web Components](https://sap.github.io/ui5-webcomponents/)
- [Fiori Design Guidelines](https://experience.sap.com/fiori-design-web/)
- [SAP Theming](https://experience.sap.com/fiori-design-web/theming/)
- [UI5 Web Components React](https://sap.github.io/ui5-webcomponents-react/)

## 🐛 Известные проблемы

1. **TypeScript ошибки**: Используйте типы из `ui5-types.d.ts`
2. **CSP ошибки**: Обновите Content Security Policy для UI5 ресурсов
3. **Шрифты не загружаются**: Проверьте сетевое соединение для SAP CDN

## ✅ Что готово

- ✅ Установлены все необходимые UI5 пакеты
- ✅ Настроена тема Fiori 3 (Quartz Light)
- ✅ Подключены SAP 72 шрифты
- ✅ Созданы кастомные CSS переменные
- ✅ Настроена responsive оболочка
- ✅ Создан Dashboard с SAP стилями
- ✅ Добавлены TypeScript типы
- ✅ Настроен Webpack для ресурсов

Приложение готово для дальнейшей разработки с использованием SAP UI5 Web Components и темы Fiori! 