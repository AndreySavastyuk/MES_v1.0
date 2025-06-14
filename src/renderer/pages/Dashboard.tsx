import React, { useEffect, useState } from 'react';

interface DashboardStats {
  totalProducts: number;
  totalLocations: number;
  lowStockItems: number;
  recentMovements: number;
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    totalLocations: 0,
    lowStockItems: 0,
    recentMovements: 0
  });

  useEffect(() => {
    // Загрузка статистики при монтировании компонента
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    try {
      // Здесь будет обращение к API
      const mockStats: DashboardStats = {
        totalProducts: 150,
        totalLocations: 25,
        lowStockItems: 8,
        recentMovements: 42
      };
      setStats(mockStats);
    } catch (error) {
      console.error('Ошибка загрузки статистики:', error);
    }
  };

  return React.createElement('div', 
    { style: { padding: '0', fontFamily: 'var(--sapFontFamily)' } },
    
    // Заголовок
    React.createElement('div', 
      { style: { marginBottom: '2rem' } },
      React.createElement('h1', {
        style: {
          fontSize: 'var(--sapFontHeader1Size)',
          margin: '0 0 0.5rem 0',
          color: 'var(--sapTextColor)',
          fontFamily: 'var(--sapFontFamily)',
          fontWeight: 'bold'
        }
      }, '📊 Панель управления складом'),
      
      React.createElement('p', {
        style: {
          fontSize: 'var(--sapFontSize)',
          color: 'var(--sapNeutralColor)',
          margin: '0',
          fontFamily: 'var(--sapFontFamily)'
        }
      }, 'Общая информация и статистика складских операций')
    ),

    // Карточки статистики
    React.createElement('div', {
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '1.5rem',
        marginBottom: '2rem'
      }
    },
      // Карточка товаров
      React.createElement('div', {
        style: {
          background: 'var(--sapGroupContentBackground)',
          padding: '1.5rem',
          borderRadius: 'var(--sapElement_BorderCornerRadius)',
          boxShadow: 'var(--sapContent_Shadow1)',
          border: '2px solid var(--warehouse-primary)',
          className: 'fade-in'
        }
      },
        React.createElement('div', {
          style: {
            display: 'flex',
            alignItems: 'center',
            gap: '1rem'
          }
        },
          React.createElement('div', {
            style: {
              fontSize: '2.5rem',
              width: '4rem',
              height: '4rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
              backgroundColor: 'var(--warehouse-primary)15',
              color: 'var(--warehouse-primary)'
            }
          }, '📦'),
          React.createElement('div', {},
            React.createElement('div', {
              style: {
                fontSize: '2rem',
                fontWeight: 'bold',
                color: 'var(--warehouse-primary)',
                fontFamily: 'var(--sapFontFamily)'
              }
            }, stats.totalProducts.toString()),
            React.createElement('div', {
              style: {
                fontSize: 'var(--sapFontSize)',
                color: 'var(--sapTextColor)',
                fontFamily: 'var(--sapFontFamily)'
              }
            }, 'Всего товаров')
          )
        )
      ),
      
      // Остальные карточки аналогично...
      React.createElement('div', {
        style: {
          background: 'var(--sapGroupContentBackground)',
          padding: '1.5rem',
          borderRadius: 'var(--sapElement_BorderCornerRadius)',
          boxShadow: 'var(--sapContent_Shadow1)',
          border: '2px solid var(--warehouse-success)'
        }
      },
        React.createElement('div', {
          style: {
            display: 'flex',
            alignItems: 'center',
            gap: '1rem'
          }
        },
          React.createElement('div', {
            style: {
              fontSize: '2.5rem',
              width: '4rem',
              height: '4rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
              backgroundColor: 'var(--warehouse-success)15',
              color: 'var(--warehouse-success)'
            }
          }, '📍'),
          React.createElement('div', {},
            React.createElement('div', {
              style: {
                fontSize: '2rem',
                fontWeight: 'bold',
                color: 'var(--warehouse-success)',
                fontFamily: 'var(--sapFontFamily)'
              }
            }, stats.totalLocations.toString()),
            React.createElement('div', {
              style: {
                fontSize: 'var(--sapFontSize)',
                color: 'var(--sapTextColor)',
                fontFamily: 'var(--sapFontFamily)'
              }
            }, 'Локаций на складе')
          )
        )
      )
    ),

    // Быстрые действия
    React.createElement('div', 
      { style: { marginBottom: '2rem' } },
      React.createElement('h2', {
        style: {
          fontSize: 'var(--sapFontHeader3Size)',
          margin: '0 0 1rem 0',
          color: 'var(--sapTextColor)',
          fontFamily: 'var(--sapFontFamily)',
          fontWeight: 'bold'
        }
      }, '⚡ Быстрые действия'),
      
      React.createElement('div', {
        style: {
          display: 'flex',
          gap: '1rem',
          flexWrap: 'wrap'
        }
      },
        React.createElement('button', {
          style: {
            padding: '0.75rem 1.5rem',
            background: 'var(--warehouse-primary)',
            color: 'white',
            border: 'none',
            borderRadius: 'var(--sapButton_BorderCornerRadius)',
            cursor: 'pointer',
            fontSize: 'var(--sapFontSize)',
            fontFamily: 'var(--sapFontFamily)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            transition: 'all 0.2s ease'
          },
          onClick: () => console.log('Добавить товар')
        }, '➕ Добавить товар'),
        
        React.createElement('button', {
          style: {
            padding: '0.75rem 1.5rem',
            background: 'var(--warehouse-success)',
            color: 'white',
            border: 'none',
            borderRadius: 'var(--sapButton_BorderCornerRadius)',
            cursor: 'pointer',
            fontSize: 'var(--sapFontSize)',
            fontFamily: 'var(--sapFontFamily)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          },
          onClick: () => console.log('Создать отчет')
        }, '📊 Создать отчет')
      )
    ),

    // Недавняя активность
    React.createElement('div', {},
      React.createElement('h2', {
        style: {
          fontSize: 'var(--sapFontHeader3Size)',
          margin: '0 0 1rem 0',
          color: 'var(--sapTextColor)',
          fontFamily: 'var(--sapFontFamily)',
          fontWeight: 'bold'
        }
      }, '📋 Недавняя активность'),
      
      React.createElement('div', {
        style: {
          background: 'var(--sapGroupContentBackground)',
          borderRadius: 'var(--sapElement_BorderCornerRadius)',
          boxShadow: 'var(--sapContent_Shadow1)',
          overflow: 'hidden'
        }
      },
        [1, 2, 3].map((item) => 
          React.createElement('div', {
            key: item,
            style: {
              padding: '1rem 1.5rem',
              borderBottom: item < 3 ? '1px solid var(--sapNeutralBorderColor)' : 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem'
            }
          },
            React.createElement('div', {
              style: {
                width: '2.5rem',
                height: '2.5rem',
                borderRadius: '50%',
                background: 'var(--warehouse-primary)15',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.25rem'
              }
            }, '📦'),
            React.createElement('div', { style: { flex: 1 } },
              React.createElement('div', {
                style: {
                  fontWeight: 'bold',
                  marginBottom: '0.25rem',
                  fontFamily: 'var(--sapFontFamily)',
                  color: 'var(--sapTextColor)'
                }
              }, `Товар "Пример ${item}" добавлен на склад`),
              React.createElement('div', {
                style: {
                  fontSize: 'var(--sapFontSmallSize)',
                  color: 'var(--sapNeutralColor)',
                  fontFamily: 'var(--sapFontFamily)'
                }
              }, new Date().toLocaleString('ru-RU'))
            ),
            React.createElement('div', {
              style: {
                padding: '0.25rem 0.75rem',
                background: 'var(--warehouse-success)25',
                color: 'var(--warehouse-success)',
                borderRadius: '1rem',
                fontSize: 'var(--sapFontSmallSize)',
                fontWeight: 'bold',
                fontFamily: 'var(--sapFontFamily)'
              }
            }, '✅ Выполнено')
          )
        )
      )
    )
  );
};

export default Dashboard; 

