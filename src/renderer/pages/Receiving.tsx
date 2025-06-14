import React, { useState, useEffect, useMemo } from 'react';

interface ReceivingData {
  id: string;
  date: string;
  orderNumber: string;
  designation: string;
  name: string;
  quantity: number;
  comment?: string;
  status: 'Принят' | 'Проблема' | 'Проведен в НП';
  supplier?: string;
  category?: string;
  unitPrice?: number;
}

interface TableColumn {
  key: keyof ReceivingData;
  label: string;
  sortable: boolean;
  width?: string;
}

const Receiving: React.FC = () => {
  const [receivingItems, setReceivingItems] = useState<ReceivingData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('Все');
  const [sortColumn, setSortColumn] = useState<keyof ReceivingData>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);

  const columns: TableColumn[] = [
    { key: 'date', label: 'Дата', sortable: true, width: '120px' },
    { key: 'orderNumber', label: 'Номер заказа', sortable: true, width: '140px' },
    { key: 'designation', label: 'Обозначение', sortable: true, width: '120px' },
    { key: 'name', label: 'Наименование', sortable: true, width: '250px' },
    { key: 'supplier', label: 'Поставщик', sortable: true, width: '150px' },
    { key: 'category', label: 'Категория', sortable: true, width: '120px' },
    { key: 'quantity', label: 'Количество', sortable: true, width: '100px' },
    { key: 'unitPrice', label: 'Цена за ед.', sortable: true, width: '120px' },
    { key: 'comment', label: 'Комментарий', sortable: false, width: '200px' },
    { key: 'status', label: 'Статус', sortable: true, width: '140px' },
  ];

  useEffect(() => {
    loadReceivingItems();
  }, []);

  const loadReceivingItems = async () => {
    try {
      const mockItems: ReceivingData[] = [
        { 
          id: 'R001', 
          date: '2024-01-20', 
          orderNumber: 'ORD-2024-001', 
          designation: 'PR-001', 
          name: 'Принтер Canon PIXMA MG3640', 
          quantity: 10, 
          comment: 'Проверить комплектацию', 
          status: 'Принят',
          supplier: 'Canon Russia',
          category: 'Принтеры',
          unitPrice: 8500
        },
        { 
          id: 'R002', 
          date: '2024-01-18', 
          orderNumber: 'ORD-2024-002', 
          designation: 'CR-001', 
          name: 'Картридж HP 85A CE285A', 
          quantity: 50, 
          comment: 'Срок годности до 2025', 
          status: 'Проведен в НП',
          supplier: 'HP Inc.',
          category: 'Картриджи',
          unitPrice: 3200
        },
        { 
          id: 'R003', 
          date: '2024-01-19', 
          orderNumber: 'ORD-2024-003', 
          designation: 'KB-001', 
          name: 'Клавиатура механическая Logitech G413', 
          quantity: 25, 
          comment: 'Упаковка повреждена', 
          status: 'Проблема',
          supplier: 'Logitech',
          category: 'Периферия',
          unitPrice: 7800
        },
        { 
          id: 'R004', 
          date: '2024-01-21', 
          orderNumber: 'ORD-2024-004', 
          designation: 'MN-001', 
          name: 'Монитор Samsung 24" Full HD', 
          quantity: 15, 
          comment: 'Все в порядке', 
          status: 'Принят',
          supplier: 'Samsung Electronics',
          category: 'Мониторы',
          unitPrice: 12500
        },
        { 
          id: 'R005', 
          date: '2024-01-22', 
          orderNumber: 'ORD-2024-005', 
          designation: 'MS-001', 
          name: 'Мышь беспроводная Logitech M705', 
          quantity: 100, 
          comment: 'Батареи в комплекте', 
          status: 'Проведен в НП',
          supplier: 'Logitech',
          category: 'Периферия',
          unitPrice: 2800
        }
      ];
      setReceivingItems(mockItems);
    } catch (error) {
      console.error('Ошибка загрузки приемки:', error);
    }
  };

  const filteredAndSortedItems = useMemo(() => {
    let filtered = receivingItems.filter(item => 
      (item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
       item.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
       item.designation.toLowerCase().includes(searchTerm.toLowerCase()) ||
       item.supplier?.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (filterStatus === 'Все' || item.status === filterStatus)
    );

    // Сортировка
    filtered.sort((a, b) => {
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];
      
      if (aVal === undefined) return 1;
      if (bVal === undefined) return -1;
      
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc' 
          ? aVal.localeCompare(bVal, 'ru') 
          : bVal.localeCompare(aVal, 'ru');
      }
      
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }
      
      return 0;
    });

    return filtered;
  }, [receivingItems, searchTerm, filterStatus, sortColumn, sortDirection]);

  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSortedItems.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSortedItems, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredAndSortedItems.length / itemsPerPage);

  const handleSort = (column: keyof ReceivingData) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const updateStatus = (itemId: string, newStatus: 'Принят' | 'Проблема' | 'Проведен в НП') => {
    setReceivingItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, status: newStatus } : item
    ));
  };

  const handleSelectItem = (itemId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedItems.size === paginatedItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(paginatedItems.map(item => item.id)));
    }
  };

  const statusOptions = ['Все', ...Array.from(new Set(receivingItems.map(item => item.status)))];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Проведен в НП': return { bg: '#e8f5e8', color: '#2d5016', border: '#4caf50' };
      case 'Принят': return { bg: '#e3f2fd', color: '#0d47a1', border: '#2196f3' };
      case 'Проблема': return { bg: '#ffebee', color: '#b71c1c', border: '#f44336' };
      default: return { bg: '#f5f5f5', color: '#333', border: '#ccc' };
    }
  };

  const formatPrice = (price?: number) => {
    return price ? new Intl.NumberFormat('ru-RU', { 
      style: 'currency', 
      currency: 'RUB',
      minimumFractionDigits: 0
    }).format(price) : '-';
  };

  return (
    <div style={{ 
      padding: '1.5rem', 
      fontFamily: 'var(--sapFontFamily)',
      backgroundColor: 'var(--sapBackgroundColor)',
      minHeight: '100vh'
    }}>
      {/* Заголовок */}
      <div style={{ 
        marginBottom: '2rem',
        padding: '1.5rem',
        background: 'linear-gradient(135deg, #2196f3 0%, #1976d2 100%)',
        borderRadius: '12px',
        color: 'white',
        boxShadow: '0 4px 20px rgba(33, 150, 243, 0.3)'
      }}>
        <h1 style={{
          fontSize: '2rem',
          margin: '0 0 0.5rem 0',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <span style={{ fontSize: '2.5rem' }}>📥</span>
          Приемка товаров
        </h1>
        <p style={{
          fontSize: '1.1rem',
          margin: '0',
          opacity: '0.9'
        }}>
          Расширенное управление поступающими товарами и заказами
        </p>
      </div>

      {/* Панель управления */}
      <div style={{
        display: 'flex',
        gap: '1rem',
        marginBottom: '1.5rem',
        flexWrap: 'wrap',
        alignItems: 'center',
        padding: '1.5rem',
        background: 'white',
        borderRadius: '12px',
        border: '1px solid #e0e0e0',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        {/* Поиск */}
        <div style={{ flex: '1', minWidth: '300px' }}>
          <input
            type="text"
            placeholder="🔍 Поиск по названию, заказу, обозначению, поставщику..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '0.875rem 1rem',
              border: '2px solid #e0e0e0',
              borderRadius: '8px',
              fontSize: '1rem',
              fontFamily: 'var(--sapFontFamily)',
              transition: 'border-color 0.2s ease',
              outline: 'none'
            }}
            onFocus={(e) => e.target.style.borderColor = '#2196f3'}
            onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
          />
        </div>
        
        {/* Фильтр по статусу */}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{
            padding: '0.875rem 1rem',
            border: '2px solid #e0e0e0',
            borderRadius: '8px',
            fontSize: '1rem',
            fontFamily: 'var(--sapFontFamily)',
            backgroundColor: 'white',
            minWidth: '150px'
          }}
        >
          {statusOptions.map(status => 
            <option key={status} value={status}>{status}</option>
          )}
        </select>

        {/* Количество на странице */}
        <select
          value={itemsPerPage}
          onChange={(e) => {
            setItemsPerPage(Number(e.target.value));
            setCurrentPage(1);
          }}
          style={{
            padding: '0.875rem 1rem',
            border: '2px solid #e0e0e0',
            borderRadius: '8px',
            fontSize: '1rem',
            fontFamily: 'var(--sapFontFamily)',
            backgroundColor: 'white'
          }}
        >
          <option value={10}>10 на стр.</option>
          <option value={20}>20 на стр.</option>
          <option value={50}>50 на стр.</option>
          <option value={100}>100 на стр.</option>
        </select>
        
        {/* Кнопки действий */}
        <button
          style={{
            padding: '0.875rem 1.5rem',
            background: '#4caf50',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '1rem',
            fontFamily: 'var(--sapFontFamily)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            boxShadow: '0 2px 4px rgba(76, 175, 80, 0.3)'
          }}
          onClick={() => console.log('Создать новый заказ')}
          onMouseEnter={(e) => e.currentTarget.style.background = '#45a049'}
          onMouseLeave={(e) => e.currentTarget.style.background = '#4caf50'}
        >
          <span>📝</span>
          Новый заказ
        </button>

        {selectedItems.size > 0 && (
          <button
            style={{
              padding: '0.875rem 1.5rem',
              background: '#ff9800',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontFamily: 'var(--sapFontFamily)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              boxShadow: '0 2px 4px rgba(255, 152, 0, 0.3)'
            }}
            onClick={() => console.log('Групповые действия', selectedItems)}
          >
            <span>⚡</span>
            Групповые действия ({selectedItems.size})
          </button>
        )}
      </div>

      {/* Большая таблица */}
      <div style={{
        background: 'white',
        borderRadius: '12px',
        border: '1px solid #e0e0e0',
        overflow: 'hidden',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontFamily: 'var(--sapFontFamily)',
            minWidth: '1200px'
          }}>
            {/* Заголовок таблицы */}
            <thead>
              <tr style={{
                backgroundColor: '#f8f9fa',
                borderBottom: '2px solid #e0e0e0'
              }}>
                <th style={{
                  padding: '1rem',
                  textAlign: 'left',
                  fontWeight: '600',
                  fontSize: '0.9rem',
                  color: '#333',
                  width: '50px'
                }}>
                  <input
                    type="checkbox"
                    checked={selectedItems.size === paginatedItems.length && paginatedItems.length > 0}
                    onChange={handleSelectAll}
                    style={{ transform: 'scale(1.2)' }}
                  />
                </th>
                {columns.map(column => (
                  <th
                    key={column.key}
                    style={{
                      padding: '1rem',
                      textAlign: 'left',
                      fontWeight: '600',
                      fontSize: '0.9rem',
                      color: '#333',
                      cursor: column.sortable ? 'pointer' : 'default',
                      width: column.width,
                      borderRight: '1px solid #f0f0f0',
                      userSelect: 'none',
                      transition: 'background-color 0.2s ease'
                    }}
                    onClick={() => column.sortable && handleSort(column.key)}
                    onMouseEnter={(e) => {
                      if (column.sortable) {
                        e.currentTarget.style.backgroundColor = '#f0f0f0';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {column.label}
                      {column.sortable && (
                        <span style={{ 
                          opacity: sortColumn === column.key ? 1 : 0.3,
                          fontSize: '0.8rem'
                        }}>
                          {sortColumn === column.key 
                            ? (sortDirection === 'asc' ? '↑' : '↓')
                            : '↕'
                          }
                        </span>
                      )}
                    </div>
                  </th>
                ))}
                <th style={{
                  padding: '1rem',
                  textAlign: 'center',
                  fontWeight: '600',
                  fontSize: '0.9rem',
                  color: '#333',
                  width: '160px'
                }}>
                  Действия
                </th>
              </tr>
            </thead>
            
            {/* Тело таблицы */}
            <tbody>
              {paginatedItems.map((item, index) => (
                <tr
                  key={item.id}
                  style={{
                    borderBottom: '1px solid #f0f0f0',
                    backgroundColor: selectedItems.has(item.id) 
                      ? '#e3f2fd' 
                      : index % 2 === 0 ? 'white' : '#fafafa',
                    transition: 'background-color 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (!selectedItems.has(item.id)) {
                      e.currentTarget.style.backgroundColor = '#f5f5f5';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!selectedItems.has(item.id)) {
                      e.currentTarget.style.backgroundColor = index % 2 === 0 ? 'white' : '#fafafa';
                    }
                  }}
                >
                  <td style={{ padding: '1rem', borderRight: '1px solid #f0f0f0' }}>
                    <input
                      type="checkbox"
                      checked={selectedItems.has(item.id)}
                      onChange={() => handleSelectItem(item.id)}
                      style={{ transform: 'scale(1.2)' }}
                    />
                  </td>
                  
                  <td style={{ 
                    padding: '1rem', 
                    fontSize: '0.9rem', 
                    fontFamily: 'monospace',
                    borderRight: '1px solid #f0f0f0',
                    fontWeight: '500'
                  }}>
                    {new Date(item.date).toLocaleDateString('ru-RU')}
                  </td>
                  
                  <td style={{ 
                    padding: '1rem', 
                    fontSize: '0.9rem', 
                    fontWeight: '600',
                    color: '#1976d2',
                    borderRight: '1px solid #f0f0f0'
                  }}>
                    {item.orderNumber}
                  </td>
                  
                  <td style={{ 
                    padding: '1rem', 
                    fontSize: '0.9rem', 
                    fontFamily: 'monospace',
                    backgroundColor: '#f8f9fa',
                    borderRight: '1px solid #f0f0f0',
                    fontWeight: '500'
                  }}>
                    {item.designation}
                  </td>
                  
                  <td style={{ 
                    padding: '1rem', 
                    fontSize: '0.9rem', 
                    fontWeight: '500',
                    borderRight: '1px solid #f0f0f0'
                  }}>
                    {item.name}
                  </td>

                  <td style={{ 
                    padding: '1rem', 
                    fontSize: '0.9rem',
                    borderRight: '1px solid #f0f0f0'
                  }}>
                    {item.supplier || '-'}
                  </td>

                  <td style={{ 
                    padding: '1rem', 
                    fontSize: '0.9rem',
                    borderRight: '1px solid #f0f0f0'
                  }}>
                    <span style={{
                      padding: '0.25rem 0.5rem',
                      backgroundColor: '#e8f5e8',
                      borderRadius: '4px',
                      fontSize: '0.8rem',
                      fontWeight: '500'
                    }}>
                      {item.category || '-'}
                    </span>
                  </td>
                  
                  <td style={{ 
                    padding: '1rem', 
                    fontSize: '0.9rem', 
                    fontWeight: 'bold',
                    textAlign: 'center',
                    backgroundColor: '#e3f2fd',
                    borderRight: '1px solid #f0f0f0'
                  }}>
                    {item.quantity.toLocaleString('ru-RU')}
                  </td>

                  <td style={{ 
                    padding: '1rem', 
                    fontSize: '0.9rem', 
                    fontWeight: '600',
                    color: '#2e7d32',
                    borderRight: '1px solid #f0f0f0'
                  }}>
                    {formatPrice(item.unitPrice)}
                  </td>
                  
                  <td style={{ 
                    padding: '1rem', 
                    fontSize: '0.8rem', 
                    color: '#666',
                    maxWidth: '200px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    borderRight: '1px solid #f0f0f0'
                  }}>
                    <span title={item.comment}>
                      {item.comment || '-'}
                    </span>
                  </td>
                  
                  <td style={{ 
                    padding: '1rem',
                    borderRight: '1px solid #f0f0f0'
                  }}>
                    <span style={{
                      padding: '0.5rem 0.75rem',
                      borderRadius: '20px',
                      fontSize: '0.8rem',
                      fontWeight: '600',
                      border: `1px solid ${getStatusColor(item.status).border}`,
                      backgroundColor: getStatusColor(item.status).bg,
                      color: getStatusColor(item.status).color
                    }}>
                      {item.status}
                    </span>
                  </td>
                  
                  <td style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {item.status === 'Принят' && (
                        <>
                          <button
                            style={{
                              padding: '0.5rem 0.75rem',
                              background: '#4caf50',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              fontSize: '0.8rem',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease'
                            }}
                            onClick={() => updateStatus(item.id, 'Проведен в НП')}
                            title="Провести в номенклатуру"
                          >
                            ✅
                          </button>
                          <button
                            style={{
                              padding: '0.5rem 0.75rem',
                              background: '#f44336',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              fontSize: '0.8rem',
                              cursor: 'pointer',
                              transition: 'all 0.2s ease'
                            }}
                            onClick={() => updateStatus(item.id, 'Проблема')}
                            title="Отметить проблему"
                          >
                            ❌
                          </button>
                        </>
                      )}
                      {item.status === 'Проблема' && (
                        <button
                          style={{
                            padding: '0.5rem 0.75rem',
                            background: '#4caf50',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                          onClick={() => updateStatus(item.id, 'Проведен в НП')}
                          title="Исправить и провести"
                        >
                          🔄
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Пагинация */}
        {totalPages > 1 && (
          <div style={{
            padding: '1rem 1.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTop: '1px solid #e0e0e0',
            backgroundColor: '#f8f9fa'
          }}>
            <div style={{ fontSize: '0.9rem', color: '#666' }}>
              Показано {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, filteredAndSortedItems.length)} из {filteredAndSortedItems.length} записей
            </div>
            
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button
                style={{
                  padding: '0.5rem 1rem',
                  background: currentPage === 1 ? '#e0e0e0' : '#2196f3',
                  color: currentPage === 1 ? '#999' : 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                }}
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                ← Предыдущая
              </button>
              
              <span style={{ margin: '0 1rem', fontSize: '0.9rem' }}>
                Страница {currentPage} из {totalPages}
              </span>
              
              <button
                style={{
                  padding: '0.5rem 1rem',
                  background: currentPage === totalPages ? '#e0e0e0' : '#2196f3',
                  color: currentPage === totalPages ? '#999' : 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
                }}
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Следующая →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Статистика */}
      <div style={{
        marginTop: '2rem',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '1rem'
      }}>
        {[
          { status: 'Принят', color: '#2196f3', icon: '📋' },
          { status: 'Проблема', color: '#f44336', icon: '⚠️' },
          { status: 'Проведен в НП', color: '#4caf50', icon: '✅' }
        ].map(({ status, color, icon }) => (
          <div
            key={status}
            style={{
              padding: '1.5rem',
              background: 'white',
              borderRadius: '12px',
              border: `2px solid ${color}20`,
              textAlign: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}
          >
            <div style={{ 
              fontSize: '2.5rem', 
              fontWeight: 'bold', 
              color: color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              marginBottom: '0.5rem'
            }}>
              <span>{icon}</span>
              {receivingItems.filter(i => i.status === status).length}
            </div>
            <div style={{ 
              fontSize: '1rem', 
              color: '#666', 
              fontWeight: '500'
            }}>
              {status}
            </div>
            <div style={{ 
              fontSize: '0.8rem', 
              color: '#999',
              marginTop: '0.5rem'
            }}>
              {receivingItems.length > 0 
                ? `${Math.round((receivingItems.filter(i => i.status === status).length / receivingItems.length) * 100)}% от общего`
                : '0%'
              }
            </div>
          </div>
        ))}
        
        {/* Общая сумма */}
        <div style={{
          padding: '1.5rem',
          background: 'linear-gradient(135deg, #ff9800, #f57c00)',
          borderRadius: '12px',
          textAlign: 'center',
          color: 'white',
          boxShadow: '0 4px 12px rgba(255, 152, 0, 0.3)'
        }}>
          <div style={{ 
            fontSize: '2rem', 
            fontWeight: 'bold',
            marginBottom: '0.5rem'
          }}>
            💰 {formatPrice(receivingItems.reduce((sum, item) => 
              sum + (item.unitPrice || 0) * item.quantity, 0
            ))}
          </div>
          <div style={{ fontSize: '1rem', fontWeight: '500' }}>
            Общая стоимость
          </div>
          <div style={{ 
            fontSize: '0.8rem',
            opacity: '0.9',
            marginTop: '0.5rem'
          }}>
            {receivingItems.reduce((sum, item) => sum + item.quantity, 0).toLocaleString('ru-RU')} единиц товара
          </div>
        </div>
      </div>
    </div>
  );
};

export default Receiving; 