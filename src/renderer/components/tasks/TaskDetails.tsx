import React, { useState, useEffect } from 'react';
import {
  Dialog,
  Title,
  Panel,
  Badge,
  ProgressIndicator,
  Table,
  TableColumn,
  TableRow,
  TableCell,
  Card,
  CardHeader,
  Icon,
  Button,
  MessageStrip,
  Bar,
  Toolbar,
  ToolbarSpacer
} from '@ui5/webcomponents-react';
import { PickTask } from '../../../shared/types';

interface TaskDetailsProps {
  taskId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (task: PickTask) => void;
  onSend?: (task: PickTask) => void;
}

interface TaskProgress {
  task_id: number;
  task_number: string;
  status: string;
  items_progress: {
    total: number;
    picked: number;
    partial: number;
    not_found: number;
    pending: number;
    percentage: number;
  };
  quantity_progress: {
    total_required: number;
    total_picked: number;
    percentage: number;
  };
  time_metrics: {
    started_at: string | null;
    time_elapsed_minutes: number;
    estimated_time_remaining_minutes: number | null;
    deadline: string | null;
  };
  items_details: Array<{
    id: number;
    part_number: string;
    part_name: string;
    location: string;
    quantity_required: number;
    quantity_picked: number;
    status: string;
    picked_at: string | null;
    progress_percentage: number;
  }>;
  last_updated: string;
}

