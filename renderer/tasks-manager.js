// Глобальные переменные
let allTasks = [];
let filteredTasks = [];
let positionCounter = 0;
let taskCounter = 1; // Счетчик для номеров заданий M001, M002
let usedTaskNumbers = new Set(); // Используемые номера заданий
let importedPositions = []; // Позиции, импортированные из Excel
let currentWorkbook = null; // Текущий загруженный Excel файл

// Переменные для сортировки
let currentSortField = null;
let currentSortDirection = 'none'; // 'none', 'asc', 'desc'

// Переменные для приемки
let receivingItems = [];
let filteredReceivingItems = [];
let currentReceivingSortField = null;
let currentReceivingSortDirection = 'none';

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    loadTasks();
    setupEventListeners();
});

// Сохранение заданий в localStorage
function saveTasks() {
    try {
        const dataToSave = {
            tasks: allTasks,
            taskCounter: taskCounter,
            usedTaskNumbers: Array.from(usedTaskNumbers)
        };
        localStorage.setItem('warehouse_tasks', JSON.stringify(dataToSave));
        console.log('💾 Задания сохранены в localStorage');
    } catch (error) {
        console.error('❌ Ошибка сохранения заданий:', error);
    }
}

// Загрузка заданий из localStorage или создание тестовых данных
async function loadTasks() {
    try {
        console.log('📋 Загрузка заданий...');
        
        // Попытка загрузки из localStorage
        const savedData = localStorage.getItem('warehouse_tasks');
        if (savedData) {
            const data = JSON.parse(savedData);
            allTasks = data.tasks || [];
            taskCounter = data.taskCounter || 1;
            usedTaskNumbers = new Set(data.usedTaskNumbers || []);
            
            // Обновляем счетчик до максимального существующего номера + 1
            allTasks.forEach(task => {
                if (task.taskNumber) {
                    usedTaskNumbers.add(task.taskNumber);
                    const num = parseInt(task.taskNumber.replace('M', ''));
                    if (num >= taskCounter) {
                        taskCounter = num + 1;
                    }
                }
            });
            
            filteredTasks = [...allTasks];
            renderTasksTable();
            console.log(`✅ Загружено ${allTasks.length} заданий из localStorage`);
            return;
        }
        
        // Если в localStorage ничего нет, создаем тестовые данные
        console.log('🆕 Создание тестовых данных...');
        
        // Пока используем моковые данные, потом заменим на API
        allTasks = [
            {
                taskNumber: 'M001',
                orderNumber: '2024/038',
                title: 'Приемка товара партия №123',
                description: 'Приемка товаров по накладной №123 от поставщика "Альфа"',
                priority: 'urgent',
                status: 'in_progress',
                type: 'receive',
                created: new Date('2024-06-07T10:00:00'),
                updated: new Date('2024-06-08T14:30:00'),
                progress: 65,
                positions: [
                    { sku: 'SKU001', name: 'Товар А', quantity: 100, completed: 65 },
                    { sku: 'SKU002', name: 'Товар Б', quantity: 50, completed: 50 }
                ],
                history: [
                    {
                        timestamp: new Date('2024-06-07T10:00:00'),
                        user: 'Иванов И.И.',
                        action: 'Создание задания',
                        comment: 'Создано новое задание приемки'
                    },
                    {
                        timestamp: new Date('2024-06-08T14:30:00'),
                        user: 'Петров П.П.',
                        action: 'Изменение приоритета',
                        field: 'priority',
                        oldValue: 'medium',
                        newValue: 'high',
                        comment: 'Повышен приоритет по требованию руководства'
                    }
                ]
            },
            {
                taskNumber: 'M002',
                orderNumber: '2024/045',
                title: 'Инвентаризация склада А',
                description: 'Плановая инвентаризация основного склада А',
                priority: 'normal',
                status: 'development',
                type: 'inventory',
                created: new Date('2024-06-08T09:00:00'),
                updated: null,
                progress: 0,
                positions: [
                    { sku: 'ALL', name: 'Все товары склада А', quantity: 1000, completed: 0 }
                ],
                history: [
                    {
                        timestamp: new Date('2024-06-08T09:00:00'),
                        user: 'Сидоров С.С.',
                        action: 'Создание задания',
                        comment: 'Плановая инвентаризация'
                    }
                ]
            },
            {
                taskNumber: 'M003',
                orderNumber: '2024/051',
                title: 'Отгрузка заказа №456',
                description: 'Отгрузка товаров по заказу клиента №456',
                priority: 'important',
                status: 'completed',
                type: 'shipment',
                created: new Date('2024-06-06T15:00:00'),
                updated: new Date('2024-06-07T16:00:00'),
                progress: 100,
                positions: [
                    { sku: 'SKU003', name: 'Товар В', quantity: 25, completed: 25 },
                    { sku: 'SKU004', name: 'Товар Г', quantity: 30, completed: 30 }
                ],
                history: [
                    {
                        timestamp: new Date('2024-06-06T15:00:00'),
                        user: 'Козлов К.К.',
                        action: 'Создание задания',
                        comment: 'Создано задание отгрузки'
                    },
                    {
                        timestamp: new Date('2024-06-07T16:00:00'),
                        user: 'Козлов К.К.',
                        action: 'Завершение задания',
                        field: 'status',
                        oldValue: 'in_progress',
                        newValue: 'completed',
                        comment: 'Отгрузка выполнена в полном объеме'
                    }
                ]
            }
        ];
        
        // Инициализация используемых номеров заданий
        allTasks.forEach(task => {
            if (task.taskNumber) {
                usedTaskNumbers.add(task.taskNumber);
                const numberPart = parseInt(task.taskNumber.substring(1));
                if (numberPart >= taskCounter) {
                    taskCounter = numberPart + 1;
                }
            }
        });
        
        filteredTasks = [...allTasks];
        renderTasksTable();
        
        console.log('✅ Задания загружены:', allTasks.length);
        console.log('📊 Используемые номера:', Array.from(usedTaskNumbers));
        console.log('🔢 Следующий счетчик:', taskCounter);
    } catch (error) {
        console.error('❌ Ошибка загрузки заданий:', error);
        showNotification('Ошибка загрузки заданий', 'error');
    }
}

