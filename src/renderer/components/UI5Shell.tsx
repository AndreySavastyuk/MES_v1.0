import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

// Используем React.createElement для избежания проблем с типами
const UI5Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Быстрые клавиши для переходов между разделами
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey) {
        switch (e.key) {
          case '1':
            e.preventDefault();
            navigate('/all-items');
            break;
          case '2':
            e.preventDefault();
            navigate('/receiving');
            break;
          case '3':
            e.preventDefault();
            navigate('/archive');
            break;
          case '4':
            e.preventDefault();
            navigate('/');
            break;
          case '5':
            e.preventDefault();
            navigate('/locations');
            break;
          case '6':
            e.preventDefault();
            navigate('/reports');
            break;
          case '7':
            e.preventDefault();
            navigate('/settings');
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [navigate]);
  return React.createElement('div', 
    { className: 'warehouse-app' },
    
    // ShellBar
    React.createElement('div', {
      style: {
        height: '44px',
        backgroundColor: 'var(--warehouse-secondary)',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        padding: '0 1rem',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }
    },
      React.createElement('h2', {
        style: { 
          margin: 0, 
          fontSize: '1.25rem',
          fontFamily: 'var(--sapFontFamily)'
        }
      }, '📦 Управление складом'),
      
      React.createElement('div', {
        style: { marginLeft: 'auto', display: 'flex', gap: '1rem' }
      },
        React.createElement('span', {
          style: { fontSize: '0.875rem', opacity: 0.8 }
        }, 'Warehouse Management System'),
        
        React.createElement('button', {
          style: {
            backgroundColor: 'transparent',
            border: '1px solid rgba(255,255,255,0.3)',
            color: 'white',
            padding: '0.5rem 1rem',
            borderRadius: '0.25rem',
            cursor: 'pointer',
            fontSize: '0.875rem',
            fontFamily: 'var(--sapFontFamily)'
          },
          onClick: () => console.log('Profile clicked')
        }, '👤 Администратор')
      )
    ),
    
    // Основной контент
    React.createElement('div', {
      style: { 
        display: 'flex', 
        height: 'calc(100vh - 76px)' // 44px ShellBar + 32px StatusBar
      }
    },
      // Боковая навигация с улучшенной оконтовкой
      React.createElement('div', {
        style: {
          width: '250px',
          backgroundColor: 'white',
          borderRight: '2px solid var(--sapNeutralBorderColor)',
          padding: '1rem 0',
          boxShadow: '2px 0 8px rgba(0,0,0,0.1)'
        }
      },
        React.createElement('nav', {},
          React.createElement('ul', {
            style: {
              listStyle: 'none',
              margin: 0,
              padding: 0
            }
          },
            [
              { name: '📦 Все позиции', path: '/all-items', icon: '📦', hotkey: 'Ctrl+1' },
              { name: '📥 Приемка', path: '/receiving', icon: '📥', hotkey: 'Ctrl+2' },
              { name: '🗂️ Архив', path: '/archive', icon: '🗂️', hotkey: 'Ctrl+3' },
              { name: '📊 Панель управления', path: '/', icon: '📊', hotkey: 'Ctrl+4' },
              { name: '📍 Локации', path: '/locations', icon: '📍', hotkey: 'Ctrl+5' },
              { name: '📈 Отчеты', path: '/reports', icon: '📈', hotkey: 'Ctrl+6' },
              { name: '⚙️ Настройки', path: '/settings', icon: '⚙️', hotkey: 'Ctrl+7' }
            ].map((item, index) => 
              React.createElement('li', { key: index },
                React.createElement('button', {
                  type: 'button',
                  style: {
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem 1rem',
                    color: location.pathname === item.path ? 'var(--warehouse-primary)' : 'var(--sapTextColor)',
                    background: 'none',
                    fontFamily: 'var(--sapFontFamily)',
                    fontSize: 'var(--sapFontSize)',
                    borderRadius: '0.5rem',
                    margin: '0 0.5rem 0.25rem 0.5rem',
                    transition: 'all 0.2s ease',
                    cursor: 'pointer',
                    backgroundColor: location.pathname === item.path ? 'var(--warehouse-primary)15' : 'transparent',
                    fontWeight: location.pathname === item.path ? 'bold' : 'normal',
                    border: location.pathname === item.path ? '1px solid var(--warehouse-primary)40' : '1px solid transparent',
                    boxShadow: location.pathname === item.path ? 'inset 0 2px 4px rgba(0,0,0,0.1)' : 'none'
                  },
                  onMouseEnter: (e) => {
                    e.currentTarget.style.backgroundColor = 'var(--warehouse-primary)20';
                    e.currentTarget.style.transform = 'translateX(4px)';
                    e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
                    e.currentTarget.style.border = '1px solid var(--warehouse-primary)60';
                  },
                  onMouseLeave: (e) => {
                    const isActive = location.pathname === item.path;
                    e.currentTarget.style.backgroundColor = isActive ? 'var(--warehouse-primary)15' : 'transparent';
                    e.currentTarget.style.transform = 'translateX(0)';
                    e.currentTarget.style.boxShadow = isActive ? 'inset 0 2px 4px rgba(0,0,0,0.1)' : 'none';
                    e.currentTarget.style.border = isActive ? '1px solid var(--warehouse-primary)40' : '1px solid transparent';
                  },
                  onClick: (e) => {
                    e.preventDefault();
                    // Мгновенный переход без задержек
                    navigate(item.path, { replace: false });
                    // Убрал уведомления о переходе между разделами для более быстрой навигации
                  }
                }, 
                  React.createElement('span', {
                    style: { fontSize: '1.2rem' }
                  }, item.icon),
                  React.createElement('div', {
                    style: { flex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }
                  },
                    React.createElement('span', {}, item.name.replace(/^[📦📥🗂️📊📍📈⚙️]\s/, '')),
                    item.hotkey && React.createElement('span', {
                      style: {
                        fontSize: 'var(--sapFontSmallSize)',
                        color: 'var(--sapNeutralColor)',
                        backgroundColor: 'var(--sapNeutralBackground)',
                        padding: '0.125rem 0.375rem',
                        borderRadius: '0.25rem',
                        fontFamily: 'monospace'
                      }
                    }, item.hotkey)
                  )
                )
              )
            )
          )
        )
      ),
      
      // Контент с улучшенной оконтовкой
      React.createElement('div', {
        style: {
          flex: 1,
          overflow: 'auto',
          padding: '1.5rem',
          backgroundColor: 'var(--sapBackgroundColor)',
          border: '1px solid var(--sapNeutralBorderColor)20',
          borderLeft: 'none',
          borderRadius: '0 0.5rem 0 0'
        }
      }, children)
    ),
    
    // Статус бар
    React.createElement('div', {
      style: {
        height: '32px',
        backgroundColor: 'var(--sapNeutralBackground)',
        borderTop: '1px solid var(--sapNeutralBorderColor)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 1rem',
        fontSize: 'var(--sapFontSmallSize)',
        color: 'var(--sapNeutralColor)',
        fontFamily: 'var(--sapFontFamily)'
      }
    },
      React.createElement('span', {}, 'Пользователь: Администратор'),
      React.createElement('span', {
        style: { marginLeft: 'auto' }
      }, 'Статус: ', 
        React.createElement('span', {
          className: 'warehouse-success'
        }, '🟢 Подключено')
      )
    )
  );
};

export default UI5Shell; 

