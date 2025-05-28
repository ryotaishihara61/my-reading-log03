// public/js/main.js

document.addEventListener('DOMContentLoaded', () => {
    // --- 書籍検索関連の要素を取得 ---
    const isbnInput = document.getElementById('isbnInput');
    const searchButton = document.getElementById('searchButton');
    const bookInfoArea = document.getElementById('bookInfoArea');
    const registrationFormArea = document.getElementById('registrationFormArea');

    // --- 読書記録保存関連の要素を取得 ---
    const saveButton = document.getElementById('saveButton');
    const readDateInput = document.getElementById('readDate');
    const ratingInput = document.getElementById('rating');
    const commentInput = document.getElementById('comment');
    const readingStatusInput = document.getElementById('readingStatus');

    // --- 現在検索されている書籍の情報を保持する変数 ---
    let currentBookDataForSave = null;

    // --- 書籍検索ボタンのイベントリスナー ---
    if (searchButton) {
        searchButton.addEventListener('click', async () => {
            let isbn = isbnInput.value.trim(); // 入力値を取得し、前後の空白を削除
            if (!isbn) {
                bookInfoArea.innerHTML = '<p style="color: red;">ISBNを入力してください。</p>';
                registrationFormArea.style.display = 'none';
                currentBookDataForSave = null;
                return;
            }

            // --- ハイフン除去処理 ---
            isbn = isbn.replace(/-/g, ''); // 全てのハイフンを空文字に置換

            // --- ISBN形式の簡易チェック (10桁または13桁の数字か) ---
            if (!/^\d{10}(\d{3})?$/.test(isbn)) {
                 bookInfoArea.innerHTML = '<p style="color: red;">ISBNは10桁または13桁の数字で入力してください（ハイフンは自動で除去されます）。</p>';
                 registrationFormArea.style.display = 'none';
                 currentBookDataForSave = null;
                 return;
            }

            bookInfoArea.innerHTML = '<p>検索中...</p>';
            registrationFormArea.style.display = 'none';
            currentBookDataForSave = null;

            try {
                const response = await fetch(`/api/search_book?isbn=${isbn}`); // 除去後のISBNを使用
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ error: '書籍情報の取得に失敗しました。サーバーからの応答が不正です。' }));
                    throw new Error(errorData.error || `サーバーエラー: ${response.status}`);
                }

                const bookData = await response.json();

                if (bookData) {
                    currentBookDataForSave = {
                        isbn13: bookData.isbn13, // APIから返されたISBN (検索に使ったものと同じ、またはAPIが正規化したもの)
                        title: bookData.title,
                        author: bookData.authors && bookData.authors.length > 0 ? bookData.authors.join(', ') : '',
                        description: bookData.description,
                        publishedDate: bookData.publishedDate,
                        publisher: bookData.publisher,
                        thumbnail: bookData.thumbnail
                    };

                    let authorsDisplay = bookData.authors && bookData.authors.length > 0 ? bookData.authors.join(', ') : '情報なし';
                    bookInfoArea.innerHTML = `
                        <h3>『${bookData.title || 'タイトル不明'}』</h3>
                        ${bookData.thumbnail ? `<img src="${bookData.thumbnail}" alt="表紙画像" style="max-width: 150px; float: left; margin-right: 15px;">` : ''}
                        <p><strong>著者:</strong> ${authorsDisplay}</p>
                        <p><strong>出版社:</strong> ${bookData.publisher || '情報なし'}</p>
                        <p><strong>出版日:</strong> ${bookData.publishedDate || '情報なし'}</p>
                        <p><strong>ISBN13:</strong> ${bookData.isbn13 || '情報なし'}</p>
                        <p style="clear:both;"><strong>概要:</strong><br>${bookData.description || '概要なし'}</p>
                    `;
                    registrationFormArea.style.display = 'block';
                } else {
                    // このケースはサーバー側で404が返された場合にフロントでエラーとして扱われるため、
                    // 通常はcatchブロックで処理されます。
                    bookInfoArea.innerHTML = `<p style="color: orange;">ISBN ${isbn} に該当する書籍が見つかりませんでした。</p>`;
                    currentBookDataForSave = null;
                }

            } catch (error) {
                console.error('書籍検索エラー:', error);
                bookInfoArea.innerHTML = `<p style="color: red;">検索エラー: ${error.message}</p>`;
                registrationFormArea.style.display = 'none';
                currentBookDataForSave = null;
            }
        });
    } else {
        console.error('要素 #searchButton が見つかりません。');
    }


    // --- 「この読書記録を保存」ボタンのイベントリスナー ---
    if (saveButton) {
        saveButton.addEventListener('click', async () => {
            if (!currentBookDataForSave || !currentBookDataForSave.isbn13) {
                alert('まず書籍を検索して情報を表示してください。');
                return;
            }

            const readDate = readDateInput.value;
            const rating = ratingInput.value;
            const comment = commentInput.value;
            const readingStatus = readingStatusInput.value;

            if (readingStatus === '読了' && !readDate) {
                alert('「読了」ステータスの場合、読了日を入力してください。');
                return;
            }

            const dataToSave = {
                ...currentBookDataForSave,
                readDate: readDate,
                rating: rating ? parseInt(rating) : '',
                comment: comment,
                readingStatus: readingStatus
            };

            try {
                const response = await fetch('/api/save_book', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(dataToSave),
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.error || `サーバーエラー: ${response.status}`);
                }

                alert(result.message || '読書記録が保存されました！');

                // フォームをクリア
                if(isbnInput) isbnInput.value = '';
                bookInfoArea.innerHTML = '';
                registrationFormArea.style.display = 'none';
                currentBookDataForSave = null;
                readDateInput.value = '';
                ratingInput.value = '';
                commentInput.value = '';
                readingStatusInput.value = '未読';

            } catch (error) {
                console.error('保存エラー:', error);
                alert(`保存に失敗しました: ${error.message}`);
            }
        });
    } else {
        console.error('要素 #saveButton が見つかりません。');
    }
});