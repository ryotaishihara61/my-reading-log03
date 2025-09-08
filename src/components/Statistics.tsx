import React, { useMemo } from 'react';
import { ReadingRecord } from '../types';
import './Statistics.css';

interface StatisticsProps {
  records: ReadingRecord[];
}

const Statistics: React.FC<StatisticsProps> = ({ records }) => {
  const stats = useMemo(() => {
    const completed = records.filter(r => r.status === 'completed');
    
    const monthlyData = new Map<string, number>();
    
    completed.forEach(record => {
      if (record.completedDate) {
        const date = new Date(record.completedDate);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        monthlyData.set(key, (monthlyData.get(key) || 0) + 1);
      }
    });

    const sortedMonths = Array.from(monthlyData.keys()).sort();
    const chartData = sortedMonths.map(month => {
      const [year, monthNum] = month.split('-');
      return {
        month: `${year}/${monthNum}`,
        count: monthlyData.get(month) || 0
      };
    });

    const totalCompleted = completed.length;
    const averageRating = completed.length > 0 
      ? completed.reduce((sum, record) => sum + (record.rating || 0), 0) / completed.filter(r => r.rating).length
      : 0;

    const currentYear = new Date().getFullYear();
    const thisYearCompleted = completed.filter(record => {
      if (!record.completedDate) return false;
      return new Date(record.completedDate).getFullYear() === currentYear;
    }).length;

    const statusCounts = {
      want_to_read: records.filter(r => r.status === 'want_to_read').length,
      reading: records.filter(r => r.status === 'reading').length,
      completed: records.filter(r => r.status === 'completed').length
    };

    const ratingDistribution = [1, 2, 3, 4, 5].map(rating => ({
      rating,
      count: completed.filter(r => r.rating === rating).length
    }));

    return {
      chartData,
      totalCompleted,
      averageRating,
      thisYearCompleted,
      statusCounts,
      ratingDistribution,
      totalBooks: records.length
    };
  }, [records]);

  const renderStars = (rating: number) => {
    return (
      <div className="stars">
        {[1, 2, 3, 4, 5].map(star => (
          <span key={star} className={`star ${star <= rating ? 'filled' : ''}`}>
            ★
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className="statistics">
      <h2>読書統計</h2>
      
      <div className="stats-overview">
        <div className="stat-card">
          <div className="stat-number">{stats.totalBooks}</div>
          <div className="stat-label">登録書籍数</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-number">{stats.totalCompleted}</div>
          <div className="stat-label">読了書籍数</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-number">{stats.thisYearCompleted}</div>
          <div className="stat-label">今年の読了数</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-number">
            {stats.averageRating > 0 ? stats.averageRating.toFixed(1) : '---'}
          </div>
          <div className="stat-label">平均評価</div>
        </div>
      </div>

      <div className="status-breakdown">
        <h3>ステータス別書籍数</h3>
        <div className="status-bars">
          <div className="status-bar">
            <span className="status-label">読みたい</span>
            <div className="bar-container">
              <div 
                className="bar want-to-read" 
                style={{ width: `${stats.totalBooks > 0 ? (stats.statusCounts.want_to_read / stats.totalBooks) * 100 : 0}%` }}
              ></div>
            </div>
            <span className="status-count">{stats.statusCounts.want_to_read}</span>
          </div>
          
          <div className="status-bar">
            <span className="status-label">読書中</span>
            <div className="bar-container">
              <div 
                className="bar reading" 
                style={{ width: `${stats.totalBooks > 0 ? (stats.statusCounts.reading / stats.totalBooks) * 100 : 0}%` }}
              ></div>
            </div>
            <span className="status-count">{stats.statusCounts.reading}</span>
          </div>
          
          <div className="status-bar">
            <span className="status-label">読了</span>
            <div className="bar-container">
              <div 
                className="bar completed" 
                style={{ width: `${stats.totalBooks > 0 ? (stats.statusCounts.completed / stats.totalBooks) * 100 : 0}%` }}
              ></div>
            </div>
            <span className="status-count">{stats.statusCounts.completed}</span>
          </div>
        </div>
      </div>

      {stats.chartData.length > 0 && (
        <div className="monthly-chart">
          <h3>月別読了数</h3>
          <div className="simple-chart">
            {stats.chartData.map(({ month, count }) => (
              <div key={month} className="chart-bar">
                <div className="bar-label">{month}</div>
                <div className="bar-container">
                  <div 
                    className="bar-fill" 
                    style={{ 
                      height: `${Math.max(20, (count / Math.max(...stats.chartData.map(d => d.count))) * 100)}px` 
                    }}
                  ></div>
                </div>
                <div className="bar-value">{count}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {stats.ratingDistribution.some(r => r.count > 0) && (
        <div className="rating-distribution">
          <h3>評価分布</h3>
          <div className="rating-bars">
            {stats.ratingDistribution.reverse().map(({ rating, count }) => (
              <div key={rating} className="rating-bar">
                <div className="rating-stars">
                  {renderStars(rating)}
                </div>
                <div className="bar-container">
                  <div 
                    className="bar rating-bar-fill" 
                    style={{ 
                      width: `${stats.totalCompleted > 0 ? (count / stats.totalCompleted) * 100 : 0}%` 
                    }}
                  ></div>
                </div>
                <span className="rating-count">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Statistics;