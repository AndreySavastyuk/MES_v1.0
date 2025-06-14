import React, { useState, useEffect, useCallback } from 'react';
import {
  Button,
  Input,
  Select,
  Option,
  Table,
  TableColumn,
  TableRow,
  TableCell,
  Badge,
  Icon,
  DatePicker,
  Panel,
  Title,
  Dialog,
  Bar,
  Toolbar,
  ToolbarSpacer,
  MessageStrip
} from '@ui5/webcomponents-react';
import { PickTask } from '../../../shared/types';

interface TaskListProps {
  onTaskSelect?: (task: PickTask) => void;
  onTaskEdit?: (task: PickTask) => void;
  onTaskCreate?: () => void;
  onTaskImport?: () => void;
  onTaskSend?: (task: PickTask) => void;
}

interface TaskFilters {
  search: string;
  status: string;
  priority: string;
  dateFrom: string;
  dateTo: string;
  assignedDevice: string;
}

const TaskList: React.FC<TaskListProps> = ({
  onTaskSelect,
  onTaskEdit,
  onTaskCreate,
  onTaskImport,
  onTaskSend
}) => {
  const [tasks, setTasks] = useState<PickTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [selectedTasks, setSelectedTasks] = useState<PickTask[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalTasks, setTotalTasks] = useState(0);
  const itemsPerPage = 20;

  // Фильтры
  const [filters, setFilters] = useState<TaskFilters>({
    search: '',
    status: '',
    priority: '',
    dateFrom: '',
    dateTo: '',
    assignedDevice: ''
  });

  // Статусы задач
  const statusOptions = [
    { value: '', text: 'Все статусы' },
    { value: 'pending', text: 'Ожидает' },
    { value: 'in_progress', text: 'В процессе' },
    { value: 'completed', text: 'Завершена' },
    { value: 'cancelled', text: 'Отменена' },
    { value: 'on_hold', text: 'Приостановлена' }
  ];

  // Приоритеты
  const priorityOptions = [
    { value: '', text: 'Все приоритеты' },
    { value: '5', text: 'Критический (5)' },
    { value: '4', text: 'Высокий (4)' },
    { value: '3', text: 'Средний (3)' },
    { value: '2', text: 'Низкий (2)' },
    { value: '1', text: 'Очень низкий (1)' }
  ];

  // Загрузка задач
  const loadTasks = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const queryParams = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        ...(filters.search && { search: filters.search }),
        ...(filters.status && { status: filters.status }),
        ...(filters.priority && { priority: filters.priority }),
        ...(filters.dateFrom && { date_from: filters.dateFrom }),
        ...(filters.dateTo && { date_to: filters.dateTo }),
        ...(filters.assignedDevice && { assigned_device: filters.assignedDevice })
      });

      const response = await fetch(`/api/tasks?${queryParams}`);
      const result = await response.json();

      if (result.success) {
        setTasks(result.data);
        setTotalPages(result.pagination?.totalPages || 0);
        setTotalTasks(result.pagination?.total || 0);
      } else {
        throw new Error(result.error || 'Ошибка загрузки задач');
      }
    } catch (err: any) {
      setError(err.message);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage, filters]);

  // Эффект для загрузки задач
  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // Обработчики фильтров
  const handleFilterChange = (field: keyof TaskFilters, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setCurrentPage(1); // Сброс на первую страницу при изменении фильтров
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      status: '',
      priority: '',
      dateFrom: '',
      dateTo: '',
      assignedDevice: ''
    });
    setCurrentPage(1);
  };

  // Функция для получения цвета бейджа статуса
  const getStatusBadgeColorScheme = (status: string) => {
    switch (status) {
      case 'pending': return '6';
      case 'in_progress': return '8';
      case 'completed': return '7';
      case 'cancelled': return '1';
      case 'on_hold': return '2';
      default: return '6';
    }
  };

  // Функция для получения цвета приоритета
  const getPriorityColor = (priority: number) => {
    if (priority >= 4) return 'var(--sapErrorColor)';
    if (priority === 3) return 'var(--sapWarningColor)';
    return 'var(--sapSuccessColor)';
  };

  // Форматирование даты
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Удаление задачи
  const handleDeleteTask = async (task: PickTask) => {
    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'DELETE'
      });
      
      const result = await response.json();
      
      if (result.success) {
        await loadTasks(); // Обновить список
      } else {
        throw new Error(result.error || 'Ошибка удаления задачи');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Отправка задачи на устройство
  const handleSendTask = (task: PickTask) => {
    if (onTaskSend) {
      onTaskSend(task);
    }
  };

  return (
    <div style={{ padding: '1rem' }}>
      {/* Заголовок и кнопки */}
      <Bar>
        <Title slot="startContent" level="H3">
          Управление задачами ({totalTasks})
        </Title>
        <div slot="endContent" style={{ display: 'flex', gap: '0.5rem' }}>
          <Button design="Emphasized" onClick={onTaskCreate}>
            <Icon name="add" slot="icon" />
            Создать задачу
          </Button>
          <Button design="Default" onClick={onTaskImport}>
            <Icon name="upload" slot="icon" />
            Импорт
          </Button>
          <Button design="Default" onClick={loadTasks}>
            <Icon name="refresh" slot="icon" />
            Обновить
          </Button>
        </div>
      </Bar>

      {/* Панель фильтров */}
      <Panel 
        headerText="Фильтры поиска" 
        collapsed={false}
        style={{ marginTop: '1rem', marginBottom: '1rem' }}
      >
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '1rem',
          padding: '1rem'
        }}>
          <Input
            placeholder="Поиск по номеру или описанию..."
            value={filters.search}
            onInput={(e: any) => handleFilterChange('search', e.target.value)}
          />
          
          <Select
            value={filters.status}
            onChange={(e: any) => handleFilterChange('status', e.detail.selectedOption.value)}
          >
            {statusOptions.map(option => (
              <Option key={option.value} value={option.value}>
                {option.text}
              </Option>
            ))}
          </Select>

          <Select
            value={filters.priority}
            onChange={(e: any) => handleFilterChange('priority', e.detail.selectedOption.value)}
          >
            {priorityOptions.map(option => (
              <Option key={option.value} value={option.value}>
                {option.text}
              </Option>
            ))}
          </Select>

          <DatePicker
            placeholder="Дата от"
            value={filters.dateFrom}
            onChange={(e: any) => handleFilterChange('dateFrom', e.target.value)}
          />

          <DatePicker
            placeholder="Дата до"
            value={filters.dateTo}
            onChange={(e: any) => handleFilterChange('dateTo', e.target.value)}
          />

          <Button design="Default" onClick={clearFilters}>
            Очистить фильтры
          </Button>
        </div>
      </Panel>

      {/* Сообщение об ошибке */}
      {error && (
        <MessageStrip design="Negative" style={{ marginBottom: '1rem' }}>
          {error}
        </MessageStrip>
      )}

      {/* Таблица задач */}
      <Table 
        mode="MultiSelect"
        onSelectionChange={(e: any) => setSelectedTasks(e.detail.selectedRows)}
        busy={loading}
        style={{ marginBottom: '1rem' }}
      >
        <TableColumn slot="columns">
          <span style={{ fontWeight: 'bold' }}>Номер</span>
        </TableColumn>
        <TableColumn slot="columns">
          <span style={{ fontWeight: 'bold' }}>Описание</span>
        </TableColumn>
        <TableColumn slot="columns">
          <span style={{ fontWeight: 'bold' }}>Статус</span>
        </TableColumn>
        <TableColumn slot="columns">
          <span style={{ fontWeight: 'bold' }}>Приоритет</span>
        </TableColumn>
        <TableColumn slot="columns">
          <span style={{ fontWeight: 'bold' }}>Прогресс</span>
        </TableColumn>
        <TableColumn slot="columns">
          <span style={{ fontWeight: 'bold' }}>Создана</span>
        </TableColumn>
        <TableColumn slot="columns">
          <span style={{ fontWeight: 'bold' }}>Дедлайн</span>
        </TableColumn>
        <TableColumn slot="columns">
          <span style={{ fontWeight: 'bold' }}>Действия</span>
        </TableColumn>

        {tasks.map((task) => (
          <TableRow key={task.id}>
            <TableCell>
              <strong>{task.number}</strong>
            </TableCell>
            <TableCell>
              <div style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {task.description}
              </div>
            </TableCell>
            <TableCell>
              <Badge colorScheme={getStatusBadgeColorScheme(task.status)}>
                {statusOptions.find(s => s.value === task.status)?.text || task.status}
              </Badge>
            </TableCell>
            <TableCell>
              <span style={{ color: getPriorityColor(task.priority), fontWeight: 'bold' }}>
                {task.priority}
              </span>
            </TableCell>
            <TableCell>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span>{task.picked_items || 0}/{task.total_items || 0}</span>
                {task.total_items > 0 && (
                  <div style={{ 
                    width: '60px', 
                    height: '6px', 
                    backgroundColor: 'var(--sapNeutralBackground)',
                    borderRadius: '3px',
                    overflow: 'hidden'
                  }}>
                    <div style={{ 
                      width: `${((task.picked_items || 0) / task.total_items) * 100}%`,
                      height: '100%',
                      backgroundColor: 'var(--sapSuccessColor)'
                    }} />
                  </div>
                )}
              </div>
            </TableCell>
            <TableCell>
              {formatDate(task.created_at)}
            </TableCell>
            <TableCell>
              {task.deadline ? (
                <span style={{ 
                  color: new Date(task.deadline) < new Date() ? 'var(--sapErrorColor)' : 'inherit'
                }}>
                  {formatDate(task.deadline)}
                </span>
              ) : '-'}
            </TableCell>
            <TableCell>
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                <Button 
                  design="Transparent" 
                  icon="detail-view"
                  onClick={() => onTaskSelect?.(task)}
                  tooltip="Просмотр"
                />
                <Button 
                  design="Transparent" 
                  icon="edit"
                  onClick={() => onTaskEdit?.(task)}
                  tooltip="Редактировать"
                />
                {task.status === 'pending' && (
                  <Button 
                    design="Transparent" 
                    icon="share"
                    onClick={() => handleSendTask(task)}
                    tooltip="Отправить на устройство"
                  />
                )}
                {task.status !== 'in_progress' && (
                  <Button 
                    design="Transparent" 
                    icon="delete"
                    onClick={() => {
                      handleDeleteTask(task);
                    }}
                    tooltip="Удалить"
                  />
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </Table>

      {/* Пагинация */}
      {totalPages > 1 && (
        <Toolbar style={{ justifyContent: 'center' }}>
          <Button 
            design="Transparent"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(1)}
          >
            Первая
          </Button>
          <Button 
            design="Transparent"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(currentPage - 1)}
          >
            Предыдущая
          </Button>
          
          <ToolbarSpacer />
          
          <span style={{ padding: '0 1rem' }}>
            Страница {currentPage} из {totalPages}
          </span>
          
          <ToolbarSpacer />
          
          <Button 
            design="Transparent"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(currentPage + 1)}
          >
            Следующая
          </Button>
          <Button 
            design="Transparent"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(totalPages)}
          >
            Последняя
          </Button>
        </Toolbar>
      )}
    </div>
  );
};

export default TaskList; 

