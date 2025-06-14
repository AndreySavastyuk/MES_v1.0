import * as cron from 'node-cron';
import ExportService from './export-service';
import EmailService from './email-service';
import * as fs from 'fs';
import * as path from 'path';

interface ScheduledReport {
  id: string;
  name: string;
  description: string;
  cronExpression: string;
  reportType: 'acceptance_log' | 'tasks_summary' | 'full_report';
  format: 'excel' | 'pdf' | 'both';
  includeCharts: boolean;
  emailRecipients: string[];
  filters?: any;
  template?: string;
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

class ReportScheduler {
  private exportService: any;
  private emailService: any;
  private scheduledReports: Map<string, ScheduledReport> = new Map();
  private activeJobs: Map<string, cron.ScheduledTask> = new Map();
  private generationHistory: ReportGeneration[] = [];
  private configFile: string;

  constructor(exportService: any, emailService: any) {
    this.exportService = exportService;
    this.emailService = emailService;
    this.configFile = path.join(process.cwd(), 'config', 'scheduled-reports.json');
    this.loadScheduledReports();
    this.startScheduler();
  }

  // Загрузка сохраненных расписаний
  private loadScheduledReports(): void {
    try {
      if (fs.existsSync(this.configFile)) {
        const data = fs.readFileSync(this.configFile, 'utf8');
        const reports = JSON.parse(data);
        
        reports.forEach((report: ScheduledReport) => {
          this.scheduledReports.set(report.id, report);
        });

        console.log(`Загружено ${this.scheduledReports.size} запланированных отчетов`);
      }
    } catch (error) {
      console.error('Ошибка загрузки запланированных отчетов:', error);
    }
  }

  // Сохранение расписаний в файл
  private saveScheduledReports(): void {
    try {
      const configDir = path.dirname(this.configFile);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }

      const reports = Array.from(this.scheduledReports.values());
      fs.writeFileSync(this.configFile, JSON.stringify(reports, null, 2));
    } catch (error) {
      console.error('Ошибка сохранения запланированных отчетов:', error);
    }
  }

  // Запуск планировщика
  private startScheduler(): void {
    this.scheduledReports.forEach((report) => {
      if (report.active) {
        this.scheduleReport(report);
      }
    });

    console.log('Планировщик отчетов запущен');
  }

