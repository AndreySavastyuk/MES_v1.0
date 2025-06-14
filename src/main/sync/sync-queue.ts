import { EventEmitter } from 'events';
import { SyncJob } from './wifi-sync-service';

export interface QueueStatistics {
  totalJobs: number;
  pendingJobs: number;
  runningJobs: number;
  completedJobs: number;
  failedJobs: number;
  averageProcessingTime: number;
  queueLength: number;
  activeWorkers: number;
}

export class SyncQueueManager extends EventEmitter {
  private pendingJobs: Map<string, SyncJob> = new Map();
  private runningJobs: Map<string, SyncJob> = new Map();
  private completedJobs: Map<string, SyncJob> = new Map();
  private failedJobs: Map<string, SyncJob> = new Map();
  private jobStartTimes: Map<string, Date> = new Map();
  
  private maxConcurrentJobs = 3; // Максимум одновременных синхронизаций
  private isRunning = false;
  private processingInterval: NodeJS.Timeout | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(maxConcurrent: number = 3) {
    super();
    this.maxConcurrentJobs = maxConcurrent;
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('Sync Queue Manager уже запущен');
      return;
    }

    console.log('Запуск Sync Queue Manager...');
    
    this.isRunning = true;
    
    // Запуск обработки очереди
    this.startProcessing();
    
    // Запуск периодической очистки
    this.startPeriodicCleanup();
    
    console.log(`Sync Queue Manager запущен (макс. ${this.maxConcurrentJobs} одновременных заданий)`);
    this.emit('started');
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    console.log('Остановка Sync Queue Manager...');
    
