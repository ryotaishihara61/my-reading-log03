import React, { useState } from 'react';
import { ReadingRecord, ReadingStatus } from '../types';
import './ReadingRecordCard.css';

interface ReadingRecordCardProps {
  record: ReadingRecord;
  onUpdate: (id: string, updates: Partial<ReadingRecord>) => void;
  onDelete: (id: string) => void;
}

const ReadingRecordCard: React.FC<ReadingRecordCardProps> = ({ record, onUpdate, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    status: record.status,
    rating: record.rating || 0,
    completedDate: record.completedDate || '',
    notes: record.notes || ''
  });

  const statusLabels = {
    want_to_read: '読みたい',
    reading: '読書中',
    completed: '読了'
  };

  const handleSave = () => {
    const updates: Partial<ReadingRecord> = {
      status: editData.status,
      rating: editData.rating || undefined,
      notes: editData.notes || undefined
    };

    if (editData.status === 'completed' && editData.completedDate) {
      updates.completedDate = editData.completedDate;
    } else if (editData.status !== 'completed') {
      updates.completedDate = undefined;
    }

    if (editData.status === 'reading' && !record.startDate) {
      updates.startDate = new Date().toISOString();
    }

    onUpdate(record.id, updates);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditData({
      status: record.status,
      rating: record.rating || 0,
      completedDate: record.completedDate || '',
      notes: record.notes || ''
    });
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (window.confirm('この書籍を削除してもよろしいですか？')) {
      onDelete(record.id);
    }
  };

  const renderStars = (rating: number, interactive: boolean = false) => {
    return (
      <div className="stars">
        {[1, 2, 3, 4, 5].map(star => (
          <span
            key={star}
            className={`star ${star <= rating ? 'filled' : ''} ${interactive ? 'interactive' : ''}`}
            onClick={interactive ? () => setEditData({ ...editData, rating: star }) : undefined}
          >
            ★
          </span>
        ))}
      </div>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP');
  };

  return (
    <div className="reading-record-card">
      <div className="book-info">
        <div className="book-image">
          <img src={record.book.imageUrl} alt={record.book.title} />
        </div>
        <div className="book-details">
          <h4 className="book-title">{record.book.title}</h4>
          <p className="book-author">{record.book.author}</p>
          <div className={`status-badge status-${record.status}`}>
            {statusLabels[record.status]}
          </div>
        </div>
      </div>

      {!isEditing ? (
        <div className="record-details">
          {record.rating && (
            <div className="rating">
              <span className="label">評価:</span>
              {renderStars(record.rating)}
            </div>
          )}
          
          {record.completedDate && (
            <div className="completed-date">
              <span className="label">読了日:</span>
              <span>{formatDate(record.completedDate)}</span>
            </div>
          )}
          
          {record.notes && (
            <div className="notes">
              <span className="label">メモ:</span>
              <p>{record.notes}</p>
            </div>
          )}
          
          <div className="dates">
            <div className="added-date">
              <span className="label">登録日:</span>
              <span>{formatDate(record.addedDate)}</span>
            </div>
          </div>

          <div className="actions">
            <button onClick={() => setIsEditing(true)} className="edit-button">
              編集
            </button>
            <button onClick={handleDelete} className="delete-button">
              削除
            </button>
          </div>
        </div>
      ) : (
        <div className="edit-form">
          <div className="form-group">
            <label>ステータス:</label>
            <select
              value={editData.status}
              onChange={(e) => setEditData({ ...editData, status: e.target.value as ReadingStatus })}
            >
              {Object.entries(statusLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>評価:</label>
            {renderStars(editData.rating, true)}
          </div>

          {editData.status === 'completed' && (
            <div className="form-group">
              <label>読了日:</label>
              <input
                type="date"
                value={editData.completedDate}
                onChange={(e) => setEditData({ ...editData, completedDate: e.target.value })}
              />
            </div>
          )}

          <div className="form-group">
            <label>メモ:</label>
            <textarea
              value={editData.notes}
              onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
              rows={3}
              placeholder="感想やメモを入力..."
            />
          </div>

          <div className="form-actions">
            <button onClick={handleSave} className="save-button">
              保存
            </button>
            <button onClick={handleCancel} className="cancel-button">
              キャンセル
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReadingRecordCard;