export interface Book {
  id: string;
  title: string;
  author: string;
  isbn?: string;
  publishedDate?: string;
  description?: string;
  imageUrl?: string;
}

export interface ReadingRecord {
  id: string;
  bookId: string;
  book: Book;
  status: 'want_to_read' | 'reading' | 'completed';
  rating?: number;
  completedDate?: string;
  notes?: string;
  startDate?: string;
  addedDate: string;
}

export type ReadingStatus = ReadingRecord['status'];