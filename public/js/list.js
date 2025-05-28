// public/js/list.js

document.addEventListener('DOMContentLoaded', () => {
    const bookListContainer = document.getElementById('bookListContainer');
    const paginationControls = document.getElementById('paginationControls');
    const totalBooksCountSpan = document.getElementById('totalBooksCount');

    // フィルタ用要素
    const keywordSearchInput = document.getElementById('keywordSearch');
    const readMonthFilterSelect = document.getElementById('readMonthFilter');
    const ratingFilterSelect = document.getElementById('ratingFilter');
    const readingStatusFilterSelect = document.getElementById('readingStatusFilter');
    const applyFilterButton = document.getElementById('applyFilterButton');
    const resetFilterButton = document.getElementById('resetFilterButton');

    // Chart.js用
    const chartCanvas = document.getElementById('booksReadChart');
    let booksChart = null; // チャートオブジェクトを保持

    let currentPage = 1;
    const booksPerPage = 10; // 1ページあたりの表示件数 (バックエンドのlimitと合わせる)

    async function fetchAndDisplayBooks(page = 1, filters = {}) {
        currentPage = page;
        const queryParams = new URLSearchParams({
            page: currentPage,
            limit: booksPerPage,
            ...filters // スプレッド構文でフィルタ条件を展開
        });

        try {
            const response = await fetch(`/api/get_books?${queryParams.toString()}`);
            if (!response.ok) {
                const errorResult = await response.json().catch(() => ({ error: '書籍リストの取得に失敗しました。' }));
                throw new Error(errorResult.error);
            }
            const result = await response.json(); // { data: booksArray, total, page, limit, totalPages }

            renderBookList(result.data);
            renderPagination(result.page, result.totalPages);
            if(totalBooksCountSpan) totalBooksCountSpan.textContent = result.total;

        } catch (error) {
            console.error('書籍リスト表示エラー:', error);
            if(bookListContainer) bookListContainer.innerHTML = `<p style="color:red;">リストの読み込みに失敗しました: ${error.message}</p>`;
            if(totalBooksCountSpan) totalBooksCountSpan.textContent = '0';
        }
    }

    function renderBookList(books) {
        if (!bookListContainer) return;
        bookListContainer.innerHTML = ''; // 表示をクリア

        if (!books || books.length === 0) {
            bookListContainer.innerHTML = '<p>該当する書籍はありません。</p>';
            return;
        }

        books.forEach(book => {
            const bookItem = document.createElement('div');
            bookItem.className = 'book-item';

            let authors = book.author || '著者不明';
            if (Array.isArray(book.author)) { // 著者が配列の場合 (Google Books APIの直接の結果など)
                authors = book.author.join(', ');
            }


            // スプレッドシートのカラム名に合わせてキーを修正
            const thumbnail = book.thumbnail || 'https://via.placeholder.com/80x120?text=NoImage'; // book.thumbnail
            const title = book.title || 'タイトル不明'; // book.title
            // const authorDisplay = book.author || '著者不明'; // book.author (上記で処理済み)
            const readDate = book.readDate || '未読了'; // book.readDate
            const rating = book.rating ? '★'.repeat(parseInt(book.rating)) + '☆'.repeat(5 - parseInt(book.rating)) + ` (${book.rating})` : '評価なし'; // book.rating
            const comment = book.comment || ''; // book.comment
            const readingStatus = book.readingStatus || 'ステータスなし'; // book.readingStatus
            const description = book.description || '概要なし'; // book.description

            bookItem.innerHTML = `
                <img src="${thumbnail}" alt="${title}の表紙">
                <div class="book-item-details">
                    <h4>${title}</h4>
                    <p><strong>著者:</strong> ${authors}</p>
                    <p><strong>読了日:</strong> ${readDate}</p>
                    <p><strong>評価:</strong> ${rating}</p>
                    <p><strong>ステータス:</strong> ${readingStatus}</p>
                    <p><strong>コメント:</strong> ${comment ? comment.substring(0, 100) + (comment.length > 100 ? '...' : '') : 'なし'}</p>
                    </div>
            `;
            bookListContainer.appendChild(bookItem);
        });
    }

    function renderPagination(currentPageNum, totalPagesNum) {
        if (!paginationControls) return;
        paginationControls.innerHTML = '';

        if (totalPagesNum <= 1) return; // 1ページ以下の場合はページネーションコントロールを表示しない

        // 前へボタン
        const prevButton = document.createElement('button');
        prevButton.textContent = '前へ';
        prevButton.disabled = currentPageNum <= 1;
        prevButton.addEventListener('click', () => {
            if (currentPageNum > 1) {
                fetchAndDisplayBooks(currentPageNum - 1, getCurrentFilters());
            }
        });
        paginationControls.appendChild(prevButton);

        // ページ番号 (簡易版: 現在ページのみ表示)
        // より複雑なページネーション (例: 1 ... 5 6 7 ... 10) も実装可能
        const currentPageSpan = document.createElement('span');
        currentPageSpan.textContent = ` ${currentPageNum} / ${totalPagesNum} `;
        currentPageSpan.style.margin = "0 10px";
        paginationControls.appendChild(currentPageSpan);


        // 次へボタン
        const nextButton = document.createElement('button');
        nextButton.textContent = '次へ';
        nextButton.disabled = currentPageNum >= totalPagesNum;
        nextButton.addEventListener('click', () => {
            if (currentPageNum < totalPagesNum) {
                fetchAndDisplayBooks(currentPageNum + 1, getCurrentFilters());
            }
        });
        paginationControls.appendChild(nextButton);
    }

    function getCurrentFilters() {
        const filters = {};
        if (keywordSearchInput.value) filters.keyword = keywordSearchInput.value;
        if (readMonthFilterSelect.value) filters.read_month = readMonthFilterSelect.value; // バックエンドは read_month
        if (ratingFilterSelect.value) filters.rating = ratingFilterSelect.value;
        if (readingStatusFilterSelect.value) filters.reading_status = readingStatusFilterSelect.value; // バックエンドは reading_status
        return filters;
    }

    async function fetchAndRenderChart() {
        if (!chartCanvas) return;
        try {
            const response = await fetch('/api/books_stats');
            if (!response.ok) throw new Error('統計データの取得に失敗しました。');
            const stats = await response.json(); // { labels: [...], data: [...] }

            if (booksChart) {
                booksChart.destroy(); // 既存のチャートがあれば破棄
            }

            booksChart = new Chart(chartCanvas, {
                type: 'bar',
                data: {
                    labels: stats.labels, // X軸のラベル (年月)
                    datasets: [{
                        label: '月別読了冊数',
                        data: stats.data, // Y軸のデータ (冊数)
                        backgroundColor: 'rgba(75, 192, 192, 0.6)',
                        borderColor: 'rgba(75, 192, 192, 1)',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true, // true にすると Canvas の width/height に従う
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                stepSize: 1, // 整数単位で表示
                                precision: 0  // 小数点以下を表示しない
                            }
                        }
                    }
                }
            });

            // 読了年月フィルタのオプションを動的に生成
            if (readMonthFilterSelect && stats.labels) {
                // 既存のオプションをクリア (最初の「すべて」オプションを除く)
                while (readMonthFilterSelect.options.length > 1) {
                    readMonthFilterSelect.remove(1);
                }
                // stats.labels はソートされている前提 (例: "2023-01", "2023-02")
                // 降順で表示したい場合は .reverse() を使う
                stats.labels.slice().reverse().forEach(month => {
                    const option = document.createElement('option');
                    option.value = month;
                    option.textContent = month;
                    readMonthFilterSelect.appendChild(option);
                });
            }

        } catch (error) {
            console.error('グラフ描画エラー:', error);
            if (chartCanvas.getContext('2d')) { // キャンバスが有効ならエラーメッセージ表示
                 const ctx = chartCanvas.getContext('2d');
                 ctx.font = '16px Arial';
                 ctx.fillStyle = 'red';
                 ctx.textAlign = 'center';
                 ctx.fillText(`グラフデータの読み込みに失敗: ${error.message}`, chartCanvas.width / 2, chartCanvas.height / 2);
            }
        }
    }

    // --- イベントリスナーの設定 ---
    if (applyFilterButton) {
        applyFilterButton.addEventListener('click', () => {
            fetchAndDisplayBooks(1, getCurrentFilters()); // フィルタ適用時は1ページ目から
        });
    }

    if (resetFilterButton) {
        resetFilterButton.addEventListener('click', () => {
            keywordSearchInput.value = '';
            readMonthFilterSelect.value = '';
            ratingFilterSelect.value = '';
            readingStatusFilterSelect.value = '';
            fetchAndDisplayBooks(1, {}); // フィルタをリセットして1ページ目から
        });
    }


    // --- 初期表示 ---
    fetchAndDisplayBooks(currentPage, getCurrentFilters()); // 初回ロード (フィルタなし、1ページ目)
    fetchAndRenderChart(); // グラフも初回ロード
});