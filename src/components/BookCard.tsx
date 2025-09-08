import React, { useState } from 'react';
import { Book, ReadingStatus } from '../types';
import './BookCard.css';

interface BookCardProps {
  book: Book;
  onAddBook: (book: Book, status: ReadingStatus) => void;
  isAlreadyAdded: boolean;
}

const BookCard: React.FC<BookCardProps> = ({ book, onAddBook, isAlreadyAdded }) => {
  const [selectedStatus, setSelectedStatus] = useState<ReadingStatus>('want_to_read');

  const statusLabels = {
    want_to_read: '読みたい',
    reading: '読書中',
    completed: '読了'
  };

  const handleAdd = () => {
    onAddBook(book, selectedStatus);
  };

  return (
    <div className="book-card">
      <div className="book-image">
        <img src={book.imageUrl} alt={book.title} />
      </div>
      <div className="book-info">
        <h4 className="book-title">{book.title}</h4>
        <p className="book-author">著者: {book.author}</p>
        {book.publishedDate && (
          <p className="book-date">出版日: {book.publishedDate}</p>
        )}
        {book.description && (
          <p className="book-description">{book.description}</p>
        )}
        
        {!isAlreadyAdded ? (
          <div className="book-actions">
            <select 
              value={selectedStatus} 
              onChange={(e) => setSelectedStatus(e.target.value as ReadingStatus)}
              className="status-select"
            >
              {Object.entries(statusLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <button onClick={handleAdd} className="add-button">
              追加
            </button>
          </div>
        ) : (
          <div className="already-added">
            <span>✓ 登録済み</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookCard;