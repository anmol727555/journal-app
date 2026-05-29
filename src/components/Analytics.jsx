import React, { useState, useEffect } from 'react';
import { Calendar, Smile, TrendingUp, Tag, Award } from 'lucide-react';

const MOOD_VALUES = {
  happy: 5,
  energetic: 4.5,
  calm: 4,
  pensive: 3,
  anxious: 2,
  sad: 1
};

const MOODS = {
  happy: { emoji: '😊', label: 'Happy', color: 'hsl(148, 85%, 46%)', rgb: '16, 185, 129' },
  calm: { emoji: '🧘', label: 'Calm', color: 'hsl(186, 90%, 45%)', rgb: '14, 165, 233' },
  energetic: { emoji: '⚡', label: 'Energetic', color: 'hsl(45, 95%, 50%)', rgb: '234, 179, 8' },
  pensive: { emoji: '💭', label: 'Pensive', color: 'hsl(263, 90%, 65%)', rgb: '139, 92, 246' },
  anxious: { emoji: '😰', label: 'Anxious', color: 'hsl(28, 95%, 55%)', rgb: '249, 115, 22' },
  sad: { emoji: '🌧️', label: 'Sad', color: 'hsl(0, 85%, 60%)', rgb: '239, 68, 68' }
};

export default function Analytics({ entries }) {
  const [moodTrendData, setMoodTrendData] = useState([]);
  const [moodDistribution, setMoodDistribution] = useState({});
  const [topTags, setTopTags] = useState([]);
  const [heatmapDays, setHeatmapDays] = useState([]);

  useEffect(() => {
    if (entries.length === 0) return;

    // 1. Mood trend over time (sort oldest to newest, limit to last 7 reflections)
    const trend = [...entries]
      .sort((a,b) => new Date(a.date) - new Date(b.date))
      .slice(-7)
      .map(e => ({
        date: new Date(e.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        value: MOOD_VALUES[e.mood] || 3,
        mood: e.mood,
        title: e.title
      }));
    setMoodTrendData(trend);

    // 2. Mood distribution counts
    const counts = {};
    let total = 0;
    entries.forEach(e => {
      if (e.mood) {
        counts[e.mood] = (counts[e.mood] || 0) + 1;
        total++;
      }
    });
    
    const distribution = {};
    Object.keys(counts).forEach(key => {
      distribution[key] = {
        count: counts[key],
        percent: Math.round((counts[key] / total) * 100)
      };
    });
    setMoodDistribution(distribution);

    // 3. Top tags list
    const tagCounts = {};
    entries.forEach(e => {
      e.tags?.forEach(tag => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      });
    });

    const sortedTags = Object.entries(tagCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a,b) => b.count - a.count)
      .slice(0, 5);
    setTopTags(sortedTags);

    // 4. Github consistency heatmap (calculate past 35 days)
    const days = [];
    const today = new Date();
    
    // Sort entries by date string for quick O(1) lookup
    const entryDatesMap = {};
    entries.forEach(e => {
      const dStr = new Date(e.date).toDateString();
      entryDatesMap[dStr] = (entryDatesMap[dStr] || 0) + e.wordCount;
    });

    for (let i = 34; i >= 0; i--) {
      const tempDate = new Date();
      tempDate.setDate(today.getDate() - i);
      const dString = tempDate.toDateString();
      
      const wordsWritten = entryDatesMap[dString] || 0;
      let activityClass = '';
      if (wordsWritten > 0 && wordsWritten < 150) activityClass = 'active-low';
      else if (wordsWritten >= 150 && wordsWritten < 400) activityClass = 'active-med';
      else if (wordsWritten >= 400) activityClass = 'active-high';

      days.push({
        date: tempDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }),
        words: wordsWritten,
        activity: activityClass
      });
    }
    setHeatmapDays(days);
  }, [entries]);

  if (entries.length === 0) {
    return (
      <div className="glass-panel empty-state" style={{ marginTop: '2rem' }}>
        <div className="empty-icon">📊</div>
        <h3 className="empty-title">Reflective Silence</h3>
        <p className="empty-desc">
          Analytics dashboard requires writing at least one journal entry to parse your emotional trends and tracking insights.
        </p>
      </div>
    );
  }

  // Draw customized SVG Trend Line Chart
  const svgWidth = 500;
  const svgHeight = 200;
  const paddingX = 40;
  const paddingY = 30;

  let trendPath = '';
  let areaPath = '';
  const points = [];

  if (moodTrendData.length > 1) {
    const minVal = 1;
    const maxVal = 5;
    const intervalX = (svgWidth - paddingX * 2) / (moodTrendData.length - 1);
    
    moodTrendData.forEach((pt, index) => {
      const x = paddingX + index * intervalX;
      // map 1..5 value to SVG coordinate (minVal goes bottom, maxVal goes top)
      const ratio = (pt.value - minVal) / (maxVal - minVal);
      const y = svgHeight - paddingY - ratio * (svgHeight - paddingY * 2);
      points.push({ x, y, info: pt });
    });

    trendPath = `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ');
    areaPath = trendPath + ` L ${points[points.length-1].x} ${svgHeight - paddingY} L ${points[0].x} ${svgHeight - paddingY} Z`;
  }

  // Draw custom SVG Donut Chart
  let accumulatedAngle = 0;
  const donutRadius = 60;
  const donutCenterX = 100;
  const donutCenterY = 100;

  return (
    <div className="analytics-layout">
      <div>
        <h1 className="greeting-text">Emotional Insights</h1>
        <p className="greeting-subtext">Deep-diving into your personal reflections and patterns.</p>
      </div>

      <div className="analytics-grid-top">
        {/* Mood Trend Panel */}
        <div className="glass-panel analytics-panel">
          <h3 className="analytics-panel-title">
            <TrendingUp size={18} />
            Mood Progression (Last 7 Reflections)
          </h3>
          
          <div className="chart-container">
            {moodTrendData.length > 1 ? (
              <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} width="100%" height="100%">
                <defs>
                  {/* Linear gradient fill under trend line */}
                  <linearGradient id="chartGlow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Y Axis Grid lines */}
                {[1, 2, 3, 4, 5].map((val) => {
                  const ratio = (val - 1) / 4;
                  const y = svgHeight - paddingY - ratio * (svgHeight - paddingY * 2);
                  return (
                    <g key={val}>
                      <line 
                        x1={paddingX} 
                        y1={y} 
                        x2={svgWidth - paddingX} 
                        y2={y} 
                        stroke="var(--border-glass)" 
                        strokeWidth="1" 
                      />
                      <text 
                        x={paddingX - 10} 
                        y={y + 4} 
                        fill="var(--text-muted)" 
                        fontSize="10" 
                        textAnchor="end"
                      >
                        {val === 5 ? '😊' : val === 4 ? '🧘' : val === 3 ? '💭' : val === 2 ? '😰' : '🌧️'}
                      </text>
                    </g>
                  );
                })}

                {/* Gradient Area Fill */}
                <path d={areaPath} fill="url(#chartGlow)" />

                {/* Main Trend Line */}
                <path 
                  d={trendPath} 
                  fill="none" 
                  stroke="var(--color-accent)" 
                  strokeWidth="3.5" 
                  strokeLinecap="round"
                  className="svg-chart-line"
                />

                {/* Interactive Points */}
                {points.map((p, idx) => (
                  <g key={idx}>
                    <circle 
                      cx={p.x} 
                      cy={p.y} 
                      r="5" 
                      fill="var(--bg-primary)" 
                      stroke="var(--color-accent)" 
                      strokeWidth="2.5"
                      className="svg-chart-dot"
                    />
                    {/* X axis labels */}
                    <text 
                      x={p.x} 
                      y={svgHeight - 10} 
                      fill="var(--text-muted)" 
                      fontSize="9" 
                      textAnchor="middle"
                    >
                      {p.info.date}
                    </text>
                  </g>
                ))}
              </svg>
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>Write at least 2 entries to display your trend chart.</p>
            )}
          </div>
        </div>

        {/* Mood Distribution */}
        <div className="glass-panel analytics-panel">
          <h3 className="analytics-panel-title">
            <Smile size={18} />
            Emotional Ratio
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginTop: '0.5rem' }}>
            {Object.entries(MOODS).map(([key, m]) => {
              const data = moodDistribution[key] || { count: 0, percent: 0 };
              return (
                <div key={key} className="tag-metric-row">
                  <div className="tag-metric-meta">
                    <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <span>{m.emoji}</span>
                      <span>{m.label}</span>
                    </span>
                    <span style={{ fontWeight: 600 }}>{data.percent}%</span>
                  </div>
                  <div className="tag-metric-bar-bg">
                    <div 
                      className="tag-metric-bar-fill" 
                      style={{ 
                        width: `${data.percent}%`, 
                        background: `linear-gradient(90deg, ${m.color} 0%, rgba(${m.rgb}, 0.5) 100%)` 
                      }} 
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="analytics-grid-bottom">
        {/* Focus Tags */}
        <div className="glass-panel analytics-panel">
          <h3 className="analytics-panel-title">
            <Tag size={18} />
            Focus Tags
          </h3>
          <div className="tag-list-metrics" style={{ marginTop: '0.5rem' }}>
            {topTags.length > 0 ? (
              topTags.map((tag, idx) => {
                const maxCount = topTags[0].count;
                const percent = Math.round((tag.count / maxCount) * 100);
                return (
                  <div key={idx} className="tag-metric-row">
                    <div className="tag-metric-meta">
                      <span>#{tag.name}</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                        {tag.count} {tag.count === 1 ? 'reflection' : 'reflections'}
                      </span>
                    </div>
                    <div className="tag-metric-bar-bg">
                      <div className="tag-metric-bar-fill" style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                );
              })
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Add tags to your journal entries to discover themes.</p>
            )}
          </div>
        </div>

        {/* Reflection Heatmap */}
        <div className="glass-panel analytics-panel">
          <h3 className="analytics-panel-title">
            <Calendar size={18} />
            Consistency Map (Past 35 Days)
          </h3>
          
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '-0.25rem' }}>
            A heat visual tracking your typing consistency.
          </p>

          <div className="heatmap-grid">
            {['S','M','T','W','T','F','S'].map((day, idx) => (
              <div key={idx} className="heatmap-day-label">{day}</div>
            ))}
            
            {heatmapDays.map((cell, idx) => (
              <div 
                key={idx} 
                className={`heatmap-cell ${cell.activity}`}
              >
                <div className="heatmap-tooltip">
                  {cell.date}: {cell.words} words
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.5rem', marginTop: '1.25rem', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            <span>Less</span>
            <div className="heatmap-cell" style={{ width: '12px', height: '12px', background: 'var(--bg-secondary)', margin: 0 }} />
            <div className="heatmap-cell active-low" style={{ width: '12px', height: '12px', margin: 0 }} />
            <div className="heatmap-cell active-med" style={{ width: '12px', height: '12px', margin: 0 }} />
            <div className="heatmap-cell active-high" style={{ width: '12px', height: '12px', margin: 0 }} />
            <span>More Reflection</span>
          </div>
        </div>
      </div>
    </div>
  );
}
