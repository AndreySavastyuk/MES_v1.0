import React, { useMemo } from 'react';
import { Card, Title, Badge, Icon, FlexBox, FlexBoxDirection, FlexBoxJustifyContent, FlexBoxAlignItems, ProgressIndicator } from '@ui5/webcomponents-react';

interface StatisticsData {
  sync?: {
    totalJobs: number;
    completedJobs: number;
    failedJobs: number;
    averageTime: number;
  };
  tasks?: {
    total: number;
    completed: number;
    inProgress: number;
    pending: number;
  };
  items?: {
    totalProcessed: number;
    totalScanned: number;
    errors: number;
  };
  performance?: {
    avgTaskTime: number;
    productivity: number;
    efficiency: number;
  };
}

interface Task {
  id: string;
  status: string;
  priority: string;
  itemsTotal?: number;
  itemsProcessed?: number;
  createdAt: string;
  updatedAt: string;
  actualTime?: number;
  estimatedTime?: number;
}

interface Device {
  id: string;
  name: string;
  status: string;
  type: string;
}

interface StatisticsWidgetsProps {
  statistics: StatisticsData;
  tasks: Task[];
  devices: Device[];
  dateRange: { from: string; to: string };
}

const StatisticsWidgets: React.FC<StatisticsWidgetsProps> = ({
  statistics,
  tasks,
  devices,
  dateRange
}) => {
  // Вычисление статистики на основе данных
  const computedStats = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayTasks = tasks.filter(task => task.updatedAt?.startsWith(today));
    
    // Статистика задач
    const taskStats = {
      total: tasks.length,
      completed: tasks.filter(t => t.status === 'completed').length,
      inProgress: tasks.filter(t => t.status === 'in_progress').length,
      pending: tasks.filter(t => t.status === 'pending').length,
      cancelled: tasks.filter(t => t.status === 'cancelled').length,
      todayCompleted: todayTasks.filter(t => t.status === 'completed').length,
      highPriority: tasks.filter(t => t.priority === 'high').length
    };

    // Статистика предметов
    const itemStats = {
      totalProcessed: tasks.reduce((sum, task) => sum + (task.itemsProcessed || 0), 0),
      totalExpected: tasks.reduce((sum, task) => sum + (task.itemsTotal || 0), 0),
      todayProcessed: todayTasks.reduce((sum, task) => sum + (task.itemsProcessed || 0), 0),
      errors: tasks.filter(t => t.status === 'cancelled').length
    };

    // Статистика производительности
    const completedTasks = tasks.filter(t => t.status === 'completed' && t.actualTime);
    const avgTaskTime = completedTasks.length > 0 
      ? completedTasks.reduce((sum, task) => sum + (task.actualTime || 0), 0) / completedTasks.length
      : 0;

    const efficiency = taskStats.total > 0 
      ? (taskStats.completed / taskStats.total) * 100
      : 0;

    const productivity = itemStats.totalExpected > 0
      ? (itemStats.totalProcessed / itemStats.totalExpected) * 100
      : 0;

    // Статистика устройств
    const deviceStats = {
      total: devices.length,
      online: devices.filter(d => d.status === 'online').length,
      syncing: devices.filter(d => d.status === 'syncing').length,
      offline: devices.filter(d => d.status === 'offline').length
    };

    return {
      taskStats,
      itemStats,
      deviceStats,
      performance: {
        avgTaskTime: Math.round(avgTaskTime),
        efficiency: Math.round(efficiency),
        productivity: Math.round(productivity)
      }
    };
  }, [tasks, devices]);

  const StatWidget: React.FC<{
    icon: string;
    title: string;
    value: string | number;
    subtitle?: string;
    color?: string;
    trend?: 'up' | 'down' | 'stable';
    badge?: { text: string; colorScheme: string };
    progress?: number;
  }> = ({ icon, title, value, subtitle, color = '#0070f2', trend, badge, progress }) => (
    <Card style={{ height: '140px', border: `1px solid ${color}20` }}>
      <div style={{ padding: '1rem', height: '100%', display: 'flex', flexDirection: 'column' }}>
        <FlexBox 
          direction={FlexBoxDirection.Row} 
          justifyContent={FlexBoxJustifyContent.SpaceBetween}
          alignItems={FlexBoxAlignItems.Start}
          style={{ marginBottom: '0.5rem' }}
        >
          <Icon name={icon} style={{ fontSize: '1.5rem', color }} />
          {badge && (
            <Badge colorScheme={badge.colorScheme}>{badge.text}</Badge>
          )}
          {trend && (
            <Icon 
              name={trend === 'up' ? 'trend-up' : trend === 'down' ? 'trend-down' : 'horizontal-line'} 
              style={{ 
                fontSize: '1rem', 
                color: trend === 'up' ? '#0f7d0f' : trend === 'down' ? '#bb0000' : '#666'
              }} 
            />
          )}
        </FlexBox>

        <div style={{ flex: 1 }}>
          <Title level="H4" style={{ margin: '0 0 0.25rem 0', color }}>
            {value}
          </Title>
          <div style={{ fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.25rem' }}>
            {title}
          </div>
          {subtitle && (
            <div style={{ fontSize: '0.75rem', color: '#666' }}>
              {subtitle}
            </div>
          )}
        </div>

        {progress !== undefined && (
          <div style={{ marginTop: '0.5rem' }}>
            <ProgressIndicator 
              value={progress} 
              valueState={progress >= 80 ? "Success" : progress >= 50 ? "Warning" : "Error"}
              style={{ height: '4px' }}
            />
          </div>
        )}
      </div>
    </Card>
  );

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
      {/* Выполненные задачи */}
      <StatWidget
        icon="complete"
        title="Выполнено задач"
        value={computedStats.taskStats.completed}
        subtitle={`Сегодня: ${computedStats.taskStats.todayCompleted}`}
        color="#0f7d0f"
        trend="up"
        progress={computedStats.performance.efficiency}
      />

      {/* Активные задачи */}
      <StatWidget
        icon="process"
        title="В работе"
        value={computedStats.taskStats.inProgress}
        subtitle={`Ожидает: ${computedStats.taskStats.pending}`}
        color="#0070f2"
        badge={{ text: 'Активно', colorScheme: '6' }}
      />

      {/* Собранные предметы */}
      <StatWidget
        icon="product"
        title="Предметов обработано"
        value={computedStats.itemStats.totalProcessed.toLocaleString()}
        subtitle={`Сегодня: ${computedStats.itemStats.todayProcessed.toLocaleString()}`}
        color="#0f7d0f"
        trend="up"
        progress={computedStats.performance.productivity}
      />

      {/* Среднее время задачи */}
      <StatWidget
        icon="time"
        title="Среднее время задачи"
        value={`${computedStats.performance.avgTaskTime} мин`}
        subtitle="На основе завершённых задач"
        color="#f0ab00"
        trend="stable"
      />

      {/* Эффективность */}
      <StatWidget
        icon="target-group"
        title="Эффективность"
        value={`${computedStats.performance.efficiency}%`}
        subtitle="Завершено от общего числа"
        color="#0070f2"
        progress={computedStats.performance.efficiency}
        trend={computedStats.performance.efficiency >= 80 ? 'up' : 'stable'}
      />

      {/* Производительность */}
      <StatWidget
        icon="performance"
        title="Производительность"
        value={`${computedStats.performance.productivity}%`}
        subtitle="Обработано от плана"
        color="#0f7d0f"
        progress={computedStats.performance.productivity}
        trend={computedStats.performance.productivity >= 90 ? 'up' : 'stable'}
      />

      {/* Устройства онлайн */}
      <StatWidget
        icon="connected"
        title="Устройства онлайн"
        value={`${computedStats.deviceStats.online}/${computedStats.deviceStats.total}`}
        subtitle={`Синхронизация: ${computedStats.deviceStats.syncing}`}
        color={computedStats.deviceStats.online > 0 ? '#0f7d0f' : '#bb0000'}
        badge={{ 
          text: computedStats.deviceStats.online > 0 ? 'Подключены' : 'Офлайн', 
          colorScheme: computedStats.deviceStats.online > 0 ? '8' : '1' 
        }}
      />

      {/* Приоритетные задачи */}
      <StatWidget
        icon="warning"
        title="Высокий приоритет"
        value={computedStats.taskStats.highPriority}
        subtitle="Требует внимания"
        color="#bb0000"
        badge={{ text: 'Приоритет', colorScheme: '1' }}
      />

      {/* Статистика синхронизации */}
      {statistics.sync && (
        <StatWidget
          icon="synchronize"
          title="Синхронизация"
          value={`${statistics.sync.completedJobs}/${statistics.sync.totalJobs}`}
          subtitle={`Ошибок: ${statistics.sync.failedJobs}`}
          color="#0070f2"
          progress={(statistics.sync.completedJobs / statistics.sync.totalJobs) * 100}
          trend={statistics.sync.failedJobs === 0 ? 'up' : 'down'}
        />
      )}

      {/* Ошибки и проблемы */}
      <StatWidget
        icon="error"
        title="Отменённых задач"
        value={computedStats.taskStats.cancelled}
        subtitle="За выбранный период"
        color="#bb0000"
        badge={computedStats.taskStats.cancelled > 0 ? { text: 'Проблемы', colorScheme: '1' } : undefined}
        trend={computedStats.taskStats.cancelled === 0 ? 'stable' : 'down'}
      />

      {/* Общая статистика за день */}
      <Card style={{ gridColumn: 'span 2', minHeight: '140px' }}>
        <div style={{ padding: '1rem' }}>
          <Title level="H5" style={{ marginBottom: '1rem' }}>
            Сводка за сегодня
          </Title>
          
          <FlexBox direction={FlexBoxDirection.Row} style={{ gap: '2rem' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.5rem' }}>
                Задачи
              </div>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#0f7d0f' }}>
                    {computedStats.taskStats.todayCompleted}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#666' }}>Выполнено</div>
                </div>
                <div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#0070f2' }}>
                    {computedStats.taskStats.inProgress}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#666' }}>В работе</div>
                </div>
              </div>
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.5rem' }}>
                Предметы
              </div>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#0f7d0f' }}>
                    {computedStats.itemStats.todayProcessed.toLocaleString()}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#666' }}>Обработано</div>
                </div>
                <div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#f0ab00' }}>
                    {Math.round(computedStats.itemStats.todayProcessed / Math.max(computedStats.taskStats.todayCompleted, 1))}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#666' }}>Среднее на задачу</div>
                </div>
              </div>
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '0.875rem', color: '#666', marginBottom: '0.5rem' }}>
                Устройства
              </div>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#0f7d0f' }}>
                    {computedStats.deviceStats.online}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#666' }}>Онлайн</div>
                </div>
                <div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#0070f2' }}>
                    {computedStats.deviceStats.syncing}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#666' }}>Синхронизация</div>
                </div>
              </div>
            </div>
          </FlexBox>
        </div>
      </Card>
    </div>
  );
};

export default StatisticsWidgets;

