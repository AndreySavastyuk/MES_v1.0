import React, { useMemo } from 'react';
import { Card, Title, Badge, Select, Option, FlexBox, FlexBoxDirection, FlexBoxJustifyContent, FlexBoxAlignItems, ProgressIndicator } from '@ui5/webcomponents-react';
import { BarChart, LineChart, PieChart, DonutChart } from '@ui5/webcomponents-react-charts';

interface Task {
  id: string;
  title: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  progress: number;
  priority: 'low' | 'medium' | 'high';
  deviceId?: string;
  createdAt: string;
  updatedAt: string;
  estimatedTime?: number;
  actualTime?: number;
  itemsTotal?: number;
  itemsProcessed?: number;
}

interface Device {
  id: string;
  name: string;
  type: string;
}

interface TaskProgressChartsProps {
  tasks: Task[];
  devices: Device[];
  filters: any;
}

const TaskProgressCharts: React.FC<TaskProgressChartsProps> = ({
  tasks,
  devices,
  filters
}) => {
  // Обработка данных для графиков
  const chartData = useMemo(() => {
    // Статистика по статусам задач
    const statusStats = tasks.reduce((acc, task) => {
      acc[task.status] = (acc[task.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const statusChartData = [
      { name: 'Ожидание', value: statusStats.pending || 0, color: '#f0ab00' },
      { name: 'В работе', value: statusStats.in_progress || 0, color: '#0070f2' },
      { name: 'Выполнено', value: statusStats.completed || 0, color: '#0f7d0f' },
      { name: 'Отменено', value: statusStats.cancelled || 0, color: '#bb0000' }
    ];

    // Прогресс по устройствам
    const deviceProgress = devices.map(device => {
      const deviceTasks = tasks.filter(task => task.deviceId === device.id);
      const totalProgress = deviceTasks.reduce((sum, task) => sum + task.progress, 0);
      const avgProgress = deviceTasks.length > 0 ? totalProgress / deviceTasks.length : 0;
      
      return {
        name: device.name,
        progress: Math.round(avgProgress),
        tasks: deviceTasks.length,
        completed: deviceTasks.filter(t => t.status === 'completed').length
      };
    });

    // Производительность по времени (последние 24 часа)
    const now = new Date();
    const hourlyStats = Array.from({ length: 24 }, (_, i) => {
      const hour = new Date(now.getTime() - (23 - i) * 60 * 60 * 1000);
      const hourStart = new Date(hour.setMinutes(0, 0, 0));
      const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000);
      
      const hourTasks = tasks.filter(task => {
        const taskTime = new Date(task.updatedAt);
        return taskTime >= hourStart && taskTime < hourEnd && task.status === 'completed';
      });

      return {
        hour: hourStart.getHours().toString().padStart(2, '0') + ':00',
        completed: hourTasks.length,
        items: hourTasks.reduce((sum, task) => sum + (task.itemsProcessed || 0), 0)
      };
    });

    // Статистика по приоритетам
    const priorityStats = tasks.reduce((acc, task) => {
      acc[task.priority] = (acc[task.priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const priorityChartData = [
      { name: 'Низкий', value: priorityStats.low || 0, color: '#0f7d0f' },
      { name: 'Средний', value: priorityStats.medium || 0, color: '#f0ab00' },
      { name: 'Высокий', value: priorityStats.high || 0, color: '#bb0000' }
    ];

    return {
      statusChartData,
      deviceProgress,
      hourlyStats,
      priorityChartData
    };
  }, [tasks, devices]);

  const getActiveTasksWithProgress = () => {
    return tasks.filter(task => 
      task.status === 'in_progress' || task.status === 'pending'
    ).slice(0, 10); // Показываем топ-10
  };

  const formatProgress = (progress: number) => {
    return Math.round(progress);
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return '#0f7d0f';
    if (progress >= 50) return '#f0ab00';
    return '#bb0000';
  };

  const getPriorityBadge = (priority: string) => {
    const configs = {
      low: { colorScheme: "8", text: "Низкий" },
      medium: { colorScheme: "7", text: "Средний" },
      high: { colorScheme: "1", text: "Высокий" }
    };
    const config = configs[priority as keyof typeof configs] || configs.medium;
    return <Badge colorScheme={config.colorScheme}>{config.text}</Badge>;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Верхняя строка графиков */}
      <FlexBox direction={FlexBoxDirection.Row} style={{ gap: '1rem' }}>
        {/* Статистика по статусам */}
        <Card style={{ flex: '1', minHeight: '300px' }}>
          <div style={{ padding: '1rem' }}>
            <Title level="H5" style={{ marginBottom: '1rem' }}>
              Статус задач
            </Title>
            <DonutChart
              data={chartData.statusChartData}
              style={{ height: '200px' }}
              centerLabel="Всего задач"
              centerValue={tasks.length.toString()}
            />
          </div>
        </Card>

        {/* Приоритеты задач */}
        <Card style={{ flex: '1', minHeight: '300px' }}>
          <div style={{ padding: '1rem' }}>
            <Title level="H5" style={{ marginBottom: '1rem' }}>
              Приоритеты
            </Title>
            <PieChart
              data={chartData.priorityChartData}
              style={{ height: '200px' }}
            />
          </div>
        </Card>

        {/* Производительность по часам */}
        <Card style={{ flex: '2', minHeight: '300px' }}>
          <div style={{ padding: '1rem' }}>
            <Title level="H5" style={{ marginBottom: '1rem' }}>
              Выполнено задач по часам (24ч)
            </Title>
            <LineChart
              data={chartData.hourlyStats}
              dimensions={[{ accessor: 'hour' }]}
              measures={[
                { accessor: 'completed', label: 'Задачи', color: '#0070f2' },
                { accessor: 'items', label: 'Предметы', color: '#0f7d0f' }
              ]}
              style={{ height: '200px' }}
            />
          </div>
        </Card>
      </FlexBox>

      {/* Прогресс по устройствам */}
      <Card>
        <div style={{ padding: '1rem' }}>
          <Title level="H5" style={{ marginBottom: '1rem' }}>
            Прогресс по устройствам
          </Title>
          <BarChart
            data={chartData.deviceProgress}
            dimensions={[{ accessor: 'name' }]}
            measures={[
              { accessor: 'progress', label: 'Средний прогресс (%)', color: '#0070f2' },
              { accessor: 'completed', label: 'Выполнено', color: '#0f7d0f' }
            ]}
            style={{ height: '250px' }}
          />
        </div>
      </Card>

      {/* Активные задачи с детальным прогрессом */}
      <Card>
        <div style={{ padding: '1rem' }}>
          <FlexBox 
            direction={FlexBoxDirection.Row} 
            justifyContent={FlexBoxJustifyContent.SpaceBetween}
            alignItems={FlexBoxAlignItems.Center}
            style={{ marginBottom: '1rem' }}
          >
            <Title level="H5">Активные задачи</Title>
            <Badge colorScheme="6">
              {getActiveTasksWithProgress().length} задач
            </Badge>
          </FlexBox>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1rem' }}>
            {getActiveTasksWithProgress().map((task) => {
              const device = devices.find(d => d.id === task.deviceId);
              return (
                <div 
                  key={task.id}
                  style={{ 
                    padding: '1rem',
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                    backgroundColor: '#fafafa'
                  }}
                >
                  <FlexBox 
                    direction={FlexBoxDirection.Row}
                    justifyContent={FlexBoxJustifyContent.SpaceBetween}
                    alignItems={FlexBoxAlignItems.Start}
                    style={{ marginBottom: '0.5rem' }}
                  >
                    <div style={{ flex: 1 }}>
                      <Title level="H6" style={{ margin: '0 0 0.25rem 0' }}>
                        {task.title}
                      </Title>
                      <div style={{ fontSize: '0.8rem', color: '#666' }}>
                        {device?.name || 'Не назначено'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      {getPriorityBadge(task.priority)}
                      <Badge colorScheme={task.status === 'in_progress' ? "6" : "7"}>
                        {task.status === 'in_progress' ? 'В работе' : 'Ожидание'}
                      </Badge>
                    </div>
                  </FlexBox>

                  <div style={{ marginBottom: '0.5rem' }}>
                    <FlexBox 
                      direction={FlexBoxDirection.Row}
                      justifyContent={FlexBoxJustifyContent.SpaceBetween}
                      style={{ fontSize: '0.875rem', marginBottom: '0.25rem' }}
                    >
                      <span>Прогресс:</span>
                      <span style={{ fontWeight: 'bold', color: getProgressColor(task.progress) }}>
                        {formatProgress(task.progress)}%
                      </span>
                    </FlexBox>
                    <ProgressIndicator 
                      value={task.progress} 
                      valueState={task.progress >= 80 ? "Success" : task.progress >= 50 ? "Warning" : "Error"}
                    />
                  </div>

                  {task.itemsTotal && (
                    <FlexBox 
                      direction={FlexBoxDirection.Row}
                      justifyContent={FlexBoxJustifyContent.SpaceBetween}
                      style={{ fontSize: '0.8rem', color: '#666' }}
                    >
                      <span>Предметы:</span>
                      <span>{task.itemsProcessed || 0} из {task.itemsTotal}</span>
                    </FlexBox>
                  )}

                  {task.estimatedTime && (
                    <FlexBox 
                      direction={FlexBoxDirection.Row}
                      justifyContent={FlexBoxJustifyContent.SpaceBetween}
                      style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.25rem' }}
                    >
                      <span>Время:</span>
                      <span>
                        ~{Math.round((task.estimatedTime * (100 - task.progress)) / 100)} мин осталось
                      </span>
                    </FlexBox>
                  )}
                </div>
              );
            })}
          </div>

          {getActiveTasksWithProgress().length === 0 && (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
              <div>Нет активных задач</div>
              <div style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
                Все задачи выполнены или ожидают назначения
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default TaskProgressCharts;

