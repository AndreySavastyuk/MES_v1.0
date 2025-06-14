import * as ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import type { ChartConfiguration, ChartTypeRegistry } from 'chart.js';
import * as fs from 'fs';
import * as path from 'path';

export interface ExportOptions {
  format: 'excel' | 'pdf' | 'both';
  includeCharts: boolean;
  dateRange: {
    from: string;
    to: string;
  };
  reportType: 'acceptance_log' | 'tasks_summary' | 'full_report';
}

export interface ExportResult {
  success: boolean;
  filePaths: string[];
  error?: string;
}

interface AcceptanceLogEntry {
  id: string;
  timestamp: string;
  taskId: string;
  taskTitle: string;
  deviceName: string;
  userName: string;
  itemsProcessed: number;
  itemsTotal: number;
  duration: number;
  status: 'completed' | 'in_progress' | 'cancelled';
  notes?: string;
}

interface TaskSummary {
  id: string;
  title: string;
  status: string;
  priority: string;
  assignedDevice: string;
  assignedUser: string;
  createdAt: string;
  completedAt?: string;
  itemsTotal: number;
  itemsProcessed: number;
  estimatedTime: number;
  actualTime?: number;
  notes?: string;
}

interface ReportStatistics {
  totalTasks: number;
  completedTasks: number;
  totalItems: number;
  averageTime: number;
  efficiency: number;
  deviceStats: { [deviceId: string]: any };
  hourlyStats: any[];
}

export class ExportService {
  private chartRenderer: ChartJSNodeCanvas;
  private exportDir: string;

  constructor() {
    this.chartRenderer = new ChartJSNodeCanvas({ 
      width: 800, 
      height: 400,
      backgroundColour: 'white'
    });
    this.exportDir = path.join(process.cwd(), 'exports');
    this.ensureExportDirectory();
  }

  private ensureExportDirectory(): void {
    if (!fs.existsSync(this.exportDir)) {
      fs.mkdirSync(this.exportDir, { recursive: true });
    }
  }

  // Экспорт журнала приемки в Excel
  async exportAcceptanceLogToExcel(
    entries: AcceptanceLogEntry[], 
    options: ExportOptions = { 
      format: 'excel',
      includeCharts: false,
      dateRange: { from: '', to: '' },
      reportType: 'acceptance_log'
    }
  ): Promise<string> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Журнал приемки');

    // Настройка метаданных
    workbook.creator = 'Warehouse Management System';
    workbook.created = new Date();
    workbook.modified = new Date();

    // Заголовок отчета
    worksheet.mergeCells('A1:J1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'ЖУРНАЛ ОПЕРАЦИЙ ПРИЕМКИ';
    titleCell.font = { size: 16, bold: true };
    titleCell.alignment = { horizontal: 'center' };
    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    };

    // Информация о периоде
    if (options.dateRange) {
      worksheet.mergeCells('A2:J2');
      const periodCell = worksheet.getCell('A2');
      periodCell.value = `Период: ${options.dateRange.from} - ${options.dateRange.to}`;
      periodCell.font = { size: 12, italic: true };
      periodCell.alignment = { horizontal: 'center' };
    }

    // Заголовки колонок
    const headers = [
      'ID записи',
      'Дата и время',
      'ID задачи',
      'Название задачи',
      'Устройство',
      'Пользователь',
      'Обработано',
      'Всего',
      'Время (мин)',
      'Статус'
    ];

