import { EventEmitter } from 'events';
import { SyncJob } from './wifi-sync-service';

interface RetryPolicy {
  maxAttempts: number;
  baseDelay: number; // базовая задержка в мс
  maxDelay: number; // максимальная задержка в мс
  exponentialBackoff: boolean;
  jitterFactor: number; // фактор случайности (0-1)
}

interface ScheduledRetry {
  job: SyncJob;
  scheduledTime: Date;
  timeoutId: NodeJS.Timeout;
  attempt: number;
}

export class RetryManager extends EventEmitter {
  private scheduledRetries: Map<string, ScheduledRetry> = new Map();
  private retryPolicies: Map<string, RetryPolicy> = new Map();
  private isRunning = false;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.setupDefaultPolicies();
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('Retry Manager уже запущен');
      return;
    }

    console.log('Запуск Retry Manager...');
    
    this.isRunning = true;
    this.startPeriodicCleanup();
    
    console.log('Retry Manager запущен');
    this.emit('started');
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    console.log('Остановка Retry Manager...');

    // Отмена всех запланированных повторных попыток
    for (const [jobId, retry] of this.scheduledRetries) {
      clearTimeout(retry.timeoutId);
      this.scheduledRetries.delete(jobId);
      this.emit('retry_cancelled', retry.job);
    }

    // Остановка периодической очистки
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    this.isRunning = false;
    console.log('Retry Manager остановлен');
    this.emit('stopped');
  }

  async scheduleRetry(job: SyncJob): Promise<boolean> {
    if (!this.isRunning) {
      console.warn('Retry Manager не запущен');
      return false;
    }

    // Проверяем, достигли ли максимального количества попыток
    if (job.attempts >= job.maxAttempts) {
      console.log(`Задание ${job.id} достигло максимального количества попыток (${job.maxAttempts})`);
      this.emit('retry_exhausted', job);
      return false;
    }

    // Получаем политику повторных попыток для типа синхронизации
    const policy = this.getRetryPolicy(job.type);
    
    // Рассчитываем задержку
    const delay = this.calculateDelay(job.attempts, policy);
    const scheduledTime = new Date(Date.now() + delay);

    console.log(`Планирование повторной попытки для задания ${job.id} через ${delay}мс (попытка ${job.attempts + 1}/${job.maxAttempts})`);

    // Отмена предыдущей попытки, если она существует
    const existingRetry = this.scheduledRetries.get(job.id);
    if (existingRetry) {
      clearTimeout(existingRetry.timeoutId);
    }

    // Планирование новой попытки
    const timeoutId = setTimeout(() => {
      this.executeRetry(job.id);
    }, delay);

    const scheduledRetry: ScheduledRetry = {
      job: { ...job, attempts: job.attempts + 1 },
      scheduledTime,
      timeoutId,
      attempt: job.attempts + 1
    };

    this.scheduledRetries.set(job.id, scheduledRetry);
    this.emit('retry_scheduled', scheduledRetry);

    return true;
  }

  async cancelRetry(jobId: string): Promise<boolean> {
    const retry = this.scheduledRetries.get(jobId);
    if (!retry) {
      return false;
    }

    clearTimeout(retry.timeoutId);
    this.scheduledRetries.delete(jobId);
    
    console.log(`Отмена повторной попытки для задания ${jobId}`);
    this.emit('retry_cancelled', retry.job);
    
    return true;
  }

  getScheduledRetries(): ScheduledRetry[] {
    return Array.from(this.scheduledRetries.values());
  }

  getRetryInfo(jobId: string): ScheduledRetry | undefined {
    return this.scheduledRetries.get(jobId);
  }

  setRetryPolicy(syncType: string, policy: Partial<RetryPolicy>): void {
    const existingPolicy = this.retryPolicies.get(syncType) || this.getDefaultPolicy();
    const newPolicy = { ...existingPolicy, ...policy };
    this.retryPolicies.set(syncType, newPolicy);
    
    console.log(`Обновлена политика повторных попыток для ${syncType}:`, newPolicy);
  }

  getRetryStatistics() {
    const scheduled = Array.from(this.scheduledRetries.values());
    
    return {
      totalScheduled: scheduled.length,
      byType: {
        full: scheduled.filter(r => r.job.type === 'full').length,
        incremental: scheduled.filter(r => r.job.type === 'incremental').length,
        tasks_only: scheduled.filter(r => r.job.type === 'tasks_only').length,
        inventory_only: scheduled.filter(r => r.job.type === 'inventory_only').length
      },
      byAttempt: {
        first: scheduled.filter(r => r.attempt === 1).length,
        second: scheduled.filter(r => r.attempt === 2).length,
        third: scheduled.filter(r => r.attempt === 3).length,
        final: scheduled.filter(r => r.attempt >= r.job.maxAttempts).length
      },
      nextRetry: scheduled.length > 0 ? 
        Math.min(...scheduled.map(r => r.scheduledTime.getTime() - Date.now())) : null
    };
  }

  private setupDefaultPolicies(): void {
    // Политика для полной синхронизации
    this.retryPolicies.set('full', {
      maxAttempts: 3,
      baseDelay: 30000, // 30 секунд
      maxDelay: 300000, // 5 минут
      exponentialBackoff: true,
      jitterFactor: 0.1
    });

    // Политика для инкрементальной синхронизации
    this.retryPolicies.set('incremental', {
      maxAttempts: 5,
      baseDelay: 10000, // 10 секунд
      maxDelay: 120000, // 2 минуты
      exponentialBackoff: true,
      jitterFactor: 0.2
    });

    // Политика для синхронизации только задач
    this.retryPolicies.set('tasks_only', {
      maxAttempts: 3,
      baseDelay: 5000, // 5 секунд
      maxDelay: 60000, // 1 минута
      exponentialBackoff: true,
      jitterFactor: 0.15
    });

    // Политика для синхронизации только инвентаря
    this.retryPolicies.set('inventory_only', {
      maxAttempts: 3,
      baseDelay: 5000, // 5 секунд
      maxDelay: 60000, // 1 минута
      exponentialBackoff: true,
      jitterFactor: 0.15
    });
  }

  private getRetryPolicy(syncType: string): RetryPolicy {
    return this.retryPolicies.get(syncType) || this.getDefaultPolicy();
  }

  private getDefaultPolicy(): RetryPolicy {
    return {
      maxAttempts: 3,
      baseDelay: 15000, // 15 секунд
      maxDelay: 180000, // 3 минуты
      exponentialBackoff: true,
      jitterFactor: 0.1
    };
  }

  private calculateDelay(attempt: number, policy: RetryPolicy): number {
    let delay = policy.baseDelay;

    if (policy.exponentialBackoff) {
      // Экспоненциальное увеличение задержки: baseDelay * 2^attempt
      delay = policy.baseDelay * Math.pow(2, attempt);
    } else {
      // Линейное увеличение: baseDelay * (attempt + 1)
      delay = policy.baseDelay * (attempt + 1);
    }

    // Ограничиваем максимальной задержкой
    delay = Math.min(delay, policy.maxDelay);

    // Добавляем случайность (jitter) для предотвращения thundering herd
    if (policy.jitterFactor > 0) {
      const jitter = delay * policy.jitterFactor * Math.random();
      delay += jitter - (delay * policy.jitterFactor / 2);
    }

    return Math.max(1000, Math.round(delay)); // Минимум 1 секунда
  }

  private async executeRetry(jobId: string): Promise<void> {
    const retry = this.scheduledRetries.get(jobId);
    if (!retry) {
      console.warn(`Попытка выполнить несуществующее повторение: ${jobId}`);
      return;
    }

    console.log(`Выполнение повторной попытки для задания ${jobId} (попытка ${retry.attempt})`);

    // Удаляем из запланированных
    this.scheduledRetries.delete(jobId);

    // Обновляем статус задания
    retry.job.status = 'pending';
    retry.job.error = undefined;

    try {
      // Отправляем событие о начале повторной попытки
      this.emit('retry_executing', retry);

      // Здесь должна быть логика повторного выполнения
      // В реальном приложении это будет вызов WiFiSyncService.queueSyncJob
      this.emit('retry_ready', retry.job);

    } catch (error: any) {
      console.error(`Ошибка при выполнении повторной попытки ${jobId}:`, error);
      
      // Планируем следующую попытку, если возможно
      retry.job.status = 'failed';
      retry.job.error = error.message;
      
      if (retry.job.attempts < retry.job.maxAttempts) {
        await this.scheduleRetry(retry.job);
      } else {
        this.emit('retry_exhausted', retry.job);
      }
    }
  }

  private startPeriodicCleanup(): void {
    // Очистка старых записей каждые 10 минут
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredRetries();
    }, 10 * 60 * 1000);
  }

  private cleanupExpiredRetries(): void {
    const now = new Date();
    const expiredThreshold = 24 * 60 * 60 * 1000; // 24 часа

    for (const [jobId, retry] of this.scheduledRetries) {
      // Удаляем очень старые повторные попытки
      if (now.getTime() - retry.job.createdAt.getTime() > expiredThreshold) {
        clearTimeout(retry.timeoutId);
        this.scheduledRetries.delete(jobId);
        
        console.log(`Удаление истекшей повторной попытки: ${jobId}`);
        this.emit('retry_expired', retry.job);
      }
    }
  }

  // Статические методы для определения причин ошибок и стратегий повторных попыток
  static shouldRetry(error: string): boolean {
    const retryableErrors = [
      'network timeout',
      'connection refused',
      'device not responding',
      'temporary unavailable',
      'sync conflict',
      'rate limit exceeded'
    ];

    const errorLower = error.toLowerCase();
    return retryableErrors.some(retryable => errorLower.includes(retryable));
  }

  static getRecommendedDelay(error: string, attempt: number): number {
    const errorLower = error.toLowerCase();

    // Быстрые повторные попытки для временных сетевых ошибок
    if (errorLower.includes('timeout') || errorLower.includes('connection')) {
      return 5000 * Math.pow(2, attempt); // 5s, 10s, 20s, 40s...
    }

    // Медленные повторные попытки для ошибок устройств
    if (errorLower.includes('device') || errorLower.includes('unavailable')) {
      return 30000 * Math.pow(1.5, attempt); // 30s, 45s, 67s, 101s...
    }

    // Очень медленные повторные попытки для rate limiting
    if (errorLower.includes('rate limit')) {
      return 60000 * (attempt + 1); // 1m, 2m, 3m, 4m...
    }

    // По умолчанию
    return 15000 * Math.pow(2, attempt);
  }

  static getMaxAttempts(syncType: string, error: string): number {
    const errorLower = error.toLowerCase();

    // Критические ошибки - меньше попыток
    if (errorLower.includes('auth') || errorLower.includes('permission')) {
      return 1; // Не повторяем ошибки авторизации
    }

    // Больше попыток для простых синхронизаций
    if (syncType === 'incremental' || syncType === 'tasks_only') {
      return 5;
    }

    // Меньше попыток для полных синхронизаций
    if (syncType === 'full') {
      return 3;
    }

    return 3; // По умолчанию
  }
}

export default RetryManager; 