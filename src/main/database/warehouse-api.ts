import { runSQL, getSQL, allSQL } from './index';
import { 
  Device, 
  PickTask, 
  PickItem, 
  AcceptanceLog, 
  SyncLog,
  ApiResponse,
  PaginatedResponse 
} from '../../shared/types';

// Device API
export class DeviceAPI {
  static async getAll(): Promise<Device[]> {
    return await allSQL('SELECT * FROM devices ORDER BY created_at DESC');
  }

  static async getById(id: number): Promise<Device | null> {
    return await getSQL('SELECT * FROM devices WHERE id = ?', [id]);
  }

  static async getOnlineDevices(): Promise<Device[]> {
    return await allSQL("SELECT * FROM devices WHERE status = 'online'");
  }

  static async create(device: Omit<Device, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<Device>> {
    try {
      const result = await runSQL(
        `INSERT INTO devices (name, ip_address, status, device_type) 
         VALUES (?, ?, ?, ?)`,
        [device.name, device.ip_address, device.status, device.device_type]
      );
      
      const created = await this.getById((result as any).lastInsertRowid);
      return { success: true, data: created || undefined };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  static async update(id: number, updates: Partial<Device>): Promise<ApiResponse<Device>> {
    try {
      const fields = Object.keys(updates).filter(key => key !== 'id').map(key => `${key} = ?`);
      const values = Object.values(updates).filter((_, index) => Object.keys(updates)[index] !== 'id');
      
      await runSQL(
        `UPDATE devices SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [...values, id]
      );
      
      const updated = await this.getById(id);
      return { success: true, data: updated };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  static async updateStatus(id: number, status: Device['status']): Promise<ApiResponse<Device>> {
    return this.update(id, { status });
  }

  static async updateLastSync(id: number): Promise<ApiResponse<Device>> {
    try {
      await runSQL('UPDATE devices SET last_sync = CURRENT_TIMESTAMP WHERE id = ?', [id]);
      const updated = await this.getById(id);
      return { success: true, data: updated };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  static async delete(id: number): Promise<ApiResponse<boolean>> {
    try {
      await runSQL('DELETE FROM devices WHERE id = ?', [id]);
      return { success: true, data: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}

// Pick Task API
export class PickTaskAPI {
  static async getAll(page = 1, limit = 50): Promise<PaginatedResponse<PickTask>> {
    try {
      const offset = (page - 1) * limit;
      const tasks = await allSQL(
        'SELECT * FROM pick_tasks ORDER BY created_at DESC LIMIT ? OFFSET ?',
        [limit, offset]
      );
      
      const totalResult = await getSQL('SELECT COUNT(*) as count FROM pick_tasks');
      const total = totalResult.count;
      
      return {
        success: true,
        data: tasks,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error: any) {
      return {
        success: false,
        data: [],
        pagination: { page: 1, limit, total: 0, totalPages: 0 }
      };
    }
  }

  static async getById(id: number): Promise<PickTask | null> {
    return await getSQL('SELECT * FROM pick_tasks WHERE id = ?', [id]);
  }

  static async getByStatus(status: PickTask['status']): Promise<PickTask[]> {
    return await allSQL('SELECT * FROM pick_tasks WHERE status = ? ORDER BY created_at DESC', [status]);
  }

  static async getByDevice(deviceId: number): Promise<PickTask[]> {
    return await allSQL('SELECT * FROM pick_tasks WHERE assigned_device = ? ORDER BY created_at DESC', [deviceId]);
  }

  static async create(task: Omit<PickTask, 'id' | 'created_at' | 'updated_at' | 'total_items' | 'picked_items'>): Promise<ApiResponse<PickTask>> {
    try {
      const result = await runSQL(
        `INSERT INTO pick_tasks (number, description, status, priority, deadline, assigned_device, created_by) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [task.number, task.description, task.status, task.priority, task.deadline, task.assigned_device, task.created_by]
      );
      
      const created = await this.getById((result as any).lastInsertRowid);
      return { success: true, data: created };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  static async update(id: number, updates: Partial<PickTask>): Promise<ApiResponse<PickTask>> {
    try {
      const fields = Object.keys(updates).filter(key => !['id', 'created_at', 'updated_at'].includes(key)).map(key => `${key} = ?`);
      const values = Object.values(updates).filter((_, index) => !['id', 'created_at', 'updated_at'].includes(Object.keys(updates)[index]));
      
      await runSQL(
        `UPDATE pick_tasks SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [...values, id]
      );
      
      const updated = await this.getById(id);
      return { success: true, data: updated };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  static async assignToDevice(id: number, deviceId: number): Promise<ApiResponse<PickTask>> {
    return this.update(id, { 
      assigned_device: deviceId, 
      assigned_at: new Date().toISOString(),
      status: 'in_progress'
    });
  }

  static async complete(id: number): Promise<ApiResponse<PickTask>> {
    return this.update(id, { 
      status: 'completed',
      completed_at: new Date().toISOString()
    });
  }

  static async getWithItems(id: number): Promise<{ task: PickTask, items: PickItem[] } | null> {
    const task = await this.getById(id);
    if (!task) return null;
    
    const items = await PickItemAPI.getByTaskId(id);
    return { task, items };
  }
}

// Pick Item API
export class PickItemAPI {
  static async getAll(): Promise<PickItem[]> {
    return await allSQL('SELECT * FROM pick_items ORDER BY created_at DESC');
  }

  static async getById(id: number): Promise<PickItem | null> {
    return await getSQL('SELECT * FROM pick_items WHERE id = ?', [id]);
  }

  static async getByTaskId(taskId: number): Promise<PickItem[]> {
    return await allSQL('SELECT * FROM pick_items WHERE task_id = ? ORDER BY id', [taskId]);
  }

  static async getByStatus(status: PickItem['status']): Promise<PickItem[]> {
    return await allSQL('SELECT * FROM pick_items WHERE status = ? ORDER BY created_at DESC', [status]);
  }

  static async create(item: Omit<PickItem, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<PickItem>> {
    try {
      const result = await runSQL(
        `INSERT INTO pick_items (task_id, part_number, part_name, quantity_required, quantity_picked, location, status, notes) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [item.task_id, item.part_number, item.part_name, item.quantity_required, item.quantity_picked, item.location, item.status, item.notes]
      );
      
      const created = await this.getById((result as any).lastInsertRowid);
      return { success: true, data: created };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  static async updateQuantityPicked(id: number, quantityPicked: number, deviceId?: number): Promise<ApiResponse<PickItem>> {
    try {
      const item = await this.getById(id);
      if (!item) {
        return { success: false, error: 'Item not found' };
      }

      const status = quantityPicked >= item.quantity_required ? 'picked' : 
                    quantityPicked > 0 ? 'partial' : 'pending';

      await runSQL(
        `UPDATE pick_items SET 
         quantity_picked = ?, 
         status = ?, 
         picked_at = CASE WHEN ? = 'picked' THEN CURRENT_TIMESTAMP ELSE picked_at END,
         picked_by_device = ?,
         updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [quantityPicked, status, status, deviceId, id]
      );
      
      const updated = await this.getById(id);
      return { success: true, data: updated };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  static async markAsPicked(id: number, deviceId?: number): Promise<ApiResponse<PickItem>> {
    const item = await this.getById(id);
    if (!item) {
      return { success: false, error: 'Item not found' };
    }
    return this.updateQuantityPicked(id, item.quantity_required, deviceId);
  }

  static async markAsNotFound(id: number, notes?: string): Promise<ApiResponse<PickItem>> {
    try {
      await runSQL(
        'UPDATE pick_items SET status = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        ['not_found', notes || 'Товар не найден', id]
      );
      
      const updated = await this.getById(id);
      return { success: true, data: updated };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}

// Acceptance Log API
export class AcceptanceLogAPI {
  static async getAll(page = 1, limit = 50): Promise<PaginatedResponse<AcceptanceLog>> {
    try {
      const offset = (page - 1) * limit;
      const logs = await allSQL(
        'SELECT * FROM acceptance_log ORDER BY timestamp DESC LIMIT ? OFFSET ?',
        [limit, offset]
      );
      
      const totalResult = await getSQL('SELECT COUNT(*) as count FROM acceptance_log');
      const total = totalResult.count;
      
      return {
        success: true,
        data: logs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error: any) {
      return {
        success: false,
        data: [],
        pagination: { page: 1, limit, total: 0, totalPages: 0 }
      };
    }
  }

  static async getById(id: number): Promise<AcceptanceLog | null> {
    return await getSQL('SELECT * FROM acceptance_log WHERE id = ?', [id]);
  }

  static async getByPartNumber(partNumber: string): Promise<AcceptanceLog[]> {
    return await allSQL('SELECT * FROM acceptance_log WHERE part_number = ? ORDER BY timestamp DESC', [partNumber]);
  }

  static async getByDevice(deviceId: number): Promise<AcceptanceLog[]> {
    return await allSQL('SELECT * FROM acceptance_log WHERE device_id = ? ORDER BY timestamp DESC', [deviceId]);
  }

  static async getByDateRange(startDate: string, endDate: string): Promise<AcceptanceLog[]> {
    return await allSQL(
      'SELECT * FROM acceptance_log WHERE timestamp BETWEEN ? AND ? ORDER BY timestamp DESC',
      [startDate, endDate]
    );
  }

  static async create(log: Omit<AcceptanceLog, 'id' | 'created_at'>): Promise<ApiResponse<AcceptanceLog>> {
    try {
      const result = await runSQL(
        `INSERT INTO acceptance_log (device_id, part_number, part_name, quantity, location, status, notes, accepted_by) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [log.device_id, log.part_number, log.part_name, log.quantity, log.location, log.status, log.notes, log.accepted_by]
      );
      
      const created = await this.getById((result as any).lastInsertRowid);
      return { success: true, data: created };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  static async getRecentAcceptance(hours = 24): Promise<AcceptanceLog[]> {
    return await allSQL(
      "SELECT * FROM acceptance_log WHERE timestamp >= datetime('now', '-' || ? || ' hours') ORDER BY timestamp DESC",
      [hours]
    );
  }
}

// Sync Log API
export class SyncLogAPI {
  static async getAll(page = 1, limit = 50): Promise<PaginatedResponse<SyncLog>> {
    try {
      const offset = (page - 1) * limit;
      const logs = await allSQL(
        'SELECT * FROM sync_log ORDER BY timestamp DESC LIMIT ? OFFSET ?',
        [limit, offset]
      );
      
      const totalResult = await getSQL('SELECT COUNT(*) as count FROM sync_log');
      const total = totalResult.count;
      
      return {
        success: true,
        data: logs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error: any) {
      return {
        success: false,
        data: [],
        pagination: { page: 1, limit, total: 0, totalPages: 0 }
      };
    }
  }

  static async getByDevice(deviceId: number): Promise<SyncLog[]> {
    return await allSQL('SELECT * FROM sync_log WHERE device_id = ? ORDER BY timestamp DESC', [deviceId]);
  }

  static async getByStatus(status: SyncLog['status']): Promise<SyncLog[]> {
    return await allSQL('SELECT * FROM sync_log WHERE status = ? ORDER BY timestamp DESC', [status]);
  }

  static async create(log: Omit<SyncLog, 'id'>): Promise<ApiResponse<SyncLog>> {
    try {
      const result = await runSQL(
        `INSERT INTO sync_log (device_id, sync_type, sync_direction, status, data_count, data_size_bytes, duration_ms, error_message) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [log.device_id, log.sync_type, log.sync_direction, log.status, log.data_count, log.data_size_bytes, log.duration_ms, log.error_message]
      );
      
      const created = await this.getById((result as any).lastInsertRowid);
      return { success: true, data: created };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  static async getById(id: number): Promise<SyncLog | null> {
    return await getSQL('SELECT * FROM sync_log WHERE id = ?', [id]);
  }

  static async startSync(deviceId: number, syncType: SyncLog['sync_type'], direction: SyncLog['sync_direction'] = 'bidirectional'): Promise<ApiResponse<SyncLog>> {
    return this.create({
      device_id: deviceId,
      sync_type: syncType,
      timestamp: new Date().toISOString(),
      status: 'started',
      data_count: 0,
      sync_direction: direction,
      data_size_bytes: 0
    });
  }

  static async completeSync(id: number, dataCount: number, dataSizeBytes: number, durationMs: number): Promise<ApiResponse<SyncLog>> {
    try {
      await runSQL(
        'UPDATE sync_log SET status = ?, data_count = ?, data_size_bytes = ?, duration_ms = ? WHERE id = ?',
        ['completed', dataCount, dataSizeBytes, durationMs, id]
      );
      
      const updated = await this.getById(id);
      return { success: true, data: updated };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  static async failSync(id: number, errorMessage: string, durationMs?: number): Promise<ApiResponse<SyncLog>> {
    try {
      await runSQL(
        'UPDATE sync_log SET status = ?, error_message = ?, duration_ms = ? WHERE id = ?',
        ['failed', errorMessage, durationMs, id]
      );
      
      const updated = await this.getById(id);
      return { success: true, data: updated };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}

// Dashboard Statistics API
export class DashboardAPI {
  static async getStats(): Promise<any> {
    try {
      const [
        totalTasks,
        pendingTasks,
        inProgressTasks,
        completedTasks,
        totalDevices,
        onlineDevices,
        recentAcceptance,
        failedSyncs
      ] = await Promise.all([
        getSQL('SELECT COUNT(*) as count FROM pick_tasks'),
        getSQL("SELECT COUNT(*) as count FROM pick_tasks WHERE status = 'pending'"),
        getSQL("SELECT COUNT(*) as count FROM pick_tasks WHERE status = 'in_progress'"),
        getSQL("SELECT COUNT(*) as count FROM pick_tasks WHERE status = 'completed'"),
        getSQL('SELECT COUNT(*) as count FROM devices'),
        getSQL("SELECT COUNT(*) as count FROM devices WHERE status = 'online'"),
        getSQL("SELECT COUNT(*) as count FROM acceptance_log WHERE timestamp >= datetime('now', '-24 hours')"),
        getSQL("SELECT COUNT(*) as count FROM sync_log WHERE status = 'failed' AND timestamp >= datetime('now', '-24 hours')")
      ]);

      return {
        success: true,
        data: {
          totalPickTasks: totalTasks.count,
          pendingTasks: pendingTasks.count,
          inProgressTasks: inProgressTasks.count,
          completedTasks: completedTasks.count,
          totalDevices: totalDevices.count,
          onlineDevices: onlineDevices.count,
          recentAcceptance: recentAcceptance.count,
          failedSyncs: failedSyncs.count
        }
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  static async getRecentActivity(): Promise<any> {
    try {
      const [recentTasks, recentAcceptance, recentSyncs] = await Promise.all([
        allSQL("SELECT * FROM pick_tasks WHERE created_at >= datetime('now', '-7 days') ORDER BY created_at DESC LIMIT 10"),
        allSQL("SELECT * FROM acceptance_log WHERE timestamp >= datetime('now', '-7 days') ORDER BY timestamp DESC LIMIT 10"),
        allSQL("SELECT * FROM sync_log WHERE timestamp >= datetime('now', '-7 days') ORDER BY timestamp DESC LIMIT 10")
      ]);

      return {
        success: true,
        data: {
          recentTasks,
          recentAcceptance,
          recentSyncs
        }
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
} 