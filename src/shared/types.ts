// Warehouse Management System Types

// Device types
export interface Device {
  id: number;
  name: string;
  ip_address?: string;
  last_sync?: string;
  status: 'online' | 'offline' | 'syncing' | 'error';
  device_type: 'tablet' | 'scanner' | 'desktop';
  created_at: string;
  updated_at: string;
}

// Pick task types
export interface PickTask {
  id: number;
  number: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold';
  priority: 1 | 2 | 3 | 4 | 5;
  created_at: string;
  deadline?: string;
  assigned_device?: number;
  assigned_at?: string;
  completed_at?: string;
  total_items: number;
  picked_items: number;
  notes?: string;
  created_by: string;
  updated_at: string;
}

export interface PickItem {
  id: number;
  task_id: number;
  part_number: string;
  part_name: string;
  quantity_required: number;
  quantity_picked: number;
  location: string;
  status: 'pending' | 'picked' | 'partial' | 'not_found';
  picked_at?: string;
  picked_by_device?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// Acceptance log types
export interface AcceptanceLog {
  id: number;
  timestamp: string;
  part_number: string;
  part_name: string;
  order_number?: string;
  quantity: number;
  cell_code: string;
  device_id?: number;
  operator_name?: string;
  supplier_name?: string;
  batch_number?: string;
  expiry_date?: string;
  notes?: string;
  created_at: string;
}

// Enhanced sync log types
export interface SyncLog {
  id: number;
  device_id: number;
  sync_type: 'full' | 'incremental' | 'tasks' | 'acceptance' | 'status';
  timestamp: string;
  status: 'started' | 'completed' | 'failed' | 'partial';
  data_count: number;
  error_message?: string;
  duration_ms?: number;
  sync_direction: 'upload' | 'download' | 'bidirectional';
  data_size_bytes: number;
}

// Location with extended properties
export interface Location {
  id: number;
  code: string;
  name: string;
  zone?: string;
  type: 'storage' | 'picking' | 'receiving' | 'shipping' | 'staging';
  capacity: number;
  status: 'active' | 'inactive' | 'maintenance';
  coordinates_x?: number;
  coordinates_y?: number;
  created_at: string;
  updated_at: string;
}

// Parts catalog
export interface Part {
  id: number;
  part_number: string;
  part_name: string;
  description?: string;
  category?: string;
  unit_of_measure: string;
  weight_kg: number;
  dimensions_length: number;
  dimensions_width: number;
  dimensions_height: number;
  min_stock_level: number;
  max_stock_level: number;
  cost_per_unit: number;
  barcode?: string;
  supplier_part_number?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Enhanced inventory
export interface Inventory {
  id: number;
  part_number: string;
  location_code: string;
  quantity: number;
  reserved_quantity: number;
  available_quantity: number;
  last_counted_at?: string;
  last_movement_at: string;
  created_at: string;
  updated_at: string;
}

// Enhanced stock movements
export interface StockMovement {
  id: number;
  part_number: string;
  location_code: string;
  movement_type: 'receipt' | 'pick' | 'adjustment' | 'transfer' | 'return';
  quantity_change: number;
  reference_id?: number;
  reference_type?: string;
  reason?: string;
  operator_name?: string;
  device_id?: number;
  timestamp: string;
  batch_number?: string;
  order_number?: string;
}

// Legacy types for backward compatibility
export interface Product extends Part {}

export interface Category {
  id: number;
  name: string;
  description?: string;
  parent_id?: number;
  created_at: string;
}

export interface Supplier {
  id: number;
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  address?: string;
  created_at: string;
}

export interface InventoryItem extends Inventory {}

// API типы
export interface ApiResponse<T> {
  success: boolean;
  data?: T | null;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// WebSocket типы
export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: string;
}

export interface SyncMessage {
  type: 'sync_update' | 'sync_status' | 'sync_error';
  deviceId: string;
  tableName?: string;
  operation?: string;
  recordId?: number;
  data?: any;
} 