// Отрисовка таблицы заданий
function renderTasksTable() {
    const tbody = document.getElementById('tasksTableBody');
    
    if (filteredTasks.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 40px; color: #6c757d;">
                    📋 Заданий не найдено
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = filteredTasks.map(task => {
        const statusClass = `status ${task.status}`;
        const priorityClass = `priority ${task.priority}`;
        
        return `
            <tr ondblclick="openEditTaskModal('${task.taskNumber}')">
                <td><strong>${task.taskNumber}</strong></td>
                <td><strong>${task.orderNumber}</strong></td>
                <td>
                    <div style="font-weight: 600; margin-bottom: 4px;">${task.title}</div>
                    <div style="font-size: 12px; color: #6c757d;">${getTypeText(task.type)}</div>
                </td>
                <td><span class="${priorityClass}">${getPriorityText(task.priority)}</span></td>
                <td><span class="${statusClass}">${getStatusText(task.status)}</span></td>
                <td><small>${formatDate(task.created)}</small></td>
                <td><small>${task.updated ? formatDate(task.updated) : '—'}</small></td>
                <td>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${task.progress}%"></div>
                    </div>
                    <small style="font-size: 11px; color: #6c757d;">${task.progress}%</small>
                </td>
            </tr>
        `;
    }).join('');
}

// Переключение панели фильтров
function toggleFilters() {
    const container = document.getElementById('filtersContainer');
    container.classList.toggle('expanded');
}

// Фильтрация заданий
function filterTasks() {
    const statusFilter = document.getElementById('statusFilter').value;
    const priorityFilter = document.getElementById('priorityFilter').value;
    const periodFilter = document.getElementById('periodFilter').value;
    const searchQuery = document.getElementById('searchInput').value.toLowerCase();
    
    filteredTasks = allTasks.filter(task => {
        const matchesStatus = !statusFilter || task.status === statusFilter;
        const matchesPriority = !priorityFilter || task.priority === priorityFilter;
        const matchesSearch = !searchQuery || 
            task.title.toLowerCase().includes(searchQuery) ||
            task.description.toLowerCase().includes(searchQuery) ||
            task.taskNumber.toLowerCase().includes(searchQuery) ||
            task.orderNumber.toLowerCase().includes(searchQuery);
        
        let matchesPeriod = true;
        if (periodFilter) {
            const now = new Date();
            const taskDate = new Date(task.created);
            
            switch (periodFilter) {
                case 'today':
                    matchesPeriod = taskDate.toDateString() === now.toDateString();
                    break;
                case 'week':
                    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                    matchesPeriod = taskDate >= weekAgo;
                    break;
                case 'month':
                    const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
                    matchesPeriod = taskDate >= monthAgo;
                    break;
            }
        }
        
        return matchesStatus && matchesPriority && matchesSearch && matchesPeriod;
    });
    
    renderTasksTable();
}

// Генерация номера задания
function generateTaskNumber() {
    let number;
    do {
        number = `M${String(taskCounter).padStart(3, '0')}`;
        taskCounter++;
    } while (usedTaskNumbers.has(number));
    
    usedTaskNumbers.add(number);
    return number;
}

// Форматирование номера заказа при вводе
function formatOrderNumber(input) {
    let value = input.value.replace(/\D/g, ''); // Удаляем все нечисловые символы
    
    if (value.length >= 4) {
        // Вставляем косую черту после 4-й цифры
        value = value.substring(0, 4) + '/' + value.substring(4, 7);
    }
    
    input.value = value;
}

// Валидация номера заказа
function validateOrderNumber(orderNumber) {
    const pattern = /^(\d{4})\/(\d{3})$/;
    const match = orderNumber.match(pattern);
    
    if (!match) {
        return { valid: false, error: 'Неверный формат. Используйте ГГГГ/ЧЧЧ' };
    }
    
    const year = parseInt(match[1]);
    const currentYear = new Date().getFullYear();
    
    if (year < currentYear - 4 || year > currentYear + 1) {
        return { 
            valid: false, 
            error: `Год должен быть в диапазоне ${currentYear - 4} - ${currentYear + 1}` 
        };
    }
    
    return { valid: true };
}

// Открытие модального окна создания задания
function openCreateTaskModal() {
    const form = document.getElementById('createTaskForm');
    form.reset();
    
    // Автоматически генерируем номер задания
    const taskNumber = generateTaskNumber();
    document.getElementById('taskNumber').value = taskNumber;
    
    // Устанавливаем текущий год для номера заказа
    const currentYear = new Date().getFullYear();
    document.getElementById('orderNumber').placeholder = `${currentYear}/001`;
    
    document.getElementById('taskPositions').innerHTML = `
        <button type="button" class="btn btn-outline" onclick="addPosition()">
            ➕ Добавить позицию
        </button>
    `;
    positionCounter = 0;
    
    document.getElementById('createTaskModal').style.display = 'block';
}

// Открытие модального окна редактирования
function openEditTaskModal(taskNumber) {
    const task = allTasks.find(t => t.taskNumber === taskNumber);
    if (!task) return;
    
    // Заполнение формы
    document.getElementById('editTaskId').value = task.taskNumber;
    document.getElementById('editTaskNumber').value = task.taskNumber;
    document.getElementById('editOrderNumber').value = task.orderNumber;
    document.getElementById('editTaskTitle').value = task.title;
    document.getElementById('editTaskDescription').value = task.description;
    document.getElementById('editTaskPriority').value = task.priority;
    document.getElementById('editTaskStatus').value = task.status;
    document.getElementById('editComment').value = '';
    
    // Загрузка истории изменений
    loadTaskHistory(task);
    
    // Загрузка прогресса выполнения
    loadTaskProgress(task);
    
    document.getElementById('editTaskModal').style.display = 'block';
}

// Открытие отчета по заданию
function openTaskReport(taskNumber) {
    const task = allTasks.find(t => t.taskNumber === taskNumber);
    if (!task) return;
    
    const reportDiv = document.getElementById('taskReport');
    
    reportDiv.innerHTML = `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
            <div>
                <h3>📋 Основная информация</h3>
                <p><strong>ID:</strong> ${task.id}</p>
                <p><strong>Название:</strong> ${task.title}</p>
                <p><strong>Тип:</strong> ${getTypeText(task.type)}</p>
                <p><strong>Приоритет:</strong> ${getPriorityText(task.priority)}</p>
                <p><strong>Статус:</strong> ${getStatusText(task.status)}</p>
            </div>
            <div>
                <h3>📊 Статистика</h3>
                <p><strong>Создано:</strong> ${formatDateTime(task.created)}</p>
                <p><strong>Обновлено:</strong> ${formatDateTime(task.updated)}</p>
                <p><strong>Прогресс:</strong> ${task.progress}%</p>
                <p><strong>Отправлено на планшет:</strong> ${task.sentToTablet ? 'Да 📱' : 'Нет'}</p>
            </div>
        </div>
        
        <h3>📦 Позиции задания</h3>
        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            ${task.positions.map(pos => `
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px; padding: 10px; background: white; border-radius: 4px;">
                    <div>
                        <strong>${pos.name}</strong> (${pos.sku})
                    </div>
                    <div>
                        ${pos.completed}/${pos.quantity} 
                        <span style="color: ${pos.completed === pos.quantity ? '#28a745' : '#ffc107'};">
                            (${Math.round((pos.completed / pos.quantity) * 100)}%)
                        </span>
                    </div>
                </div>
            `).join('')}
        </div>
        
        <h3>📝 История изменений</h3>
        <div style="max-height: 300px; overflow-y: auto;">
            ${task.history.map(item => `
                <div class="history-item">
                    <div class="history-meta">
                        <strong>${item.user}</strong>
                        <span>${formatDateTime(item.timestamp)}</span>
                    </div>
                    <div class="history-change">${item.action}</div>
                    ${item.field ? `<small>Поле: ${item.field} (${item.oldValue} → ${item.newValue})</small>` : ''}
                    ${item.comment ? `<div class="history-comment">${item.comment}</div>` : ''}
                </div>
            `).join('')}
        </div>
    `;
    
    document.getElementById('reportModal').style.display = 'block';
}

// Добавление позиции в задание
function addPosition() {
    positionCounter++;
    const positionsDiv = document.getElementById('taskPositions');
    const addButton = positionsDiv.querySelector('button');
    
    const positionDiv = document.createElement('div');
    positionDiv.className = 'position-item';
    positionDiv.innerHTML = `
        <button type="button" class="position-remove" onclick="removePosition(this)">×</button>
        <div class="form-row">
            <div class="form-group">
                <label>SKU</label>
                <input type="text" name="position_sku_${positionCounter}" placeholder="Артикул товара" required>
            </div>
            <div class="form-group">
                <label>Название</label>
                <input type="text" name="position_name_${positionCounter}" placeholder="Название товара" required>
            </div>
        </div>
        <div class="form-group">
            <label>Количество</label>
            <input type="number" name="position_quantity_${positionCounter}" min="1" placeholder="Количество" required>
        </div>
    `;
    
    positionsDiv.insertBefore(positionDiv, addButton);
}

// Удаление позиции
function removePosition(button) {
    button.parentElement.remove();
}

// Создание нового задания
function createTask() {
    const form = document.getElementById('createTaskForm');
    const formData = new FormData(form);
    
    // Сбор данных формы
    const newTask = {
        id: 'T' + String(Date.now()).slice(-3),
        title: formData.get('taskTitle') || document.getElementById('taskTitle').value,
        description: formData.get('taskDescription') || document.getElementById('taskDescription').value,
        priority: formData.get('taskPriority') || document.getElementById('taskPriority').value,
        status: 'pending',
        type: formData.get('taskType') || document.getElementById('taskType').value,
        created: new Date(),
        updated: new Date(),
        progress: 0,
        sentToTablet: false,
        positions: [],
        history: [{
            timestamp: new Date(),
            user: 'Текущий пользователь',
            action: 'Создание задания',
            comment: 'Создано новое задание'
        }]
    };
    
    // Сбор позиций
    const positionItems = document.querySelectorAll('.position-item');
    positionItems.forEach(item => {
        const inputs = item.querySelectorAll('input');
        if (inputs.length >= 3) {
            newTask.positions.push({
                sku: inputs[0].value,
                name: inputs[1].value,
                quantity: parseInt(inputs[2].value) || 0,
                completed: 0
            });
        }
    });
    
    // Добавление в список
    allTasks.push(newTask);
    filteredTasks = [...allTasks];
    renderTasksTable();
    
    // Сохранение в localStorage
    saveTasks();
    
    closeModal('createTaskModal');
    showNotification('Задание успешно создано', 'success');
    
    console.log('✅ Создано новое задание:', newTask);
}

// Сохранение изменений задания
function saveTask() {
    const taskId = document.getElementById('editTaskId').value;
    const task = allTasks.find(t => t.id === taskId);
    if (!task) return;
    
    const oldTitle = task.title;
    const oldPriority = task.priority;
    const oldStatus = task.status;
    const comment = document.getElementById('editComment').value;
    
    // Обновление данных
    task.title = document.getElementById('editTaskTitle').value;
    task.description = document.getElementById('editTaskDescription').value;
    task.priority = document.getElementById('editTaskPriority').value;
    task.status = document.getElementById('editTaskStatus').value;
    task.updated = new Date();
    
    // Добавление записи в историю
    const changes = [];
    if (oldTitle !== task.title) changes.push(`название: "${oldTitle}" → "${task.title}"`);
    if (oldPriority !== task.priority) changes.push(`приоритет: ${oldPriority} → ${task.priority}`);
    if (oldStatus !== task.status) changes.push(`статус: ${oldStatus} → ${task.status}`);
    
    if (changes.length > 0) {
        task.history.push({
            timestamp: new Date(),
            user: 'Текущий пользователь',
            action: 'Изменение данных',
            details: changes.join(', '),
            comment: comment || 'Без комментария'
        });
    }
    
    renderTasksTable();
    
    // Сохранение в localStorage
    saveTasks();
    
    closeModal('editTaskModal');
    showNotification('Изменения сохранены', 'success');
    
    console.log('✅ Задание обновлено:', task);
}

// Отправка задания на планшет
function sendToTablet() {
    const taskId = document.getElementById('editTaskId').value;
    const task = allTasks.find(t => t.id === taskId);
    if (!task) return;
    
    if (task.sentToTablet) {
        showNotification('Задание уже отправлено на планшет', 'warning');
        return;
    }
    
    task.sentToTablet = true;
    task.updated = new Date();
    task.history.push({
        timestamp: new Date(),
        user: 'Текущий пользователь',
        action: 'Отправка на планшет',
        comment: 'Задание отправлено на планшет для выполнения'
    });
    
    renderTasksTable();
    showNotification('Задание отправлено на планшет 📱', 'success');
    
    console.log('✅ Задание отправлено на планшет:', task);
}

// Удаление задания
function deleteTask(taskNumber) {
    const task = allTasks.find(t => t.taskNumber === taskNumber);
    if (!task) return;
    
    if (!confirm(`Вы уверены, что хотите удалить задание "${task.title}"?`)) {
        return;
    }
    
    if (task.sentToTablet) {
        // Архивирование с пометкой удаления
        task.status = 'deleted';
        task.updated = new Date();
        task.history.push({
            timestamp: new Date(),
            user: 'Текущий пользователь',
            action: 'Помечено как удаленное',
            comment: 'Задание помечено как удаленное и перемещено в архив'
        });
        
        showNotification('Задание помечено как удаленное и перемещено в архив 🗂️', 'warning');
    } else {
        // Полное удаление
        const index = allTasks.findIndex(t => t.taskNumber === taskNumber);
        allTasks.splice(index, 1);
        // Освобождаем номер задания
        usedTaskNumbers.delete(task.taskNumber);
        showNotification('Задание удалено', 'success');
    }
    
    filteredTasks = [...allTasks];
    renderTasksTable();
    
    // Сохранение в localStorage
    saveTasks();
    
    console.log('🗑️ Задание удалено:', taskNumber);
}

// Загрузка истории изменений
function loadTaskHistory(task) {
    const historyDiv = document.getElementById('changeHistory');
    
    historyDiv.innerHTML = task.history.map(item => `
        <div class="history-item">
            <div class="history-meta">
                <strong>${item.user}</strong>
                <span>${formatDateTime(item.timestamp)}</span>
            </div>
            <div class="history-change">${item.action}</div>
            ${item.details ? `<small style="color: #6c757d;">${item.details}</small>` : ''}
            ${item.comment ? `<div class="history-comment">${item.comment}</div>` : ''}
        </div>
    `).join('');
}

// Загрузка прогресса выполнения
function loadTaskProgress(task) {
    const progressDiv = document.getElementById('taskProgress');
    
    progressDiv.innerHTML = `
        <div style="margin-bottom: 20px;">
            <h4>📊 Общий прогресс: ${task.progress}%</h4>
            <div class="progress-bar" style="width: 100%; height: 20px;">
                <div class="progress-fill" style="width: ${task.progress}%"></div>
            </div>
        </div>
        
        <h4>📦 Прогресс по позициям:</h4>
        ${task.positions.map((pos, index) => {
            const progress = Math.round((pos.completed / pos.quantity) * 100);
            return `
                <div style="margin-bottom: 15px; padding: 10px; background: #f8f9fa; border-radius: 8px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                        <strong>${index + 1}. ${pos.name} (${pos.sku})</strong>
                        <span>${pos.completed}/${pos.quantity} (${progress}%)</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progress}%"></div>
                    </div>
                </div>
            `;
        }).join('')}
    `;
}

// Утилиты
function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function openTab(evt, tabName) {
    // Скрытие всех табов
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(tab => tab.classList.remove('active'));
    
    // Удаление активного класса у кнопок
    const tabButtons = document.querySelectorAll('.tab-button');
    tabButtons.forEach(btn => btn.classList.remove('active'));
    
    // Показ выбранного таба
    document.getElementById(tabName).classList.add('active');
    evt.currentTarget.classList.add('active');
}

function showNotification(message, type = 'info') {
    // Простое уведомление - можно заменить на более красивое
    alert(message);
}

function refreshTasks() {
    loadTasks();
    showNotification('Список заданий обновлен', 'success');
}

function openArchiveView() {
    // Добавляем опцию "Удаленные" если её еще нет
    const statusFilter = document.getElementById('statusFilter');
    const deletedOption = Array.from(statusFilter.options).find(option => option.value === 'deleted');
    
    if (!deletedOption) {
        statusFilter.innerHTML += '<option value="deleted">Удаленные</option>';
    }
    
    statusFilter.value = 'deleted';
    filterTasks();
    showNotification('Показан архив заданий', 'info');
}

function showAllTasks() {
    // Восстанавливаем заголовок
    const header = document.querySelector('.header h1');
    header.innerHTML = '📋 Система управления заданиями';
    
    // Восстанавливаем таблицу заданий, если она была заменена
    const tableContainer = document.querySelector('.table-container');
    if (!tableContainer.querySelector('#tasksTable')) {
        tableContainer.innerHTML = `
            <table class="tasks-table" id="tasksTable">
                <thead>
                    <tr>
                        <th class="col-task-id sortable" data-sort="taskNumber" onclick="sortTable('taskNumber')">
                            № Задания <span class="sort-icon">↕️</span>
                        </th>
                        <th class="col-order-id sortable" data-sort="orderNumber" onclick="sortTable('orderNumber')">
                            № Заказа <span class="sort-icon">↕️</span>
                        </th>
                        <th class="col-title sortable" data-sort="title" onclick="sortTable('title')">
                            Название <span class="sort-icon">↕️</span>
                        </th>
                        <th class="col-priority sortable" data-sort="priority" onclick="sortTable('priority')">
                            Приоритет <span class="sort-icon">↕️</span>
                        </th>
                        <th class="col-status sortable" data-sort="status" onclick="sortTable('status')">
                            Статус <span class="sort-icon">↕️</span>
                        </th>
                        <th class="col-created sortable" data-sort="created" onclick="sortTable('created')">
                            Создан <span class="sort-icon">↕️</span>
                        </th>
                        <th class="col-updated sortable" data-sort="updated" onclick="sortTable('updated')">
                            Обновлен <span class="sort-icon">↕️</span>
                        </th>
                        <th class="col-progress sortable" data-sort="progress" onclick="sortTable('progress')">
                            Прогресс <span class="sort-icon">↕️</span>
                        </th>
                    </tr>
                </thead>
                <tbody id="tasksTableBody">
                    <!-- Задания будут добавлены динамически -->
                </tbody>
            </table>
        `;
    }
    
    // Сброс всех фильтров и показ всех активных заданий
    const statusFilter = document.getElementById('statusFilter');
    const priorityFilter = document.getElementById('priorityFilter');
    const searchInput = document.getElementById('searchInput');
    const periodFilter = document.getElementById('periodFilter');
    
    if (statusFilter) statusFilter.value = '';
    if (priorityFilter) priorityFilter.value = '';
    if (searchInput) searchInput.value = '';
    if (periodFilter) periodFilter.value = '';
    
    // Сброс текущей сортировки
    currentSortField = null;
    currentSortDirection = 'none';
    updateSortIcons();
    
    // Показ всех заданий
    filteredTasks = [...allTasks];
    renderTasksTable();
    
    showNotification('Показаны все активные задания', 'info');
}

