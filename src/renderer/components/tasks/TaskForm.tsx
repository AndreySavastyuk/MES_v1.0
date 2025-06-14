import React, { useState, useEffect } from 'react';
import {
  Button,
  Input,
  TextArea,
  Select,
  Option,
  DateTimePicker,
  Panel,
  Title,
  FormGroup,
  FormItem,
  Label,
  MessageStrip,
  Table,
  TableColumn,
  TableRow,
  TableCell,
  Dialog,
  Bar
} from '@ui5/webcomponents-react';
import { PickTask, PickItem, Device } from '../../../shared/types';

interface TaskFormProps {
  task?: PickTask | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (taskData: any) => void;
  mode: 'create' | 'edit';
}

interface TaskFormData {
  number: string;
  description: string;
  priority: number;
  deadline: string;
  assigned_device: number | null;
  items: PickItem[];
}

interface NewItem {
  part_number: string;
  part_name: string;
  quantity_required: number;
  location: string;
}

const TaskForm: React.FC<TaskFormProps> = ({
  task,
  isOpen,
  onClose,
  onSave,
  mode
}) => {
  const [formData, setFormData] = useState<TaskFormData>({
    number: '',
    description: '',
    priority: 3,
    deadline: '',
    assigned_device: null,
    items: []
  });

  const [newItem, setNewItem] = useState<NewItem>({
    part_number: '',
    part_name: '',
    quantity_required: 1,
    location: ''
  });

  const [devices, setDevices] = useState<Device[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [addItemDialogOpen, setAddItemDialogOpen] = useState(false);

  // Инициализация формы при изменении задачи
  useEffect(() => {
    if (task && mode === 'edit') {
      setFormData({
        number: task.number,
        description: task.description || '',
        priority: task.priority,
        deadline: task.deadline || '',
        assigned_device: task.assigned_device,
        items: [] // Элементы загружаются отдельно
      });
      loadTaskItems(task.id);
    } else if (mode === 'create') {
      // Генерация номера задачи для нового создания
      const now = new Date();
      const taskNumber = `PICK-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
      
      setFormData({
        number: taskNumber,
        description: '',
        priority: 3,
        deadline: '',
        assigned_device: null,
        items: []
      });
    }
  }, [task, mode]);

  // Загрузка устройств
  useEffect(() => {
    if (isOpen) {
      loadDevices();
    }
  }, [isOpen]);

  const loadDevices = async () => {
    try {
      const response = await fetch('/api/devices');
      const result = await response.json();
      
      if (result.success) {
        setDevices(result.data);
      }
    } catch (error) {
      console.error('Ошибка загрузки устройств:', error);
    }
  };

  const loadTaskItems = async (taskId: number) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`);
      const result = await response.json();
      
      if (result.success && result.data.items) {
        setFormData(prev => ({ ...prev, items: result.data.items }));
      }
    } catch (error) {
      console.error('Ошибка загрузки элементов задачи:', error);
    }
  };

  // Валидация формы
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.number.trim()) {
      newErrors.number = 'Номер задачи обязателен';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Описание задачи обязательно';
    }

    if (formData.priority < 1 || formData.priority > 5) {
      newErrors.priority = 'Приоритет должен быть от 1 до 5';
    }

    if (formData.deadline) {
      const deadlineDate = new Date(formData.deadline);
      if (deadlineDate <= new Date()) {
        newErrors.deadline = 'Дедлайн должен быть в будущем';
      }
    }

    if (formData.items.length === 0) {
      newErrors.items = 'Должен быть добавлен хотя бы один элемент';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Валидация нового элемента
  const validateNewItem = (): boolean => {
    return !!(
      newItem.part_number.trim() &&
      newItem.part_name.trim() &&
      newItem.location.trim() &&
      newItem.quantity_required > 0
    );
  };

  // Добавление элемента
  const handleAddItem = () => {
    if (!validateNewItem()) {
      return;
    }

    const item: PickItem = {
      id: Date.now(), // Временный ID
      task_id: task?.id || 0,
      part_number: newItem.part_number,
      part_name: newItem.part_name,
      quantity_required: newItem.quantity_required,
      quantity_picked: 0,
      location: newItem.location,
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      picked_at: null
    };

    setFormData(prev => ({
      ...prev,
      items: [...prev.items, item]
    }));

    // Очистка формы нового элемента
    setNewItem({
      part_number: '',
      part_name: '',
      quantity_required: 1,
      location: ''
    });

    setAddItemDialogOpen(false);
  };

  // Удаление элемента
  const handleRemoveItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  // Сохранение формы
  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    
    try {
      const saveData = {
        ...formData,
        items: mode === 'create' ? formData.items : undefined // При редактировании элементы обновляются отдельно
      };

      await onSave(saveData);
      onClose();
    } catch (error) {
      console.error('Ошибка сохранения:', error);
    } finally {
      setLoading(false);
    }
  };

  // Приоритеты
  const priorityOptions = [
    { value: 1, text: 'Очень низкий (1)', color: 'var(--sapSuccessColor)' },
    { value: 2, text: 'Низкий (2)', color: 'var(--sapSuccessColor)' },
    { value: 3, text: 'Средний (3)', color: 'var(--sapWarningColor)' },
    { value: 4, text: 'Высокий (4)', color: 'var(--sapErrorColor)' },
    { value: 5, text: 'Критический (5)', color: 'var(--sapErrorColor)' }
  ];

  const formatDateTime = (value: string) => {
    if (!value) return '';
    return new Date(value).toISOString().slice(0, 16);
  };

  return (
    <Dialog
      open={isOpen}
      headerText={mode === 'create' ? 'Создание новой задачи' : 'Редактирование задачи'}
      onAfterClose={onClose}
      style={{ width: '90vw', maxWidth: '1200px' }}
    >
      <div style={{ padding: '1rem' }}>
        {/* Основная информация */}
        <Panel headerText="Основная информация" style={{ marginBottom: '1rem' }}>
          <div style={{ padding: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <FormItem>
                <Label required>Номер задачи</Label>
                <Input
                  value={formData.number}
                  onInput={(e: any) => setFormData(prev => ({ ...prev, number: e.target.value }))}
                  valueState={errors.number ? 'Error' : 'None'}
                  valueStateMessage={errors.number}
                  required
                />
              </FormItem>

              <FormItem>
                <Label>Приоритет</Label>
                <Select
                  value={formData.priority.toString()}
                  onChange={(e: any) => setFormData(prev => ({ 
                    ...prev, 
                    priority: parseInt(e.detail.selectedOption.value) 
                  }))}
                >
                  {priorityOptions.map(option => (
                    <Option key={option.value} value={option.value.toString()}>
                      {option.text}
                    </Option>
                  ))}
                </Select>
              </FormItem>
            </div>

            <FormItem>
              <Label required>Описание</Label>
              <TextArea
                value={formData.description}
                onInput={(e: any) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                valueState={errors.description ? 'Error' : 'None'}
                valueStateMessage={errors.description}
                rows={3}
                required
              />
            </FormItem>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <FormItem>
                <Label>Дедлайн</Label>
                <DateTimePicker
                  value={formatDateTime(formData.deadline)}
                  onChange={(e: any) => setFormData(prev => ({ 
                    ...prev, 
                    deadline: e.target.value ? new Date(e.target.value).toISOString() : ''
                  }))}
                  valueState={errors.deadline ? 'Error' : 'None'}
                  valueStateMessage={errors.deadline}
                />
              </FormItem>

              <FormItem>
                <Label>Назначить устройству</Label>
                <Select
                  value={formData.assigned_device?.toString() || ''}
                  onChange={(e: any) => setFormData(prev => ({ 
                    ...prev, 
                    assigned_device: e.detail.selectedOption.value ? parseInt(e.detail.selectedOption.value) : null
                  }))}
                >
                  <Option value="">Не назначено</Option>
                  {devices.filter(d => d.status === 'online').map(device => (
                    <Option key={device.id} value={device.id.toString()}>
                      {device.name} ({device.device_type})
                    </Option>
                  ))}
                </Select>
              </FormItem>
            </div>
          </div>
        </Panel>

        {/* Элементы задачи */}
        <Panel headerText="Элементы задачи" style={{ marginBottom: '1rem' }}>
          <div style={{ padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <Title level="H5">
                Элементы ({formData.items.length})
              </Title>
              <Button 
                design="Emphasized" 
                icon="add"
                onClick={() => setAddItemDialogOpen(true)}
              >
                Добавить элемент
              </Button>
            </div>

            {errors.items && (
              <MessageStrip design="Negative" style={{ marginBottom: '1rem' }}>
                {errors.items}
              </MessageStrip>
            )}

            {formData.items.length > 0 ? (
              <Table>
                <TableColumn slot="columns">Артикул</TableColumn>
                <TableColumn slot="columns">Наименование</TableColumn>
                <TableColumn slot="columns">Количество</TableColumn>
                <TableColumn slot="columns">Локация</TableColumn>
                <TableColumn slot="columns">Действия</TableColumn>

                {formData.items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{item.part_number}</TableCell>
                    <TableCell>{item.part_name}</TableCell>
                    <TableCell>{item.quantity_required}</TableCell>
                    <TableCell>{item.location}</TableCell>
                    <TableCell>
                      <Button
                        design="Transparent"
                        icon="delete"
                        onClick={() => handleRemoveItem(index)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </Table>
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--sapContentLabelColor)' }}>
                Добавьте элементы в задачу
              </div>
            )}
          </div>
        </Panel>
      </div>

      {/* Кнопки действий */}
      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #eee' }}>
        <Button design="Transparent" onClick={onClose}>
          Отмена
        </Button>
        <Button 
          design="Emphasized" 
          onClick={handleSave}
          disabled={loading}
        >
          {loading ? 'Сохранение...' : (mode === 'create' ? 'Создать' : 'Сохранить')}
        </Button>
      </div>

      {/* Диалог добавления элемента */}
      <Dialog
        open={addItemDialogOpen}
        headerText="Добавить элемент"
        onAfterClose={() => setAddItemDialogOpen(false)}
      >
        <div style={{ padding: '1rem', minWidth: '400px' }}>
          <FormItem style={{ marginBottom: '1rem' }}>
            <Label required>Артикул</Label>
            <Input
              value={newItem.part_number}
              onInput={(e: any) => setNewItem(prev => ({ ...prev, part_number: e.target.value }))}
              required
            />
          </FormItem>

          <FormItem style={{ marginBottom: '1rem' }}>
            <Label required>Наименование</Label>
            <Input
              value={newItem.part_name}
              onInput={(e: any) => setNewItem(prev => ({ ...prev, part_name: e.target.value }))}
              required
            />
          </FormItem>

          <FormItem style={{ marginBottom: '1rem' }}>
            <Label required>Количество</Label>
            <Input
              type="Number"
              value={newItem.quantity_required.toString()}
              onInput={(e: any) => setNewItem(prev => ({ 
                ...prev, 
                quantity_required: parseInt(e.target.value) || 1 
              }))}
              required
            />
          </FormItem>

          <FormItem style={{ marginBottom: '1rem' }}>
            <Label required>Локация</Label>
            <Input
              value={newItem.location}
              onInput={(e: any) => setNewItem(prev => ({ ...prev, location: e.target.value }))}
              placeholder="A1-B2-C3"
              required
            />
          </FormItem>
        </div>

        <div slot="footer" style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <Button 
            design="Transparent" 
            onClick={() => setAddItemDialogOpen(false)}
          >
            Отмена
          </Button>
          <Button 
            design="Emphasized" 
            onClick={handleAddItem}
            disabled={!validateNewItem()}
          >
            Добавить
          </Button>
        </div>
      </Dialog>
    </Dialog>
  );
};

export default TaskForm; 

