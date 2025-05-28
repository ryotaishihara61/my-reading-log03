// sheets.js
const { google } = require('googleapis');
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

// スプレッドシートのカラム名 (実際のシートに合わせてください)
const HEADERS = [
    "isbn13",
    "title",
    "author",
    "description",
    "publishedDate",
    "publisher",
    "thumbnail",
    "readDate",
    "rating",
    "comment",
    "readingStatus"
];

function getSheetsAuth() {
    console.log('[sheets.js] getSheetsAuth が呼び出されました。');
    const keyFilePath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    const credentialsJson = process.env.GOOGLE_CREDENTIALS_JSON;

    if (credentialsJson) {
        try {
            console.log('[sheets.js] GOOGLE_CREDENTIALS_JSON を使用して認証します。');
            const credentials = JSON.parse(credentialsJson);
            const auth = new google.auth.GoogleAuth({
                credentials,
                scopes: ['https://www.googleapis.com/auth/spreadsheets'],
            });
            return auth;
        } catch (e) {
            console.error("[sheets.js] GOOGLE_CREDENTIALS_JSON のパースに失敗しました:", e);
            throw new Error("認証設定エラー (JSONパース)。");
        }
    } else if (keyFilePath) {
        console.log('[sheets.js] GOOGLE_APPLICATION_CREDENTIALS を使用して認証します。 Path:', keyFilePath);
        const auth = new google.auth.GoogleAuth({
            keyFile: keyFilePath,
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
        return auth;
    } else {
        console.error("[sheets.js] 認証情報 (GOOGLE_APPLICATION_CREDENTIALS または GOOGLE_CREDENTIALS_JSON) が .env ファイルに見つかりません。");
        throw new Error("認証設定がありません。");
    }
}

async function getSheetsService() {
    console.log('[sheets.js] getSheetsService が呼び出されました。');
    const auth = getSheetsAuth();
    const client = await auth.getClient();
    const sheets = google.sheets({ version: 'v4', auth: client });
    console.log('[sheets.js] Google Sheets APIサービスオブジェクトの取得に成功しました。');
    return sheets;
}

// スプレッドシートからデータを取得 (読了本一覧用)
async function getBooksFromSheet(filters = {}) {
    console.log('[sheets.js] getBooksFromSheet が呼び出されました。 Filters:', filters);
    const sheets = await getSheetsService();
    const { keyword, read_month, rating, reading_status, page = 1, limit = 10 } = filters;

    // ★★★ 実際のシート名に合わせてください！ ★★★
    const sheetName = 'Sheet1'; // 例: '読書記録', 'シート1' など
    const rangeToRead = `${sheetName}!A:K`; // カラム数が11なのでAからK列まで

    console.log(`[sheets.js] 読み取り範囲: ${rangeToRead}`);

    try {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: rangeToRead,
        });

        const rows = response.data.values;
        if (!rows || rows.length === 0) {
            console.log('[sheets.js] スプレッドシートにデータがありません (ヘッダーも含む)。');
            return { data: [], total: 0, page, limit, totalPages: 0 };
        }

        const actualHeadersFromSheet = rows[0]; // スプレッドシートの実際のヘッダー
        console.log('[sheets.js] スプレッドシートのヘッダー行:', actualHeadersFromSheet);
        console.log('[sheets.js] 定義済みのHEADERS:', HEADERS);
        // 注意: 実際のヘッダーと定義済みHEADERSが一致しているか確認することが重要

        let books = rows.slice(1).map(row => {
            let book = {};
            HEADERS.forEach((header, index) => { // 定義済みのHEADERSをキーとして使用
                book[header] = row[index] !== undefined ? row[index] : null;
            });
            return book;
        });

        // --- フィルタリング ---
        if (keyword) {
            const lowerKeyword = keyword.toLowerCase();
            books = books.filter(book =>
                (book.title && String(book.title).toLowerCase().includes(lowerKeyword)) ||
                (book.author && String(book.author).toLowerCase().includes(lowerKeyword)) ||
                (book.comment && String(book.comment).toLowerCase().includes(lowerKeyword)) ||
                (book.isbn13 && String(book.isbn13).toLowerCase().includes(lowerKeyword))
            );
        }
        if (read_month) {
            books = books.filter(book => book.readDate && String(book.readDate).startsWith(read_month));
        }
        if (rating) {
            books = books.filter(book => book.rating && String(book.rating) === String(rating));
        }
        if (reading_status) {
            books = books.filter(book => book.readingStatus && String(book.readingStatus).toLowerCase() === reading_status.toLowerCase());
        }

        const total = books.length;
        const totalPages = Math.ceil(total / limit);
        const startIndex = (page - 1) * limit;
        const paginatedBooks = books.slice(startIndex, startIndex + limit);

        console.log(`[sheets.js] getBooksFromSheet 成功。 ${paginatedBooks.length} 件の書籍を返します。Total: ${total}`);
        return { data: paginatedBooks, total, page, limit, totalPages };

    } catch (err) {
        console.error('[sheets.js] getBooksFromSheet内でのエラーキャッチ:', err.message);
        if (err.response && err.response.data && err.response.data.error) {
            console.error('[sheets.js] Google Sheets API エラー詳細 (getBooks):', err.response.data.error.message);
        }
        const apiError = new Error('Googleスプレッドシートからのデータ取得に失敗しました。 ' + (err.message || ''));
        apiError.status = err.code || 500;
        throw apiError;
    }
}