function exportReport() {
    // Экспорт отчета - заглушка
    showNotification('Отчет экспортирован (функция в разработке)', 'info');
}

// Форматирование даты и времени
function formatDateTime(date) {
    return new Date(date).toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Форматирование только даты
function formatDate(date) {
    return new Date(date).toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

// Текстовые представления
function getStatusText(status) {
    const statuses = {
        'development': 'В разработке',
        'sent': 'Отправлен',
        'loaded': 'Загружен',
        'in_progress': 'В работе',
        'paused': 'Приостановлен',
        'completed': 'Выполнен',
        'deleted': 'Удалено'
    };
    return statuses[status] || status;
}

function getPriorityText(priority) {
    const priorities = {
        'low': 'Низкий',
        'normal': 'Нормальный',
        'important': 'Важный',
        'urgent': 'Срочный'
    };
    return priorities[priority] || priority;
}

function getTypeText(type) {
    const types = {
        'picking': 'Комплектация',
        'shipment': 'Отгрузка',
        'writeoff': 'Списание',
        // Старые типы для совместимости
        'inventory': 'Инвентаризация',
        'receive': 'Приемка',
        'move': 'Перемещение'
    };
    return types[type] || type;
}

// === ФУНКЦИИ ИМПОРТА EXCEL ===

// Открытие модального окна импорта
function openImportModal() {
    // Сброс состояния
    importedPositions = [];
    currentWorkbook = null;
    document.getElementById('importPreview').style.display = 'none';
    document.getElementById('createFromImportBtn').style.display = 'none';
    
    // Сброс формы
    const uploadArea = document.getElementById('uploadArea');
    uploadArea.className = 'upload-area';
    uploadArea.innerHTML = `
        <div class="upload-content">
            <div class="upload-icon">📁</div>
            <h3>Перетащите Excel файл сюда</h3>
            <p>или</p>
            <button class="btn btn-info" onclick="document.getElementById('excelFile').click()">
                Выберите файл
            </button>
            <input type="file" id="excelFile" accept=".xlsx" style="display: none;" onchange="handleFileSelect(event)">
            <div class="file-info">
                <small>Поддерживаются только файлы .xlsx</small>
            </div>
        </div>
    `;
    
    // Генерация нового номера задания
    const taskNumber = generateTaskNumber();
    document.getElementById('importTaskNumber').value = taskNumber;
    
    // Установка текущего года для номера заказа
    const currentYear = new Date().getFullYear();
    document.getElementById('importOrderNumber').placeholder = `${currentYear}/001`;
    
    document.getElementById('importModal').style.display = 'block';
    
    // Настройка drag & drop
    setupDragAndDrop();
}

// Настройка drag & drop
function setupDragAndDrop() {
    const uploadArea = document.getElementById('uploadArea');
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, preventDefaults, false);
    });
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    ['dragenter', 'dragover'].forEach(eventName => {
        uploadArea.addEventListener(eventName, () => {
            uploadArea.classList.add('dragover');
        }, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, () => {
            uploadArea.classList.remove('dragover');
        }, false);
    });
    
    uploadArea.addEventListener('drop', handleDrop, false);
}

// Обработка drop события
function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    
    if (files.length > 0) {
        handleFileUpload(files[0]);
    }
}

// Обработка выбора файла
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        handleFileUpload(file);
    }
}

// Обработка загрузки файла
function handleFileUpload(file) {
    // Проверка расширения файла
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
        showFileError('Неподдерживаемый формат файла. Пожалуйста, выберите файл .xlsx');
        return;
    }
    
    // Проверка размера файла (макс 10MB)
    if (file.size > 10 * 1024 * 1024) {
        showFileError('Файл слишком большой. Максимальный размер: 10MB');
        return;
    }
    
    showFileProcessing(file.name);
    
    // Чтение файла
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            
            parseExcelFile(workbook, file.name);
        } catch (error) {
            console.error('Ошибка чтения Excel файла:', error);
            showFileError('Ошибка чтения файла. Убедитесь, что файл не поврежден.');
        }
    };
    
    reader.onerror = function() {
        showFileError('Ошибка чтения файла');
    };
    
    reader.readAsArrayBuffer(file);
}

// Парсинг Excel файла
function parseExcelFile(workbook, filename) {
    try {
        // Получаем первый лист
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        
        // Конвертируем в JSON с сохранением пустых строк
        const jsonData = XLSX.utils.sheet_to_json(sheet, { 
            header: 1,
            defval: '',
            blankrows: true 
        });
        
        console.log('📊 Данные из Excel:', jsonData);
        
        // Извлечение названия задания из A2 (строка 1, индекс 0)
        let taskTitle = '';
        if (jsonData.length > 1 && jsonData[1] && jsonData[1][0]) {
            taskTitle = String(jsonData[1][0]).trim();
        }
        
        // Парсинг позиций
        const positions = parsePositionsFromData(jsonData);
        
        if (positions.length === 0) {
            showFileError('В файле не найдены позиции для импорта');
            return;
        }
        
        // Сохранение результатов
        importedPositions = positions;
        currentWorkbook = workbook;
        
        // Обновление интерфейса
        showImportPreview(taskTitle, positions, filename);
        
    } catch (error) {
        console.error('Ошибка парсинга Excel:', error);
        showFileError('Ошибка обработки файла. Проверьте структуру данных.');
    }
}

