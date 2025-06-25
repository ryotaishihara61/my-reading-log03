// booksApi.js
const { google } = require('googleapis');
const API_KEY = process.env.GOOGLE_BOOKS_API_KEY;

// googleapisライブラリを使用して書籍情報を検索する関数
async function searchBookByISBN(isbn) {
    console.log('[booksApi.js] searchBookByISBN 実行 ISBN (受信時):', isbn);
    if (!API_KEY) {
        console.error("[booksApi.js] エラー: GOOGLE_BOOKS_API_KEY が .env ファイルまたは環境変数に設定されていません。");
        throw new Error("Google Books APIキーが設定されていません。サーバー管理者に連絡してください。");
    }

    if (!isbn || String(isbn).trim() === '') {
        console.error("[booksApi.js] エラー: ISBNが指定されていません。");
        throw new Error("ISBNが指定されていません。");
    }

    let sanitizedIsbn = String(isbn).replace(/-/g, ''); // 全てのハイフンを空文字に置換
    console.log('[booksApi.js] searchBookByISBN 実行 ISBN (サニタイズ後):', sanitizedIsbn);

    if (!/^\d{10}(\d{3})?$/.test(sanitizedIsbn)) {
        console.error(`[booksApi.js] エラー: 無効なISBN形式です - ${sanitizedIsbn}`);
        throw new Error("無効なISBN形式です。10桁または13桁の数字である必要があります。");
    }

    try {
        const books = google.books({ version: 'v1' });
        console.log(`[booksApi.js] Google Books APIに問い合わせ: isbn:${sanitizedIsbn}`);
        const response = await books.volumes.list({
            q: `isbn:${sanitizedIsbn}`,
            key: API_KEY
        });
        console.log('[booksApi.js] Google Books APIからの生レスポンスステータス:', response.status);

        if (response.data.totalItems === 0 || !response.data.items) {
            console.log(`[booksApi.js] ISBN ${sanitizedIsbn} に該当する書籍が見つかりませんでした。`);
            return null;
        }

        const bookInfo = response.data.items[0].volumeInfo;
        let thumbnail = bookInfo.imageLinks ? bookInfo.imageLinks.thumbnail || bookInfo.imageLinks.smallThumbnail : undefined;

        // HTTPをHTTPSに変換
        if (thumbnail && thumbnail.startsWith('http://')) {
            thumbnail = thumbnail.replace(/^http:\/\//i, 'https://');
            console.log('[booksApi.js] サムネイルURLをHTTPSに変換しました:', thumbnail);
        }

        const result = {
            title: bookInfo.title,
            authors: bookInfo.authors || [],
            description: bookInfo.description,
            publishedDate: bookInfo.publishedDate,
            publisher: bookInfo.publisher,
            thumbnail: thumbnail, // 変換後のサムネイルURL
            isbn13: sanitizedIsbn // 検索に使用したサニタイズ後のISBNを返す
        };
        console.log('[booksApi.js] 取得した書籍情報:', result);
        return result;

    } catch (error) {
        console.error('[booksApi.js] Google Books APIでの検索中にエラーが発生しました:', error.message);
        if (error.response && error.response.data && error.response.data.error) {
            console.error('[booksApi.js] Google API エラー詳細:', error.response.data.error);
            const apiError = error.response.data.error;
            throw new Error(`Google Books API エラー: ${apiError.message} (コード: ${apiError.code})`);
        }
        throw new Error("Google Books APIでの書籍情報取得に失敗しました。詳細はサーバーログを確認してください。");
    }
}

// 作品名で書籍情報を検索する関数
async function searchBookByTitle(title) {
    console.log('[booksApi.js] searchBookByTitle 実行 Title (受信時):', title);
    if (!API_KEY) {
        console.error("[booksApi.js] エラー: GOOGLE_BOOKS_API_KEY が .env ファイルまたは環境変数に設定されていません。");
        throw new Error("Google Books APIキーが設定されていません。サーバー管理者に連絡してください。");
    }

    if (!title || String(title).trim() === '') {
        console.error("[booksApi.js] エラー: 作品名が指定されていません。");
        throw new Error("作品名が指定されていません。");
    }

    const sanitizedTitle = String(title).trim();
    console.log('[booksApi.js] searchBookByTitle 実行 Title (サニタイズ後):', sanitizedTitle);

    try {
        const books = google.books({ version: 'v1' });
        console.log(`[booksApi.js] Google Books APIに問い合わせ: intitle:${sanitizedTitle}`);
        const response = await books.volumes.list({
            q: `intitle:${sanitizedTitle}`,
            key: API_KEY,
            maxResults: 10
        });
        console.log('[booksApi.js] Google Books APIからの生レスポンスステータス:', response.status);

        if (response.data.totalItems === 0 || !response.data.items) {
            console.log(`[booksApi.js] 作品名 "${sanitizedTitle}" に該当する書籍が見つかりませんでした。`);
            return [];
        }

        const results = response.data.items.map(item => {
            const bookInfo = item.volumeInfo;
            let thumbnail = bookInfo.imageLinks ? bookInfo.imageLinks.thumbnail || bookInfo.imageLinks.smallThumbnail : undefined;

            // HTTPをHTTPSに変換
            if (thumbnail && thumbnail.startsWith('http://')) {
                thumbnail = thumbnail.replace(/^http:\/\//i, 'https://');
            }

            // ISBN13を取得（存在する場合）
            let isbn13 = null;
            if (bookInfo.industryIdentifiers) {
                const isbn13Identifier = bookInfo.industryIdentifiers.find(id => id.type === 'ISBN_13');
                if (isbn13Identifier) {
                    isbn13 = isbn13Identifier.identifier;
                }
            }

            return {
                title: bookInfo.title,
                authors: bookInfo.authors || [],
                description: bookInfo.description,
                publishedDate: bookInfo.publishedDate,
                publisher: bookInfo.publisher,
                thumbnail: thumbnail,
                isbn13: isbn13
            };
        });

        console.log('[booksApi.js] 取得した書籍情報数:', results.length);
        return results;

    } catch (error) {
        console.error('[booksApi.js] Google Books APIでの作品名検索中にエラーが発生しました:', error.message);
        if (error.response && error.response.data && error.response.data.error) {
            console.error('[booksApi.js] Google API エラー詳細:', error.response.data.error);
            const apiError = error.response.data.error;
            throw new Error(`Google Books API エラー: ${apiError.message} (コード: ${apiError.code})`);
        }
        throw new Error("Google Books APIでの書籍情報取得に失敗しました。詳細はサーバーログを確認してください。");
    }
}

module.exports = { searchBookByISBN, searchBookByTitle };