    const headerRow = worksheet.getRow(4);
    headers.forEach((header, index) => {
      const cell = headerRow.getCell(index + 1);
      cell.value = header;
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF366092' }
      };
      cell.alignment = { horizontal: 'center' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    // Данные
    entries.forEach((entry, index) => {
      const row = worksheet.getRow(index + 5);
      const rowData = [
        entry.id,
        new Date(entry.timestamp),
        entry.taskId,
        entry.taskTitle,
        entry.deviceName,
        entry.userName,
        entry.itemsProcessed,
        entry.itemsTotal,
        entry.duration,
        this.getStatusLabel(entry.status)
      ];

      rowData.forEach((value, colIndex) => {
        const cell = row.getCell(colIndex + 1);
        cell.value = value;
        
        // Форматирование даты
        if (colIndex === 1) {
          cell.numFmt = 'dd.mm.yyyy hh:mm:ss';
        }
        
        // Цветовое кодирование статуса
        if (colIndex === 9) {
          const statusColor = entry.status === 'completed' ? 'FF00B050' : 
                             entry.status === 'in_progress' ? 'FFFF9900' : 'FFFF0000';
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: statusColor }
          };
          cell.font = { color: { argb: 'FFFFFFFF' } };
        }

        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });

      // Чередующиеся цвета строк
      if (index % 2 === 1) {
        row.eachCell((cell) => {
          if (!cell.fill || cell.fill.type !== 'pattern') {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFF2F2F2' }
            };
          }
        });
      }
    });

    // Автоматическая ширина колонок
    worksheet.columns.forEach((column) => {
      let maxLength = 0;
      column.eachCell({ includeEmpty: true }, (cell) => {
        const columnLength = cell.value ? cell.value.toString().length : 10;
        if (columnLength > maxLength) {
          maxLength = columnLength;
        }
      });
      column.width = Math.min(maxLength + 2, 50);
    });

    // Добавление итоговой строки
    const totalRow = worksheet.getRow(entries.length + 6);
    totalRow.getCell(1).value = 'ИТОГО:';
    totalRow.getCell(1).font = { bold: true };
    totalRow.getCell(7).value = entries.reduce((sum, entry) => sum + entry.itemsProcessed, 0);
    totalRow.getCell(8).value = entries.reduce((sum, entry) => sum + entry.itemsTotal, 0);
    totalRow.getCell(9).value = entries.reduce((sum, entry) => sum + entry.duration, 0);
    
    // Форматирование итоговой строки
    totalRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFDDEBF7' }
      };
      cell.font = { bold: true };
      cell.border = {
        top: { style: 'thick' },
        bottom: { style: 'thick' }
      };
    });

    // Сохранение файла
    const filename = `acceptance-log-${Date.now()}.xlsx`;
    const filepath = path.join(this.exportDir, filename);
    await workbook.xlsx.writeFile(filepath);

    return filepath;
  }

  // Генерация PDF отчета для выполненных задач
  async generateTasksPDFReport(
    tasks: TaskSummary[],
    statistics: ReportStatistics,
    options: ExportOptions = { 
      format: 'pdf',
      includeCharts: false,
      dateRange: { from: '', to: '' },
      reportType: 'tasks_summary'
    }
  ): Promise<string> {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Заголовок
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('ОТЧЕТ ПО ВЫПОЛНЕННЫМ ЗАДАЧАМ', pageWidth / 2, 20, { align: 'center' });

    // Дата генерации
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Сгенерировано: ${new Date().toLocaleString('ru-RU')}`, pageWidth / 2, 30, { align: 'center' });

    if (options.dateRange) {
      doc.text(`Период: ${options.dateRange.from} - ${options.dateRange.to}`, pageWidth / 2, 36, { align: 'center' });
    }

    // Сводная статистика
    let yPosition = 50;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('СВОДНАЯ СТАТИСТИКА', 20, yPosition);

    yPosition += 10;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    const statsData = [
      ['Всего задач:', statistics.totalTasks.toString()],
      ['Выполнено задач:', statistics.completedTasks.toString()],
      ['Всего предметов:', statistics.totalItems.toString()],
      ['Среднее время выполнения:', `${statistics.averageTime} мин`],
      ['Эффективность:', `${statistics.efficiency}%`]
    ];

    (doc as any).autoTable({
      startY: yPosition,
      head: [['Показатель', 'Значение']],
      body: statsData,
      theme: 'grid',
      headStyles: { fillColor: [70, 114, 196] },
      styles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 40, halign: 'right' }
      }
    });

    yPosition = (doc as any).lastAutoTable.finalY + 15;

    // Таблица задач
    if (yPosition > pageHeight - 50) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('ДЕТАЛИЗАЦИЯ ЗАДАЧ', 20, yPosition);

    yPosition += 5;

    const tasksTableData = tasks.map(task => [
      task.id,
      task.title,
      this.getStatusLabel(task.status),
      task.assignedDevice,
      task.assignedUser,
      `${task.itemsProcessed}/${task.itemsTotal}`,
      task.actualTime ? `${task.actualTime} мин` : 'Н/Д',
      task.completedAt ? new Date(task.completedAt).toLocaleDateString('ru-RU') : 'Н/Д'
    ]);

    (doc as any).autoTable({
      startY: yPosition,
      head: [['ID', 'Название', 'Статус', 'Устройство', 'Пользователь', 'Предметы', 'Время', 'Завершено']],
      body: tasksTableData,
      theme: 'grid',
      headStyles: { fillColor: [70, 114, 196] },
      styles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 40 },
        2: { cellWidth: 20 },
        3: { cellWidth: 25 },
        4: { cellWidth: 25 },
        5: { cellWidth: 20 },
        6: { cellWidth: 20 },
        7: { cellWidth: 25 }
      },
      didParseCell: function(data) {
        // Цветовое кодирование статуса
        if (data.column.index === 2) {
          if (data.cell.text[0] === 'Выполнено') {
            data.cell.styles.fillColor = [0, 176, 80];
            data.cell.styles.textColor = [255, 255, 255];
          } else if (data.cell.text[0] === 'В работе') {
            data.cell.styles.fillColor = [255, 153, 0];
            data.cell.styles.textColor = [255, 255, 255];
          }
        }
      }
    });

    // Добавление графиков, если требуется
    if (options.includeCharts) {
      await this.addChartsToPDF(doc, statistics);
    }

    // Сохранение файла
    const filename = `tasks-report-${Date.now()}.pdf`;
    const filepath = path.join(this.exportDir, filename);
    doc.save(filepath);

    return filepath;
  }

  // Создание сводного отчета с графиками
  async generateSummaryReport(
    data: {
      tasks: TaskSummary[];
      statistics: ReportStatistics;
      acceptanceLog: AcceptanceLogEntry[];
    },
    options: ExportOptions
  ): Promise<string> {
    if (options.format === 'excel') {
      return this.generateSummaryExcelReport(data, options);
    } else {
      return this.generateSummaryPDFReport(data, options);
    }
  }

  private async generateSummaryExcelReport(
    data: any,
    options: ExportOptions
  ): Promise<string> {
    const workbook = new ExcelJS.Workbook();

    // Лист с общей статистикой
    const summarySheet = workbook.addWorksheet('Сводка');
    await this.createSummarySheet(summarySheet, data.statistics);

    // Лист с задачами
    const tasksSheet = workbook.addWorksheet('Задачи');
    await this.createTasksSheet(tasksSheet, data.tasks);

    // Лист с журналом приемки
    const logSheet = workbook.addWorksheet('Журнал приемки');
    await this.createAcceptanceLogSheet(logSheet, data.acceptanceLog);

    // Лист с графиками
    if (options.includeCharts) {
      const chartsSheet = workbook.addWorksheet('Графики');
      await this.createChartsSheet(chartsSheet, data.statistics);
    }

    const filename = `summary-report-${Date.now()}.xlsx`;
    const filepath = path.join(this.exportDir, filename);
    await workbook.xlsx.writeFile(filepath);

    return filepath;
  }

  private async generateSummaryPDFReport(
    data: any,
    options: ExportOptions
  ): Promise<string> {
    const doc = new jsPDF('p', 'mm', 'a4');

    // Титульная страница
    await this.createPDFTitlePage(doc, data.statistics, options);

    // Статистика
    doc.addPage();
    await this.createPDFStatisticsPage(doc, data.statistics);

    // Графики
    if (options.includeCharts) {
      doc.addPage();
      await this.addChartsToPDF(doc, data.statistics);
    }

    // Детализация задач
    doc.addPage();
    await this.createPDFTasksPage(doc, data.tasks);

    const filename = `summary-report-${Date.now()}.pdf`;
    const filepath = path.join(this.exportDir, filename);
    doc.save(filepath);

    return filepath;
  }

  // Вспомогательные методы для создания листов Excel
  private async createSummarySheet(sheet: ExcelJS.Worksheet, statistics: ReportStatistics): Promise<void> {
    // Заголовок
    sheet.mergeCells('A1:D1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'СВОДНАЯ СТАТИСТИКА';
    titleCell.font = { size: 16, bold: true };
    titleCell.alignment = { horizontal: 'center' };

    // Основные показатели
    const metrics = [
      ['Показатель', 'Значение', 'Единица измерения', 'Комментарий'],
      ['Всего задач', statistics.totalTasks, 'шт', ''],
      ['Выполнено задач', statistics.completedTasks, 'шт', ''],
      ['Всего предметов', statistics.totalItems, 'шт', ''],
      ['Среднее время', statistics.averageTime, 'мин', ''],
      ['Эффективность', statistics.efficiency, '%', '']
    ];

    metrics.forEach((row, index) => {
      const excelRow = sheet.getRow(index + 3);
      row.forEach((value, colIndex) => {
        const cell = excelRow.getCell(colIndex + 1);
        cell.value = value;
        if (index === 0) {
          cell.font = { bold: true };
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFDDEBF7' }
          };
        }
      });
    });

    // Автоматическая ширина колонок
    sheet.columns.forEach(column => {
      column.width = 20;
    });
  }

  private async createTasksSheet(sheet: ExcelJS.Worksheet, tasks: TaskSummary[]): Promise<void> {
    // Заголовок
    sheet.mergeCells('A1:H1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'ДЕТАЛИЗАЦИЯ ЗАДАЧ';
    titleCell.font = { size: 16, bold: true };
    titleCell.alignment = { horizontal: 'center' };

    // Заголовки колонок
    const headers = ['ID', 'Название', 'Статус', 'Приоритет', 'Устройство', 'Пользователь', 'Предметы', 'Время'];
    const headerRow = sheet.getRow(3);
    headers.forEach((header, index) => {
      const cell = headerRow.getCell(index + 1);
      cell.value = header;
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFDDEBF7' }
      };
    });

    // Данные задач
    tasks.forEach((task, index) => {
      const row = sheet.getRow(index + 4);
      const rowData = [
        task.id,
        task.title,
        this.getStatusLabel(task.status),
        task.priority,
        task.assignedDevice,
        task.assignedUser,
        `${task.itemsProcessed}/${task.itemsTotal}`,
        task.actualTime ? `${task.actualTime} мин` : 'Н/Д'
      ];

      rowData.forEach((value, colIndex) => {
        row.getCell(colIndex + 1).value = value;
      });
    });
  }

  private async createAcceptanceLogSheet(sheet: ExcelJS.Worksheet, entries: AcceptanceLogEntry[]): Promise<void> {
    // Заголовок
    sheet.mergeCells('A1:I1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'ЖУРНАЛ ОПЕРАЦИЙ ПРИЕМКИ';
    titleCell.font = { size: 16, bold: true };
    titleCell.alignment = { horizontal: 'center' };

    // Заголовки и данные (аналогично основному методу экспорта)
    // ... код заголовков и данных ...
  }

  private async createChartsSheet(sheet: ExcelJS.Worksheet, statistics: ReportStatistics): Promise<void> {
    // Генерация графиков и их вставка в Excel
    const chartImage = await this.generateChartImage(statistics);
    
    if (chartImage) {
      const imageId = sheet.workbook.addImage({
        buffer: chartImage,
        extension: 'png'
      });

      sheet.addImage(imageId, {
        tl: { col: 1, row: 1 },
        ext: { width: 600, height: 400 }
      });
    }
  }

  // Вспомогательные методы для PDF
  private async createPDFTitlePage(doc: jsPDF, statistics: ReportStatistics, options: ExportOptions): Promise<void> {
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('СВОДНЫЙ ОТЧЕТ', pageWidth / 2, 50, { align: 'center' });
    doc.text('СКЛАДСКИХ ОПЕРАЦИЙ', pageWidth / 2, 65, { align: 'center' });

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`Период: ${options.dateRange?.from || 'Н/Д'} - ${options.dateRange?.to || 'Н/Д'}`, pageWidth / 2, 85, { align: 'center' });
    doc.text(`Дата генерации: ${new Date().toLocaleString('ru-RU')}`, pageWidth / 2, 95, { align: 'center' });

    // Краткая статистика на титульной странице
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('ОСНОВНЫЕ ПОКАЗАТЕЛИ', pageWidth / 2, 120, { align: 'center' });

    const quickStats = [
      `Всего задач: ${statistics.totalTasks}`,
      `Выполнено: ${statistics.completedTasks}`,
      `Обработано предметов: ${statistics.totalItems}`,
      `Эффективность: ${statistics.efficiency}%`
    ];

    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    quickStats.forEach((stat, index) => {
      doc.text(stat, pageWidth / 2, 140 + (index * 10), { align: 'center' });
    });
  }

  private async createPDFStatisticsPage(doc: jsPDF, statistics: ReportStatistics): Promise<void> {
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('ДЕТАЛЬНАЯ СТАТИСТИКА', 20, 30);

    // Создание таблицы со статистикой
    const statsData = [
      ['Показатель', 'Значение', 'Процент от общего'],
      ['Всего задач', statistics.totalTasks.toString(), '100%'],
      ['Выполнено задач', statistics.completedTasks.toString(), `${(statistics.completedTasks / statistics.totalTasks * 100).toFixed(1)}%`],
      ['Всего предметов', statistics.totalItems.toString(), '100%'],
      ['Среднее время выполнения', `${statistics.averageTime} мин`, '-'],
      ['Эффективность системы', `${statistics.efficiency}%`, '-']
    ];

    (doc as any).autoTable({
      startY: 40,
      head: [statsData[0]],
      body: statsData.slice(1),
      theme: 'grid',
      headStyles: { fillColor: [70, 114, 196] }
    });
  }

  private async createPDFTasksPage(doc: jsPDF, tasks: TaskSummary[]): Promise<void> {
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('СПИСОК ЗАДАЧ', 20, 30);

    const tasksData = tasks.slice(0, 20).map(task => [  // Ограничиваем для PDF
      task.id,
      task.title.substring(0, 30) + (task.title.length > 30 ? '...' : ''),
      this.getStatusLabel(task.status),
      task.assignedDevice,
      `${task.itemsProcessed}/${task.itemsTotal}`
    ]);

    (doc as any).autoTable({
      startY: 40,
      head: [['ID', 'Название', 'Статус', 'Устройство', 'Предметы']],
      body: tasksData,
      theme: 'grid',
      headStyles: { fillColor: [70, 114, 196] },
      styles: { fontSize: 8 }
    });

    if (tasks.length > 20) {
      const yPos = (doc as any).lastAutoTable.finalY + 10;
      doc.setFontSize(10);
      doc.text(`Показано ${20} из ${tasks.length} задач. Полный список доступен в Excel версии отчета.`, 20, yPos);
    }
  }

  private async addChartsToPDF(doc: jsPDF, statistics: ReportStatistics): Promise<void> {
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('ГРАФИКИ И ДИАГРАММЫ', 20, 30);

    // Генерация графика производительности
    const chartBuffer = await this.generateChartImage(statistics);
    if (chartBuffer) {
      const chartDataUrl = `data:image/png;base64,${chartBuffer.toString('base64')}`;
      doc.addImage(chartDataUrl, 'PNG', 20, 40, 160, 100);
    }
  }

  private async generateChartImage(statistics: ReportStatistics): Promise<Buffer | null> {
    try {
      const configuration = {
        type: 'bar' as const,
        data: {
          labels: ['Всего', 'Выполнено', 'В работе', 'Отменено'],
          datasets: [{
            label: 'Количество задач',
            data: [
              statistics.totalTasks,
              statistics.completedTasks,
              statistics.totalTasks - statistics.completedTasks,
              0
            ],
            backgroundColor: ['#4472C4', '#70AD47', '#FFC000', '#C55A5A']
          }]
        },
        options: {
          responsive: false,
          plugins: {
            title: {
              display: true,
              text: 'Статистика выполнения задач'
            }
          }
        }
      };

      return await this.chartRenderer.renderToBuffer(configuration);
    } catch (error) {
      console.error('Ошибка генерации графика:', error);
      return null;
    }
  }

  private getStatusLabel(status: string): string {
    const labels = {
      'completed': 'Выполнено',
      'in_progress': 'В работе',
      'pending': 'Ожидание',
      'cancelled': 'Отменено'
    };
    return labels[status as keyof typeof labels] || status;
  }

  // Получение списка созданных файлов
  getExportedFiles(): string[] {
    return fs.readdirSync(this.exportDir).map(file => path.join(this.exportDir, file));
  }

  // Очистка старых файлов
  cleanupOldFiles(daysOld: number = 7): number {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const files = fs.readdirSync(this.exportDir);
    let deletedCount = 0;

    files.forEach(file => {
      const filepath = path.join(this.exportDir, file);
      const stats = fs.statSync(filepath);
      
      if (stats.mtime < cutoffDate) {
        fs.unlinkSync(filepath);
        deletedCount++;
      }
    });

    return deletedCount;
  }

  async generateReport(options: ExportOptions): Promise<ExportResult> {
    console.log('Генерация отчета:', options);
    
    try {
      // Заглушка для генерации отчета
      const filePaths: string[] = [];
      
      if (options.format === 'excel' || options.format === 'both') {
        filePaths.push(`reports/report_${Date.now()}.xlsx`);
      }
      
      if (options.format === 'pdf' || options.format === 'both') {
        filePaths.push(`reports/report_${Date.now()}.pdf`);
      }
      
      return {
        success: true,
        filePaths
      };
    } catch (error) {
      return {
        success: false,
        filePaths: [],
        error: error instanceof Error ? error.message : 'Неизвестная ошибка'
      };
    }
  }
}

export default new ExportService();