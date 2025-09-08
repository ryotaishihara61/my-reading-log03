import React, { useState } from 'react';
import { Book, ReadingRecord, ReadingStatus } from '../types';
import BookCard from './BookCard';
import './BookSearch.css';

interface BookSearchProps {
  onAddRecord: (record: ReadingRecord) => void;
  existingRecords: ReadingRecord[];
}

const BookSearch: React.FC<BookSearchProps> = ({ onAddRecord, existingRecords }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const mockBooks: Book[] = [
    {
      id: '1',
      title: 'TypeScript入門',
      author: '山田太郎',
      isbn: '9784000000001',
      publishedDate: '2023-01-01',
      description: 'TypeScriptの基礎から応用まで学べる入門書',
      imageUrl: 'https://via.placeholder.com/150x200?text=TypeScript入門'
    },
    {
      id: '2',
      title: 'React実践ガイド',
      author: '田中花子',
      isbn: '9784000000002',
      publishedDate: '2023-02-01',
      description: 'Reactを使ったモダンなWebアプリケーション開発',
      imageUrl: 'https://via.placeholder.com/150x200?text=React実践ガイド'
    },
    {
      id: '3',
      title: 'Node.js完全攻略',
      author: '佐藤次郎',
      isbn: '9784000000003',
      publishedDate: '2023-03-01',
      description: 'Node.jsによるサーバーサイド開発の決定版',
      imageUrl: 'https://via.placeholder.com/150x200?text=Node.js完全攻略'
    }
  ];

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsLoading(true);
    
    setTimeout(() => {
      const results = mockBooks.filter(book =>
        book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        book.author.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setSearchResults(results);
      setIsLoading(false);
    }, 500);
  };

  const handleAddBook = (book: Book, status: ReadingStatus) => {
    const existingRecord = existingRecords.find(record => record.bookId === book.id);
    if (existingRecord) {
      alert('この書籍は既に登録されています');
      return;
    }

    const newRecord: ReadingRecord = {
      id: Date.now().toString(),
      bookId: book.id,
      book: book,
      status: status,
      addedDate: new Date().toISOString(),
      startDate: status === 'reading' ? new Date().toISOString() : undefined
    };

    onAddRecord(newRecord);
    alert('書籍を登録しました');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="book-search">
      <div className="search-section">
        <h2>書籍を検索</h2>
        <div className="search-input-group">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="書籍名または著者名を入力"
            className="search-input"
          />
          <button onClick={handleSearch} disabled={isLoading} className="search-button">
            {isLoading ? '検索中...' : '検索'}
          </button>
        </div>
      </div>

      {searchResults.length > 0 && (
        <div className="search-results">
          <h3>検索結果 ({searchResults.length}件)</h3>
          <div className="books-grid">
            {searchResults.map(book => (
              <BookCard
                key={book.id}
                book={book}
                onAddBook={handleAddBook}
                isAlreadyAdded={existingRecords.some(record => record.bookId === book.id)}
              />
            ))}
          </div>
        </div>
      )}

      {searchQuery && searchResults.length === 0 && !isLoading && (
        <div className="no-results">
          <p>「{searchQuery}」の検索結果が見つかりませんでした</p>
        </div>
      )}
    </div>
  );
};

export default BookSearch;