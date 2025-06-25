// public/js/main.js

document.addEventListener('DOMContentLoaded', () => {
    // --- 書籍検索関連の要素を取得 ---
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');
    const bookInfoArea = document.getElementById('bookInfoArea');
    const registrationFormArea = document.getElementById('registrationFormArea');
    const searchTypeRadios = document.querySelectorAll('input[name="searchType"]');

    // --- 読書記録保存関連の要素を取得 ---
    const saveButton = document.getElementById('saveButton');
    const readDateInput = document.getElementById('readDate');
    const commentInput = document.getElementById('comment');
    const readingStatusInput = document.getElementById('readingStatus');

    // --- 星評価UI関連の要素を取得 ---
    const ratingInput = document.getElementById('rating'); // これは隠しフィールド
    const ratingStarsContainer = document.getElementById('ratingStars');
    const stars = ratingStarsContainer ? ratingStarsContainer.querySelectorAll('span') : [];

    // --- 現在検索されている書籍の情報を保持する変数 ---
    let currentBookDataForSave = null;

    // --- 星評価のロジック ---
    if (ratingStarsContainer && stars.length > 0) {
        stars.forEach(star => {
            star.addEventListener('mouseover', function() {
                resetStarsVisual(); // 一旦すべての星の見た目をリセット
                const currentValue = parseInt(this.dataset.value);
                highlightStarsVisual(currentValue, 'hovered');
            });

            star.addEventListener('mouseout', function() {
                resetStarsVisual();
                const selectedRating = parseInt(ratingInput.value); // 隠しフィールドの値を取得
                if (selectedRating > 0) {
                    highlightStarsVisual(selectedRating, 'selected');
                }
            });

            star.addEventListener('click', function() {
                const value = parseInt(this.dataset.value);
                ratingInput.value = value; // 隠しフィールドに値を設定
                resetStarsVisual();
                highlightStarsVisual(value, 'selected');
            });
        });
    }

    function resetStarsVisual() {
        stars.forEach(s => {
            s.className = ''; // 'hovered' や 'selected' クラスを削除
            s.textContent = '☆'; // 空の星に戻す
        });
    }

    function highlightStarsVisual(value, stateClass) {
        for (let i = 0; i < stars.length; i++) {
            if (i < value) {
                stars[i].classList.add(stateClass);
                stars[i].textContent = '★'; // 満たされた星
            } else {
                stars[i].classList.remove(stateClass); // valueより大きい星はクラスを削除
                stars[i].textContent = '☆'; // 空の星
            }
        }
        // stateClass が 'selected' の場合、value より大きい星の 'hovered' も消す
        if (stateClass === 'selected') {
             for (let i = value; i < stars.length; i++) {
                 stars[i].classList.remove('hovered');
             }
        }
    }


    // 検索タイプが変更されたときのプレースホルダー更新
    searchTypeRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            if (radio.value === 'isbn') {
                searchInput.placeholder = 'ISBN13を入力 (例: 9784003101016)';
            } else if (radio.value === 'title') {
                searchInput.placeholder = '作品名を入力 (例: 吾輩は猫である)';
            }
        });
    });

    // --- 書籍検索ボタンのイベントリスナー ---
    if (searchButton) {
        searchButton.addEventListener('click', async () => {
            const searchValue = searchInput.value.trim();
            const searchType = document.querySelector('input[name="searchType"]:checked').value;
            
            if (!searchValue) {
                const fieldName = searchType === 'isbn' ? 'ISBN' : '作品名';
                bookInfoArea.innerHTML = `<p style="color: red;">${fieldName}を入力してください。</p>`;
                registrationFormArea.style.display = 'none';
                currentBookDataForSave = null;
                return;
            }

            // ISBN検索の場合のバリデーション
            if (searchType === 'isbn') {
                const sanitizedIsbn = searchValue.replace(/-/g, '');
                if (!/^\d{10}(\d{3})?$/.test(sanitizedIsbn)) {
                    bookInfoArea.innerHTML = '<p style="color: red;">ISBNは10桁または13桁の数字で入力してください（ハイフンは自動で除去されます）。</p>';
                    registrationFormArea.style.display = 'none';
                    currentBookDataForSave = null;
                    return;
                }
            }

            bookInfoArea.innerHTML = '<p>検索中...</p>';
            registrationFormArea.style.display = 'none';
            currentBookDataForSave = null;

            try {
                const queryParam = searchType === 'isbn' ? `isbn=${encodeURIComponent(searchValue)}` : `title=${encodeURIComponent(searchValue)}`;
                const response = await fetch(`/api/search_book?${queryParam}`);
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ error: '書籍情報の取得に失敗しました。サーバーからの応答が不正です。' }));
                    throw new Error(errorData.error || `サーバーエラー: ${response.status}`);
                }
                const result = await response.json();

                if (result.type === 'single') {
                    // ISBN検索の結果（1件）
                    displaySingleBook(result.data);
                } else if (result.type === 'multiple') {
                    // 作品名検索の結果（複数件）
                    displayMultipleBooks(result.data);
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

    // 単一書籍表示関数
    function displaySingleBook(bookData) {
        let apiThumbnail = bookData.thumbnail;
        if (apiThumbnail && apiThumbnail.startsWith('http://')) {
            apiThumbnail = apiThumbnail.replace(/^http:\/\//i, 'https://');
        }
        currentBookDataForSave = {
            isbn13: bookData.isbn13,
            title: bookData.title,
            author: bookData.authors && bookData.authors.length > 0 ? bookData.authors.join(', ') : '',
            description: bookData.description,
            publishedDate: bookData.publishedDate,
            publisher: bookData.publisher,
            thumbnail: apiThumbnail
        };
        let authorsDisplay = bookData.authors && bookData.authors.length > 0 ? bookData.authors.join(', ') : '情報なし';
        const imagePath = apiThumbnail ? apiThumbnail : '/images/no-image.png';
        bookInfoArea.innerHTML = `
            <h3>『${bookData.title || 'タイトル不明'}』</h3>
            <img src="${imagePath}" alt="${bookData.title || '書籍'}の表紙" style="max-width: 150px; float: left; margin-right: 15px;">
            <p><strong>著者:</strong> ${authorsDisplay}</p>
            <p><strong>出版社:</strong> ${bookData.publisher || '情報なし'}</p>
            <p><strong>出版日:</strong> ${bookData.publishedDate || '情報なし'}</p>
            <p><strong>ISBN13:</strong> ${bookData.isbn13 || '情報なし'}</p>
            <p style="clear:both;"><strong>概要:</strong><br>${bookData.description || '概要なし'}</p>
        `;
        registrationFormArea.style.display = 'block';
    }

    // 複数書籍表示関数
    function displayMultipleBooks(booksData) {
        let html = '<h3>検索結果</h3><div class="search-results">';
        booksData.forEach((book, index) => {
            let apiThumbnail = book.thumbnail;
            if (apiThumbnail && apiThumbnail.startsWith('http://')) {
                apiThumbnail = apiThumbnail.replace(/^http:\/\//i, 'https://');
            }
            const imagePath = apiThumbnail ? apiThumbnail : '/images/no-image.png';
            const authorsDisplay = book.authors && book.authors.length > 0 ? book.authors.join(', ') : '情報なし';
            
            html += `
                <div class="search-result-item" data-index="${index}">
                    <img src="${imagePath}" alt="${book.title || '書籍'}の表紙" style="max-width: 100px; float: left; margin-right: 10px;">
                    <div class="book-details">
                        <h4>${book.title || 'タイトル不明'}</h4>
                        <p><strong>著者:</strong> ${authorsDisplay}</p>
                        <p><strong>出版社:</strong> ${book.publisher || '情報なし'}</p>
                        <p><strong>出版日:</strong> ${book.publishedDate || '情報なし'}</p>
                        <p><strong>ISBN13:</strong> ${book.isbn13 || '情報なし'}</p>
                        <button class="select-book-btn" data-index="${index}">この本を選択</button>
                    </div>
                    <div style="clear:both;"></div>
                </div>
            `;
        });
        html += '</div>';
        bookInfoArea.innerHTML = html;

        // 「この本を選択」ボタンのイベントリスナーを追加
        const selectButtons = bookInfoArea.querySelectorAll('.select-book-btn');
        selectButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const index = parseInt(e.target.dataset.index);
                const selectedBook = booksData[index];
                displaySingleBook(selectedBook);
            });
        });
    }

    // --- 「この読書記録を保存」ボタンのイベントリスナー ---
    if (saveButton) {
        saveButton.addEventListener('click', async () => {
            if (!currentBookDataForSave || !currentBookDataForSave.isbn13) {
                alert('まず書籍を検索して情報を表示してください。');
                return;
            }
            const readDate = readDateInput.value;
            const ratingValue = ratingInput.value; // 隠しフィールドから値を取得
            const comment = commentInput.value;
            const readingStatus = readingStatusInput.value;

            if (readingStatus === '読了' && !readDate) {
                alert('「読了」ステータスの場合、読了日を入力してください。');
                return;
            }
            const dataToSave = {
                ...currentBookDataForSave,
                readDate: readDate,
                rating: ratingValue ? parseInt(ratingValue) : '', // 隠しフィールドの値を使用
                comment: comment,
                readingStatus: readingStatus
            };

            try {
                const response = await fetch('/api/save_book', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(dataToSave),
                });
                const result = await response.json();
                if (!response.ok) {
                    throw new Error(result.error || `サーバーエラー: ${response.status}`);
                }
                alert(result.message || '読書記録が保存されました！');

                if(searchInput) searchInput.value = '';
                bookInfoArea.innerHTML = '';
                registrationFormArea.style.display = 'none';
                currentBookDataForSave = null;
                readDateInput.value = '';
                ratingInput.value = ''; // 隠しフィールドの値をクリア
                if (ratingStarsContainer) resetStarsVisual(); // 星の見た目をリセット
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