// booksApi.js
const { google } = require('googleapis');
const API_KEY = process.env.GOOGLE_BOOKS_API_KEY;

// googleapisライブラリを使用して書籍情報を検索する関数
async function searchBookByISBN(isbn) {
    if (!API_KEY) {
        console.error("エラー: GOOGLE_BOOKS_API_KEY が .env ファイルに設定されていません。");
        throw new Error("Google Books APIキーが設定されていません。サーバー管理者に連絡してください。");
    }

    if (!isbn || isbn.trim() === '') {
        throw new Error("ISBNが指定されていません。");
    }

    try {
        // google.books の初期化方法がバージョンによって異なる場合があるので注意
        // 通常、APIキーはリクエストのパラメータとして含めます
        const books = google.books({ version: 'v1' }); // APIキーはここでは渡さない

        const response = await books.volumes.list({
            q: `isbn:${isbn}`,
            key: API_KEY // APIキーをここでパラメータとして渡す
        });

        if (response.data.totalItems === 0 || !response.data.items) {
            return null; // 書籍が見つからなかった場合
        }

        // 最初に見つかった書籍情報を返す
        const bookInfo = response.data.items[0].volumeInfo;
        return {
            title: bookInfo.title,
            authors: bookInfo.authors || [], // 著者は配列の場合がある
            description: bookInfo.description,
            publishedDate: bookInfo.publishedDate,
            publisher: bookInfo.publisher,
            thumbnail: bookInfo.imageLinks ? bookInfo.imageLinks.thumbnail || bookInfo.imageLinks.smallThumbnail : undefined,
            isbn13: isbn // 検索に使ったISBNも返しておく
        };

    } catch (error) {
        console.error('Google Books APIでの検索中にエラーが発生しました:', error.response ? error.response.data : error.message);
        if (error.response && error.response.data && error.response.data.error) {
            const apiError = error.response.data.error;
            // APIからの具体的なエラーメッセージを投げる
            throw new Error(`Google Books API エラー: ${apiError.message} (コード: ${apiError.code})`);
        }
        throw new Error("Google Books APIでの書籍情報取得に失敗しました。");
    }
}

module.exports = { searchBookByISBN };