// Парсинг позиций из данных Excel
function parsePositionsFromData(data) {
    const positions = [];
    
    console.log('🔍 Начинаем парсинг данных Excel...');
    
    // Начинаем с 3-й строки (индекс 2), пропускаем заголовки
    for (let i = 2; i < data.length; i++) {
        const row = data[i];
        if (!row || !row[0]) continue; // Пропускаем пустые строки
        
        const cellA = String(row[0] || '').trim();
        const cellB = String(row[1] || '').trim();
        const cellC = String(row[2] || '').trim();
        
        if (!cellA) continue;
        
        console.log(`📋 Строка ${i + 1}: A="${cellA}", B="${cellB}", C="${cellC}"`);
        
        // Проверяем наличие количества в столбце B
        const quantity = parseFloat(cellB);
        if (!cellB || isNaN(quantity) || quantity <= 0) {
            console.log(`⚠️ Пропускаем строку ${i + 1}: нет корректного количества`);
            continue;
        }
        
        let designation = '';
        let name = '';
        
        // Проверяем, есть ли знак "+" в столбце C (стандартное изделие)
        if (cellC === '+' || cellC === '✓' || cellC.includes('+')) {
            console.log(`🔧 Строка ${i + 1}: Стандартное изделие`);
            
            // Для стандартных изделий парсим по паттерну "Название остальное_обозначение"
            const parsed = parseStandardItem(cellA);
            designation = parsed.designation;
            name = parsed.name;
        } else {
            console.log(`📦 Строка ${i + 1}: Обычное изделие`);
            
            // Обычные изделия: "ОБОЗНАЧЕНИЕ - НАИМЕНОВАНИЕ" или "ОБОЗНАЧЕНИЕ  -  НАИМЕНОВАНИЕ"
            const parsed = parseRegularItem(cellA);
            designation = parsed.designation;
            name = parsed.name;
        }
        
        if (designation && name) {
            positions.push({
                designation: designation,
                name: name,
                quantity: quantity,
                source: `Строка ${i + 1}`,
                isStandard: cellC === '+' || cellC === '✓' || cellC.includes('+')
            });
            
            console.log(`✅ Добавлена позиция: "${name}" (${designation}) - ${quantity} шт`);
        } else {
            console.log(`❌ Не удалось распарсить строку ${i + 1}: "${cellA}"`);
        }
    }
    
    console.log(`📊 Итого найдено позиций: ${positions.length}`);
    return positions;
}

// Парсинг обычных изделий: "ОБОЗНАЧЕНИЕ - НАИМЕНОВАНИЕ"
function parseRegularItem(text) {
    // Ищем разделитель " - " или "  -  "
    const separators = [' - ', '  -  ', '-'];
    
    for (const separator of separators) {
        if (text.includes(separator)) {
            const parts = text.split(separator);
            if (parts.length >= 2) {
                return {
                    designation: parts[0].trim(),
                    name: parts.slice(1).join(separator).trim()
                };
            }
        }
    }
    
    // Если разделитель не найден, пытаемся определить по паттернам
    const designationPatterns = [
        /^[А-Я]{1,4}\./,  // НЗ.КШ.050...
        /^\d{3}-\d{3}/,   // 057-063...
        /^[А-Я\d]+\.[А-Я\d]+\./  // Техническое обозначение с точками
    ];
    
    for (const pattern of designationPatterns) {
        const match = text.match(pattern);
        if (match) {
            const designation = match[0];
            const name = text.substring(designation.length).trim();
            return { designation, name };
        }
    }
    
    // Если ничего не подошло, возвращаем весь текст как наименование
    return {
        designation: '',
        name: text
    };
}

// Парсинг стандартных изделий: "Название техническое_обозначение"
function parseStandardItem(text) {
    console.log(`🔧 Парсинг стандартного изделия: "${text}"`);
    
    // Разбиваем на слова
    const words = text.split(/\s+/);
    let nameWords = [];
    let designationStartIndex = 0;
    
    // Проходим по словам и ищем первое слово с цифрой
    for (let i = 0; i < words.length; i++) {
        const word = words[i];
        
        // Если слово содержит цифру, это начало обозначения
        if (/\d/.test(word)) {
            designationStartIndex = i;
            break;
        }
        
        // Если слово состоит только из букв, добавляем к наименованию
        if (/^[А-Яа-яёЁ]+$/i.test(word)) {
            nameWords.push(word);
        } else {
            // Если встретился символ не буква и не цифра, это может быть начало обозначения
            designationStartIndex = i;
            break;
        }
    }
    
    // Если не найдено слов с цифрами, берем максимум 3 первых слова как название
    if (designationStartIndex === 0 && nameWords.length > 0) {
        if (nameWords.length > 3) {
            designationStartIndex = 3;
        } else {
            designationStartIndex = nameWords.length;
        }
    }
    
    // Если ничего не найдено, используем первое слово как название
    if (designationStartIndex === 0) {
        designationStartIndex = 1;
    }
    
    const name = words.slice(0, designationStartIndex).join(' ');
    const designation = words.slice(designationStartIndex).join(' ');
    
    console.log(`✅ Результат парсинга: Название="${name}", Обозначение="${designation}"`);
    
    return {
        name: name || text,
        designation: designation || ''
    };
}



// Показ предварительного просмотра
function showImportPreview(taskTitle, positions, filename) {
    // Обновление названия задания
    document.getElementById('importTaskTitle').value = taskTitle;
    
    // Показ области предварительного просмотра
    document.getElementById('importPreview').style.display = 'block';
    document.getElementById('createFromImportBtn').style.display = 'inline-block';
    
    // Отображение позиций
    renderImportPositions(positions);
    
    // Показ успешного сообщения
    showFileSuccess(`Файл "${filename}" успешно обработан. Найдено позиций: ${positions.length}`);
}

// Отрисовка импортированных позиций
function renderImportPositions(positions) {
    const tbody = document.getElementById('importPositionsBody');
    
    tbody.innerHTML = positions.map((pos, index) => `
        <tr>
            <td>
                ${index + 1}
                ${pos.isStandard ? '<span style="color: #28a745; font-weight: bold;" title="Стандартное изделие">🔧</span>' : ''}
            </td>
            <td title="${pos.designation}">
                <div style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    ${pos.designation}
                </div>
            </td>
            <td title="${pos.name}">
                <div style="max-width: 250px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    ${pos.name}
                </div>
            </td>
            <td><strong>${pos.quantity}</strong> шт</td>
            <td>
                <button class="position-remove-btn" onclick="removeImportPosition(${index})">
                    🗑️
                </button>
            </td>
        </tr>
    `).join('');
}

// Удаление позиции из импорта
function removeImportPosition(index) {
    importedPositions.splice(index, 1);
    renderImportPositions(importedPositions);
    
    if (importedPositions.length === 0) {
        document.getElementById('createFromImportBtn').style.display = 'none';
    }
}

