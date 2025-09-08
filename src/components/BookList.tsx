import React, { useState, useMemo } from 'react';
import { ReadingRecord, ReadingStatus } from '../types';
import ReadingRecordCard from './ReadingRecordCard';
import './BookList.css';

interface BookListProps {
  records: ReadingRecord[];
  onUpdateRecord: (id: string, updates: Partial<ReadingRecord>) => void;
  onDeleteRecord: (id: string) => void;
}

const BookList: React.FC<BookListProps> = ({ records, onUpdateRecord, onDeleteRecord }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ReadingStatus | 'all'>('all');
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'addedDate' | 'completedDate' | 'title'>('addedDate');

  const statusLabels = {
    all: 'すべて',
    want_to_read: '読みたい',
    reading: '読書中',
    completed: '読了'
  };

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    records.forEach(record => {
      if (record.completedDate) {
        const year = new Date(record.completedDate).getFullYear().toString();
        years.add(year);
      }
    });
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [records]);

  const filteredAndSortedRecords = useMemo(() => {
    let filtered = records;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(record =>
        record.book.title.toLowerCase().includes(query) ||
        record.book.author.toLowerCase().includes(query) ||
        (record.notes && record.notes.toLowerCase().includes(query))
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(record => record.status === statusFilter);
    }

    if (yearFilter !== 'all') {
      filtered = filtered.filter(record => {
        if (!record.completedDate) return false;
        const year = new Date(record.completedDate).getFullYear().toString();
        return year === yearFilter;
      });
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return a.book.title.localeCompare(b.book.title);
        case 'completedDate':
          if (!a.completedDate && !b.completedDate) return 0;
          if (!a.completedDate) return 1;
          if (!b.completedDate) return -1;
          return new Date(b.completedDate).getTime() - new Date(a.completedDate).getTime();
        case 'addedDate':
        default:
          return new Date(b.addedDate).getTime() - new Date(a.addedDate).getTime();
      }
    });

    return filtered;
  }, [records, searchQuery, statusFilter, yearFilter, sortBy]);

  const getStatusCounts = () => {
    return {
      all: records.length,
      want_to_read: records.filter(r => r.status === 'want_to_read').length,
      reading: records.filter(r => r.status === 'reading').length,
      completed: records.filter(r => r.status === 'completed').length
    };
  };

  const statusCounts = getStatusCounts();

  return (
    <div className="book-list">
      <div className="list-header">
        <h2>管理書籍一覧</h2>
        
        <div className="status-summary">
          {Object.entries(statusCounts).map(([status, count]) => (
            <div key={status} className="status-count">
              <span className="status-label">{statusLabels[status as keyof typeof statusLabels]}</span>
              <span className="count">{count}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="filters">
        <div className="filter-group">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="書籍名、著者名、メモで検索"
            className="search-input"
          />
        </div>

        <div className="filter-group">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ReadingStatus | 'all')}
            className="filter-select"
          >
            {Object.entries(statusLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">すべての年</option>
            {availableYears.map(year => (
              <option key={year} value={year}>{year}年</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="filter-select"
          >
            <option value="addedDate">登録日順</option>
            <option value="completedDate">読了日順</option>
            <option value="title">書籍名順</option>
          </select>
        </div>
      </div>

      <div className="records-list">
        {filteredAndSortedRecords.length > 0 ? (
          <>
            <div className="results-count">
              {filteredAndSortedRecords.length}件の結果
            </div>
            <div className="records-grid">
              {filteredAndSortedRecords.map(record => (
                <ReadingRecordCard
                  key={record.id}
                  record={record}
                  onUpdate={onUpdateRecord}
                  onDelete={onDeleteRecord}
                />
              ))}
            </div>
          </>
        ) : (
          <div className="no-records">
            <p>条件に一致する書籍が見つかりませんでした</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookList;