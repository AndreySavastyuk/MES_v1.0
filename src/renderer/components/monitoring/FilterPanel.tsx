import React from 'react';
import { Card, Title, Select, Option, DateTimePicker, Input, Button, MultiComboBox, MultiComboBoxItem, FlexBox, FlexBoxDirection, FlexBoxJustifyContent, FlexBoxAlignItems, Badge } from '@ui5/webcomponents-react';

interface Device {
  id: string;
  name: string;
  type: string;
  status: string;
}

interface DashboardFilters {
  dateFrom: string;
  dateTo: string;
  selectedDevices: string[];
  taskStatus: string;
  refreshInterval: number;
}

interface FilterPanelProps {
  filters: DashboardFilters;
  onFiltersChange: (filters: Partial<DashboardFilters>) => void;
  devices: Device[];
  style?: React.CSSProperties;
}

const FilterPanel: React.FC<FilterPanelProps> = ({
  filters,
  onFiltersChange,
  devices,
  style
}) => {
  const handleDateFromChange = (value: string) => {
    onFiltersChange({ dateFrom: value });
  };

  const handleDateToChange = (value: string) => {
    onFiltersChange({ dateTo: value });
  };

  const handleTaskStatusChange = (value: string) => {
    onFiltersChange({ taskStatus: value });
  };

  const handleDeviceSelectionChange = (selectedDevices: string[]) => {
    onFiltersChange({ selectedDevices });
  };

  const handleRefreshIntervalChange = (value: number) => {
    onFiltersChange({ refreshInterval: value });
  };

  const handleQuickDateRange = (range: 'today' | 'yesterday' | 'week' | 'month') => {
    const now = new Date();
    let dateFrom: string;
    let dateTo: string = now.toISOString().split('T')[0];

    switch (range) {
      case 'today':
        dateFrom = now.toISOString().split('T')[0];
        break;
      case 'yesterday':
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        dateFrom = yesterday.toISOString().split('T')[0];
        dateTo = yesterday.toISOString().split('T')[0];
        break;
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        dateFrom = weekAgo.toISOString().split('T')[0];
        break;
      case 'month':
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        dateFrom = monthAgo.toISOString().split('T')[0];
        break;
      default:
        return;
    }

    onFiltersChange({ dateFrom, dateTo });
  };

  const handleResetFilters = () => {
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    onFiltersChange({
      dateFrom: dayAgo.toISOString().split('T')[0],
      dateTo: now.toISOString().split('T')[0],
      selectedDevices: [],
      taskStatus: 'all',
      refreshInterval: 30
    });
  };

  const getDeviceStatusColor = (status: string) => {
    switch (status) {
      case 'online': return '#0f7d0f';
      case 'syncing': return '#0070f2';
      case 'offline': return '#666666';
      case 'error': return '#bb0000';
      default: return '#666666';
    }
  };

  const getSelectedDevicesCount = () => {
    return filters.selectedDevices.length;
  };

  const getOnlineDevicesCount = () => {
    return devices.filter(device => device.status === 'online').length;
  };

  return (
    <Card style={{ ...style }}>
      <div style={{ padding: '1rem' }}>
        <FlexBox
          direction={FlexBoxDirection.Row}
          justifyContent={FlexBoxJustifyContent.SpaceBetween}
          alignItems={FlexBoxAlignItems.Center}
          style={{ marginBottom: '1rem' }}
        >
          <Title level="H5">Фильтры мониторинга</Title>
          <Button
            design="Transparent"
            icon="reset"
            onClick={handleResetFilters}
          >
            Сбросить
          </Button>
        </FlexBox>

        <FlexBox direction={FlexBoxDirection.Row} style={{ gap: '1rem', flexWrap: 'wrap' }}>
          {/* Быстрый выбор периода */}
          <div style={{ minWidth: '200px' }}>
            <div style={{ fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
              Быстрый выбор периода
            </div>
            <FlexBox direction={FlexBoxDirection.Row} style={{ gap: '0.5rem', flexWrap: 'wrap' }}>
              <Button
                design="Transparent"
                onClick={() => handleQuickDateRange('today')}
                style={{ fontSize: '0.8rem' }}
              >
                Сегодня
              </Button>
              <Button
                design="Transparent"
                onClick={() => handleQuickDateRange('yesterday')}
                style={{ fontSize: '0.8rem' }}
              >
                Вчера
              </Button>
              <Button
                design="Transparent"
                onClick={() => handleQuickDateRange('week')}
                style={{ fontSize: '0.8rem' }}
              >
                Неделя
              </Button>
              <Button
                design="Transparent"
                onClick={() => handleQuickDateRange('month')}
                style={{ fontSize: '0.8rem' }}
              >
                Месяц
              </Button>
            </FlexBox>
          </div>

          {/* Дата от */}
          <div style={{ minWidth: '150px' }}>
            <div style={{ fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
              Дата от
            </div>
            <Input
              type="Text"
              value={filters.dateFrom}
              onChange={(e) => handleDateFromChange((e.target as any).value)}
              placeholder="YYYY-MM-DD"
              style={{ width: '100%' }}
            />
          </div>

          {/* Дата до */}
          <div style={{ minWidth: '150px' }}>
            <div style={{ fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
              Дата до
            </div>
            <Input
              type="Text"
              value={filters.dateTo}
              onChange={(e) => handleDateToChange((e.target as any).value)}
              placeholder="YYYY-MM-DD"
              style={{ width: '100%' }}
            />
          </div>

          {/* Статус задач */}
          <div style={{ minWidth: '150px' }}>
            <div style={{ fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
              Статус задач
            </div>
            <Select
              value={filters.taskStatus}
              onChange={(e) => handleTaskStatusChange((e.detail as any).selectedOption.value)}
              style={{ width: '100%' }}
            >
              <Option value="all">Все</Option>
              <Option value="pending">Ожидание</Option>
              <Option value="in_progress">В работе</Option>
              <Option value="completed">Выполнено</Option>
              <Option value="cancelled">Отменено</Option>
            </Select>
          </div>

          {/* Выбор устройств */}
          <div style={{ minWidth: '200px', flex: 1 }}>
            <div style={{ fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
              Устройства
              {getSelectedDevicesCount() > 0 && (
                <Badge style={{ marginLeft: '0.5rem' }} colorScheme="6">
                  {getSelectedDevicesCount()} выбрано
                </Badge>
              )}
            </div>
            <MultiComboBox
              placeholder="Выберите устройства"
              value={filters.selectedDevices.join(', ')}
              onSelectionChange={(e) => {
                const selectedItems = (e.detail as any).items || [];
                const selectedDeviceIds = selectedItems.map((item: any) => item.value);
                handleDeviceSelectionChange(selectedDeviceIds);
              }}
              style={{ width: '100%' }}
            >
              {devices.map((device) => (
                <MultiComboBoxItem
                  key={device.id}
                  text={device.name}
                  selected={filters.selectedDevices.includes(device.id)}
                  data-value={device.id}
                >
                  <FlexBox 
                    direction={FlexBoxDirection.Row} 
                    alignItems={FlexBoxAlignItems.Center}
                    style={{ gap: '0.5rem' }}
                  >
                    <div
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: getDeviceStatusColor(device.status)
                      }}
                    />
                    <span>{device.name}</span>
                    <Badge 
                      colorScheme={device.status === 'online' ? "8" : "2"}
                      style={{ fontSize: '0.7rem' }}
                    >
                      {device.type}
                    </Badge>
                  </FlexBox>
                </MultiComboBoxItem>
              ))}
            </MultiComboBox>
          </div>

          {/* Интервал обновления */}
          <div style={{ minWidth: '150px' }}>
            <div style={{ fontSize: '0.875rem', fontWeight: '500', marginBottom: '0.5rem' }}>
              Обновление (сек)
            </div>
            <Select
              value={filters.refreshInterval.toString()}
              onChange={(e) => handleRefreshIntervalChange(parseInt((e.detail as any).selectedOption.value))}
              style={{ width: '100%' }}
            >
              <Option value="10">10 секунд</Option>
              <Option value="30">30 секунд</Option>
              <Option value="60">1 минута</Option>
              <Option value="300">5 минут</Option>
              <Option value="0">Выключено</Option>
            </Select>
          </div>
        </FlexBox>

        {/* Индикаторы состояния */}
        <FlexBox
          direction={FlexBoxDirection.Row}
          style={{ gap: '1rem', marginTop: '1rem', padding: '0.5rem 0', borderTop: '1px solid #e0e0e0' }}
        >
          <div style={{ fontSize: '0.8rem', color: '#666' }}>
            Всего устройств: <strong>{devices.length}</strong>
          </div>
          <div style={{ fontSize: '0.8rem', color: '#666' }}>
            Онлайн: <strong style={{ color: '#0f7d0f' }}>{getOnlineDevicesCount()}</strong>
          </div>
          {getSelectedDevicesCount() > 0 && (
            <div style={{ fontSize: '0.8rem', color: '#666' }}>
              Фильтр устройств: <strong style={{ color: '#0070f2' }}>{getSelectedDevicesCount()}</strong>
            </div>
          )}
          <div style={{ fontSize: '0.8rem', color: '#666' }}>
            Период: <strong>{filters.dateFrom}</strong> — <strong>{filters.dateTo}</strong>
          </div>
        </FlexBox>

        {/* Предупреждения */}
        {devices.length === 0 && (
          <div style={{ 
            marginTop: '1rem', 
            padding: '0.5rem 1rem', 
            backgroundColor: '#fff3cd', 
            border: '1px solid #ffeeba',
            borderRadius: '4px',
            fontSize: '0.875rem',
            color: '#856404'
          }}>
            <strong>Внимание:</strong> Устройства не найдены. Проверьте подключение к сети.
          </div>
        )}

        {getOnlineDevicesCount() === 0 && devices.length > 0 && (
          <div style={{ 
            marginTop: '1rem', 
            padding: '0.5rem 1rem', 
            backgroundColor: '#f8d7da', 
            border: '1px solid #f5c6cb',
            borderRadius: '4px',
            fontSize: '0.875rem',
            color: '#721c24'
          }}>
            <strong>Предупреждение:</strong> Все устройства офлайн. Данные могут быть устаревшими.
          </div>
        )}
      </div>
    </Card>
  );
};

export default FilterPanel; 

