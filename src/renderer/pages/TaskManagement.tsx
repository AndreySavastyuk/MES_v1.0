import React, { useState } from 'react';
import {
  Title,
  Panel
} from '@ui5/webcomponents-react';
import TaskList from '../components/tasks/TaskList';
import TaskForm from '../components/tasks/TaskForm';
import TaskDetails from '../components/tasks/TaskDetails';
import ImportDialog from '../components/tasks/ImportDialog';
import DeviceSelector from '../components/tasks/DeviceSelector';
import { PickTask } from '../../shared/types';

const TaskManagement: React.FC = () => {
  // Состояния модальных окон
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [taskDetailsOpen, setTaskDetailsOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [deviceSelectorOpen, setDeviceSelectorOpen] = useState(false);

  // Состояния данных
  const [selectedTask, setSelectedTask] = useState<PickTask | null>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [taskForSending, setTaskForSending] = useState<PickTask | null>(null);

  // Состояние для обновления списка
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Функция для принудительного обновления списка задач
  const refreshTaskList = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // Обработчики для TaskList
  const handleTaskSelect = (task: PickTask) => {
    setSelectedTaskId(task.id);
    setTaskDetailsOpen(true);
  };

  const handleTaskEdit = (task: PickTask) => {
    setSelectedTask(task);
    setFormMode('edit');
    setTaskFormOpen(true);
  };

  const handleTaskCreate = () => {
    setSelectedTask(null);
    setFormMode('create');
    setTaskFormOpen(true);
  };

  const handleTaskImport = () => {
    setImportDialogOpen(true);
  };

  const handleTaskSend = (task: PickTask) => {
    setTaskForSending(task);
    setDeviceSelectorOpen(true);
  };

  // Обработчики для TaskForm
  const handleTaskSave = async (taskData: any) => {
    try {
      const url = formMode === 'create' ? '/api/tasks' : `/api/tasks/${selectedTask?.id}`;
      const method = formMode === 'create' ? 'POST' : 'PUT';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(taskData)
      });

      const result = await response.json();

      if (result.success) {
        // Показать уведомление об успехе
        showToast(
          formMode === 'create' ? 'Задача успешно создана' : 'Задача успешно обновлена',
          'Success'
        );
        
        // Обновить список задач
        refreshTaskList();
        
        // Закрыть форму
        setTaskFormOpen(false);
        setSelectedTask(null);
      } else {
        throw new Error(result.error || 'Ошибка сохранения задачи');
      }
    } catch (error: any) {
      console.error('Ошибка сохранения задачи:', error);
      showToast(`Ошибка: ${error.message}`, 'Error');
      throw error; // Пробрасываем ошибку, чтобы форма не закрылась
    }
  };

  const handleTaskFormClose = () => {
    setTaskFormOpen(false);
    setSelectedTask(null);
  };

  // Обработчики для TaskDetails
  const handleTaskDetailsEdit = (task: PickTask) => {
    setTaskDetailsOpen(false);
    handleTaskEdit(task);
  };

  const handleTaskDetailsSend = (task: PickTask) => {
    setTaskDetailsOpen(false);
    handleTaskSend(task);
  };

  const handleTaskDetailsClose = () => {
    setTaskDetailsOpen(false);
    setSelectedTaskId(null);
  };

  // Обработчики для ImportDialog
  const handleImportComplete = () => {
    showToast('Импорт успешно завершен', 'Success');
    refreshTaskList();
    setImportDialogOpen(false);
  };

  const handleImportClose = () => {
    setImportDialogOpen(false);
  };

  // Обработчики для DeviceSelector
  const handleSendToDevice = async (deviceId: number) => {
    try {
      // Показать уведомление об успехе
      showToast('Задача отправлена на устройство', 'Success');
      
      // Обновить список задач
      refreshTaskList();
      
      // Закрыть селектор устройств
      setDeviceSelectorOpen(false);
      setTaskForSending(null);
    } catch (error: any) {
      console.error('Ошибка отправки задачи:', error);
      showToast(`Ошибка отправки: ${error.message}`, 'Error');
    }
  };

  const handleDeviceSelectorClose = () => {
    setDeviceSelectorOpen(false);
    setTaskForSending(null);
  };

  // Функция для показа уведомлений (упрощенная версия)
  const showToast = (message: string, type: 'Success' | 'Error' | 'Warning' | 'Information' = 'Information') => {
    // Простое уведомление через alert для демонстрации
    // В production версии можно использовать библиотеку уведомлений
    console.log(`${type}: ${message}`);
    
    // Создаем временное уведомление в правом верхнем углу
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'Error' ? 'var(--sapErrorBackground)' : 
                   type === 'Success' ? 'var(--sapSuccessBackground)' : 
                   type === 'Warning' ? 'var(--sapWarningBackground)' : 
                   'var(--sapInformationBackground)'};
      color: ${type === 'Error' ? 'var(--sapErrorColor)' : 
                type === 'Success' ? 'var(--sapSuccessColor)' : 
                type === 'Warning' ? 'var(--sapWarningColor)' : 
                'var(--sapInformationColor)'};
      padding: 12px 16px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      z-index: 9999;
      font-family: var(--sapFontFamily);
      font-size: 0.875rem;
      border-left: 4px solid ${type === 'Error' ? 'var(--sapErrorBorderColor)' : 
                              type === 'Success' ? 'var(--sapSuccessBorderColor)' : 
                              type === 'Warning' ? 'var(--sapWarningBorderColor)' : 
                              'var(--sapInformationBorderColor)'};
      transition: opacity 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    // Анимация появления
    setTimeout(() => {
      notification.style.opacity = '1';
    }, 10);
    
    // Удаление уведомления
    setTimeout(() => {
      notification.style.opacity = '0';
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification);
        }
      }, 300);
    }, 3000);
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Заголовок страницы */}
      <div style={{ 
        padding: '1rem 2rem', 
        borderBottom: '1px solid var(--sapNeutralBorderColor)',
        backgroundColor: 'var(--sapShell_BackgroundColor)'
      }}>
        <Title level="H2">
          Управление задачами склада
        </Title>
        <p style={{ 
          margin: '0.5rem 0 0 0', 
          color: 'var(--sapContent_LabelColor)',
          fontSize: '0.875rem'
        }}>
          Создание, назначение и отслеживание задач по сборке заказов
        </p>
      </div>

      {/* Основное содержимое */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <TaskList
          key={refreshTrigger} // Принудительное обновление при изменении
          onTaskSelect={handleTaskSelect}
          onTaskEdit={handleTaskEdit}
          onTaskCreate={handleTaskCreate}
          onTaskImport={handleTaskImport}
          onTaskSend={handleTaskSend}
        />
      </div>

      {/* Модальные окна */}
      <TaskForm
        task={selectedTask}
        isOpen={taskFormOpen}
        onClose={handleTaskFormClose}
        onSave={handleTaskSave}
        mode={formMode}
      />

      <TaskDetails
        taskId={selectedTaskId}
        isOpen={taskDetailsOpen}
        onClose={handleTaskDetailsClose}
        onEdit={handleTaskDetailsEdit}
        onSend={handleTaskDetailsSend}
      />

      <ImportDialog
        isOpen={importDialogOpen}
        onClose={handleImportClose}
        onImportComplete={handleImportComplete}
      />

      <DeviceSelector
        task={taskForSending}
        isOpen={deviceSelectorOpen}
        onClose={handleDeviceSelectorClose}
        onSendToDevice={handleSendToDevice}
      />
    </div>
  );
};

export default TaskManagement; 

