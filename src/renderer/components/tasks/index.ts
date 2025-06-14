// Экспорт всех компонентов для управления задачами
export { default as TaskList } from './TaskList';
export { default as TaskForm } from './TaskForm';
export { default as TaskDetails } from './TaskDetails';
export { default as ImportDialog } from './ImportDialog';
export { default as DeviceSelector } from './DeviceSelector';

// Дополнительные типы для компонентов
export interface TaskComponentProps {
  onTaskSelect?: (task: any) => void;
  onTaskEdit?: (task: any) => void;
  onTaskCreate?: () => void;
  onTaskImport?: () => void;
  onTaskSend?: (task: any) => void;
} 