    // Остановка обработки
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }

    // Остановка очистки
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    // Отмена всех ожидающих заданий
    for (const [jobId, job] of this.pendingJobs) {
      job.status = 'cancelled';
      job.error = 'Service stopped';
      this.failedJobs.set(jobId, job);
      this.pendingJobs.delete(jobId);
      this.emit('job_cancelled', job);
    }

    // Ожидание завершения активных заданий (с таймаутом)
    await this.waitForRunningJobs(30000); // 30 секунд максимум

    this.isRunning = false;
    console.log('Sync Queue Manager остановлен');
    this.emit('stopped');
  }

  async addJob(job: SyncJob): Promise<void> {
    if (!this.isRunning) {
      throw new Error('Queue manager not running');
    }

    console.log(`Добавление задания в очередь: ${job.id} (${job.type}, приоритет: ${job.priority})`);
    
    job.status = 'pending';
    this.pendingJobs.set(job.id, job);
    
    this.emit('job_added', job);
    
    // Попытка немедленной обработки
    this.processQueue();
  }

  async getJobPosition(jobId: string): Promise<number> {
    const sortedJobs = this.getSortedPendingJobs();
    const position = sortedJobs.findIndex(job => job.id === jobId);
    return position >= 0 ? position + 1 : -1;
  }

  async cancelJob(jobId: string): Promise<boolean> {
    // Проверяем ожидающие задания
    const pendingJob = this.pendingJobs.get(jobId);
    if (pendingJob) {
      pendingJob.status = 'cancelled';
      pendingJob.error = 'Cancelled by user';
      this.pendingJobs.delete(jobId);
      this.failedJobs.set(jobId, pendingJob);
      this.emit('job_cancelled', pendingJob);
      return true;
    }

    // Для выполняющихся заданий просто помечаем как отмененные
    const runningJob = this.runningJobs.get(jobId);
    if (runningJob) {
      runningJob.status = 'cancelled';
      this.emit('job_cancel_requested', runningJob);
      return true;
    }

    return false;
  }

  async completeJob(jobId: string, success: boolean, error?: string): Promise<void> {
    const job = this.runningJobs.get(jobId);
    if (!job) {
      console.warn(`Попытка завершить несуществующее задание: ${jobId}`);
      return;
    }

    // Удаляем из активных
    this.runningJobs.delete(jobId);
    this.jobStartTimes.delete(jobId);

    // Обновляем статус
    if (success) {
      job.status = 'completed';
      job.progress.completed = job.progress.total;
      job.progress.percentage = 100;
      this.completedJobs.set(jobId, job);
      console.log(`Задание завершено успешно: ${jobId}`);
      this.emit('job_completed', job);
    } else {
      job.status = 'failed';
      job.error = error || 'Unknown error';
      this.failedJobs.set(jobId, job);
      console.log(`Задание завершено с ошибкой: ${jobId} - ${error}`);
      this.emit('job_failed', job);
    }

    // Обработка следующих заданий в очереди
    this.processQueue();
  }

  getJob(jobId: string): SyncJob | undefined {
    return this.pendingJobs.get(jobId) || 
           this.runningJobs.get(jobId) || 
           this.completedJobs.get(jobId) || 
           this.failedJobs.get(jobId);
  }

  getJobsByDevice(deviceId: string): SyncJob[] {
    const allJobs: SyncJob[] = [
      ...Array.from(this.pendingJobs.values()),
      ...Array.from(this.runningJobs.values()),
      ...Array.from(this.completedJobs.values()),
      ...Array.from(this.failedJobs.values())
    ];

    return allJobs.filter(job => job.deviceId === deviceId);
  }

  getStatistics(): QueueStatistics {
    const processingTimes = this.calculateProcessingTimes();
    
    return {
      totalJobs: this.pendingJobs.size + this.runningJobs.size + 
                this.completedJobs.size + this.failedJobs.size,
      pendingJobs: this.pendingJobs.size,
      runningJobs: this.runningJobs.size,
      completedJobs: this.completedJobs.size,
      failedJobs: this.failedJobs.size,
      averageProcessingTime: processingTimes.average,
      queueLength: this.pendingJobs.size,
      activeWorkers: this.runningJobs.size
    };
  }

  checkStuckJobs(): void {
    const stuckThreshold = 30 * 60 * 1000; // 30 минут
    const now = new Date();

    for (const [jobId, startTime] of this.jobStartTimes) {
      if (now.getTime() - startTime.getTime() > stuckThreshold) {
        const job = this.runningJobs.get(jobId);
        if (job) {
          console.warn(`Обнаружено застрявшее задание: ${jobId}`);
          
          // Помечаем как неудачное
          job.status = 'failed';
          job.error = 'Job timeout - stuck for too long';
          
          this.runningJobs.delete(jobId);
          this.jobStartTimes.delete(jobId);
          this.failedJobs.set(jobId, job);
          
          this.emit('job_failed', job);
          this.emit('job_stuck', job);
        }
      }
    }
  }

  private startProcessing(): void {
    // Обработка очереди каждые 5 секунд
    this.processingInterval = setInterval(() => {
      this.processQueue();
    }, 5000);
  }

  private startPeriodicCleanup(): void {
    // Очистка старых завершенных заданий каждый час
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldJobs();
    }, 60 * 60 * 1000);
  }

  private processQueue(): void {
    if (!this.isRunning) {
      return;
    }

    // Проверяем, можем ли мы запустить новые задания
    const availableSlots = this.maxConcurrentJobs - this.runningJobs.size;
    if (availableSlots <= 0) {
      return;
    }

    // Получаем отсортированные по приоритету задания
    const sortedJobs = this.getSortedPendingJobs();
    
    // Запускаем задания по доступным слотам
    for (let i = 0; i < Math.min(availableSlots, sortedJobs.length); i++) {
      const job = sortedJobs[i];
      this.startJob(job);
    }
  }

  private getSortedPendingJobs(): SyncJob[] {
    return Array.from(this.pendingJobs.values())
      .sort((a, b) => {
        // Сначала по приоритету (выше число = выше приоритет)
        if (a.priority !== b.priority) {
          return b.priority - a.priority;
        }
        // Затем по времени создания (раньше = выше приоритет)
        return a.createdAt.getTime() - b.createdAt.getTime();
      });
  }

  private startJob(job: SyncJob): void {
    console.log(`Запуск задания: ${job.id} (${job.type})`);
    
    // Перемещаем из ожидающих в выполняющиеся
    this.pendingJobs.delete(job.id);
    this.runningJobs.set(job.id, job);
    this.jobStartTimes.set(job.id, new Date());
    
    // Обновляем статус
    job.status = 'running';
    job.progress.currentOperation = 'Инициализация';
    
    this.emit('job_started', job);
    
    // Здесь должна быть логика фактического выполнения синхронизации
    // В реальном приложении это будет вызов соответствующего сервиса
    this.executeJob(job);
  }

  private async executeJob(job: SyncJob): Promise<void> {
    try {
      // Эмуляция выполнения задания
      // В реальности здесь будет вызов синхронизационного сервиса
      
      switch (job.type) {
        case 'full':
          await this.executeFullSync(job);
          break;
        case 'incremental':
          await this.executeIncrementalSync(job);
          break;
        case 'tasks_only':
          await this.executeTasksOnlySync(job);
          break;
        case 'inventory_only':
          await this.executeInventoryOnlySync(job);
          break;
        default:
          throw new Error(`Unknown sync type: ${job.type}`);
      }
      
      // Задание завершено успешно
      await this.completeJob(job.id, true);
      
    } catch (error: any) {
      console.error(`Ошибка выполнения задания ${job.id}:`, error);
      await this.completeJob(job.id, false, error.message);
    }
  }

  private async executeFullSync(job: SyncJob): Promise<void> {
    const steps = [
      'Подготовка данных',
      'Синхронизация задач',
      'Синхронизация инвентаря',
      'Синхронизация настроек',
      'Финализация'
    ];

    for (let i = 0; i < steps.length; i++) {
      if (job.status === 'cancelled') {
        throw new Error('Job cancelled');
      }

      job.progress.currentOperation = steps[i];
      job.progress.completed = i + 1;
      job.progress.total = steps.length;
      job.progress.percentage = Math.round(((i + 1) / steps.length) * 100);

      this.emit('job_progress', job);

      // Эмуляция работы
      await this.delay(2000);
    }
  }

  private async executeIncrementalSync(job: SyncJob): Promise<void> {
    const steps = [
      'Проверка изменений',
      'Синхронизация обновлений',
      'Подтверждение'
    ];

    for (let i = 0; i < steps.length; i++) {
      if (job.status === 'cancelled') {
        throw new Error('Job cancelled');
      }

      job.progress.currentOperation = steps[i];
      job.progress.completed = i + 1;
      job.progress.total = steps.length;
      job.progress.percentage = Math.round(((i + 1) / steps.length) * 100);

      this.emit('job_progress', job);
      await this.delay(1000);
    }
  }

  private async executeTasksOnlySync(job: SyncJob): Promise<void> {
    job.progress.currentOperation = 'Синхронизация задач';
    job.progress.completed = 1;
    job.progress.total = 1;
    job.progress.percentage = 100;
    this.emit('job_progress', job);
    await this.delay(1500);
  }

  private async executeInventoryOnlySync(job: SyncJob): Promise<void> {
    job.progress.currentOperation = 'Синхронизация инвентаря';
    job.progress.completed = 1;
    job.progress.total = 1;
    job.progress.percentage = 100;
    this.emit('job_progress', job);
    await this.delay(1500);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async waitForRunningJobs(timeoutMs: number): Promise<void> {
    const startTime = Date.now();
    
    while (this.runningJobs.size > 0 && (Date.now() - startTime) < timeoutMs) {
      await this.delay(1000);
    }

    // Принудительно завершаем оставшиеся задания
    for (const [jobId, job] of this.runningJobs) {
      job.status = 'cancelled';
      job.error = 'Service shutdown';
      this.failedJobs.set(jobId, job);
      this.emit('job_cancelled', job);
    }

    this.runningJobs.clear();
    this.jobStartTimes.clear();
  }

  private cleanupOldJobs(): void {
    const cleanupThreshold = 24 * 60 * 60 * 1000; // 24 часа
    const now = new Date();

    // Очистка завершенных заданий
    for (const [jobId, job] of this.completedJobs) {
      if (now.getTime() - job.createdAt.getTime() > cleanupThreshold) {
        this.completedJobs.delete(jobId);
      }
    }

    // Очистка неудачных заданий (оставляем более свежие для анализа)
    for (const [jobId, job] of this.failedJobs) {
      if (now.getTime() - job.createdAt.getTime() > cleanupThreshold) {
        this.failedJobs.delete(jobId);
      }
    }

    console.log(`Очистка завершена. Активных заданий: ${this.getStatistics().totalJobs}`);
  }

  private calculateProcessingTimes(): { average: number; min: number; max: number } {
    const completedJobs = Array.from(this.completedJobs.values());
    
    if (completedJobs.length === 0) {
      return { average: 0, min: 0, max: 0 };
    }

    const times = completedJobs.map(job => {
      // Примерное время выполнения на основе типа задания
      switch (job.type) {
        case 'full': return 10000; // 10 секунд
        case 'incremental': return 3000; // 3 секунды
        case 'tasks_only': return 1500; // 1.5 секунды
        case 'inventory_only': return 1500; // 1.5 секунды
        default: return 5000;
      }
    });

    return {
      average: times.reduce((sum, time) => sum + time, 0) / times.length,
      min: Math.min(...times),
      max: Math.max(...times)
    };
  }
}

export default SyncQueueManager; 