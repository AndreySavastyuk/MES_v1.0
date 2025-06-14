import React, { useState, useRef } from 'react';
import {
  Dialog,
  Button,
  Title,
  Panel,
  MessageStrip,
  Table,
  TableColumn,
  TableRow,
  TableCell,
  ProgressIndicator,
  Card,
  CardHeader,
  Icon,
  Badge,
  Bar
} from '@ui5/webcomponents-react';
import * as XLSX from 'xlsx';

interface ImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

interface ImportPreviewRow {
  number: string;
  part_number: string;
  part_name: string;
  quantity_required: number;
  location: string;
  description?: string;
  priority?: number;
  deadline?: string;
  isValid: boolean;
  errors: string[];
}

interface ImportResult {
  created: number;
  errors: string[];
}

const ImportDialog: React.FC<ImportDialogProps> = ({
  isOpen,
  onClose,
  onImportComplete
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<ImportPreviewRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [step, setStep] = useState<'upload' | 'preview' | 'result'>('upload');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Обязательные поля
  const requiredFields = ['number', 'part_number', 'part_name', 'quantity_required', 'location'];

  // Сброс состояния при закрытии
  const handleClose = () => {
    setFile(null);
    setPreviewData([]);
    setImportResult(null);
    setStep('upload');
    setDragOver(false);
    onClose();
  };

  // Обработка выбора файла
  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
    processFile(selectedFile);
  };

  // Обработка drag & drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && isValidFileType(droppedFile)) {
      handleFileSelect(droppedFile);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  // Проверка типа файла
  const isValidFileType = (file: File): boolean => {
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv' // .csv
    ];
    
    return validTypes.includes(file.type) || 
           file.name.endsWith('.xlsx') || 
           file.name.endsWith('.xls') || 
           file.name.endsWith('.csv');
  };

  // Обработка файла
  const processFile = async (file: File) => {
    try {
      const buffer = await file.arrayBuffer();
      let data: any[] = [];

      if (file.name.endsWith('.csv')) {
        // Обработка CSV
        const text = new TextDecoder().decode(buffer);
        const lines = text.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
          throw new Error('CSV файл должен содержать заголовки и данные');
        }

        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        
        data = lines.slice(1).map(line => {
          const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
          const row: any = {};
          headers.forEach((header, index) => {
            row[header] = values[index] || '';
          });
          return row;
        });
      } else {
        // Обработка Excel
        const workbook = XLSX.read(buffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        data = XLSX.utils.sheet_to_json(worksheet);
      }

      if (data.length === 0) {
        throw new Error('Файл не содержит данных');
      }

      const processedData = validateAndProcessData(data);
      setPreviewData(processedData);
      setStep('preview');

    } catch (error: any) {
      console.error('Ошибка обработки файла:', error);
      alert(`Ошибка обработки файла: ${error.message}`);
    }
  };

  // Валидация и обработка данных
  const validateAndProcessData = (data: any[]): ImportPreviewRow[] => {
    return data.map((row, index) => {
      const errors: string[] = [];
      
      // Проверка обязательных полей
      requiredFields.forEach(field => {
        if (!row[field] || String(row[field]).trim() === '') {
          errors.push(`Отсутствует поле: ${field}`);
        }
      });

      // Валидация quantity_required
      const quantity = parseInt(row.quantity_required);
      if (isNaN(quantity) || quantity <= 0) {
        errors.push('Количество должно быть положительным числом');
      }

      // Валидация priority
      if (row.priority) {
        const priority = parseInt(row.priority);
        if (isNaN(priority) || priority < 1 || priority > 5) {
          errors.push('Приоритет должен быть от 1 до 5');
        }
      }

      // Валидация deadline
      if (row.deadline && isNaN(Date.parse(row.deadline))) {
        errors.push('Некорректный формат даты дедлайна');
      }

      return {
        number: String(row.number || '').trim(),
        part_number: String(row.part_number || '').trim(),
        part_name: String(row.part_name || '').trim(),
        quantity_required: quantity || 0,
        location: String(row.location || '').trim(),
        description: String(row.description || '').trim(),
        priority: row.priority ? parseInt(row.priority) : 3,
        deadline: row.deadline ? new Date(row.deadline).toISOString() : undefined,
        isValid: errors.length === 0,
        errors
      };
    });
  };

  // Выполнение импорта
  const handleImport = async () => {
    if (!file || previewData.length === 0) return;

    setImporting(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/tasks/import', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (result.success) {
        setImportResult(result.data);
        setStep('result');
        setTimeout(() => {
          onImportComplete();
        }, 1000);
      } else {
        throw new Error(result.error || 'Ошибка импорта');
      }
    } catch (error: any) {
      console.error('Ошибка импорта:', error);
      alert(`Ошибка импорта: ${error.message}`);
    } finally {
      setImporting(false);
    }
  };

  // Статистика превью
  const validRows = previewData.filter(row => row.isValid).length;
  const invalidRows = previewData.length - validRows;

  // Шаблон для скачивания
  const downloadTemplate = () => {
    const template = [
      {
        number: 'PICK-2024-001',
        part_number: 'P001',
        part_name: 'Болт М8x20',
        quantity_required: 50,
        location: 'A1-B2-C3',
        description: 'Заказ для клиента А-123',
        priority: 3,
        deadline: '2024-12-31'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'task_import_template.xlsx');
  };

  return (
    <Dialog
      open={isOpen}
      headerText="Импорт задач из файла"
      onAfterClose={handleClose}
      style={{ width: '90vw', maxWidth: '1200px' }}
    >
      <div style={{ padding: '1rem' }}>
        {step === 'upload' && (
          <>
            {/* Инструкции */}
            <MessageStrip design="Information" style={{ marginBottom: '1rem' }}>
              Поддерживаются файлы Excel (.xlsx, .xls) и CSV (.csv). 
              Обязательные поля: number, part_number, part_name, quantity_required, location.
            </MessageStrip>

            {/* Кнопка шаблона */}
            <div style={{ marginBottom: '1rem' }}>
              <Button design="Transparent" icon="download" onClick={downloadTemplate}>
                Скачать шаблон Excel
              </Button>
            </div>

            {/* Область загрузки */}
            <div
              style={{
                border: `2px dashed ${dragOver ? 'var(--sapSuccessColor)' : 'var(--sapNeutralBorderColor)'}`,
                borderRadius: '8px',
                padding: '3rem',
                textAlign: 'center',
                backgroundColor: dragOver ? 'var(--sapSuccessBackground)' : 'var(--sapNeutralBackground)',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
            >
              <Icon 
                name="upload" 
                style={{ 
                  fontSize: '3rem', 
                  color: 'var(--sapContent_IconColor)',
                  marginBottom: '1rem'
                }} 
              />
              <div style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>
                Перетащите файл сюда или нажмите для выбора
              </div>
              <div style={{ color: 'var(--sapContent_LabelColor)' }}>
                Поддерживаются Excel (.xlsx, .xls) и CSV (.csv) файлы
              </div>
              
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const selectedFile = e.target.files?.[0];
                  if (selectedFile && isValidFileType(selectedFile)) {
                    handleFileSelect(selectedFile);
                  } else {
                    alert('Неподдерживаемый тип файла');
                  }
                }}
              />
            </div>
          </>
        )}

        {step === 'preview' && (
          <>
            {/* Статистика */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
              <Card>
                <CardHeader titleText="Всего строк" />
                <div style={{ padding: '1rem', textAlign: 'center', fontSize: '2rem', fontWeight: 'bold' }}>
                  {previewData.length}
                </div>
              </Card>
              
              <Card>
                <CardHeader titleText="Валидные строки" />
                <div style={{ padding: '1rem', textAlign: 'center', fontSize: '2rem', fontWeight: 'bold', color: 'var(--sapSuccessColor)' }}>
                  {validRows}
                </div>
              </Card>
              
              <Card>
                <CardHeader titleText="Ошибки" />
                <div style={{ padding: '1rem', textAlign: 'center', fontSize: '2rem', fontWeight: 'bold', color: 'var(--sapErrorColor)' }}>
                  {invalidRows}
                </div>
              </Card>
            </div>

            {invalidRows > 0 && (
              <MessageStrip design="Warning" style={{ marginBottom: '1rem' }}>
                Найдены ошибки в {invalidRows} строках. Будут импортированы только валидные записи.
              </MessageStrip>
            )}

            {/* Превью данных */}
            <Panel headerText="Превью данных" style={{ marginBottom: '1rem' }}>
              <div style={{ padding: '1rem', maxHeight: '400px', overflow: 'auto' }}>
                <Table>
                  <TableColumn slot="columns">Статус</TableColumn>
                  <TableColumn slot="columns">Номер</TableColumn>
                  <TableColumn slot="columns">Артикул</TableColumn>
                  <TableColumn slot="columns">Наименование</TableColumn>
                  <TableColumn slot="columns">Количество</TableColumn>
                  <TableColumn slot="columns">Локация</TableColumn>
                  <TableColumn slot="columns">Ошибки</TableColumn>

                  {previewData.slice(0, 50).map((row, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Badge colorScheme={row.isValid ? '7' : '1'}>
                          {row.isValid ? 'OK' : 'Ошибка'}
                        </Badge>
                      </TableCell>
                      <TableCell>{row.number}</TableCell>
                      <TableCell>{row.part_number}</TableCell>
                      <TableCell>
                        <div style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {row.part_name}
                        </div>
                      </TableCell>
                      <TableCell>{row.quantity_required}</TableCell>
                      <TableCell>{row.location}</TableCell>
                      <TableCell>
                        {row.errors.length > 0 && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--sapErrorColor)' }}>
                            {row.errors.join(', ')}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </Table>
                
                {previewData.length > 50 && (
                  <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--sapContent_LabelColor)' }}>
                    Показаны первые 50 записей из {previewData.length}
                  </div>
                )}
              </div>
            </Panel>
          </>
        )}

        {step === 'result' && importResult && (
          <>
            {/* Результаты импорта */}
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <Icon 
                name={importResult.errors.length === 0 ? "message-success" : "message-warning"} 
                style={{ 
                  fontSize: '4rem', 
                  color: importResult.errors.length === 0 ? 'var(--sapSuccessColor)' : 'var(--sapWarningColor)',
                  marginBottom: '1rem'
                }} 
              />
              <Title level="H3">
                Импорт завершен
              </Title>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <Card>
                <CardHeader titleText="Создано элементов" />
                <div style={{ padding: '1rem', textAlign: 'center', fontSize: '2rem', fontWeight: 'bold', color: 'var(--sapSuccessColor)' }}>
                  {importResult.created}
                </div>
              </Card>
              
              <Card>
                <CardHeader titleText="Ошибки" />
                <div style={{ padding: '1rem', textAlign: 'center', fontSize: '2rem', fontWeight: 'bold', color: 'var(--sapErrorColor)' }}>
                  {importResult.errors.length}
                </div>
              </Card>
            </div>

            {importResult.errors.length > 0 && (
              <Panel headerText="Ошибки импорта">
                <div style={{ padding: '1rem', maxHeight: '300px', overflow: 'auto' }}>
                  {importResult.errors.map((error, index) => (
                    <div key={index} style={{ 
                      padding: '0.5rem', 
                      marginBottom: '0.5rem',
                      backgroundColor: 'var(--sapErrorBackground)',
                      border: '1px solid var(--sapErrorBorderColor)',
                      borderRadius: '4px',
                      fontSize: '0.875rem'
                    }}>
                      {error}
                    </div>
                  ))}
                </div>
              </Panel>
            )}
          </>
        )}

        {importing && (
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <ProgressIndicator value={50} displayValue="Импорт в процессе..." />
            <div style={{ marginTop: '1rem', color: 'var(--sapContent_LabelColor)' }}>
              Пожалуйста, подождите...
            </div>
          </div>
        )}
      </div>

      {/* Кнопки действий */}
      <div slot="footer" style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
        {step === 'upload' && (
          <Button design="Emphasized" onClick={handleClose}>
            Отмена
          </Button>
        )}
        
        {step === 'preview' && (
          <>
            <Button design="Transparent" onClick={() => setStep('upload')}>
              Назад
            </Button>
            <Button 
              design="Emphasized" 
              onClick={handleImport}
              disabled={validRows === 0 || importing}
            >
              {importing ? 'Импорт...' : `Импортировать (${validRows} записей)`}
            </Button>
          </>
        )}
        
        {step === 'result' && (
          <Button design="Emphasized" onClick={handleClose}>
            Закрыть
          </Button>
        )}
      </div>
    </Dialog>
  );
};

export default ImportDialog; 

