import React, { useState, useEffect } from 'react';
import { ReadingRecord, Book, ReadingStatus } from './types';
import BookSearch from './components/BookSearch';
import BookList from './components/BookList';
import Statistics from './components/Statistics';
import './App.css';

function App() {
  const [readingRecords, setReadingRecords] = useState<ReadingRecord[]>([]);
  const [currentView, setCurrentView] = useState<'search' | 'list' | 'stats'>('search');

  useEffect(() => {
    const stored = localStorage.getItem('readingRecords');
    if (stored) {
      setReadingRecords(JSON.parse(stored));
    }
  }, []);

  const saveRecords = (records: ReadingRecord[]) => {
    setReadingRecords(records);
    localStorage.setItem('readingRecords', JSON.stringify(records));
  };

  const handleAddRecord = (newRecord: ReadingRecord) => {
    const newRecords = [...readingRecords, newRecord];
    saveRecords(newRecords);
  };

  const handleUpdateRecord = (id: string, updates: Partial<ReadingRecord>) => {
    const updatedRecords = readingRecords.map(record =>
      record.id === id ? { ...record, ...updates } : record
    );
    saveRecords(updatedRecords);
  };

  const handleDeleteRecord = (id: string) => {
    const updatedRecords = readingRecords.filter(record => record.id !== id);
    saveRecords(updatedRecords);
  };

  const renderSearch = () => (
    <BookSearch 
      onAddRecord={handleAddRecord}
      existingRecords={readingRecords}
    />
  );

  const renderList = () => (
    <BookList 
      records={readingRecords}
      onUpdateRecord={handleUpdateRecord}
      onDeleteRecord={handleDeleteRecord}
    />
  );

  const renderStats = () => (
    <Statistics records={readingRecords} />
  );

  return (
    <div className="App">
      <nav className="navbar">
        <h1>読書管理アプリ</h1>
        <div className="nav-links">
          <button 
            className={currentView === 'search' ? 'active' : ''}
            onClick={() => setCurrentView('search')}
          >
            書籍検索
          </button>
          <button 
            className={currentView === 'list' ? 'active' : ''}
            onClick={() => setCurrentView('list')}
          >
            管理書籍
          </button>
          <button 
            className={currentView === 'stats' ? 'active' : ''}
            onClick={() => setCurrentView('stats')}
          >
            統計
          </button>
        </div>
      </nav>

      <main className="main-content">
        {currentView === 'search' && renderSearch()}
        {currentView === 'list' && renderList()}
        {currentView === 'stats' && renderStats()}
      </main>
    </div>
  );
}

export default App;