// Создание задания из импорта
function createTaskFromImport() {
    // Валидация
    const taskTitle = document.getElementById('importTaskTitle').value.trim();
    const orderNumber = document.getElementById('importOrderNumber').value.trim();
    const taskNumber = document.getElementById('importTaskNumber').value.trim();
    
    if (!taskTitle) {
        alert('Введите название задания');
        return;
    }
    
    if (!orderNumber) {
        alert('Введите номер заказа');
        return;
    }
    
    const orderValidation = validateOrderNumber(orderNumber);
    if (!orderValidation.valid) {
        alert(orderValidation.error);
        return;
    }
    
    if (importedPositions.length === 0) {
        alert('Нет позиций для создания задания');
        return;
    }
    
    // Номер задания генерируется автоматически, валидация не нужна
    if (!taskNumber) {
        alert('Ошибка: не удалось сгенерировать номер задания');
        return;
    }
    
    // Создание задания
    const newTask = {
        taskNumber: taskNumber,
        orderNumber: orderNumber,
        title: taskTitle,
        description: `Задание создано из Excel файла. Позиций: ${importedPositions.length}`,
        priority: document.getElementById('importPriority').value,
        status: 'development',
        type: document.getElementById('importTaskType').value,
        created: new Date(),
        updated: null,
        progress: 0,
        positions: importedPositions.map(pos => ({
            sku: pos.designation,
            name: pos.name,
            quantity: pos.quantity,
            completed: 0
        })),
        history: [{
            timestamp: new Date(),
            user: 'Текущий пользователь',
            action: 'Создание задания из Excel',
            comment: `Импортировано ${importedPositions.length} позиций из Excel файла`
        }]
    };
    
    // Добавление в список заданий
    allTasks.push(newTask);
    filteredTasks = [...allTasks];
    renderTasksTable();
    
    // Сохранение в localStorage
    saveTasks();
    
    // Закрытие модального окна
    closeModal('importModal');
    
    // Уведомление
    showNotification(`Задание "${taskTitle}" успешно создано из Excel файла`, 'success');
    
    console.log('✅ Создано задание из Excel:', newTask);
}

// Показ сообщений о состоянии файла
function showFileProcessing(filename) {
    const uploadArea = document.getElementById('uploadArea');
    uploadArea.className = 'upload-area processing';
    uploadArea.innerHTML = `
        <div class="file-processing">
            <div>⏳</div>
            <div>Обработка файла "${filename}"...</div>
        </div>
    `;
}

function showFileSuccess(message) {
    const uploadArea = document.getElementById('uploadArea');
    uploadArea.className = 'upload-area';
    uploadArea.innerHTML = `
        <div class="file-success">
            <div>✅</div>
            <div>${message}</div>
        </div>
    `;
}

function showFileError(message) {
    const uploadArea = document.getElementById('uploadArea');
    uploadArea.className = 'upload-area';
    uploadArea.innerHTML = `
        <div class="file-error">
            <div>❌</div>
            <div>${message}</div>
        </div>
        <div style="margin-top: 15px;">
            <button class="btn btn-info" onclick="openImportModal()">
                Попробовать снова
            </button>
        </div>
    `;
}

// Настройка обработчиков событий
function setupEventListeners() {
    // Закрытие модальных окон при клике вне них
    window.onclick = function(event) {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            if (event.target === modal) {
                modal.style.display = 'none';
            }
        });
    };
    
    // Горячие клавиши
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            const openModals = document.querySelectorAll('.modal[style*="block"]');
            openModals.forEach(modal => {
                modal.style.display = 'none';
            });
        }
        
        if (event.ctrlKey && event.key === 'n') {
            event.preventDefault();
            openCreateTaskModal();
        }
        
        // Горячие клавиши для быстрых переходов
        if (event.ctrlKey && event.key === '1') {
            event.preventDefault();
            showAllItems();
        }
        
        if (event.ctrlKey && event.key === '2') {
            event.preventDefault();
            showReceiving();
        }
        
        if (event.ctrlKey && event.key === '3') {
            event.preventDefault();
            showArchive();
        }
        
        if (event.ctrlKey && event.key === '0') {
            event.preventDefault();
            showAllTasks();
        }
    });
    
    // Настройка глобального drag & drop
    setupGlobalDragAndDrop();
}

// Настройка глобального drag & drop
function setupGlobalDragAndDrop() {
    console.log('🚀 Настройка глобального drag & drop...');
    
    // Предотвращение стандартного поведения браузера для drag & drop
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        document.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    // Визуальная индикация при перетаскивании над окном
    let dragCounter = 0;
    
    document.addEventListener('dragenter', function(e) {
        console.log('📂 Drag enter event', e.dataTransfer.types);
        dragCounter++;
        if (e.dataTransfer.types.includes('Files')) {
            document.body.classList.add('drag-active');
            console.log('✅ Добавлен класс drag-active');
        }
    });
    
    document.addEventListener('dragover', function(e) {
        if (e.dataTransfer.types.includes('Files')) {
            document.body.classList.add('drag-active');
        }
    });
    
    document.addEventListener('dragleave', function(e) {
        console.log('📂 Drag leave event');
        dragCounter--;
        if (dragCounter <= 0) {
            dragCounter = 0;
            document.body.classList.remove('drag-active');
            console.log('❌ Убран класс drag-active');
        }
    });
    
    // Обработка drop на весь документ
    document.addEventListener('drop', function(e) {
        console.log('📂 Drop event', e.dataTransfer.files);
        dragCounter = 0;
        document.body.classList.remove('drag-active');
        
        // Если модальное окно импорта не открыто, открываем его и обрабатываем файл
        const importModal = document.getElementById('importModal');
        if (importModal && importModal.style.display !== 'block') {
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                const file = files[0];
                console.log('📁 Обрабатываем файл:', file.name);
                
                if (file.name.toLowerCase().endsWith('.xlsx')) {
                    console.log('✅ Excel файл обнаружен, открываем импорт');
                    openImportModal();
                    
                    // Небольшая задержка, чтобы модальное окно успело открыться
                    setTimeout(() => {
                        handleFileUpload(file);
                    }, 200);
                } else {
                    console.log('❌ Неподдерживаемый файл');
                    alert('Поддерживаются только файлы .xlsx');
                }
            }
        } else {
            console.log('🔄 Модальное окно импорта уже открыто');
            // Если модальное окно уже открыто, обрабатываем в нем
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                handleFileUpload(files[0]);
            }
        }
    });
    
    console.log('✅ Глобальный drag & drop настроен');
}