// スプレッドシートにデータを保存
async function saveBookToSheet(bookDetails) {
    console.log('[sheets.js] saveBookToSheet が呼び出されました。');
    console.log('[sheets.js] 受信した bookDetails:', JSON.stringify(bookDetails, null, 2));
    console.log('[sheets.js] 使用する SPREADSHEET_ID:', SPREADSHEET_ID);

    const sheets = await getSheetsService();
    const newRow = HEADERS.map(header => {
        const value = bookDetails[header];
        return value !== undefined && value !== null ? String(value) : ''; // nullも空文字に
    });

    console.log('[sheets.js] スプレッドシートに書き込む行データ (newRow):', newRow);

    // ★★★ 実際のシート名に合わせてください！ ★★★
    const sheetNameForAppend = 'Sheet1'; // 例: '読書記録', 'シート1' など
    const rangeToAppend = `${sheetNameForAppend}!A1`; // A1を指定すると最終行の次に追加される

    console.log('[sheets.js] 書き込み先の範囲:', rangeToAppend);

    try {
        console.log('[sheets.js] sheets.spreadsheets.values.append を実行します...');
        const response = await sheets.spreadsheets.values.append({
            spreadsheetId: SPREADSHEET_ID,
            range: rangeToAppend, // どのテーブルに対して追加するか (A1でテーブル全体を指定)
            valueInputOption: 'USER_ENTERED', // 'RAW' または 'USER_ENTERED'
            insertDataOption: 'INSERT_ROWS', // 行を挿入してデータを追加
            resource: {
                values: [newRow], // 保存するデータ (1行分のデータ)
            },
        });

        console.log('[sheets.js] Google Sheets APIからの完全なレスポンス (saveBookToSheet):', JSON.stringify(response, null, 2));

        if (response && response.data && response.data.updates) {
            console.log('[sheets.js] response.data.updates (更新情報):', JSON.stringify(response.data.updates, null, 2));
            if (response.data.updates.updatedCells) {
                console.log(`[sheets.js] ${response.data.updates.updatedCells} 個のセルが更新されたようです。`);
            } else {
                console.log('[sheets.js] response.data.updates.updatedCells は存在しませんでした。');
            }
            if (response.data.updates.updatedRange) {
                 console.log(`[sheets.js] 更新された範囲: ${response.data.updates.updatedRange}`);
            }
        } else {
            console.log('[sheets.js] response.data または response.data.updates が存在しませんでした。書き込みが成功したか不明です。');
        }

        return response.data;

    } catch (err) {
        console.error('[sheets.js] saveBookToSheet内でのエラーキャッチ:', err.message);
        console.error('[sheets.js] エラーオブジェクト全体 (saveBookToSheet):', err);
        if (err.errors && err.errors.length > 0 && err.errors[0].message) { // googleapis v4+ エラー形式
             console.error('[sheets.js] Google Sheets API エラー詳細 (saveBookToSheet):', err.errors[0].message);
             throw new Error(`Google Sheets API Error: ${err.errors[0].message}`);
        } else if (err.response && err.response.data && err.response.data.error && err.response.data.error.message) { // 古い形式または他のエラー
             console.error('[sheets.js] Google Sheets API エラー詳細 (saveBookToSheet, fallback):', err.response.data.error.message);
             throw new Error(`Google Sheets API Error: ${err.response.data.error.message}`);
        }
        throw new Error('Googleスプレッドシートへのデータ保存中にAPI呼び出しで失敗しました。');
    }
}

