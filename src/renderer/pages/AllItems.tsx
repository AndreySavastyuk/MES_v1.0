import React, { useState, useEffect } from 'react';

interface ItemData {
  id: string;
  name: string;
  category: string;
  quantity: number;
  location: string;
  status: 'В наличии' | 'Мало' | 'Нет в наличии';
  lastUpdate: string;
}

const AllItems: React.FC = () => {
  const [items, setItems] = useState<ItemData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('Все');

  useEffect(() => {
    // Загрузка данных при монтировании компонента
    loadItems();
  }, []);

  const loadItems = async () => {
    try {
      // Здесь будет обращение к API
      const mockItems: ItemData[] = [
        { id: '001', name: 'Принтер HP LaserJet', category: 'Оргтехника', quantity: 15, location: 'Склад A-1', status: 'В наличии', lastUpdate: '2024-01-15' },
        { id: '002', name: 'Бумага A4', category: 'Расходники', quantity: 5, location: 'Склад B-2', status: 'Мало', lastUpdate: '2024-01-14' },
        { id: '003', name: 'Клавиатура механическая', category: 'Периферия', quantity: 25, location: 'Склад A-3', status: 'В наличии', lastUpdate: '2024-01-16' },
        { id: '004', name: 'Монитор 24"', category: 'Мониторы', quantity: 0, location: 'Склад C-1', status: 'Нет в наличии', lastUpdate: '2024-01-10' }
      ];
      setItems(mockItems);
    } catch (error) {
      console.error('Ошибка загрузки товаров:', error);
    }
  };

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (filterCategory === 'Все' || item.category === filterCategory)
  );

  const categories = ['Все', ...Array.from(new Set(items.map(item => item.category)))];

  return React.createElement('div', 
    { style: { padding: '0', fontFamily: 'var(--sapFontFamily)' } },
    
    // Заголовок раздела с улучшенной оконтовкой
    React.createElement('div', 
      { 
        style: { 
          marginBottom: '2rem',
          padding: '1.5rem',
          background: 'linear-gradient(135deg, var(--warehouse-primary)15, var(--warehouse-secondary)10)',
          borderRadius: 'var(--sapElement_BorderCornerRadius)',
          border: '2px solid var(--warehouse-primary)40',
          boxShadow: 'var(--sapContent_Shadow2)'
        } 
      },
      React.createElement('h1', {
        style: {
          fontSize: 'var(--sapFontHeader1Size)',
          margin: '0 0 0.5rem 0',
          color: 'var(--warehouse-primary)',
          fontFamily: 'var(--sapFontFamily)',
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }
      }, 
        React.createElement('span', { style: { fontSize: '2rem' } }, '📦'),
        'Все позиции'
      ),
      
      React.createElement('p', {
        style: {
          fontSize: 'var(--sapFontSize)',
          color: 'var(--sapNeutralColor)',
          margin: '0',
          fontFamily: 'var(--sapFontFamily)'
        }
      }, 'Полный каталог всех товаров и позиций на складе')
    ),

    // Панель поиска и фильтров с оконтовкой
    React.createElement('div', {
      style: {
        display: 'flex',
        gap: '1rem',
        marginBottom: '1.5rem',
        flexWrap: 'wrap',
        alignItems: 'center',
        padding: '1rem',
        background: 'var(--sapGroupContentBackground)',
        borderRadius: 'var(--sapElement_BorderCornerRadius)',
        border: '1px solid var(--sapNeutralBorderColor)',
        boxShadow: 'var(--sapContent_Shadow1)'
      }
    },
      // Поиск
      React.createElement('div', {
        style: { flex: '1', minWidth: '250px' }
      },
        React.createElement('input', {
          type: 'text',
          placeholder: '🔍 Поиск товаров...',
          value: searchTerm,
          onChange: (e) => setSearchTerm(e.target.value),
          style: {
            width: '100%',
            padding: '0.75rem 1rem',
            border: '2px solid var(--warehouse-primary)30',
            borderRadius: 'var(--sapField_BorderCornerRadius)',
            fontSize: 'var(--sapFontSize)',
            fontFamily: 'var(--sapFontFamily)',
            transition: 'border-color 0.2s ease',
            outline: 'none',
            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)'
          }
        })
      ),
      
      // Фильтр по категориям
      React.createElement('select', {
        value: filterCategory,
        onChange: (e) => setFilterCategory(e.target.value),
        style: {
          padding: '0.75rem 1rem',
          border: '2px solid var(--warehouse-primary)30',
          borderRadius: 'var(--sapField_BorderCornerRadius)',
          fontSize: 'var(--sapFontSize)',
          fontFamily: 'var(--sapFontFamily)',
          backgroundColor: 'white',
          minWidth: '150px'
        }
      },
        categories.map(category => 
          React.createElement('option', { key: category, value: category }, category)
        )
      ),
      
              // Кнопка добавления
        React.createElement('button', {
          style: {
            padding: '0.75rem 1.5rem',
            background: 'var(--warehouse-primary)',
            color: 'white',
            border: '2px solid var(--warehouse-primary)',
            borderRadius: 'var(--sapButton_BorderCornerRadius)',
            fontSize: 'var(--sapFontSize)',
            fontFamily: 'var(--sapFontFamily)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            boxShadow: 'var(--sapContent_Shadow1)'
          },
        onClick: () => console.log('Добавить новый товар')
      }, 
        React.createElement('span', {}, '➕'),
        'Добавить товар'
      )
    ),

    // Таблица товаров с улучшенной оконтовкой
    React.createElement('div', {
      style: {
        background: 'var(--sapGroupContentBackground)',
        borderRadius: 'var(--sapElement_BorderCornerRadius)',
        border: '2px solid var(--sapNeutralBorderColor)',
        overflow: 'hidden',
        boxShadow: 'var(--sapContent_Shadow2)'
      }
    },
      React.createElement('table', {
        style: {
          width: '100%',
          borderCollapse: 'collapse',
          fontFamily: 'var(--sapFontFamily)'
        }
      },
        // Заголовок таблицы
        React.createElement('thead', {},
          React.createElement('tr', {
            style: {
              backgroundColor: 'var(--warehouse-primary)10',
              borderBottom: '2px solid var(--warehouse-primary)20'
            }
          },
            ['ID', 'Название', 'Категория', 'Количество', 'Локация', 'Статус', 'Обновлено'].map(header => 
              React.createElement('th', {
                key: header,
                style: {
                  padding: '1rem',
                  textAlign: 'left',
                  fontWeight: 'bold',
                  color: 'var(--warehouse-primary)',
                  fontSize: 'var(--sapFontSize)',
                  fontFamily: 'var(--sapFontFamily)'
                }
              }, header)
            )
          )
        ),
        
        // Тело таблицы
        React.createElement('tbody', {},
          filteredItems.map((item, index) => 
            React.createElement('tr', {
              key: item.id,
              style: {
                borderBottom: '1px solid var(--sapNeutralBorderColor)',
                backgroundColor: index % 2 === 0 ? 'transparent' : 'var(--sapNeutralBackground)50',
                transition: 'background-color 0.2s ease'
              },
              onMouseEnter: (e) => {
                e.currentTarget.style.backgroundColor = 'var(--warehouse-primary)08';
              },
              onMouseLeave: (e) => {
                e.currentTarget.style.backgroundColor = index % 2 === 0 ? 'transparent' : 'var(--sapNeutralBackground)50';
              }
            },
              React.createElement('td', {
                style: { padding: '1rem', fontSize: 'var(--sapFontSize)', fontFamily: 'monospace' }
              }, item.id),
              React.createElement('td', {
                style: { padding: '1rem', fontSize: 'var(--sapFontSize)', fontWeight: '500' }
              }, item.name),
              React.createElement('td', {
                style: { padding: '1rem', fontSize: 'var(--sapFontSize)' }
              }, item.category),
              React.createElement('td', {
                style: { padding: '1rem', fontSize: 'var(--sapFontSize)', fontWeight: 'bold' }
              }, item.quantity.toString()),
              React.createElement('td', {
                style: { padding: '1rem', fontSize: 'var(--sapFontSize)' }
              }, item.location),
              React.createElement('td', {
                style: { padding: '1rem' }
              },
                React.createElement('span', {
                  style: {
                    padding: '0.25rem 0.75rem',
                    borderRadius: '1rem',
                    fontSize: 'var(--sapFontSmallSize)',
                    fontWeight: 'bold',
                    backgroundColor: 
                      item.status === 'В наличии' ? 'var(--warehouse-success)20' :
                      item.status === 'Мало' ? 'var(--warehouse-warning)20' : 'var(--warehouse-error)20',
                    color:
                      item.status === 'В наличии' ? 'var(--warehouse-success)' :
                      item.status === 'Мало' ? 'var(--warehouse-warning)' : 'var(--warehouse-error)'
                  }
                }, item.status)
              ),
              React.createElement('td', {
                style: { padding: '1rem', fontSize: 'var(--sapFontSmallSize)', color: 'var(--sapNeutralColor)' }
              }, new Date(item.lastUpdate).toLocaleDateString('ru-RU'))
            )
          )
        )
      )
    ),

    // Информация о количестве
    React.createElement('div', {
      style: {
        marginTop: '1.5rem',
        padding: '1rem',
        background: 'var(--sapNeutralBackground)',
        borderRadius: 'var(--sapElement_BorderCornerRadius)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: 'var(--sapFontSmallSize)',
        color: 'var(--sapNeutralColor)',
        fontFamily: 'var(--sapFontFamily)'
      }
    },
      React.createElement('span', {}, `Показано ${filteredItems.length} из ${items.length} товаров`),
      React.createElement('span', {}, `Последнее обновление: ${new Date().toLocaleString('ru-RU')}`)
    )
  );
};

export default AllItems; 