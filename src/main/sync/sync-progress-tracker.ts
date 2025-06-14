import { EventEmitter } from 'events';

export interface ProgressInfo {
  total: number;
  completed: number;
  percentage: number;
  currentOperation?: string;
  bytesTransferred?: number;
  totalBytes?: number;
  transferRate?: number; // байт/сек
  estimatedTimeRemaining?: number; // секунды
}

interface ProgressSession {
  jobId: string;
  deviceId: string;
  startTime: Date;
  lastUpdateTime: Date;
  progress: ProgressInfo;
  history: ProgressSnapshot[];
}

interface ProgressSnapshot {
  timestamp: Date;
  completed: number;
  bytesTransferred?: number;
}

export class SyncProgressTracker extends EventEmitter {
  private sessions: Map<string, ProgressSession> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private updateInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
  }

  start(): void {
    console.log('Запуск Sync Progress Tracker...');
    
    // Периодическое обновление расчетов каждые 5 секунд
    this.updateInterval = setInterval(() => {
      this.updateAllSessions();
    }, 5000);

    // Очистка старых сессий каждые 10 минут
    this.cleanupInterval = setInterval(() => {
      this.cleanupOldSessions();
    }, 10 * 60 * 1000);

    console.log('Sync Progress Tracker запущен');
  }

  stop(): void {
    console.log('Остановка Sync Progress Tracker...');

    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    // Завершаем все активные сессии
    for (const [jobId, session] of this.sessions) {
      this.emit('progress_session_ended', session);
    }

    this.sessions.clear();
    console.log('Sync Progress Tracker остановлен');
  }

  startSession(jobId: string, deviceId: string, initialProgress?: Partial<ProgressInfo>): void {
    const now = new Date();
    
    const progress: ProgressInfo = {
      total: 100,
      completed: 0,
      percentage: 0,
      currentOperation: 'Инициализация',
      bytesTransferred: 0,
      totalBytes: 0,
      transferRate: 0,
      estimatedTimeRemaining: 0,
      ...initialProgress
    };

    const session: ProgressSession = {
      jobId,
      deviceId,
      startTime: now,
      lastUpdateTime: now,
      progress,
      history: [{
        timestamp: now,
        completed: progress.completed,
        bytesTransferred: progress.bytesTransferred || 0
      }]
    };

    this.sessions.set(jobId, session);
    
    console.log(`Начата сессия отслеживания прогресса: ${jobId}`);
    this.emit('progress_session_started', session);
  }

  async updateProgress(jobId: string, update: Partial<ProgressInfo>): Promise<void> {
    const session = this.sessions.get(jobId);
    if (!session) {
      console.warn(`Попытка обновить несуществующую сессию: ${jobId}`);
      return;
    }

    const now = new Date();
    const previousProgress = { ...session.progress };

    // Обновляем прогресс
    Object.assign(session.progress, update);

    // Пересчитываем процент, если обновлены completed или total
    if (update.completed !== undefined || update.total !== undefined) {
      session.progress.percentage = Math.min(100, 
        Math.round((session.progress.completed / session.progress.total) * 100)
      );
    }

    // Добавляем снимок в историю
    session.history.push({
      timestamp: now,
      completed: session.progress.completed,
      bytesTransferred: session.progress.bytesTransferred || 0
    });

    // Ограничиваем размер истории
    if (session.history.length > 100) {
      session.history = session.history.slice(-50);
    }

    // Обновляем время последнего обновления
    session.lastUpdateTime = now;

    // Рассчитываем скорость передачи и оставшееся время
    this.calculateMetrics(session);

    this.emit('progress_updated', {
      jobId,
      deviceId: session.deviceId,
      progress: session.progress,
      previousProgress,
      session
    });
  }

  getProgress(jobId: string): ProgressInfo | null {
    const session = this.sessions.get(jobId);
    return session ? session.progress : null;
  }

  getSession(jobId: string): ProgressSession | null {
    return this.sessions.get(jobId) || null;
  }

  getAllSessions(): ProgressSession[] {
    return Array.from(this.sessions.values());
  }

  getSessionsByDevice(deviceId: string): ProgressSession[] {
    return Array.from(this.sessions.values())
      .filter(session => session.deviceId === deviceId);
  }

  endSession(jobId: string): void {
    const session = this.sessions.get(jobId);
    if (session) {
      // Устанавливаем финальный прогресс
      session.progress.percentage = 100;
      session.progress.completed = session.progress.total;
      session.progress.currentOperation = 'Завершено';
      session.progress.estimatedTimeRemaining = 0;
      
      console.log(`Завершена сессия отслеживания прогресса: ${jobId}`);
      this.emit('progress_session_ended', session);
      
      // Удаляем через некоторое время для возможности просмотра результатов
      setTimeout(() => {
        this.sessions.delete(jobId);
      }, 60000); // 1 минута
    }
  }

  cancelSession(jobId: string): void {
    const session = this.sessions.get(jobId);
    if (session) {
      session.progress.currentOperation = 'Отменено';
      
      console.log(`Отменена сессия отслеживания прогресса: ${jobId}`);
      this.emit('progress_session_cancelled', session);
      
      this.sessions.delete(jobId);
    }
  }

  private calculateMetrics(session: ProgressSession): void {
    const now = new Date();
    const elapsed = now.getTime() - session.startTime.getTime();
    
    if (elapsed < 1000 || session.history.length < 2) {
      return; // Недостаточно данных для расчета
    }

    // Рассчитываем скорость передачи на основе последних 30 секунд
    const recentHistory = session.history.filter(snapshot => 
      now.getTime() - snapshot.timestamp.getTime() <= 30000
    );

    if (recentHistory.length >= 2) {
      const oldest = recentHistory[0];
      const newest = recentHistory[recentHistory.length - 1];
      
      const timeDiff = (newest.timestamp.getTime() - oldest.timestamp.getTime()) / 1000;
      
      if (timeDiff > 0) {
        // Скорость по элементам
        const itemsDiff = newest.completed - oldest.completed;
        const itemsPerSecond = itemsDiff / timeDiff;
        
        // Скорость по байтам
        if (newest.bytesTransferred && oldest.bytesTransferred) {
          const bytesDiff = newest.bytesTransferred - oldest.bytesTransferred;
          session.progress.transferRate = bytesDiff / timeDiff;
        }

        // Оценка оставшегося времени
        const remainingItems = session.progress.total - session.progress.completed;
        if (itemsPerSecond > 0 && remainingItems > 0) {
          session.progress.estimatedTimeRemaining = remainingItems / itemsPerSecond;
        }
      }
    }
  }

  private updateAllSessions(): void {
    for (const session of this.sessions.values()) {
      // Обновляем метрики для всех активных сессий
      if (session.progress.percentage < 100) {
        this.calculateMetrics(session);
        
        // Отправляем событие обновления метрик
        this.emit('progress_metrics_updated', {
          jobId: session.jobId,
          deviceId: session.deviceId,
          transferRate: session.progress.transferRate,
          estimatedTimeRemaining: session.progress.estimatedTimeRemaining
        });
      }
    }
  }

  private cleanupOldSessions(): void {
    const cleanupThreshold = 24 * 60 * 60 * 1000; // 24 часа
    const now = new Date();

    for (const [jobId, session] of this.sessions) {
      // Удаляем очень старые завершенные сессии
      if (session.progress.percentage >= 100 && 
          now.getTime() - session.lastUpdateTime.getTime() > cleanupThreshold) {
        
        console.log(`Очистка старой сессии: ${jobId}`);
        this.sessions.delete(jobId);
        this.emit('progress_session_cleaned', session);
      }
    }
  }

  // Утилиты для форматирования
  static formatTransferRate(bytesPerSecond: number): string {
    if (!bytesPerSecond) return '0 B/s';
    
    const units = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
    let size = bytesPerSecond;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  static formatTimeRemaining(seconds: number): string {
    if (!seconds || seconds <= 0) return '0 сек';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}ч ${minutes}м ${secs}с`;
    } else if (minutes > 0) {
      return `${minutes}м ${secs}с`;
    } else {
      return `${secs}с`;
    }
  }

  static formatBytes(bytes: number): string {
    if (!bytes) return '0 B';
    
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  getStatistics() {
    const sessions = Array.from(this.sessions.values());
    const activeSessions = sessions.filter(s => s.progress.percentage < 100);
    
    // Общая статистика
    const totalSessions = sessions.length;
    const completedSessions = sessions.filter(s => s.progress.percentage >= 100).length;
    
    // Средняя скорость передачи
    const sessionsWithRate = sessions.filter(s => s.progress.transferRate && s.progress.transferRate > 0);
    const averageTransferRate = sessionsWithRate.length > 0 ? 
      sessionsWithRate.reduce((sum, s) => sum + (s.progress.transferRate || 0), 0) / sessionsWithRate.length : 0;
    
    // Общий объем переданных данных
    const totalBytesTransferred = sessions.reduce((sum, s) => sum + (s.progress.bytesTransferred || 0), 0);
    
    return {
      totalSessions,
      activeSessions: activeSessions.length,
      completedSessions,
      averageTransferRate,
      totalBytesTransferred,
      sessionsByDevice: this.groupSessionsByDevice(sessions),
      oldestActiveSession: activeSessions.length > 0 ? 
        Math.min(...activeSessions.map(s => s.startTime.getTime())) : null
    };
  }

  private groupSessionsByDevice(sessions: ProgressSession[]) {
    const grouped: { [deviceId: string]: number } = {};
    
    for (const session of sessions) {
      grouped[session.deviceId] = (grouped[session.deviceId] || 0) + 1;
    }
    
    return grouped;
  }
}

export default SyncProgressTracker; 