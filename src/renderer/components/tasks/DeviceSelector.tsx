import React, { useState, useEffect } from 'react';
import {
  Dialog,
  Button,
  Title,
  Card,
  CardHeader,
  Badge,
  Icon,
  MessageStrip,
  Input,
  Select,
  Option,
  Panel,
  Table,
  TableColumn,
  TableRow,
  TableCell,
  RadioButton
} from '@ui5/webcomponents-react';
import { Device, PickTask } from '../../../shared/types';

interface DeviceSelectorProps {
  task: PickTask | null;
  isOpen: boolean;
  onClose: () => void;
  onSendToDevice: (deviceId: number) => void;
}

const DeviceSelector: React.FC<DeviceSelectorProps> = ({
  task,
  isOpen,
  onClose,
  onSendToDevice
}) => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [filter, setFilter] = useState<string>('online');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sending, setSending] = useState(false);

  // Загрузка устройств
  useEffect(() => {
    if (isOpen) {
      loadDevices();
    }
  }, [isOpen]);

  const loadDevices = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/devices');
      const result = await response.json();

      if (result.success) {
        setDevices(result.data);
      } else {
        throw new Error(result.error || 'Ошибка загрузки устройств');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Фильтрация устройств
  const filteredDevices = devices.filter(device => {
    // Фильтр по статусу
    if (filter === 'online' && device.status !== 'online') return false;
    if (filter === 'all' && device.status === 'error') return false;

    // Поиск по названию или IP
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return device.name.toLowerCase().includes(query) ||
             (device.ip_address && device.ip_address.toLowerCase().includes(query));
    }

    return true;
  });

  // Отправка задачи на устройство
  const handleSendTask = async () => {
    if (!selectedDeviceId || !task) return;

    setSending(true);
    setError('');

    try {
      const response = await fetch(`/api/tasks/${task.id}/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          device_id: selectedDeviceId
        })
      });

      const result = await response.json();

      if (result.success) {
        onSendToDevice(selectedDeviceId);
        onClose();
      } else {
        throw new Error(result.error || 'Ошибка отправки задачи');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  // Функции для получения цветов и текста статуса
  const getStatusBadgeColorScheme = (status: string) => {
    switch (status) {
      case 'online': return '7';
      case 'offline': return '6';
      case 'syncing': return '8';
      case 'error': return '1';
      default: return '6';
    }
  };

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      online: 'В сети',
      offline: 'Отключен',
      syncing: 'Синхронизация',
      error: 'Ошибка'
    };
    return statusMap[status] || status;
  };

  const getDeviceTypeIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'tablet': return 'tablet';
      case 'scanner': return 'bar-code';
      case 'desktop': return 'desktop-monitor';
      default: return 'device-mobile';
    }
  };

  const getDeviceTypeText = (deviceType: string) => {
    const typeMap: Record<string, string> = {
      tablet: 'Планшет',
      scanner: 'Сканер',
      desktop: 'Рабочая станция'
    };
    return typeMap[deviceType] || deviceType;
  };

  // Форматирование времени синхронизации
  const formatLastSync = (dateString: string | null) => {
    if (!dateString) return 'Никогда';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Только что';
    if (diffInMinutes < 60) return `${diffInMinutes} мин назад`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} ч назад`;
    return date.toLocaleDateString('ru-RU');
  };

  const onlineDevices = devices.filter(d => d.status === 'online');
  const selectedDevice = devices.find(d => d.id === selectedDeviceId);

  return (
    <Dialog
      open={isOpen}
      headerText="Выбор устройства для отправки задачи"
      onAfterClose={onClose}
      style={{ width: '90vw', maxWidth: '1000px' }}
    >
      <div style={{ padding: '1rem' }}>
        {/* Информация о задаче */}
        {task && (
          <Panel headerText="Задача для отправки" style={{ marginBottom: '1rem' }}>
            <div style={{ padding: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <strong>Номер:</strong> {task.number}
                </div>
                <div>
                  <strong>Приоритет:</strong> {task.priority}
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <strong>Описание:</strong> {task.description}
                </div>
              </div>
            </div>
          </Panel>
        )}

        {/* Сообщение об ошибке */}
        {error && (
          <MessageStrip design="Negative" style={{ marginBottom: '1rem' }}>
            {error}
          </MessageStrip>
        )}

        {/* Статистика устройств */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
          <Card>
            <CardHeader titleText="Всего устройств" />
            <div style={{ padding: '1rem', textAlign: 'center', fontSize: '1.5rem', fontWeight: 'bold' }}>
              {devices.length}
            </div>
          </Card>
          
          <Card>
            <CardHeader titleText="В сети" />
            <div style={{ padding: '1rem', textAlign: 'center', fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--sapSuccessColor)' }}>
              {onlineDevices.length}
            </div>
          </Card>
          
          <Card>
            <CardHeader titleText="Планшеты" />
            <div style={{ padding: '1rem', textAlign: 'center', fontSize: '1.5rem', fontWeight: 'bold' }}>
              {devices.filter(d => d.device_type === 'tablet').length}
            </div>
          </Card>
        </div>

        {/* Фильтры */}
        <Panel headerText="Фильтры" collapsed style={{ marginBottom: '1rem' }}>
          <div style={{ padding: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <Input
                placeholder="Поиск по названию или IP..."
                value={searchQuery}
                onInput={(e: any) => setSearchQuery(e.target.value)}
              />
              
              <Select
                value={filter}
                onChange={(e: any) => setFilter(e.detail.selectedOption.value)}
              >
                <Option value="online">Только в сети</Option>
                <Option value="all">Все кроме ошибок</Option>
              </Select>
            </div>
          </div>
        </Panel>

        {/* Список устройств */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            Загрузка устройств...
          </div>
        ) : filteredDevices.length === 0 ? (
          <MessageStrip design="Information">
            {onlineDevices.length === 0 ? 
              'Нет доступных устройств в сети. Проверьте подключение устройств.' :
              'Нет устройств, соответствующих фильтрам.'
            }
          </MessageStrip>
        ) : (
          <Panel headerText={`Доступные устройства (${filteredDevices.length})`}>
            <div style={{ padding: '1rem' }}>
              <div style={{ display: 'grid', gap: '1rem' }}>
                {filteredDevices.map((device) => (
                  <Card 
                    key={device.id}
                    style={{ 
                      cursor: device.status === 'online' ? 'pointer' : 'not-allowed',
                      border: selectedDeviceId === device.id ? '2px solid var(--sapSuccessColor)' : undefined,
                      opacity: device.status === 'online' ? 1 : 0.6
                    }}
                    onClick={() => {
                      if (device.status === 'online') {
                        setSelectedDeviceId(device.id);
                      }
                    }}
                  >
                    <div style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                        <RadioButton
                          checked={selectedDeviceId === device.id}
                          disabled={device.status !== 'online'}
                          onChange={() => {
                            if (device.status === 'online') {
                              setSelectedDeviceId(device.id);
                            }
                          }}
                        />
                        
                        <Icon 
                          name={getDeviceTypeIcon(device.device_type)}
                          style={{ fontSize: '1.5rem', color: 'var(--sapContent_IconColor)' }}
                        />
                        
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>
                            {device.name}
                          </div>
                          <div style={{ fontSize: '0.875rem', color: 'var(--sapContent_LabelColor)' }}>
                            {getDeviceTypeText(device.device_type)}
                            {device.ip_address && ` • ${device.ip_address}`}
                          </div>
                        </div>
                        
                        <Badge colorScheme={getStatusBadgeColorScheme(device.status)}>
                          {getStatusText(device.status)}
                        </Badge>
                      </div>
                      
                      <div style={{ fontSize: '0.75rem', color: 'var(--sapContent_LabelColor)' }}>
                        Последняя синхронизация: {formatLastSync(device.last_sync)}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </Panel>
        )}

        {/* Информация о выбранном устройстве */}
        {selectedDevice && (
          <Panel headerText="Выбранное устройство" style={{ marginTop: '1rem' }}>
            <div style={{ padding: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <Icon 
                  name={getDeviceTypeIcon(selectedDevice.device_type)}
                  style={{ fontSize: '2rem', color: 'var(--sapSuccessColor)' }}
                />
                <div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>
                    {selectedDevice.name}
                  </div>
                  <div style={{ color: 'var(--sapContent_LabelColor)' }}>
                    {getDeviceTypeText(selectedDevice.device_type)} • {selectedDevice.ip_address}
                  </div>
                </div>
              </div>
            </div>
          </Panel>
        )}
      </div>

      {/* Кнопки действий */}
      <div slot="footer" style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
        <Button design="Transparent" onClick={onClose}>
          Отмена
        </Button>
        
        <Button 
          design="Emphasized" 
          onClick={handleSendTask}
          disabled={!selectedDeviceId || sending || !task}
          icon="share"
        >
          {sending ? 'Отправка...' : 'Отправить задачу'}
        </Button>
      </div>
    </Dialog>
  );
};

export default DeviceSelector; 