// 統計情報を取得 (年月別読了数)
async function getBooksStatsFromSheet() {
    console.log('[sheets.js] getBooksStatsFromSheet が呼び出されました。');
    const sheets = await getSheetsService();

    // ★★★ 実際のシート名に合わせてください！ ★★★
    const sheetNameForStats = 'Sheet1'; // 例: '読書記録', 'シート1' など
    // 読了日(H列相当 -> HEADERS[7]), readingStatus(K列相当 -> HEADERS[10])
    const rangeForStats = `${sheetNameForStats}!${String.fromCharCode(65 + HEADERS.indexOf("readDate"))}:${String.fromCharCode(65 + HEADERS.indexOf("readingStatus"))}`;
    console.log(`[sheets.js] 統計用の読み取り範囲: ${rangeForStats} (これは例です。実際には全行読みます)`);


    try {
        // 全行の関連列を読むために、A:K のようにするか、データのある範囲を特定する
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: `${sheetNameForStats}!A:${String.fromCharCode(65 + HEADERS.length -1)}`, // 全カラム取得
        });

        const rows = response.data.values;
        if (!rows || rows.length <= 1) { // ヘッダー行のみ、またはデータなし
            console.log('[sheets.js] 統計用データがスプレッドシートにありません。');
            return { labels: [], data: [] };
        }

        const books = rows.slice(1).map(row => {
            let book = {};
            HEADERS.forEach((header, index) => {
                book[header] = row[index] !== undefined ? row[index] : null;
            });
            return book;
        });

        const monthlyCounts = {};
        books.forEach(book => {
            // "読了" ステータスで、かつ読了日があるものをカウント
            if (book.readDate && book.readingStatus && String(book.readingStatus).toLowerCase() === '読了') {
                const yearMonth = String(book.readDate).substring(0, 7); // "YYYY-MM"
                monthlyCounts[yearMonth] = (monthlyCounts[yearMonth] || 0) + 1;
            }
        });

        const sortedMonths = Object.keys(monthlyCounts).sort();
        const chartLabels = sortedMonths;
        const chartDataValues = sortedMonths.map(month => monthlyCounts[month]);

        console.log('[sheets.js] getBooksStatsFromSheet 成功。');
        return { labels: chartLabels, data: chartDataValues };

    } catch (err) {
        console.error('[sheets.js] getBooksStatsFromSheet内でのエラーキャッチ:', err.message);
        if (err.response && err.response.data && err.response.data.error) {
            console.error('[sheets.js] Google Sheets API エラー詳細 (getBooksStats):', err.response.data.error.message);
        }
        const apiError = new Error('Googleスプレッドシートからの統計データ取得に失敗しました。 ' + (err.message || ''));
        apiError.status = err.code || 500;
        throw apiError;
    }
}


module.exports = {
    getBooksFromSheet,
    saveBookToSheet,
    getBooksStatsFromSheet
};