const TaskDetails: React.FC<TaskDetailsProps> = ({
  taskId,
  isOpen,
  onClose,
  onEdit,
  onSend
}) => {
  const [task, setTask] = useState<PickTask | null>(null);
  const [progress, setProgress] = useState<TaskProgress | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  // Загрузка данных задачи
  useEffect(() => {
    if (taskId && isOpen) {
      loadTaskDetails();
      loadTaskProgress();
      
      // Автообновление прогресса каждые 30 секунд для активных задач
      const interval = setInterval(() => {
        if (task?.status === 'in_progress') {
          loadTaskProgress();
        }
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [taskId, isOpen]);

  const loadTaskDetails = async () => {
    if (!taskId) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/tasks/${taskId}`);
      const result = await response.json();

      if (result.success) {
        setTask(result.data.task);
      } else {
        throw new Error(result.error || 'Ошибка загрузки задачи');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadTaskProgress = async () => {
    if (!taskId) return;

    try {
      const response = await fetch(`/api/tasks/${taskId}/progress`);
      const result = await response.json();

      if (result.success) {
        setProgress(result.data);
      } else {
        console.error('Ошибка загрузки прогресса:', result.error);
      }
    } catch (err) {
      console.error('Ошибка загрузки прогресса:', err);
    }
  };

  // Функции форматирования
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}ч ${mins}м` : `${mins}м`;
  };

  const getStatusBadgeColorScheme = (status: string) => {
    switch (status) {
      case 'pending': return '6';
      case 'in_progress': return '8';
      case 'completed': return '7';
      case 'cancelled': return '1';
      case 'on_hold': return '2';
      case 'picked': return '7';
      case 'partial': return '2';
      case 'not_found': return '1';
      default: return '6';
    }
  };

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: 'Ожидает',
      in_progress: 'В процессе',
      completed: 'Завершена',
      cancelled: 'Отменена',
      on_hold: 'Приостановлена',
      picked: 'Собрано',
      partial: 'Частично',
      not_found: 'Не найдено'
    };
    return statusMap[status] || status;
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 4) return 'var(--sapErrorColor)';
    if (priority === 3) return 'var(--sapWarningColor)';
    return 'var(--sapSuccessColor)';
  };

  if (!task) {
    return (
      <Dialog open={isOpen} headerText="Детали задачи" onAfterClose={onClose}>
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          {loading ? 'Загрузка...' : 'Задача не найдена'}
        </div>
      </Dialog>
    );
  }

  return (
    <Dialog
      open={isOpen}
      headerText={`Задача ${task.number}`}
      onAfterClose={onClose}
      style={{ width: '90vw', maxWidth: '1400px' }}
    >
      <div style={{ padding: '1rem' }}>
        {error && (
          <MessageStrip design="Negative" style={{ marginBottom: '1rem' }}>
            {error}
          </MessageStrip>
        )}

        {/* Заголовок с действиями */}
        <Bar style={{ marginBottom: '1rem' }}>
          <Title slot="startContent" level="H4">
            {task.description}
          </Title>
          <div slot="endContent" style={{ display: 'flex', gap: '0.5rem' }}>
            {onEdit && (
              <Button design="Default" icon="edit" onClick={() => onEdit(task)}>
                Редактировать
              </Button>
            )}
            {task.status === 'pending' && onSend && (
              <Button design="Emphasized" icon="share" onClick={() => onSend(task)}>
                Отправить на устройство
              </Button>
            )}
            <Button design="Default" icon="refresh" onClick={loadTaskProgress}>
              Обновить
            </Button>
          </div>
        </Bar>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          {/* Основная информация */}
          <Panel headerText="Основная информация">
            <div style={{ padding: '1rem' }}>
              <div style={{ marginBottom: '1rem' }}>
                <strong>Номер:</strong> {task.number}
              </div>
              <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <strong>Статус:</strong>
                <Badge colorScheme={getStatusBadgeColorScheme(task.status)}>
                  {getStatusText(task.status)}
                </Badge>
              </div>
              <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <strong>Приоритет:</strong>
                <span style={{ color: getPriorityColor(task.priority), fontWeight: 'bold' }}>
                  {task.priority}
                </span>
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <strong>Создана:</strong> {formatDate(task.created_at)}
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <strong>Создал:</strong> {task.created_by}
              </div>
              {task.deadline && (
                <div style={{ marginBottom: '1rem' }}>
                  <strong>Дедлайн:</strong>
                  <span style={{ 
                    color: new Date(task.deadline) < new Date() ? 'var(--sapErrorColor)' : 'inherit'
                  }}>
                    {formatDate(task.deadline)}
                  </span>
                </div>
              )}
              {task.assigned_at && (
                <div style={{ marginBottom: '1rem' }}>
                  <strong>Назначена:</strong> {formatDate(task.assigned_at)}
                </div>
              )}
              {task.completed_at && (
                <div style={{ marginBottom: '1rem' }}>
                  <strong>Завершена:</strong> {formatDate(task.completed_at)}
                </div>
              )}
            </div>
          </Panel>

          {/* Прогресс выполнения */}
          {progress && (
            <Panel headerText="Прогресс выполнения">
              <div style={{ padding: '1rem' }}>
                {/* Прогресс по позициям */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <strong>Позиции:</strong>
                    <span>{progress.items_progress.picked} / {progress.items_progress.total}</span>
                  </div>
                  <ProgressIndicator 
                    value={progress.items_progress.percentage}
                    displayValue={`${progress.items_progress.percentage}%`}
                  />
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem', fontSize: '0.875rem' }}>
                    <span>✅ Собрано: {progress.items_progress.picked}</span>
                    <span>⚠️ Частично: {progress.items_progress.partial}</span>
                    <span>❌ Не найдено: {progress.items_progress.not_found}</span>
                    <span>⏳ Ожидает: {progress.items_progress.pending}</span>
                  </div>
                </div>

                {/* Прогресс по количеству */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <strong>Количество:</strong>
                    <span>{progress.quantity_progress.total_picked} / {progress.quantity_progress.total_required}</span>
                  </div>
                  <ProgressIndicator 
                    value={progress.quantity_progress.percentage}
                    displayValue={`${progress.quantity_progress.percentage}%`}
                  />
                </div>

                {/* Временные метрики */}
                {progress.time_metrics.started_at && (
                  <div>
                    <strong>Время выполнения:</strong>
                    <div style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>
                      <div>⏱️ Прошло: {formatDuration(progress.time_metrics.time_elapsed_minutes)}</div>
                      {progress.time_metrics.estimated_time_remaining_minutes && (
                        <div>🔮 Осталось: {formatDuration(progress.time_metrics.estimated_time_remaining_minutes)}</div>
                      )}
                      <div>🔄 Обновлено: {formatDate(progress.last_updated)}</div>
                    </div>
                  </div>
                )}
              </div>
            </Panel>
          )}
        </div>

        {/* Детали элементов */}
        {progress && (
          <Panel headerText="Детали элементов" style={{ marginBottom: '1rem' }}>
            <div style={{ padding: '1rem' }}>
              <Table>
                <TableColumn slot="columns">Артикул</TableColumn>
                <TableColumn slot="columns">Наименование</TableColumn>
                <TableColumn slot="columns">Локация</TableColumn>
                <TableColumn slot="columns">Количество</TableColumn>
                <TableColumn slot="columns">Прогресс</TableColumn>
                <TableColumn slot="columns">Статус</TableColumn>
                <TableColumn slot="columns">Собрано</TableColumn>

                {progress.items_details.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <strong>{item.part_number}</strong>
                    </TableCell>
                    <TableCell>
                      <div style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.part_name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span style={{ fontFamily: 'monospace' }}>{item.location}</span>
                    </TableCell>
                    <TableCell>
                      {item.quantity_picked} / {item.quantity_required}
                    </TableCell>
                    <TableCell>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ 
                          width: '60px', 
                          height: '6px', 
                          backgroundColor: 'var(--sapNeutralBackground)',
                          borderRadius: '3px',
                          overflow: 'hidden'
                        }}>
                          <div style={{ 
                            width: `${item.progress_percentage}%`,
                            height: '100%',
                            backgroundColor: item.progress_percentage === 100 ? 'var(--sapSuccessColor)' : 
                                           item.progress_percentage > 0 ? 'var(--sapWarningColor)' : 
                                           'var(--sapNeutralColor)'
                          }} />
                        </div>
                        <span style={{ fontSize: '0.75rem' }}>
                          {item.progress_percentage}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge colorScheme={getStatusBadgeColorScheme(item.status)}>
                        {getStatusText(item.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {item.picked_at ? (
                        <span style={{ fontSize: '0.75rem', color: 'var(--sapContentLabelColor)' }}>
                          {formatDate(item.picked_at)}
                        </span>
                      ) : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </Table>
            </div>
          </Panel>
        )}

        {/* Карточки статистики */}
        {progress && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <Card>
              <CardHeader titleText="Всего позиций" />
              <div style={{ padding: '1rem', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--sapIndicator_6)' }}>
                  {progress.items_progress.total}
                </div>
              </div>
            </Card>

            <Card>
              <CardHeader titleText="Собрано позиций" />
              <div style={{ padding: '1rem', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--sapSuccessColor)' }}>
                  {progress.items_progress.picked}
                </div>
              </div>
            </Card>

            <Card>
              <CardHeader titleText="Общее количество" />
              <div style={{ padding: '1rem', textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--sapIndicator_6)' }}>
                  {progress.quantity_progress.total_picked} / {progress.quantity_progress.total_required}
                </div>
              </div>
            </Card>

            {progress.time_metrics.started_at && (
              <Card>
                <CardHeader titleText="Время выполнения" />
                <div style={{ padding: '1rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--sapIndicator_8)' }}>
                    {formatDuration(progress.time_metrics.time_elapsed_minutes)}
                  </div>
                </div>
              </Card>
            )}
          </div>
        )}
      </div>

      {/* Кнопка закрытия */}
      <div slot="footer" style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button design="Emphasized" onClick={onClose}>
          Закрыть
        </Button>
      </div>
    </Dialog>
  );
};

export default TaskDetails; 

