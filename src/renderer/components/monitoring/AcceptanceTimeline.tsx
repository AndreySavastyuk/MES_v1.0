import React, { useMemo } from 'react';
import { Timeline, TimelineItem, Card, Title, Badge, Icon, FlexBox, FlexBoxDirection, FlexBoxJustifyContent, FlexBoxAlignItems, Button } from '@ui5/webcomponents-react';

interface TimelineEvent {
  id: string;
  type: 'task_created' | 'task_started' | 'task_completed' | 'task_cancelled' | 'item_scanned' | 'sync_started' | 'sync_completed' | 'device_connected' | 'device_disconnected';
  title: string;
  description?: string;
  timestamp: string;
  deviceId?: string;
  deviceName?: string;
  taskId?: string;
  userId?: string;
  userName?: string;
  metadata?: any;
}

interface Task {
  id: string;
  title: string;
  status: string;
}

interface AcceptanceTimelineProps {
  timeline: TimelineEvent[];
  tasks: Task[];
  filters: any;
  onEventClick?: (event: TimelineEvent) => void;
}

const AcceptanceTimeline: React.FC<AcceptanceTimelineProps> = ({
  timeline,
  tasks,
  filters,
  onEventClick
}) => {
  // Обработка и сортировка событий временной линии
  const processedTimeline = useMemo(() => {
    return timeline
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 50); // Показываем последние 50 событий
  }, [timeline]);

  const getEventIcon = (type: string) => {
    const icons = {
      task_created: 'add-document',
      task_started: 'play',
      task_completed: 'complete',
      task_cancelled: 'cancel',
      item_scanned: 'bar-code',
      sync_started: 'synchronize',
      sync_completed: 'complete',
      device_connected: 'connected',
      device_disconnected: 'disconnected'
    };
    return icons[type as keyof typeof icons] || 'information';
  };

  const getEventColor = (type: string) => {
    const colors = {
      task_created: '#0070f2',
      task_started: '#f0ab00',
      task_completed: '#0f7d0f',
      task_cancelled: '#bb0000',
      item_scanned: '#0070f2',
      sync_started: '#f0ab00',
      sync_completed: '#0f7d0f',
      device_connected: '#0f7d0f',
      device_disconnected: '#bb0000'
    };
    return colors[type as keyof typeof colors] || '#666666';
  };

  const getEventTypeLabel = (type: string) => {
    const labels = {
      task_created: 'Создана задача',
      task_started: 'Начата задача',
      task_completed: 'Завершена задача',
      task_cancelled: 'Отменена задача',
      item_scanned: 'Сканирование',
      sync_started: 'Начата синхронизация',
      sync_completed: 'Синхронизация завершена',
      device_connected: 'Устройство подключено',
      device_disconnected: 'Устройство отключено'
    };
    return labels[type as keyof typeof labels] || 'Событие';
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      
      if (diffMinutes < 1) return 'Только что';
      if (diffMinutes < 60) return `${diffMinutes} мин назад`;
      
      const diffHours = Math.floor(diffMinutes / 60);
      if (diffHours < 24) return `${diffHours} ч назад`;
      
      return date.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Неизвестно';
    }
  };

  const getEventBadge = (type: string) => {
    const configs = {
      task_created: { colorScheme: "6", text: "Новая" },
      task_started: { colorScheme: "7", text: "Запуск" },
      task_completed: { colorScheme: "8", text: "Готово" },
      task_cancelled: { colorScheme: "1", text: "Отмена" },
      item_scanned: { colorScheme: "6", text: "Сканер" },
      sync_started: { colorScheme: "7", text: "Синх" },
      sync_completed: { colorScheme: "8", text: "Синх ОК" },
      device_connected: { colorScheme: "8", text: "Подключен" },
      device_disconnected: { colorScheme: "1", text: "Отключен" }
    };
    
    const config = configs[type as keyof typeof configs] || { colorScheme: "2", text: "Событие" };
    return <Badge colorScheme={config.colorScheme}>{config.text}</Badge>;
  };

  const handleEventClick = (event: TimelineEvent) => {
    if (onEventClick) {
      onEventClick(event);
    }
  };

  const getEventDetails = (event: TimelineEvent) => {
    const details = [];
    
    if (event.deviceName) {
      details.push(`Устройство: ${event.deviceName}`);
    }
    
    if (event.userName) {
      details.push(`Пользователь: ${event.userName}`);
    }
    
    if (event.metadata) {
      if (event.metadata.itemCount) {
        details.push(`Предметов: ${event.metadata.itemCount}`);
      }
      if (event.metadata.duration) {
        details.push(`Время: ${event.metadata.duration} мин`);
      }
      if (event.metadata.errorMessage) {
        details.push(`Ошибка: ${event.metadata.errorMessage}`);
      }
    }
    
    return details;
  };

  // Группировка событий по дням
  const groupedEvents = useMemo(() => {
    const groups: { [key: string]: TimelineEvent[] } = {};
    
    processedTimeline.forEach(event => {
      const date = new Date(event.timestamp).toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
      
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(event);
    });
    
    return groups;
  }, [processedTimeline]);

  if (!processedTimeline || processedTimeline.length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
        <Icon name="information" style={{ fontSize: '2rem', marginBottom: '1rem' }} />
        <div>Нет событий для отображения</div>
        <div style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
          События появятся по мере выполнения операций
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
      {Object.entries(groupedEvents).map(([date, events], groupIndex) => (
        <div key={date} style={{ marginBottom: '1.5rem' }}>
          {/* Заголовок дня */}
          <div style={{ 
            position: 'sticky', 
            top: 0, 
            backgroundColor: '#f5f5f5', 
            padding: '0.5rem 0',
            borderBottom: '1px solid #e0e0e0',
            marginBottom: '1rem',
            zIndex: 1
          }}>
            <Title level="H6" style={{ margin: 0, color: '#666' }}>
              {date}
            </Title>
          </div>

          {/* События дня */}
          <Timeline>
            {events.map((event, eventIndex) => (
              <TimelineItem
                key={event.id}
                icon={getEventIcon(event.type)}
                name={formatTimestamp(event.timestamp)}
                subtitleText={event.deviceName || ''}
                onClick={() => handleEventClick(event)}
                style={{ cursor: 'pointer' }}
              >
                <Card 
                  style={{ 
                    border: `1px solid ${getEventColor(event.type)}40`,
                    borderLeft: `4px solid ${getEventColor(event.type)}`,
                    marginBottom: '0.5rem'
                  }}
                >
                  <div style={{ padding: '0.75rem' }}>
                    <FlexBox
                      direction={FlexBoxDirection.Row}
                      justifyContent={FlexBoxJustifyContent.SpaceBetween}
                      alignItems={FlexBoxAlignItems.Start}
                      style={{ marginBottom: '0.5rem' }}
                    >
                      <div style={{ flex: 1 }}>
                        <Title level="H6" style={{ margin: '0 0 0.25rem 0' }}>
                          {event.title}
                        </Title>
                        {event.description && (
                          <div style={{ fontSize: '0.875rem', color: '#666' }}>
                            {event.description}
                          </div>
                        )}
                      </div>
                      {getEventBadge(event.type)}
                    </FlexBox>

                    {/* Детали события */}
                    {getEventDetails(event).length > 0 && (
                      <div style={{ 
                        fontSize: '0.8rem', 
                        color: '#666',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.25rem'
                      }}>
                        {getEventDetails(event).map((detail, i) => (
                          <div key={i}>{detail}</div>
                        ))}
                      </div>
                    )}

                    {/* Связанная задача */}
                    {event.taskId && (
                      <div style={{ marginTop: '0.5rem' }}>
                        <Button
                          design="Transparent"
                          icon="task"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Навигация к задаче
                          }}
                          style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}
                        >
                          Открыть задачу
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>
              </TimelineItem>
            ))}
          </Timeline>
        </div>
      ))}

      {/* Кнопка загрузки ещё */}
      {processedTimeline.length >= 50 && (
        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
          <Button
            design="Transparent"
            icon="down"
            onClick={() => {
              // Загрузка дополнительных событий
            }}
          >
            Показать ещё события
          </Button>
        </div>
      )}
    </div>
  );
};

export default AcceptanceTimeline; 