  // Создание нового запланированного отчета
  async createScheduledReport(reportConfig: Omit<ScheduledReport, 'id' | 'lastGenerated' | 'nextRun'>): Promise<string> {
    const reportId = `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const report: ScheduledReport = {
      ...reportConfig,
      id: reportId,
      nextRun: this.getNextRunTime(reportConfig.cronExpression)
    };

    // Валидация cron выражения
    if (!cron.validate(report.cronExpression)) {
      throw new Error(`Некорректное cron выражение: ${report.cronExpression}`);
    }

    this.scheduledReports.set(reportId, report);
    
    if (report.active) {
      this.scheduleReport(report);
    }

    this.saveScheduledReports();
    
    console.log(`Создан запланированный отчет: ${report.name} (${reportId})`);
    return reportId;
  }

  // Обновление запланированного отчета
  async updateScheduledReport(reportId: string, updates: Partial<ScheduledReport>): Promise<void> {
    const report = this.scheduledReports.get(reportId);
    if (!report) {
      throw new Error(`Отчет с ID ${reportId} не найден`);
    }

    // Останавливаем текущую задачу
    this.stopReportSchedule(reportId);

    // Обновляем конфигурацию
    const updatedReport = { ...report, ...updates };
    
    if (updates.cronExpression) {
      if (!cron.validate(updates.cronExpression)) {
        throw new Error(`Некорректное cron выражение: ${updates.cronExpression}`);
      }
      updatedReport.nextRun = this.getNextRunTime(updates.cronExpression);
    }

    this.scheduledReports.set(reportId, updatedReport);

    // Перезапускаем, если активен
    if (updatedReport.active) {
      this.scheduleReport(updatedReport);
    }

    this.saveScheduledReports();
    console.log(`Обновлен запланированный отчет: ${updatedReport.name} (${reportId})`);
  }

  // Удаление запланированного отчета
  async deleteScheduledReport(reportId: string): Promise<void> {
    this.stopReportSchedule(reportId);
    this.scheduledReports.delete(reportId);
    this.saveScheduledReports();
    
    console.log(`Удален запланированный отчет: ${reportId}`);
  }

  // Планирование отчета
  private scheduleReport(report: ScheduledReport): void {
    const task = cron.schedule(report.cronExpression, async () => {
      await this.generateScheduledReport(report);
    }, {
      timezone: 'Europe/Moscow'
    });

    this.activeJobs.set(report.id, task);
    console.log(`Запланирован отчет "${report.name}" по расписанию: ${report.cronExpression}`);
  }

  // Остановка планирования отчета
  private stopReportSchedule(reportId: string): void {
    const task = this.activeJobs.get(reportId);
    if (task) {
      task.stop();
      this.activeJobs.delete(reportId);
    }
  }

  // Генерация запланированного отчета
  private async generateScheduledReport(report: ScheduledReport): Promise<void> {
    const startTime = Date.now();
    const generation: ReportGeneration = {
      reportId: report.id,
      timestamp: new Date().toISOString(),
      status: 'error',
      filePaths: [],
      duration: 0,
      recipientsSent: []
    };

    try {
      console.log(`Начинается генерация отчета: ${report.name}`);

      // Получение данных для отчета
      const data = await this.fetchReportData(report);
      
      const options = {
        format: report.format as 'excel' | 'pdf',
        includeCharts: report.includeCharts,
        dateRange: this.getDateRangeForReport(report),
        filters: report.filters,
        template: report.template
      };

      let filePaths: string[] = [];

      // Генерация файлов отчета
      switch (report.reportType) {
        case 'acceptance_log':
          if (report.format === 'both') {
            const excelPath = await this.exportService.exportAcceptanceLogToExcel(data.acceptanceLog, { ...options, format: 'excel' });
            filePaths.push(excelPath);
            // PDF для журнала приемки пока не реализован
          } else {
            const filePath = await this.exportService.exportAcceptanceLogToExcel(data.acceptanceLog, options);
            filePaths.push(filePath);
          }
          break;

        case 'tasks_summary':
          if (report.format === 'both') {
            const pdfPath = await this.exportService.generateTasksPDFReport(data.tasks, data.statistics, { ...options, format: 'pdf' });
            filePaths.push(pdfPath);
            // Excel версия через summary report
            const excelPath = await this.exportService.generateSummaryReport(data, { ...options, format: 'excel' });
            filePaths.push(excelPath);
          } else if (report.format === 'pdf') {
            const filePath = await this.exportService.generateTasksPDFReport(data.tasks, data.statistics, options);
            filePaths.push(filePath);
          } else {
            const filePath = await this.exportService.generateSummaryReport(data, options);
            filePaths.push(filePath);
          }
          break;

        case 'full_report':
          if (report.format === 'both') {
            const excelPath = await this.exportService.generateSummaryReport(data, { ...options, format: 'excel' });
            const pdfPath = await this.exportService.generateSummaryReport(data, { ...options, format: 'pdf' });
            filePaths.push(excelPath, pdfPath);
          } else {
            const filePath = await this.exportService.generateSummaryReport(data, options);
            filePaths.push(filePath);
          }
          break;
      }

      generation.filePaths = filePaths;
      generation.status = 'success';

      // Отправка по email
      if (report.emailRecipients.length > 0) {
        for (const recipient of report.emailRecipients) {
          try {
            await this.emailService.sendReportEmail(
              recipient,
              report.name,
              report.description,
              filePaths
            );
            generation.recipientsSent.push(recipient);
          } catch (emailError) {
            console.error(`Ошибка отправки отчета на ${recipient}:`, emailError);
          }
        }
      }

      // Обновление времени последней генерации
      report.lastGenerated = new Date().toISOString();
      report.nextRun = this.getNextRunTime(report.cronExpression);
      this.scheduledReports.set(report.id, report);
      this.saveScheduledReports();

      console.log(`Отчет "${report.name}" успешно сгенерирован и отправлен ${generation.recipientsSent.length} получателям`);

    } catch (error) {
      generation.errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
      console.error(`Ошибка генерации отчета "${report.name}":`, error);
    } finally {
      generation.duration = Date.now() - startTime;
      this.generationHistory.push(generation);
      
      // Ограничиваем историю до 1000 записей
      if (this.generationHistory.length > 1000) {
        this.generationHistory = this.generationHistory.slice(-1000);
      }
    }
  }

  // Получение данных для отчета
  private async fetchReportData(report: ScheduledReport): Promise<any> {
    // Здесь должна быть интеграция с вашими источниками данных
    // Пока возвращаем моковые данные
    
    const dateRange = this.getDateRangeForReport(report);
    
    // В реальном приложении здесь будут вызовы к базе данных или API
    const mockData = {
      tasks: this.generateMockTasks(),
      statistics: this.generateMockStatistics(),
      acceptanceLog: this.generateMockAcceptanceLog(),
      devices: this.generateMockDevices()
    };

    // Применение фильтров
    if (report.filters) {
      // Применить фильтры к данным
      return this.applyFilters(mockData, report.filters);
    }

    return mockData;
  }

  // Получение диапазона дат для отчета
  private getDateRangeForReport(report: ScheduledReport): { from: string; to: string } {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    // По умолчанию - предыдущий день
    return {
      from: yesterday.toISOString().split('T')[0],
      to: yesterday.toISOString().split('T')[0]
    };
  }

  // Применение фильтров к данным
  private applyFilters(data: any, filters: any): any {
    // Реализация фильтрации данных
    return data;
  }

  // Вычисление времени следующего запуска
  private getNextRunTime(cronExpression: string): string {
    try {
      // Простая реализация - в реальном проекте используйте библиотеку
      return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    } catch (error) {
      return '';
    }
  }

  // Ручная генерация отчета
  async generateReportNow(reportId: string): Promise<ReportGeneration> {
    const report = this.scheduledReports.get(reportId);
    if (!report) {
      throw new Error(`Отчет с ID ${reportId} не найден`);
    }

    await this.generateScheduledReport(report);
    
    // Возвращаем последнюю запись из истории
    return this.generationHistory[this.generationHistory.length - 1];
  }

  // Получение списка запланированных отчетов
  getScheduledReports(): ScheduledReport[] {
    return Array.from(this.scheduledReports.values());
  }

  // Получение отчета по ID
  getScheduledReport(reportId: string): ScheduledReport | undefined {
    return this.scheduledReports.get(reportId);
  }

  // Получение истории генерации
  getGenerationHistory(reportId?: string): ReportGeneration[] {
    if (reportId) {
      return this.generationHistory.filter(gen => gen.reportId === reportId);
    }
    return this.generationHistory;
  }

  // Получение статистики планировщика
  getSchedulerStatistics(): any {
    const totalReports = this.scheduledReports.size;
    const activeReports = Array.from(this.scheduledReports.values()).filter(r => r.active).length;
    const recentGenerations = this.generationHistory.filter(g => 
      new Date(g.timestamp).getTime() > Date.now() - 24 * 60 * 60 * 1000
    );
    
    return {
      totalReports,
      activeReports,
      inactiveReports: totalReports - activeReports,
      generationsLast24h: recentGenerations.length,
      successfulGenerationsLast24h: recentGenerations.filter(g => g.status === 'success').length,
      averageGenerationTime: recentGenerations.reduce((sum, g) => sum + g.duration, 0) / recentGenerations.length || 0
    };
  }

  // Остановка планировщика
  stop(): void {
    this.activeJobs.forEach((task) => {
      task.stop();
    });
    this.activeJobs.clear();
    console.log('Планировщик отчетов остановлен');
  }

  // Моковые данные для тестирования
  private generateMockTasks(): any[] {
    return [
      {
        id: 'task1',
        title: 'Приемка товара партия №123',
        status: 'completed',
        priority: 'high',
        assignedDevice: 'Tablet-001',
        assignedUser: 'Иванов И.И.',
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        itemsTotal: 50,
        itemsProcessed: 50,
        estimatedTime: 120,
        actualTime: 115
      }
    ];
  }

  private generateMockStatistics(): any {
    return {
      totalTasks: 10,
      completedTasks: 8,
      totalItems: 500,
      averageTime: 90,
      efficiency: 80,
      deviceStats: {},
      hourlyStats: []
    };
  }

  private generateMockAcceptanceLog(): any[] {
    return [
      {
        id: 'log1',
        timestamp: new Date().toISOString(),
        taskId: 'task1',
        taskTitle: 'Приемка товара',
        deviceName: 'Tablet-001',
        userName: 'Иванов И.И.',
        itemsProcessed: 50,
        itemsTotal: 50,
        duration: 115,
        status: 'completed'
      }
    ];
  }

  private generateMockDevices(): any[] {
    return [
      {
        id: 'device1',
        name: 'Tablet-001',
        type: 'tablet',
        status: 'online'
      }
    ];
  }
}

export default ReportScheduler;
export type { ScheduledReport, ReportGeneration };