// Функция сортировки таблицы
function sortTable(field) {
    console.log(`🔄 Сортировка по полю: ${field}`);
    
    // Определяем направление сортировки
    if (currentSortField === field) {
        // Переключаем направление для того же поля
        switch(currentSortDirection) {
            case 'none':
                currentSortDirection = 'asc';
                break;
            case 'asc':
                currentSortDirection = 'desc';
                break;
            case 'desc':
                currentSortDirection = 'none';
                break;
        }
    } else {
        // Новое поле - начинаем с возрастания
        currentSortField = field;
        currentSortDirection = 'asc';
    }
    
    // Обновляем иконки в заголовках
    updateSortIcons();
    
    // Выполняем сортировку
    if (currentSortDirection === 'none') {
        // Возвращаем исходный порядок
        filteredTasks = [...allTasks];
        // Применяем текущие фильтры
        filterTasks();
    } else {
        // Сортируем массив
        filteredTasks.sort((a, b) => {
            let valueA = getSortValue(a, field);
            let valueB = getSortValue(b, field);
            
            // Обработка null/undefined значений
            if (valueA === null || valueA === undefined) valueA = '';
            if (valueB === null || valueB === undefined) valueB = '';
            
            let comparison = 0;
            
            // Специальная обработка для разных типов полей
            switch(field) {
                case 'taskNumber':
                case 'orderNumber':
                    // Сортировка строк
                    comparison = valueA.toString().localeCompare(valueB.toString(), 'ru', { numeric: true });
                    break;
                    
                case 'created':
                case 'updated':
                    // Сортировка дат
                    const dateA = new Date(valueA);
                    const dateB = new Date(valueB);
                    comparison = dateA - dateB;
                    break;
                    
                case 'progress':
                    // Сортировка чисел
                    comparison = valueA - valueB;
                    break;
                    
                case 'priority':
                    // Сортировка приоритетов по важности
                    const priorityOrder = { 'low': 1, 'normal': 2, 'important': 3, 'urgent': 4 };
                    comparison = (priorityOrder[valueA] || 0) - (priorityOrder[valueB] || 0);
                    break;
                    
                case 'status':
                    // Сортировка статусов по порядку выполнения
                    const statusOrder = { 
                        'development': 1, 
                        'sent': 2, 
                        'loaded': 3, 
                        'in_progress': 4, 
                        'paused': 5, 
                        'completed': 6 
                    };
                    comparison = (statusOrder[valueA] || 0) - (statusOrder[valueB] || 0);
                    break;
                    
                default:
                    // Обычная строковая сортировка
                    comparison = valueA.toString().localeCompare(valueB.toString(), 'ru');
                    break;
            }
            
            return currentSortDirection === 'asc' ? comparison : -comparison;
        });
    }
    
    // Перерисовываем таблицу
    renderTasksTable();
    
    console.log(`✅ Сортировка ${currentSortDirection} по ${field} завершена`);
}

// Получение значения для сортировки
function getSortValue(task, field) {
    switch(field) {
        case 'taskNumber': return task.taskNumber;
        case 'orderNumber': return task.orderNumber;
        case 'title': return task.title;
        case 'priority': return task.priority;
        case 'status': return task.status;
        case 'created': return task.created;
        case 'updated': return task.updated;
        case 'progress': return task.progress;
        default: return '';
    }
}

// Обновление иконок сортировки в заголовках
function updateSortIcons() {
    // Убираем классы сортировки у всех заголовков
    document.querySelectorAll('.tasks-table th.sortable').forEach(th => {
        th.classList.remove('sort-asc', 'sort-desc');
        const icon = th.querySelector('.sort-icon');
        if (icon) {
            icon.innerHTML = '↕️';
        }
    });
    
    // Устанавливаем класс для текущего поля сортировки
    if (currentSortField && currentSortDirection !== 'none') {
        const currentHeader = document.querySelector(`[data-sort="${currentSortField}"]`);
        if (currentHeader) {
            currentHeader.classList.add(`sort-${currentSortDirection}`);
            const icon = currentHeader.querySelector('.sort-icon');
            if (icon) {
                if (currentSortDirection === 'asc') {
                    icon.innerHTML = '🔺';
                } else if (currentSortDirection === 'desc') {
                    icon.innerHTML = '🔻';
                }
            }
        }
    }
}

// === ФУНКЦИИ ПРИЕМКИ ===

// Загрузка данных приемки
function loadReceivingItems() {
    try {
        const savedData = localStorage.getItem('warehouse_receiving');
        if (savedData) {
            const data = JSON.parse(savedData);
            receivingItems = data || [];
        } else {
            // Создаем тестовые данные приемки
            receivingItems = [
                {
                    id: 'R001',
                    date: '2024-06-08',
                    orderNumber: '2024/038',
                    designation: 'НЗ.КШ.050.16.01.01М.100',
                    name: 'Седло клапана',
                    quantity: 50,
                    routeCard: 'МК-2024-001',
                    npStatus: 'approved'
                },
                {
                    id: 'R002',
                    date: '2024-06-09',
                    orderNumber: '2024/045',
                    designation: 'НЗ.КШ.050.16.02.01.010',
                    name: 'Пружина тарельчатая',
                    quantity: 25,
                    routeCard: 'МК-2024-002',
                    npStatus: 'pending'
                }
            ];
            saveReceivingItems();
        }
        
        filteredReceivingItems = [...receivingItems];
        console.log(`✅ Загружено ${receivingItems.length} позиций приемки`);
    } catch (error) {
        console.error('❌ Ошибка загрузки данных приемки:', error);
    }
}

// Сохранение данных приемки в localStorage
function saveReceivingItems() {
    try {
        localStorage.setItem('warehouse_receiving', JSON.stringify(receivingItems));
        console.log('💾 Данные приемки сохранены');
    } catch (error) {
        console.error('❌ Ошибка сохранения данных приемки:', error);
    }
}

// Открытие модального окна приемки
function openReceivingModal() {
    loadReceivingItems();
    renderReceivingTable();
    document.getElementById('receivingModal').style.display = 'block';
}

