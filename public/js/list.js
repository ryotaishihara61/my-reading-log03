// public/js/list.js

document.addEventListener('DOMContentLoaded', () => {
    const bookListContainer = document.getElementById('bookListContainer');
    const paginationControls = document.getElementById('paginationControls');
    const totalBooksCountSpan = document.getElementById('totalBooksCount');

    const keywordSearchInput = document.getElementById('keywordSearch');
    const readMonthFilterSelect = document.getElementById('readMonthFilter');
    const ratingFilterSelect = document.getElementById('ratingFilter');
    const readingStatusFilterSelect = document.getElementById('readingStatusFilter');
    const applyFilterButton = document.getElementById('applyFilterButton');
    const resetFilterButton = document.getElementById('resetFilterButton');

    const chartCanvas = document.getElementById('booksReadChart');
    let booksChart = null;

    let currentPage = 1;
    const booksPerPage = 10;

    async function fetchAndDisplayBooks(page = 1, filters = {}) {
        currentPage = page;
        const queryParams = new URLSearchParams({
            page: currentPage,
            limit: booksPerPage,
            ...filters
        });

        try {
            const response = await fetch(`/api/get_books?${queryParams.toString()}`);
            if (!response.ok) {
                const errorResult = await response.json().catch(() => ({ error: '書籍リストの取得に失敗しました。' }));
                throw new Error(errorResult.error);
            }
            const result = await response.json();

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
        bookListContainer.innerHTML = '';

        if (!books || books.length === 0) {
            bookListContainer.innerHTML = '<p>該当する書籍はありません。</p>';
            return;
        }

        books.forEach(book => {
            const bookItem = document.createElement('div');
            bookItem.className = 'book-item';

            let authors = book.author || '著者不明';
            if (Array.isArray(book.author)) {
                authors = book.author.join(', ');
            }

            let bookThumbnailFromSheet = book.thumbnail;
            // サムネイルURLがHTTPの場合、HTTPSに変換
            if (bookThumbnailFromSheet && bookThumbnailFromSheet.startsWith('http://')) {
                bookThumbnailFromSheet = bookThumbnailFromSheet.replace(/^http:\/\//i, 'https://');
            }
            const imagePath = bookThumbnailFromSheet ? bookThumbnailFromSheet : '/images/no-image.png'; // 代替画像パス

            const title = book.title || 'タイトル不明';
            const readDate = book.readDate || '未読了';
            const rating = book.rating ? '★'.repeat(parseInt(book.rating)) + '☆'.repeat(5 - parseInt(book.rating)) + ` (${book.rating})` : '評価なし';
            const comment = book.comment || '';
            const readingStatus = book.readingStatus || 'ステータスなし';

            bookItem.innerHTML = `
                <img src="${imagePath}" alt="${title}の表紙">
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

        if (totalPagesNum <= 1) return;

        const prevButton = document.createElement('button');
        prevButton.textContent = '前へ';
        prevButton.disabled = currentPageNum <= 1;
        prevButton.addEventListener('click', () => {
            if (currentPageNum > 1) {
                fetchAndDisplayBooks(currentPageNum - 1, getCurrentFilters());
            }
        });
        paginationControls.appendChild(prevButton);

        const currentPageSpan = document.createElement('span');
        currentPageSpan.textContent = ` ${currentPageNum} / ${totalPagesNum} `;
        currentPageSpan.style.margin = "0 10px";
        paginationControls.appendChild(currentPageSpan);

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
        if (readMonthFilterSelect.value) filters.read_month = readMonthFilterSelect.value;
        if (ratingFilterSelect.value) filters.rating = ratingFilterSelect.value;
        if (readingStatusFilterSelect.value) filters.reading_status = readingStatusFilterSelect.value;
        return filters;
    }

    async function fetchAndRenderChart() {
        if (!chartCanvas) return;
        try {
            const response = await fetch('/api/books_stats');
            if (!response.ok) throw new Error('統計データの取得に失敗しました。');
            const stats = await response.json();

            if (booksChart) {
                booksChart.destroy();
            }

            booksChart = new Chart(chartCanvas, {
                type: 'bar',
                data: {
                    labels: stats.labels,
                    datasets: [{
                        label: '月別読了冊数',
                        data: stats.data,
                        backgroundColor: 'rgba(75, 192, 192, 0.6)',
                        borderColor: 'rgba(75, 192, 192, 1)',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                stepSize: 1,
                                precision: 0
                            }
                        }
                    }
                }
            });

            if (readMonthFilterSelect && stats.labels) {
                while (readMonthFilterSelect.options.length > 1) {
                    readMonthFilterSelect.remove(1);
                }
                stats.labels.slice().reverse().forEach(month => {
                    const option = document.createElement('option');
                    option.value = month;
                    option.textContent = month;
                    readMonthFilterSelect.appendChild(option);
                });
            }

        } catch (error) {
            console.error('グラフ描画エラー:', error);
            if (chartCanvas.getContext('2d')) {
                 const ctx = chartCanvas.getContext('2d');
                 ctx.font = '16px Arial';
                 ctx.fillStyle = 'red';
                 ctx.textAlign = 'center';
                 ctx.fillText(`グラフデータの読み込みに失敗: ${error.message}`, chartCanvas.width / 2, chartCanvas.height / 2);
            }
        }
    }

    if (applyFilterButton) {
        applyFilterButton.addEventListener('click', () => {
            fetchAndDisplayBooks(1, getCurrentFilters());
        });
    }

    if (resetFilterButton) {
        resetFilterButton.addEventListener('click', () => {
            keywordSearchInput.value = '';
            readMonthFilterSelect.value = '';
            ratingFilterSelect.value = '';
            readingStatusFilterSelect.value = '';
            fetchAndDisplayBooks(1, {});
        });
    }

    fetchAndDisplayBooks(currentPage, getCurrentFilters());
    fetchAndRenderChart();
});