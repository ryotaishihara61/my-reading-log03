// server.js

// 1. 必要なモジュールをインポートします
require('dotenv').config(); // .envファイルから環境変数を読み込みます
const express = require('express');
const path = require('path');
const { searchBookByISBN, searchBookByTitle } = require('./booksApi'); // booksApi.jsからインポート
const { getBooksFromSheet, saveBookToSheet, getBooksStatsFromSheet, updateBookInSheet, deleteBookFromSheet } = require('./sheets'); // sheets.jsからインポート

// 2. Expressアプリケーションを作成します
const app = express();

// 3. ポート番号を設定します (環境変数PORTがあればそれを使用し、なければ3000を使用)
const PORT = process.env.PORT || 3000;

// 4. ミドルウェアを設定します
// JSON形式のリクエストボディを解析できるようにします
app.use(express.json());

// 5. 基本的なHTMLページを提供するルートを設定します
// ルートURL ('/') にアクセスがあった場合、public/list.html を送信します（一覧をトップページにする）
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'list.html'));
});

// '/list' URLにアクセスがあった場合、public/list.html を送信します  
app.get('/list', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'list.html'));
});

// '/register' URLにアクセスがあった場合、public/index.html を送信します（書籍登録ページ）
app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 静的ファイル (HTML, CSS, クライアント側JavaScript) を配信するための設定
// ルートハンドラーの後に配置して、特定のルートを優先させる
app.use(express.static(path.join(__dirname, 'public')));

// --- APIエンドポイント ---

// 書籍検索API (ISBNまたは作品名を使用)
app.get('/api/search_book', async (req, res) => {
    const { isbn, title } = req.query;
    
    if (!isbn && !title) {
        return res.status(400).json({ error: 'ISBNまたは作品名を指定してください。' });
    }
    
    try {
        if (isbn) {
            // ISBN検索
            const bookData = await searchBookByISBN(isbn);
            if (bookData) {
                res.json({ type: 'single', data: bookData });
            } else {
                res.status(404).json({ error: `ISBN ${isbn} に該当する書籍が見つかりませんでした。` });
            }
        } else if (title) {
            // 作品名検索
            const booksData = await searchBookByTitle(title);
            if (booksData && booksData.length > 0) {
                res.json({ type: 'multiple', data: booksData });
            } else {
                res.status(404).json({ error: `作品名 "${title}" に該当する書籍が見つかりませんでした。` });
            }
        }
    } catch (error) {
        console.error(`書籍検索APIエラー (ISBN: ${isbn}, Title: ${title}):`, error);
        res.status(500).json({ error: error.message || '書籍情報の検索中にサーバーエラーが発生しました。' });
    }
});

// 読書記録保存API
app.post('/api/save_book', async (req, res) => {
    const bookDataToSave = req.body;
    if (!bookDataToSave || !bookDataToSave.title || !bookDataToSave.isbn13) {
        return res.status(400).json({ error: '保存する書籍データが不完全です。タイトルとISBNは必須です。' });
    }
    
    // ISBNと書籍タイトルからAmazon検索リンクを自動生成
    if (bookDataToSave.isbn13 && bookDataToSave.title) {
        const cleanIsbn = bookDataToSave.isbn13.replace(/[-\s]/g, ''); // ハイフンとスペースを除去
        const encodedTitle = encodeURIComponent(bookDataToSave.title); // タイトルをURL用にエンコード
        bookDataToSave.amazonLink = `https://amazon.co.jp/s?k=${cleanIsbn}+${encodedTitle}`;
    }
    
    try {
        const result = await saveBookToSheet(bookDataToSave);
        res.status(201).json({ message: '読書記録が正常に保存されました。', data: result });
    } catch (error) {
        console.error('読書記録の保存中にサーバーエラーが発生しました:', error);
        res.status(500).json({ error: error.message || '読書記録の保存に失敗しました。' });
    }
});

// 書籍リスト取得API (ページネーションとフィルタ対応)
app.get('/api/get_books', async (req, res) => {
    try {
        const {
            keyword,
            read_month,
            rating,
            reading_status,
            page = 1,
            limit = 10
        } = req.query;

        const filters = {
            keyword,
            read_month,
            rating,
            reading_status,
            page: parseInt(page, 10),
            limit: parseInt(limit, 10)
        };

        const booksData = await getBooksFromSheet(filters);
        res.json(booksData);

    } catch (error) {
        console.error('書籍リストの取得中にサーバーエラーが発生しました:', error);
        res.status(500).json({ error: error.message || '書籍リストの取得に失敗しました。' });
    }
});

// 書籍統計情報取得API
app.get('/api/books_stats', async (req, res) => {
    try {
        const statsData = await getBooksStatsFromSheet();
        res.json(statsData);
    } catch (error) {
        console.error('書籍統計の取得中にサーバーエラーが発生しました:', error);
        res.status(500).json({ error: error.message || '書籍統計の取得に失敗しました。' });
    }
});

// 書籍情報更新API
app.put('/api/update_book', async (req, res) => {
    const bookDataToUpdate = req.body;
    if (!bookDataToUpdate || !bookDataToUpdate.isbn13) {
        return res.status(400).json({ error: '更新する書籍のISBN13が必要です。' });
    }
    
    try {
        const result = await updateBookInSheet(bookDataToUpdate);
        res.json({ message: '書籍情報が正常に更新されました。', data: result });
    } catch (error) {
        console.error('書籍情報の更新中にサーバーエラーが発生しました:', error);
        res.status(500).json({ error: error.message || '書籍情報の更新に失敗しました。' });
    }
});

// 書籍削除API
app.delete('/api/delete_book', async (req, res) => {
    const { isbn13 } = req.body;
    if (!isbn13) {
        return res.status(400).json({ error: '削除する書籍のISBN13が必要です。' });
    }
    
    try {
        const result = await deleteBookFromSheet(isbn13);
        res.json({ message: '書籍が正常に削除されました。', data: result });
    } catch (error) {
        console.error('書籍削除中にサーバーエラーが発生しました:', error);
        res.status(500).json({ error: error.message || '書籍の削除に失敗しました。' });
    }
});

// 6. サーバーを起動します
app.listen(PORT, () => {
    console.log(`サーバーが起動しました。 http://localhost:${PORT} でアクセスできます。`);
});