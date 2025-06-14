import React from 'react';
import { Card, Badge, Button, Title, FlexBox, FlexBoxDirection, FlexBoxJustifyContent, FlexBoxAlignItems, Icon, ProgressIndicator } from '@ui5/webcomponents-react';

interface Device {
  id: string;
  name: string;
  type: 'tablet' | 'scanner' | 'warehouse' | 'unknown';
  status: 'online' | 'offline' | 'syncing' | 'error';
  ipAddress?: string;
  lastSeen: string;
  syncProgress?: number;
  taskCount?: number;
  batteryLevel?: number;
  version?: string;
}

interface DeviceStatusCardsProps {
  devices: Device[];
  syncStatus: any;
  onDeviceAction?: (deviceId: string, action: string) => void;
}

const DeviceStatusCards: React.FC<DeviceStatusCardsProps> = ({
  devices,
  syncStatus,
  onDeviceAction
}) => {
  const getDeviceIcon = (type: string, status: string) => {
    const baseIcons = {
      tablet: 'ipad',
      scanner: 'bar-code',
      warehouse: 'building',
      unknown: 'question-mark'
    };

    return baseIcons[type as keyof typeof baseIcons] || 'question-mark';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return '#0f7d0f';
      case 'syncing': return '#0070f2';
      case 'offline': return '#666666';
      case 'error': return '#bb0000';
      default: return '#666666';
    }
  };

  const getStatusBadge = (status: string) => {
    const configs = {
      online: { colorScheme: "8", text: "Онлайн" },
      syncing: { colorScheme: "6", text: "Синхронизация" },
      offline: { colorScheme: "2", text: "Офлайн" },
      error: { colorScheme: "1", text: "Ошибка" }
    };

    const config = configs[status as keyof typeof configs] || configs.offline;
    return <Badge colorScheme={config.colorScheme}>{config.text}</Badge>;
  };

  const getDeviceTypeLabel = (type: string) => {
    const labels = {
      tablet: 'Планшет',
      scanner: 'Сканер',
      warehouse: 'Склад',
      unknown: 'Неизвестно'
    };
    return labels[type as keyof typeof labels] || labels.unknown;
  };

  const formatLastSeen = (lastSeen: string) => {
    try {
      const date = new Date(lastSeen);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      
      if (diffMinutes < 1) return 'Только что';
      if (diffMinutes < 60) return `${diffMinutes} мин назад`;
      
      const diffHours = Math.floor(diffMinutes / 60);
      if (diffHours < 24) return `${diffHours} ч назад`;
      
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays} дн назад`;
    } catch {
      return 'Неизвестно';
    }
  };

  const handleDeviceAction = (deviceId: string, action: string) => {
    if (onDeviceAction) {
      onDeviceAction(deviceId, action);
    }
  };

  const getBatteryIcon = (level?: number) => {
    if (!level) return 'battery-empty';
    if (level > 75) return 'battery-full';
    if (level > 50) return 'battery-half';
    if (level > 25) return 'battery-low';
    return 'battery-empty';
  };

  const getBatteryColor = (level?: number) => {
    if (!level) return '#666666';
    if (level > 50) return '#0f7d0f';
    if (level > 25) return '#e9730c';
    return '#bb0000';
  };

  if (!devices || devices.length === 0) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
        <Icon name="information" style={{ fontSize: '2rem', marginBottom: '1rem' }} />
        <div>Устройства не найдены</div>
        <div style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
          Проверьте подключение к сети или обновите данные
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
      {devices.map((device) => (
        <Card key={device.id} style={{ border: `2px solid ${getStatusColor(device.status)}20` }}>
          <div style={{ padding: '1rem' }}>
            {/* Заголовок устройства */}
            <FlexBox
              direction={FlexBoxDirection.Row}
              justifyContent={FlexBoxJustifyContent.SpaceBetween}
              alignItems={FlexBoxAlignItems.Center}
              style={{ marginBottom: '1rem' }}
            >
              <FlexBox direction={FlexBoxDirection.Row} alignItems={FlexBoxAlignItems.Center} style={{ gap: '0.5rem' }}>
                <Icon
                  name={getDeviceIcon(device.type, device.status)}
                  style={{ 
                    fontSize: '1.5rem', 
                    color: getStatusColor(device.status)
                  }}
                />
                <div>
                  <Title level="H5" style={{ margin: 0 }}>
                    {device.name}
                  </Title>
                  <div style={{ fontSize: '0.75rem', color: '#666' }}>
                    {getDeviceTypeLabel(device.type)}
                  </div>
                </div>
              </FlexBox>
              {getStatusBadge(device.status)}
            </FlexBox>

            {/* Детали устройства */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem' }}>
              {device.ipAddress && (
                <FlexBox direction={FlexBoxDirection.Row} justifyContent={FlexBoxJustifyContent.SpaceBetween}>
                  <span style={{ color: '#666' }}>IP адрес:</span>
                  <span style={{ fontFamily: 'monospace' }}>{device.ipAddress}</span>
                </FlexBox>
              )}

              <FlexBox direction={FlexBoxDirection.Row} justifyContent={FlexBoxJustifyContent.SpaceBetween}>
                <span style={{ color: '#666' }}>Последний раз онлайн:</span>
                <span>{formatLastSeen(device.lastSeen)}</span>
              </FlexBox>

              {device.taskCount !== undefined && (
                <FlexBox direction={FlexBoxDirection.Row} justifyContent={FlexBoxJustifyContent.SpaceBetween}>
                  <span style={{ color: '#666' }}>Активных задач:</span>
                  <Badge colorScheme="6">{device.taskCount}</Badge>
                </FlexBox>
              )}

              {device.version && (
                <FlexBox direction={FlexBoxDirection.Row} justifyContent={FlexBoxJustifyContent.SpaceBetween}>
                  <span style={{ color: '#666' }}>Версия:</span>
                  <span style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{device.version}</span>
                </FlexBox>
              )}

              {/* Батарея */}
              {device.batteryLevel !== undefined && (
                <FlexBox direction={FlexBoxDirection.Row} justifyContent={FlexBoxJustifyContent.SpaceBetween} alignItems={FlexBoxAlignItems.Center}>
                  <span style={{ color: '#666' }}>Батарея:</span>
                  <FlexBox direction={FlexBoxDirection.Row} alignItems={FlexBoxAlignItems.Center} style={{ gap: '0.25rem' }}>
                    <Icon
                      name={getBatteryIcon(device.batteryLevel)}
                      style={{ color: getBatteryColor(device.batteryLevel), fontSize: '1rem' }}
                    />
                    <span style={{ color: getBatteryColor(device.batteryLevel) }}>
                      {device.batteryLevel}%
                    </span>
                  </FlexBox>
                </FlexBox>
              )}

              {/* Прогресс синхронизации */}
              {device.status === 'syncing' && device.syncProgress !== undefined && (
                <div style={{ marginTop: '0.5rem' }}>
                  <FlexBox direction={FlexBoxDirection.Row} justifyContent={FlexBoxJustifyContent.SpaceBetween} style={{ marginBottom: '0.25rem' }}>
                    <span style={{ color: '#666', fontSize: '0.8rem' }}>Синхронизация:</span>
                    <span style={{ fontSize: '0.8rem' }}>{device.syncProgress}%</span>
                  </FlexBox>
                  <ProgressIndicator value={device.syncProgress} />
                </div>
              )}
            </div>

            {/* Действия */}
            <FlexBox direction={FlexBoxDirection.Row} style={{ gap: '0.5rem', marginTop: '1rem' }}>
              {device.status === 'online' && (
                <>
                  <Button
                    design="Transparent"
                    icon="synchronize"
                    onClick={() => handleDeviceAction(device.id, 'sync')}
                    style={{ flex: 1 }}
                  >
                    Синхронизировать
                  </Button>
                  <Button
                    design="Transparent"
                    icon="settings"
                    onClick={() => handleDeviceAction(device.id, 'settings')}
                  />
                </>
              )}

              {device.status === 'offline' && (
                <Button
                  design="Transparent"
                  icon="refresh"
                  onClick={() => handleDeviceAction(device.id, 'ping')}
                  style={{ flex: 1 }}
                >
                  Проверить связь
                </Button>
              )}

              {device.status === 'error' && (
                <Button
                  design="Negative"
                  icon="alert"
                  onClick={() => handleDeviceAction(device.id, 'diagnose')}
                  style={{ flex: 1 }}
                >
                  Диагностика
                </Button>
              )}

              <Button
                design="Transparent"
                icon="detail-view"
                onClick={() => handleDeviceAction(device.id, 'details')}
              />
            </FlexBox>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default DeviceStatusCards; 

