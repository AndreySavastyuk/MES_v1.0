import React, { useState, useEffect } from 'react';
import { Card, Title, Panel, Button, MessageStrip, Badge, ProgressIndicator, Timeline, TimelineItem, Select, Option, DateTimePicker, Input, FlexBox, FlexBoxDirection, FlexBoxJustifyContent, FlexBoxAlignItems } from '@ui5/webcomponents-react';
import DeviceStatusCards from '../components/monitoring/DeviceStatusCards';
import TaskProgressCharts from '../components/monitoring/TaskProgressCharts';
import StatisticsWidgets from '../components/monitoring/StatisticsWidgets';
import AcceptanceTimeline from '../components/monitoring/AcceptanceTimeline';
import FilterPanel from '../components/monitoring/FilterPanel';

interface DashboardFilters {
  dateFrom: string;
  dateTo: string;
  selectedDevices: string[];
  taskStatus: string;
  refreshInterval: number;
}

interface DashboardData {
  devices: any[];
  tasks: any[];
  statistics: any;
  timeline: any[];
  syncStatus: any;
}

const MonitoringDashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    devices: [],
    tasks: [],
    statistics: {},
    timeline: [],
    syncStatus: {}
  });

  const [filters, setFilters] = useState<DashboardFilters>({
    dateFrom: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 24 часа назад
    dateTo: new Date().toISOString().split('T')[0],
    selectedDevices: [],
    taskStatus: 'all',
    refreshInterval: 30 // секунды
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Загрузка данных дашборда
  const loadDashboardData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [devicesRes, tasksRes, statsRes, syncRes] = await Promise.all([
        fetch('/api/sync/devices'),
        fetch(`/api/tasks?status=${filters.taskStatus}&from=${filters.dateFrom}&to=${filters.dateTo}`),
        fetch('/api/sync/statistics'),
        fetch('/api/sync/status')
      ]);

      if (!devicesRes.ok || !tasksRes.ok || !statsRes.ok || !syncRes.ok) {
        throw new Error('Ошибка загрузки данных');
      }

      const [devices, tasks, statistics, syncStatus] = await Promise.all([
        devicesRes.json(),
        tasksRes.json(),
        statsRes.json(),
        syncRes.json()
      ]);

      // Загружаем временную линию операций
      const timelineRes = await fetch(`/api/operations/timeline?from=${filters.dateFrom}&to=${filters.dateTo}`);
      const timeline = timelineRes.ok ? await timelineRes.json() : { data: [] };

      setDashboardData({
        devices: devices.data || [],
        tasks: tasks.data?.items || [],
        statistics: statistics.data || {},
        timeline: timeline.data || [],
        syncStatus: syncStatus.data || {}
      });

      setLastUpdate(new Date());
    } catch (err: any) {
      console.error('Ошибка загрузки данных дашборда:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Автоматическое обновление
  useEffect(() => {
    loadDashboardData();

    if (autoRefresh) {
      const interval = setInterval(loadDashboardData, filters.refreshInterval * 1000);
      return () => clearInterval(interval);
    }
  }, [filters, autoRefresh]);

  // WebSocket подключение для real-time обновлений
  useEffect(() => {
    let ws: WebSocket | null = null;

    const connectWebSocket = () => {
      try {
        ws = new WebSocket('ws://localhost:8081');
        
        ws.onopen = () => {
          console.log('WebSocket подключен к серверу синхронизации');
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            handleWebSocketMessage(message);
          } catch (err) {
            console.error('Ошибка парсинга WebSocket сообщения:', err);
          }
        };

        ws.onclose = () => {
          console.log('WebSocket соединение закрыто');
          // Переподключение через 5 секунд
          setTimeout(connectWebSocket, 5000);
        };

        ws.onerror = (error) => {
          console.error('WebSocket ошибка:', error);
        };
      } catch (err) {
        console.error('Ошибка подключения WebSocket:', err);
      }
    };

    connectWebSocket();

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, []);

  const handleWebSocketMessage = (message: any) => {
    switch (message.type) {
      case 'device_status_update':
        setDashboardData(prev => ({
          ...prev,
          devices: message.devices || prev.devices
        }));
        break;

      case 'sync_statistics':
        setDashboardData(prev => ({
          ...prev,
          statistics: {
            ...prev.statistics,
            sync: message.statistics
          }
        }));
        break;

      case 'task_updated':
        // Обновляем конкретную задачу
        setDashboardData(prev => ({
          ...prev,
          tasks: prev.tasks.map(task => 
            task.id === message.task.id ? message.task : task
          )
        }));
        break;

      default:
        console.log('Неизвестный тип WebSocket сообщения:', message.type);
    }
  };

  const handleFiltersChange = (newFilters: Partial<DashboardFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const handleRefresh = () => {
    loadDashboardData();
  };

  const toggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh);
  };

  const getOnlineDevicesCount = () => {
    return dashboardData.devices.filter(device => device.status === 'online').length;
  };

  const getTotalDevicesCount = () => {
    return dashboardData.devices.length;
  };

  const getActiveTasks = () => {
    return dashboardData.tasks.filter(task => 
      task.status === 'in_progress' || task.status === 'pending'
    ).length;
  };

  const getCompletedTasksToday = () => {
    const today = new Date().toISOString().split('T')[0];
    return dashboardData.tasks.filter(task => 
      task.status === 'completed' && task.updated_at?.startsWith(today)
    ).length;
  };

  return (
    <div style={{ padding: '1rem', backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      {/* Заголовок дашборда */}
      <FlexBox
        direction={FlexBoxDirection.Row}
        justifyContent={FlexBoxJustifyContent.SpaceBetween}
        alignItems={FlexBoxAlignItems.Center}
        style={{ marginBottom: '1rem' }}
      >
        <div>
          <Title level="H2">Мониторинг складских операций</Title>
          <div style={{ marginTop: '0.5rem', color: '#666', fontSize: '0.875rem' }}>
            Последнее обновление: {lastUpdate.toLocaleTimeString()}
            {autoRefresh && (
              <Badge style={{ marginLeft: '0.5rem' }} colorScheme="8">
                Авто-обновление: {filters.refreshInterval}с
              </Badge>
            )}
          </div>
        </div>

        <FlexBox direction={FlexBoxDirection.Row} style={{ gap: '0.5rem' }}>
          <Button
            design="Emphasized"
            icon="refresh"
            onClick={handleRefresh}
            disabled={loading}
          >
            Обновить
          </Button>
          
          <Button
            design={autoRefresh ? "Negative" : "Positive"}
            icon={autoRefresh ? "pause" : "play"}
            onClick={toggleAutoRefresh}
          >
            {autoRefresh ? 'Пауза' : 'Авто'}
          </Button>
        </FlexBox>
      </FlexBox>

      {/* Сообщения об ошибках */}
      {error && (
        <MessageStrip
          design="Negative"
          style={{ marginBottom: '1rem' }}
          onClose={() => setError(null)}
        >
          {error}
        </MessageStrip>
      )}

      {/* Индикатор загрузки */}
      {loading && (
        <ProgressIndicator
          value={undefined}
          style={{ marginBottom: '1rem' }}
        />
      )}

      {/* Быстрая статистика */}
      <FlexBox
        direction={FlexBoxDirection.Row}
        style={{ gap: '1rem', marginBottom: '1.5rem' }}
      >
        <Card style={{ minWidth: '200px', flex: '1' }}>
          <div style={{ padding: '1rem', textAlign: 'center' }}>
            <Title level="H4" style={{ margin: '0 0 0.5rem 0' }}>
              Устройства онлайн
            </Title>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: getOnlineDevicesCount() > 0 ? '#0f7d0f' : '#bb0000' }}>
              {getOnlineDevicesCount()}/{getTotalDevicesCount()}
            </div>
            <Badge colorScheme={getOnlineDevicesCount() > 0 ? "8" : "1"}>
              {getOnlineDevicesCount() > 0 ? 'Подключены' : 'Отключены'}
            </Badge>
          </div>
        </Card>

        <Card style={{ minWidth: '200px', flex: '1' }}>
          <div style={{ padding: '1rem', textAlign: 'center' }}>
            <Title level="H4" style={{ margin: '0 0 0.5rem 0' }}>
              Активные задачи
            </Title>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#0070f2' }}>
              {getActiveTasks()}
            </div>
            <Badge colorScheme="6">В работе</Badge>
          </div>
        </Card>

        <Card style={{ minWidth: '200px', flex: '1' }}>
          <div style={{ padding: '1rem', textAlign: 'center' }}>
            <Title level="H4" style={{ margin: '0 0 0.5rem 0' }}>
              Выполнено сегодня
            </Title>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#0f7d0f' }}>
              {getCompletedTasksToday()}
            </div>
            <Badge colorScheme="8">Задач</Badge>
          </div>
        </Card>

        <Card style={{ minWidth: '200px', flex: '1' }}>
          <div style={{ padding: '1rem', textAlign: 'center' }}>
            <Title level="H4" style={{ margin: '0 0 0.5rem 0' }}>
              Синхронизация
            </Title>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#0070f2' }}>
              {dashboardData.syncStatus.queueStatistics?.runningJobs || 0}
            </div>
            <Badge colorScheme="6">Активных</Badge>
          </div>
        </Card>
      </FlexBox>

      {/* Панель фильтров */}
      <FilterPanel
        filters={filters}
        onFiltersChange={handleFiltersChange}
        devices={dashboardData.devices}
        style={{ marginBottom: '1.5rem' }}
      />

      {/* Основной контент */}
      <FlexBox direction={FlexBoxDirection.Row} style={{ gap: '1.5rem' }}>
        {/* Левая колонка - Устройства и задачи */}
        <div style={{ flex: '2', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Карточки статуса устройств */}
          <Panel headerText="Статус устройств">
            <DeviceStatusCards
              devices={dashboardData.devices}
              syncStatus={dashboardData.syncStatus}
            />
          </Panel>

          {/* Графики прогресса задач */}
          <Panel headerText="Прогресс выполнения задач">
            <TaskProgressCharts
              tasks={dashboardData.tasks}
              devices={dashboardData.devices}
              filters={filters}
            />
          </Panel>

          {/* Виджеты статистики */}
          <Panel headerText="Статистика операций">
            <StatisticsWidgets
              statistics={dashboardData.statistics}
              tasks={dashboardData.tasks}
              devices={dashboardData.devices}
              dateRange={{ from: filters.dateFrom, to: filters.dateTo }}
            />
          </Panel>
        </div>

        {/* Правая колонка - Временная линия */}
        <div style={{ flex: '1' }}>
          <Panel headerText="Хронология операций">
            <AcceptanceTimeline
              timeline={dashboardData.timeline}
              tasks={dashboardData.tasks}
              filters={filters}
            />
          </Panel>
        </div>
      </FlexBox>
    </div>
  );
};

export default MonitoringDashboard;

