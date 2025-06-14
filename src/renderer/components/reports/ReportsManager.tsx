import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  CardHeader,
  Title,
  Button,
  Tab,
  TabContainer,
  TabSeparator,
  Badge,
  Select,
  Option,
  MultiComboBox,
  DatePicker,
  CheckBox,
  Input,
  TextArea,
  Dialog,
  Bar,
  ProgressIndicator,
  Table,
  TableColumn,
  TableRow,
  TableCell,
  Icon,
  FlexBox,
  FlexBoxDirection,
  FlexBoxJustifyContent,
  FlexBoxAlignItems,
  Toolbar,
  ToolbarSeparator
} from '@ui5/webcomponents-react';

interface ExportOptions {
  format: 'excel' | 'pdf' | 'both';
  includeCharts: boolean;
  dateRange: { from: string; to: string };
  reportType: 'acceptance_log' | 'tasks_summary' | 'full_report';
  filters?: any;
}

interface ScheduledReport {
  id: string;
  name: string;
  description: string;
  cronExpression: string;
  reportType: 'acceptance_log' | 'tasks_summary' | 'full_report';
  format: 'excel' | 'pdf' | 'both';
  includeCharts: boolean;
  emailRecipients: string[];
  active: boolean;
  lastGenerated?: string;
  nextRun?: string;
}

interface ReportGeneration {
  reportId: string;
  timestamp: string;
  status: 'success' | 'error';
  filePaths: string[];
  errorMessage?: string;
  duration: number;
  recipientsSent: string[];
}

// Временная замена для отсутствующих компонентов
const CardContent: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="ui5-card-content">{children}</div>
);

const MessageToast = {
  show: (message: string) => {
    console.log('Toast:', message);
    // В реальном приложении здесь будет показ уведомления
  }
};

const ReportsManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState('instant');
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  
  // Данные
  const [scheduledReports, setScheduledReports] = useState<ScheduledReport[]>([]);
  const [generationHistory, setGenerationHistory] = useState<ReportGeneration[]>([]);
  const [emailConfig, setEmailConfig] = useState<any>(null);
  
  // Состояние формы экспорта
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'excel',
    includeCharts: true,
    dateRange: {
      from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      to: new Date().toISOString().split('T')[0]
    },
    reportType: 'full_report'
  });

  // Состояние формы планирования
  const [scheduleForm, setScheduleForm] = useState({
    name: '',
    description: '',
    cronExpression: '0 9 * * 1-5', // Каждый будний день в 9:00
    reportType: 'full_report' as 'acceptance_log' | 'tasks_summary' | 'full_report',
    format: 'excel' as 'excel' | 'pdf' | 'both',
    includeCharts: true,
    emailRecipients: [] as string[],
    active: true
  });

  // Загрузка данных при монтировании
  useEffect(() => {
    loadScheduledReports();
    loadGenerationHistory();
    loadEmailConfig();
  }, []);

  // Загрузка запланированных отчетов
  const loadScheduledReports = async () => {
    try {
      const response = await fetch('/api/reports/scheduled');
      const data = await response.json();
      setScheduledReports(data);
    } catch (error) {
      console.error('Ошибка загрузки запланированных отчетов:', error);
    }
  };

  // Загрузка истории генерации
  const loadGenerationHistory = async () => {
    try {
      const response = await fetch('/api/reports/history');
      const data = await response.json();
      setGenerationHistory(data);
    } catch (error) {
      console.error('Ошибка загрузки истории отчетов:', error);
    }
  };

  // Загрузка конфигурации email
  const loadEmailConfig = async () => {
    try {
      const response = await fetch('/api/reports/email-config');
      const data = await response.json();
      setEmailConfig(data);
    } catch (error) {
      console.error('Ошибка загрузки конфигурации email:', error);
    }
  };

  // Мгновенная генерация отчета
  const handleInstantExport = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(exportOptions)
      });

      if (response.ok) {
        const data = await response.json();
        setToastMessage(`Отчет успешно сгенерирован: ${data.filePaths.join(', ')}`);
        setShowExportDialog(false);
        
        // Скачивание файлов
        for (const filePath of data.filePaths) {
          const downloadResponse = await fetch(`/api/reports/download?path=${encodeURIComponent(filePath)}`);
          const blob = await downloadResponse.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filePath.split('/').pop() || 'report';
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        }
      } else {
        throw new Error('Ошибка генерации отчета');
      }
    } catch (error) {
      setToastMessage('Ошибка генерации отчета: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // Создание запланированного отчета
  const handleCreateScheduledReport = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/reports/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scheduleForm)
      });

      if (response.ok) {
        setToastMessage('Запланированный отчет создан успешно');
        setShowScheduleDialog(false);
        await loadScheduledReports();
        
        // Сброс формы
        setScheduleForm({
          name: '',
          description: '',
          cronExpression: '0 9 * * 1-5',
          reportType: 'full_report',
          format: 'excel',
          includeCharts: true,
          emailRecipients: [],
          active: true
        });
      } else {
        throw new Error('Ошибка создания запланированного отчета');
      }
    } catch (error) {
      setToastMessage('Ошибка: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // Переключение активности запланированного отчета
  const toggleReportActive = async (reportId: string, active: boolean) => {
    try {
      const response = await fetch(`/api/reports/schedule/${reportId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active })
      });

      if (response.ok) {
        await loadScheduledReports();
        setToastMessage(`Отчет ${active ? 'активирован' : 'деактивирован'}`);
      }
    } catch (error) {
      setToastMessage('Ошибка обновления отчета: ' + (error as Error).message);
    }
  };

  // Удаление запланированного отчета
  const deleteScheduledReport = async (reportId: string) => {
    try {
      const response = await fetch(`/api/reports/schedule/${reportId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await loadScheduledReports();
        setToastMessage('Запланированный отчет удален');
      }
    } catch (error) {
      setToastMessage('Ошибка удаления отчета: ' + (error as Error).message);
    }
  };

  // Ручная генерация запланированного отчета
  const generateReportNow = async (reportId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/reports/schedule/${reportId}/generate`, {
        method: 'POST'
      });

      if (response.ok) {
        setToastMessage('Отчет сгенерирован и отправлен');
        await loadGenerationHistory();
      }
    } catch (error) {
      setToastMessage('Ошибка генерации отчета: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // Получение статуса отчета
  const getReportStatusBadge = (report: ScheduledReport) => {
    if (!report.active) {
      return <Badge colorScheme="3">Неактивен</Badge>;
    }
    
    if (report.lastGenerated) {
      const lastGen = new Date(report.lastGenerated);
      const now = new Date();
      const diffHours = (now.getTime() - lastGen.getTime()) / (1000 * 60 * 60);
      
      if (diffHours < 25) {
        return <Badge colorScheme="8">Активен</Badge>;
      }
    }
    
    return <Badge colorScheme="2">Ожидание</Badge>;
  };

  // Получение описания cron выражения
  const getCronDescription = (cronExpression: string): string => {
    const cronDescriptions: { [key: string]: string } = {
      '0 9 * * 1-5': 'Каждый будний день в 9:00',
      '0 18 * * *': 'Каждый день в 18:00',
      '0 9 * * 1': 'Каждый понедельник в 9:00',
      '0 9 1 * *': 'Первого числа каждого месяца в 9:00',
      '0 */6 * * *': 'Каждые 6 часов',
      '0 0 * * 0': 'Каждое воскресенье в полночь'
    };
    
    return cronDescriptions[cronExpression] || cronExpression;
  };

  // Фильтрованная история по выбранному отчету
  const filteredHistory = useMemo(() => {
    return generationHistory.slice(0, 50); // Показываем последние 50 записей
  }, [generationHistory]);

  // Статистика
  const statistics = useMemo(() => {
    const total = scheduledReports.length;
    const active = scheduledReports.filter(r => r.active).length;
    const recentGenerations = generationHistory.filter(g => 
      new Date(g.timestamp).getTime() > Date.now() - 24 * 60 * 60 * 1000
    );
    
    return {
      totalReports: total,
      activeReports: active,
      generationsLast24h: recentGenerations.length,
      successRate: recentGenerations.length > 0 
        ? Math.round((recentGenerations.filter(g => g.status === 'success').length / recentGenerations.length) * 100)
        : 0
    };
  }, [scheduledReports, generationHistory]);

  return (
    <div style={{ padding: '1rem' }}>
      {/* Заголовок и статистика */}
      <Card>
        <CardHeader>
          <Title level="H3">Управление отчетами</Title>
        </CardHeader>
        <CardContent>
          <FlexBox direction={FlexBoxDirection.Row} justifyContent={FlexBoxJustifyContent.SpaceAround}>
            <FlexBox direction={FlexBoxDirection.Column} alignItems={FlexBoxAlignItems.Center}>
              <Title level="H4">{statistics.totalReports}</Title>
              <span>Всего отчетов</span>
            </FlexBox>
            <FlexBox direction={FlexBoxDirection.Column} alignItems={FlexBoxAlignItems.Center}>
              <Title level="H4">{statistics.activeReports}</Title>
              <span>Активных</span>
            </FlexBox>
            <FlexBox direction={FlexBoxDirection.Column} alignItems={FlexBoxAlignItems.Center}>
              <Title level="H4">{statistics.generationsLast24h}</Title>
              <span>За сутки</span>
            </FlexBox>
            <FlexBox direction={FlexBoxDirection.Column} alignItems={FlexBoxAlignItems.Center}>
              <Title level="H4">{statistics.successRate}%</Title>
              <span>Успешность</span>
            </FlexBox>
          </FlexBox>
        </CardContent>
      </Card>

      {/* Вкладки */}
      <TabContainer 
        collapsed={false}
        style={{ marginTop: '1rem' }}
        onTabSelect={(e) => setActiveTab(e.detail.tab.getAttribute('data-key') || 'instant')}
      >
        <Tab text="Мгновенный экспорт" data-key="instant" selected={activeTab === 'instant'} />
        <TabSeparator />
        <Tab text="Планировщик" data-key="scheduler" selected={activeTab === 'scheduler'} />
        <TabSeparator />
        <Tab text="История" data-key="history" selected={activeTab === 'history'} />
        <TabSeparator />
        <Tab text="Настройки" data-key="settings" selected={activeTab === 'settings'} />
      </TabContainer>

      {/* Контент вкладок */}
      {activeTab === 'instant' && (
        <Card style={{ marginTop: '1rem' }}>
          <CardHeader>
            <Title level="H4">Мгновенная генерация отчетов</Title>
            <Toolbar>
              <Button 
                design="Emphasized" 
                onClick={() => setShowExportDialog(true)}
              >
                Создать отчет
              </Button>
            </Toolbar>
          </CardHeader>
          <CardContent>
            <p>Создайте отчет сейчас с настраиваемыми параметрами и скачайте его немедленно.</p>
            
            <FlexBox direction={FlexBoxDirection.Row} style={{ gap: '1rem', marginTop: '1rem' }}>
              <Button 
                design="Default" 
                onClick={() => {
                  setExportOptions({ ...exportOptions, reportType: 'acceptance_log' });
                  setShowExportDialog(true);
                }}
              >
                📋 Журнал приемки
              </Button>
              
              <Button 
                design="Default" 
                onClick={() => {
                  setExportOptions({ ...exportOptions, reportType: 'tasks_summary' });
                  setShowExportDialog(true);
                }}
              >
                📊 Отчет по задачам
              </Button>
              
              <Button 
                design="Default" 
                onClick={() => {
                  setExportOptions({ ...exportOptions, reportType: 'full_report' });
                  setShowExportDialog(true);
                }}
              >
                📈 Полный отчет
              </Button>
            </FlexBox>
          </CardContent>
        </Card>
      )}

      {activeTab === 'scheduler' && (
        <Card style={{ marginTop: '1rem' }}>
          <CardHeader>
            <Title level="H4">Запланированные отчеты</Title>
            <Toolbar>
              <Button 
                design="Emphasized" 
                onClick={() => setShowScheduleDialog(true)}
              >
                Добавить отчет
              </Button>
            </Toolbar>
          </CardHeader>
          <CardContent>
            {scheduledReports.length === 0 ? (
              <p>Нет запланированных отчетов. Создайте первый отчет для автоматической генерации.</p>
            ) : (
              <Table>
                <TableColumn>
                  <span>Название</span>
                </TableColumn>
                <TableColumn>
                  <span>Тип</span>
                </TableColumn>
                <TableColumn>
                  <span>Расписание</span>
                </TableColumn>
                <TableColumn>
                  <span>Статус</span>
                </TableColumn>
                <TableColumn>
                  <span>Последний запуск</span>
                </TableColumn>
                <TableColumn>
                  <span>Действия</span>
                </TableColumn>
                
                {scheduledReports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell>
                      <div>
                        <strong>{report.name}</strong>
                        <br />
                        <small>{report.description}</small>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge colorScheme="1">
                        {report.reportType === 'acceptance_log' ? 'Журнал' :
                         report.reportType === 'tasks_summary' ? 'Задачи' : 'Полный'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        {getCronDescription(report.cronExpression)}
                        <br />
                        <small>Следующий: {report.nextRun ? new Date(report.nextRun).toLocaleString('ru-RU') : 'Н/Д'}</small>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getReportStatusBadge(report)}
                    </TableCell>
                    <TableCell>
                      {report.lastGenerated ? 
                        new Date(report.lastGenerated).toLocaleString('ru-RU') : 
                        'Никогда'
                      }
                    </TableCell>
                    <TableCell>
                      <FlexBox direction={FlexBoxDirection.Row} style={{ gap: '0.5rem' }}>
                        <Button 
                          design="Default" 
                          onClick={() => generateReportNow(report.id)}
                          disabled={loading}
                        >
                          ▶️
                        </Button>
                        <Button 
                          design={report.active ? "Negative" : "Positive"} 
                          onClick={() => toggleReportActive(report.id, !report.active)}
                        >
                          {report.active ? '⏸️' : '▶️'}
                        </Button>
                        <Button 
                          design="Negative" 
                          onClick={() => deleteScheduledReport(report.id)}
                        >
                          🗑️
                        </Button>
                      </FlexBox>
                    </TableCell>
                  </TableRow>
                ))}
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'history' && (
        <Card style={{ marginTop: '1rem' }}>
          <CardHeader>
            <Title level="H4">История генерации отчетов</Title>
            <Toolbar>
              <Button onClick={() => setShowHistoryDialog(true)}>
                Подробности
              </Button>
            </Toolbar>
          </CardHeader>
          <CardContent>
            {filteredHistory.length === 0 ? (
              <p>История пуста. Отчеты еще не генерировались.</p>
            ) : (
              <Table>
                <TableColumn>
                  <span>Дата и время</span>
                </TableColumn>
                <TableColumn>
                  <span>Отчет</span>
                </TableColumn>
                <TableColumn>
                  <span>Статус</span>
                </TableColumn>
                <TableColumn>
                  <span>Длительность</span>
                </TableColumn>
                <TableColumn>
                  <span>Файлы</span>
                </TableColumn>
                <TableColumn>
                  <span>Email</span>
                </TableColumn>
                
                {filteredHistory.map((generation, index) => {
                  const report = scheduledReports.find(r => r.id === generation.reportId);
                  return (
                    <TableRow key={index}>
                      <TableCell>
                        {new Date(generation.timestamp).toLocaleString('ru-RU')}
                      </TableCell>
                      <TableCell>
                        {report?.name || generation.reportId}
                      </TableCell>
                      <TableCell>
                        <Badge colorScheme={generation.status === 'success' ? '8' : '1'}>
                          {generation.status === 'success' ? 'Успешно' : 'Ошибка'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {Math.round(generation.duration / 1000)}с
                      </TableCell>
                      <TableCell>
                        {generation.filePaths.length} файл(ов)
                      </TableCell>
                      <TableCell>
                        {generation.recipientsSent.length} получател(ей)
                      </TableCell>
                    </TableRow>
                  );
                })}
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'settings' && (
        <Card style={{ marginTop: '1rem' }}>
          <CardHeader>
            <Title level="H4">Настройки отчетов</Title>
          </CardHeader>
          <CardContent>
            <div style={{ display: 'grid', gap: '1rem' }}>
              <div>
                <Title level="H5">Email настройки</Title>
                {emailConfig ? (
                  <div>
                    <p><strong>SMTP сервер:</strong> {emailConfig.host}:{emailConfig.port}</p>
                    <p><strong>Отправитель:</strong> {emailConfig.fromName} &lt;{emailConfig.fromEmail}&gt;</p>
                    <p><strong>Безопасность:</strong> {emailConfig.secure ? 'SSL/TLS' : 'Нет'}</p>
                  </div>
                ) : (
                  <p>Email не настроен</p>
                )}
              </div>
              
              <div>
                <Title level="H5">Хранение файлов</Title>
                <p>Экспортированные файлы сохраняются в папке: /exports</p>
                <p>Автоматическая очистка файлов старше 7 дней</p>
              </div>
              
              <div>
                <Title level="H5">Форматы экспорта</Title>
                <ul>
                  <li><strong>Excel (.xlsx)</strong> - Полное форматирование, графики, несколько листов</li>
                  <li><strong>PDF (.pdf)</strong> - Готовый к печати отчет с таблицами и диаграммами</li>
                  <li><strong>Оба формата</strong> - Excel для анализа, PDF для распечатки</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Диалог мгновенного экспорта */}
      <Dialog 
        open={showExportDialog} 
        onAfterClose={() => setShowExportDialog(false)}
        headerText="Настройки экспорта"
        style={{ width: '600px' }}
      >
        <div style={{ padding: '1rem', display: 'grid', gap: '1rem' }}>
          <div>
            <label>Тип отчета:</label>
            <Select 
              value={exportOptions.reportType}
              onChange={(e) => setExportOptions({...exportOptions, reportType: e.detail.selectedOption.getAttribute('data-key') as any})}
            >
              <Option data-key="acceptance_log">Журнал приемки</Option>
              <Option data-key="tasks_summary">Отчет по задачам</Option>
              <Option data-key="full_report">Полный отчет</Option>
            </Select>
          </div>

          <div>
            <label>Формат:</label>
            <Select 
              value={exportOptions.format}
              onChange={(e) => setExportOptions({...exportOptions, format: e.detail.selectedOption.getAttribute('data-key') as any})}
            >
              <Option data-key="excel">Excel (.xlsx)</Option>
              <Option data-key="pdf">PDF</Option>
              <Option data-key="both">Оба формата</Option>
            </Select>
          </div>

          <div>
            <label>Период с:</label>
            <DatePicker 
              value={exportOptions.dateRange.from}
              onChange={(e) => setExportOptions({
                ...exportOptions, 
                dateRange: {...exportOptions.dateRange, from: e.detail.value}
              })}
            />
          </div>

          <div>
            <label>Период по:</label>
            <DatePicker 
              value={exportOptions.dateRange.to}
              onChange={(e) => setExportOptions({
                ...exportOptions, 
                dateRange: {...exportOptions.dateRange, to: e.detail.value}
              })}
            />
          </div>

          <CheckBox 
            checked={exportOptions.includeCharts}
            text="Включить графики и диаграммы"
            onChange={(e) => setExportOptions({...exportOptions, includeCharts: e.target.checked})}
          />
        </div>

        <Bar slot="footer">
          <Button design="Emphasized" onClick={handleInstantExport} disabled={loading}>
            {loading ? 'Генерация...' : 'Создать отчет'}
          </Button>
          <Button design="Transparent" onClick={() => setShowExportDialog(false)}>
            Отмена
          </Button>
        </Bar>
      </Dialog>

      {/* Диалог создания запланированного отчета */}
      <Dialog 
        open={showScheduleDialog} 
        onAfterClose={() => setShowScheduleDialog(false)}
        headerText="Новый запланированный отчет"
        style={{ width: '700px' }}
      >
        <div style={{ padding: '1rem', display: 'grid', gap: '1rem' }}>
          <div>
            <label>Название отчета:</label>
            <Input 
              value={scheduleForm.name}
              placeholder="Например: Ежедневный отчет по задачам"
              onInput={(e) => setScheduleForm({...scheduleForm, name: e.target.value})}
            />
          </div>

          <div>
            <label>Описание:</label>
            <TextArea 
              value={scheduleForm.description}
              placeholder="Краткое описание отчета"
              rows={3}
              onInput={(e) => setScheduleForm({...scheduleForm, description: e.target.value})}
            />
          </div>

          <div>
            <label>Тип отчета:</label>
            <Select 
              value={scheduleForm.reportType}
              onChange={(e) => setScheduleForm({...scheduleForm, reportType: e.detail.selectedOption.getAttribute('data-key') as any})}
            >
              <Option data-key="acceptance_log">Журнал приемки</Option>
              <Option data-key="tasks_summary">Отчет по задачам</Option>
              <Option data-key="full_report">Полный отчет</Option>
            </Select>
          </div>

          <div>
            <label>Расписание:</label>
            <Select 
              value={scheduleForm.cronExpression}
              onChange={(e) => setScheduleForm({...scheduleForm, cronExpression: e.detail.selectedOption.getAttribute('data-key') || ''})}
            >
              <Option data-key="0 9 * * 1-5">Каждый будний день в 9:00</Option>
              <Option data-key="0 18 * * *">Каждый день в 18:00</Option>
              <Option data-key="0 9 * * 1">Каждый понедельник в 9:00</Option>
              <Option data-key="0 9 1 * *">Первого числа месяца в 9:00</Option>
              <Option data-key="0 */6 * * *">Каждые 6 часов</Option>
              <Option data-key="0 0 * * 0">Каждое воскресенье в полночь</Option>
            </Select>
          </div>

          <div>
            <label>Формат:</label>
            <Select 
              value={scheduleForm.format}
              onChange={(e) => setScheduleForm({...scheduleForm, format: e.detail.selectedOption.getAttribute('data-key') as any})}
            >
              <Option data-key="excel">Excel (.xlsx)</Option>
              <Option data-key="pdf">PDF</Option>
              <Option data-key="both">Оба формата</Option>
            </Select>
          </div>

          <CheckBox 
            checked={scheduleForm.includeCharts}
            text="Включить графики и диаграммы"
            onChange={(e) => setScheduleForm({...scheduleForm, includeCharts: e.target.checked})}
          />

          <CheckBox 
            checked={scheduleForm.active}
            text="Активировать сразу после создания"
            onChange={(e) => setScheduleForm({...scheduleForm, active: e.target.checked})}
          />
        </div>

        <Bar slot="footer">
          <Button design="Emphasized" onClick={handleCreateScheduledReport} disabled={loading}>
            {loading ? 'Создание...' : 'Создать'}
          </Button>
          <Button design="Transparent" onClick={() => setShowScheduleDialog(false)}>
            Отмена
          </Button>
        </Bar>
      </Dialog>

      {/* Прогресс */}
      {loading && (
        <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 1000 }}>
          <Card style={{ padding: '2rem', textAlign: 'center' }}>
            <ProgressIndicator displayValue="Генерация отчета..." />
          </Card>
        </div>
      )}

      {/* Toast сообщения */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: 'var(--sapInformationBackground)',
          color: 'var(--sapInformationColor)',
          padding: '12px 16px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          zIndex: 9999,
          fontFamily: 'var(--sapFontFamily)',
          fontSize: '0.875rem',
          borderLeft: '4px solid var(--sapInformationBorderColor)',
          transition: 'opacity 0.3s ease'
        }}>
          {toastMessage}
        </div>
      )}
    </div>
  );
};

export default ReportsManager;


