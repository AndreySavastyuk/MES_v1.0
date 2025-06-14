import React, { useState, useEffect } from 'react';

interface ArchiveData {
  id: string;
  name: string;
  category: string;
  quantity: number;
  location: string;
  reason: 'Списано' | 'Продано' | 'Возврат' | 'Перемещено';
  date: string;
  operator: string;
  notes?: string;
}

const Archive: React.FC = () => {
  const [archiveItems, setArchiveItems] = useState<ArchiveData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterReason, setFilterReason] = useState('Все');

  useEffect(() => {
    loadArchiveItems();
  }, []);

  const loadArchiveItems = async () => {
    try {
      const mockItems: ArchiveData[] = [
        { id: 'A001', name: 'Принтер HP LaserJet 1020', category: 'Оргтехника', quantity: 1, location: 'Склад A-1', reason: 'Списано', date: '2024-01-10', operator: 'Иванов И.И.', notes: 'Неисправность печатающей головки' },
        { id: 'A002', name: 'Клавиатура Microsoft', category: 'Периферия', quantity: 3, location: 'Склад B-2', reason: 'Продано', date: '2024-01-12', operator: 'Петров П.П.' }
      ];
      setArchiveItems(mockItems);
    } catch (error) {
      console.error('Ошибка загрузки архива:', error);
    }
  };

  const filteredItems = archiveItems.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
    (filterReason === 'Все' || item.reason === filterReason)
  );

  const reasons = ['Все', ...Array.from(new Set(archiveItems.map(item => item.reason)))];

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
        React.createElement('span', { style: { fontSize: '2rem' } }, '🗂️'),
        'Архив операций'
      ),
      
      React.createElement('p', {
        style: {
          fontSize: 'var(--sapFontSize)',
          color: 'var(--sapNeutralColor)',
          margin: '0',
          fontFamily: 'var(--sapFontFamily)'
        }
      }, 'История всех выполненных операций и движений товаров')
    )
  );
};

export default Archive; 