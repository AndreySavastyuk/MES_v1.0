import { create } from 'zustand';

interface Product {
  id: number;
  sku: string;
  name: string;
  description?: string;
  price: number;
  cost: number;
  category_id?: number;
  supplier_id?: number;
  created_at: string;
  updated_at: string;
}

interface InventoryItem {
  id: number;
  product_id: number;
  location_id?: number;
  quantity: number;
  reserved_quantity: number;
  min_stock_level: number;
  max_stock_level?: number;
  last_updated: string;
}

interface Location {
  id: number;
  code: string;
  name: string;
  zone?: string;
  aisle?: string;
  shelf?: string;
  bin?: string;
  location_type: string;
  is_active: boolean;
  created_at: string;
}

interface AppState {
  // Подключение
  isConnected: boolean;
  connectionStatus: 'connected' | 'disconnected' | 'connecting';
  
  // Пользователь
  currentUser: string | null;
  
  // Данные
  products: Product[];
  inventory: InventoryItem[];
  locations: Location[];
  
  // Состояние загрузки
  loading: {
    products: boolean;
    inventory: boolean;
    locations: boolean;
  };
  
  // Ошибки
  errors: {
    products: string | null;
    inventory: string | null;
    locations: string | null;
  };
  
  // Синхронизация
  syncStatus: {
    lastSync: string | null;
    pendingCount: number;
    isSync: boolean;
  };
}

interface AppActions {
  // Подключение
  setConnectionStatus: (status: 'connected' | 'disconnected' | 'connecting') => void;
  
  // Пользователь
  setCurrentUser: (user: string | null) => void;
  
  // Продукты
  setProducts: (products: Product[]) => void;
  addProduct: (product: Product) => void;
  updateProduct: (id: number, product: Partial<Product>) => void;
  removeProduct: (id: number) => void;
  setProductsLoading: (loading: boolean) => void;
  setProductsError: (error: string | null) => void;
  
  // Остатки
  setInventory: (inventory: InventoryItem[]) => void;
  updateInventoryItem: (productId: number, locationId: number, quantity: number) => void;
  setInventoryLoading: (loading: boolean) => void;
  setInventoryError: (error: string | null) => void;
  
  // Локации
  setLocations: (locations: Location[]) => void;
  addLocation: (location: Location) => void;
  updateLocation: (id: number, location: Partial<Location>) => void;
  setLocationsLoading: (loading: boolean) => void;
  setLocationsError: (error: string | null) => void;
  
  // Синхронизация
  setSyncStatus: (status: Partial<AppState['syncStatus']>) => void;
  
  // Очистка
  clearAllData: () => void;
}

const useAppStore = create<AppState & AppActions>((set, get) => ({
  // Начальное состояние
  isConnected: false,
  connectionStatus: 'disconnected',
  currentUser: null,
  products: [],
  inventory: [],
  locations: [],
  loading: {
    products: false,
    inventory: false,
    locations: false,
  },
  errors: {
    products: null,
    inventory: null,
    locations: null,
  },
  syncStatus: {
    lastSync: null,
    pendingCount: 0,
    isSync: false,
  },

  // Действия для подключения
  setConnectionStatus: (status) => set((state) => ({
    connectionStatus: status,
    isConnected: status === 'connected'
  })),

  // Действия для пользователя
  setCurrentUser: (user) => set({ currentUser: user }),

  // Действия для продуктов
  setProducts: (products) => set({ products }),
  
  addProduct: (product) => set((state) => ({
    products: [...state.products, product]
  })),
  
  updateProduct: (id, updatedProduct) => set((state) => ({
    products: state.products.map(product =>
      product.id === id ? { ...product, ...updatedProduct } : product
    )
  })),
  
  removeProduct: (id) => set((state) => ({
    products: state.products.filter(product => product.id !== id)
  })),
  
  setProductsLoading: (loading) => set((state) => ({
    loading: { ...state.loading, products: loading }
  })),
  
  setProductsError: (error) => set((state) => ({
    errors: { ...state.errors, products: error }
  })),

  // Действия для остатков
  setInventory: (inventory) => set({ inventory }),
  
  updateInventoryItem: (productId, locationId, quantity) => set((state) => ({
    inventory: state.inventory.map(item =>
      item.product_id === productId && item.location_id === locationId
        ? { ...item, quantity, last_updated: new Date().toISOString() }
        : item
    )
  })),
  
  setInventoryLoading: (loading) => set((state) => ({
    loading: { ...state.loading, inventory: loading }
  })),
  
  setInventoryError: (error) => set((state) => ({
    errors: { ...state.errors, inventory: error }
  })),

  // Действия для локаций
  setLocations: (locations) => set({ locations }),
  
  addLocation: (location) => set((state) => ({
    locations: [...state.locations, location]
  })),
  
  updateLocation: (id, updatedLocation) => set((state) => ({
    locations: state.locations.map(location =>
      location.id === id ? { ...location, ...updatedLocation } : location
    )
  })),
  
  setLocationsLoading: (loading) => set((state) => ({
    loading: { ...state.loading, locations: loading }
  })),
  
  setLocationsError: (error) => set((state) => ({
    errors: { ...state.errors, locations: error }
  })),

  // Действия для синхронизации
  setSyncStatus: (status) => set((state) => ({
    syncStatus: { ...state.syncStatus, ...status }
  })),

  // Очистка всех данных
  clearAllData: () => set({
    products: [],
    inventory: [],
    locations: [],
    loading: {
      products: false,
      inventory: false,
      locations: false,
    },
    errors: {
      products: null,
      inventory: null,
      locations: null,
    },
    syncStatus: {
      lastSync: null,
      pendingCount: 0,
      isSync: false,
    },
  }),
}));

export default useAppStore; 