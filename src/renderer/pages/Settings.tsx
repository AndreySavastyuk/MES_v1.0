import React from 'react';

const Settings: React.FC = () => {
  return React.createElement('div', 
    { style: { padding: '0', fontFamily: 'var(--sapFontFamily)' } },
    
    React.createElement('div', 
      { 
        style: { 
          marginBottom: '2rem',
          padding: '1.5rem',
          background: 'linear-gradient(135deg, var(--warehouse-primary)15, var(--warehouse-secondary)10)',
          borderRadius: 'var(--sapElement_BorderCornerRadius)',
          border: '1px solid var(--warehouse-primary)30'
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
        React.createElement('span', { style: { fontSize: '2rem' } }, '⚙️'),
        'Настройки системы'
      ),
      
      React.createElement('p', {
        style: {
          fontSize: 'var(--sapFontSize)',
          color: 'var(--sapNeutralColor)',
          margin: '0',
          fontFamily: 'var(--sapFontFamily)'
        }
      }, 'Конфигурация и настройки приложения')
    )
  );
};

export default Settings; 