// Рендеринг таблицы приемки
function renderReceivingTable() {
    const tbody = document.getElementById('receivingTableBody');
    
    if (filteredReceivingItems.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 40px; color: #6c757d;">
                    📦 Позиций приемки не найдено
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = filteredReceivingItems.map(item => {
        const statusClass = `status ${item.npStatus}`;
        const statusText = getReceivingStatusText(item.npStatus);
        
        return `
            <tr ondblclick="editReceivingItem('${item.id}')">
                <td>${formatDate(new Date(item.date))}</td>
                <td><strong>${item.orderNumber}</strong></td>
                <td><code>${item.designation}</code></td>
                <td>${item.name}</td>
                <td><strong>${item.quantity}</strong></td>
                <td>${item.routeCard || '—'}</td>
                <td><span class="${statusClass}">${statusText}</span></td>
            </tr>
        `;
    }).join('');
}

// Получение текста статуса НП
function getReceivingStatusText(status) {
    const statuses = {
        'pending': 'Ожидает',
        'approved': 'Одобрено',
        'rejected': 'Отклонено'
    };
    return statuses[status] || status;
}

// Открытие модального окна добавления позиции приемки
function openAddReceivingItemModal() {
    const form = document.getElementById('addReceivingItemForm');
    form.reset();
    
    // Устанавливаем текущую дату
    document.getElementById('receivingDate').value = new Date().toISOString().split('T')[0];
    
    // Устанавливаем текущий год для номера заказа
    const currentYear = new Date().getFullYear();
    document.getElementById('receivingOrderNumber').placeholder = `${currentYear}/001`;
    
    document.getElementById('addReceivingItemModal').style.display = 'block';
}

// Добавление новой позиции приемки
function addReceivingItem() {
    const date = document.getElementById('receivingDate').value;
    const orderNumber = document.getElementById('receivingOrderNumber').value;
    const designation = document.getElementById('receivingDesignation').value;
    const name = document.getElementById('receivingName').value;
    const quantity = parseInt(document.getElementById('receivingQuantity').value);
    const routeCard = document.getElementById('receivingRouteCard').value;
    const npStatus = document.getElementById('receivingNpStatus').value;
    
    // Валидация
    if (!date || !orderNumber || !designation || !name || !quantity) {
        alert('Пожалуйста, заполните все обязательные поля');
        return;
    }
    
    // Валидация номера заказа
    const orderValidation = validateOrderNumber(orderNumber);
    if (!orderValidation.valid) {
        alert(orderValidation.error);
        return;
    }
    
    // Создание новой позиции
    const newItem = {
        id: 'R' + String(Date.now()).slice(-6),
        date: date,
        orderNumber: orderNumber,
        designation: designation,
        name: name,
        quantity: quantity,
        routeCard: routeCard || null,
        npStatus: npStatus
    };
    
    // Добавление в массив
    receivingItems.push(newItem);
    filteredReceivingItems = [...receivingItems];
    
    // Сохранение и обновление таблицы
    saveReceivingItems();
    renderReceivingTable();
    
    // Закрытие модального окна
    closeModal('addReceivingItemModal');
    
    showNotification('Позиция приемки добавлена успешно', 'success');
    console.log('✅ Добавлена новая позиция приемки:', newItem);
}

// Фильтрация позиций приемки
function filterReceivingItems() {
    const dateFilter = document.getElementById('receivingDateFilter').value;
    const orderFilter = document.getElementById('receivingOrderFilter').value.toLowerCase();
    const statusFilter = document.getElementById('receivingStatusFilter').value;
    const searchFilter = document.getElementById('receivingSearchFilter').value.toLowerCase();
    
    filteredReceivingItems = receivingItems.filter(item => {
        const matchesDate = !dateFilter || item.date === dateFilter;
        const matchesOrder = !orderFilter || item.orderNumber.toLowerCase().includes(orderFilter);
        const matchesStatus = !statusFilter || item.npStatus === statusFilter;
        const matchesSearch = !searchFilter || 
            item.designation.toLowerCase().includes(searchFilter) ||
            item.name.toLowerCase().includes(searchFilter);
        
        return matchesDate && matchesOrder && matchesStatus && matchesSearch;
    });
    
    renderReceivingTable();
}

// Сортировка таблицы приемки
function sortReceivingTable(field) {
    console.log(`🔄 Сортировка приемки по полю: ${field}`);
    
    // Определяем направление сортировки
    if (currentReceivingSortField === field) {
        switch(currentReceivingSortDirection) {
            case 'none':
                currentReceivingSortDirection = 'asc';
                break;
            case 'asc':
                currentReceivingSortDirection = 'desc';
                break;
            case 'desc':
                currentReceivingSortDirection = 'none';
                break;
        }
    } else {
        currentReceivingSortField = field;
        currentReceivingSortDirection = 'asc';
    }
    
    // Обновляем иконки в заголовках
    updateReceivingSortIcons();
    
    // Выполняем сортировку
    if (currentReceivingSortDirection === 'none') {
        filteredReceivingItems = [...receivingItems];
        filterReceivingItems();
    } else {
        filteredReceivingItems.sort((a, b) => {
            let valueA = getReceivingSortValue(a, field);
            let valueB = getReceivingSortValue(b, field);
            
            if (valueA === null || valueA === undefined) valueA = '';
            if (valueB === null || valueB === undefined) valueB = '';
            
            let comparison = 0;
            
            switch(field) {
                case 'date':
                    comparison = new Date(valueA) - new Date(valueB);
                    break;
                case 'quantity':
                    comparison = valueA - valueB;
                    break;
                case 'npStatus':
                    const statusOrder = { 'pending': 1, 'approved': 2, 'rejected': 3 };
                    comparison = (statusOrder[valueA] || 0) - (statusOrder[valueB] || 0);
                    break;
                default:
                    comparison = valueA.toString().localeCompare(valueB.toString(), 'ru');
                    break;
            }
            
            return currentReceivingSortDirection === 'asc' ? comparison : -comparison;
        });
    }
    
    renderReceivingTable();
}

// Получение значения для сортировки приемки
function getReceivingSortValue(item, field) {
    switch(field) {
        case 'date': return item.date;
        case 'orderNumber': return item.orderNumber;
        case 'designation': return item.designation;
        case 'name': return item.name;
        case 'quantity': return item.quantity;
        case 'routeCard': return item.routeCard;
        case 'npStatus': return item.npStatus;
        default: return '';
    }
}

// Обновление иконок сортировки для приемки
function updateReceivingSortIcons() {
    document.querySelectorAll('#receivingTable th.sortable').forEach(th => {
        th.classList.remove('sort-asc', 'sort-desc');
        const icon = th.querySelector('.sort-icon');
        if (icon) {
            icon.innerHTML = '↕️';
        }
    });
    
    if (currentReceivingSortField && currentReceivingSortDirection !== 'none') {
        const currentHeader = document.querySelector(`#receivingTable [data-sort="${currentReceivingSortField}"]`);
        if (currentHeader) {
            currentHeader.classList.add(`sort-${currentReceivingSortDirection}`);
            const icon = currentHeader.querySelector('.sort-icon');
            if (icon) {
                if (currentReceivingSortDirection === 'asc') {
                    icon.innerHTML = '🔺';
                } else if (currentReceivingSortDirection === 'desc') {
                    icon.innerHTML = '🔻';
                }
            }
        }
    }
}

// Экспорт отчета по приемке
function exportReceivingReport() {
    showNotification('Отчет по приемке экспортирован (функция в разработке)', 'info');
}

// Новые функции для основных разделов
function showAllItems() {
    console.log('📦 Переход к разделу "Все позиции"');
    
    // Меняем заголовок
    const header = document.querySelector('.header h1');
    header.innerHTML = '📦 Все позиции';
    
    // Очищаем контент и показываем все позиции
    const tableContainer = document.querySelector('.table-container');
    tableContainer.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #5a9fd4;">
            <div style="font-size: 3rem; margin-bottom: 20px;">📦</div>
            <h2 style="color: #5a9fd4; margin-bottom: 10px;">Все позиции</h2>
            <p style="color: #7a8fa3;">Полный каталог всех товаров и позиций на складе</p>
            <div style="margin-top: 30px;">
                <button class="btn btn-primary" onclick="showAllTasks()">
                    🔙 Вернуться к заданиям
                </button>
            </div>
        </div>
    `;
    
    // showNotification('Переход к разделу "Все позиции"', 'success'); // убрано уведомление
}

function showReceiving() {
    console.log('📥 Переход к разделу "Приемка"');
    
    // Меняем заголовок
    const header = document.querySelector('.header h1');
    header.innerHTML = '📥 Приемка товаров';
    
    // Очищаем контент и показываем приемку
    const tableContainer = document.querySelector('.table-container');
    tableContainer.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #d4a574;">
            <div style="font-size: 3rem; margin-bottom: 20px;">📥</div>
            <h2 style="color: #d4a574; margin-bottom: 10px;">Приемка товаров</h2>
            <p style="color: #7a8fa3;">Управление поступающими товарами и заказами</p>
            <div style="margin-top: 30px;">
                <button class="btn btn-warning" onclick="openReceivingModal()">
                    📦 Открыть приемку
                </button>
                <button class="btn btn-primary" onclick="showAllTasks()" style="margin-left: 10px;">
                    🔙 Вернуться к заданиям
                </button>
            </div>
        </div>
    `;
    
    // showNotification('Переход к разделу "Приемка"', 'success'); // убрано уведомление
}

function showArchive() {
    console.log('🗂️ Переход к разделу "Архив"');
    
    // Меняем заголовок
    const header = document.querySelector('.header h1');
    header.innerHTML = '🗂️ Архив операций';
    
    // Очищаем контент и показываем архив
    const tableContainer = document.querySelector('.table-container');
    tableContainer.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #7a8fa3;">
            <div style="font-size: 3rem; margin-bottom: 20px;">🗂️</div>
            <h2 style="color: #7a8fa3; margin-bottom: 10px;">Архив операций</h2>
            <p style="color: #7a8fa3;">История всех выполненных операций и движений товаров</p>
            <div style="margin-top: 30px;">
                <button class="btn btn-secondary" onclick="openArchiveView()">
                    📋 Открыть архив
                </button>
                <button class="btn btn-primary" onclick="showAllTasks()" style="margin-left: 10px;">
                    🔙 Вернуться к заданиям
                </button>
            </div>
        </div>
    `;
    
    // showNotification('Переход к разделу "Архив"', 'success'); // убрано уведомление
}