import React, { useState } from 'react';
import {
  BarChart3,
  Users,
  MessageSquare,
  Database,
  Clock,
  Smile,
  Meh,
  Frown,
  TrendingUp,
  Award,
  Zap,
  CheckCircle2,
  Calendar,
  Globe,
  Download,
  FileText,
  Layers,
} from 'lucide-react';
import { Badge } from '../UI/Badge';
import { Button } from '../UI/Button';
import './Analytics.css';

export function AnalyticsDashboard({ analyticsData, onExportAnalytics, t }) {
  const [hoveredTrend, setHoveredTrend] = useState(null);
  const [hoveredMemGrowth, setHoveredMemGrowth] = useState(null);

  const {
    totalConversations = 128,
    totalCustomers = 24,
    memoriesStored = 412,
    avgResponseTimeMs = 385,
    csatScore = 4.88,
    recallHitRatePercent = 94.6,
    sentimentDistribution = { positive: 82, neutral: 14, negative: 4 },
    trendData = [],
    categoryBreakdown = [],
  } = analyticsData || {};

  // Mocked memory growth data across past 7 days
  const memoryGrowthData = [
    { day: 'Mon', cumulative: 340, newRetained: 18 },
    { day: 'Tue', cumulative: 355, newRetained: 15 },
    { day: 'Wed', cumulative: 372, newRetained: 17 },
    { day: 'Thu', cumulative: 388, newRetained: 16 },
    { day: 'Fri', cumulative: 401, newRetained: 13 },
    { day: 'Sat', cumulative: 407, newRetained: 6 },
    { day: 'Sun', cumulative: 412, newRetained: 5 },
  ];

  // Language usage distribution
  const languageUsageData = [
    { lang: 'English (en)', percentage: 62, count: 79, color: '#3b82f6', flag: '🇺🇸' },
    { lang: 'Telugu (te)', percentage: 21, count: 27, color: '#06b6d4', flag: '🇮🇳' },
    { lang: 'Hindi (hi)', percentage: 17, count: 22, color: '#8b5cf6', flag: '🇮🇳' },
  ];

  const maxCount = Math.max(...trendData.map((d) => d.count), 35);
  const maxCumulative = Math.max(...memoryGrowthData.map((d) => d.cumulative), 450);

  const handleExport = () => {
    const report = {
      generatedAt: new Date().toISOString(),
      summary: {
        totalConversations,
        totalCustomers,
        memoriesStored,
        avgResponseTimeMs,
        csatScore,
        recallHitRatePercent,
      },
      sentimentDistribution,
      trendData,
      memoryGrowthData,
      languageUsageData,
      categoryBreakdown,
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `support-analytics-report-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="analytics-view glass-panel animate-fade-in">
      {/* Analytics Header */}
      <div className="analytics-header">
        <div className="analytics-title-group">
          <div className="analytics-icon-box">
            <BarChart3 size={22} strokeWidth={2.2} />
          </div>
          <div>
            <h2 className="analytics-title">{t.analyticsTitle || 'Support & Memory Analytics'}</h2>
            <p className="analytics-sub">
              {t.analyticsSubtitle || 'Operational insights across memory recall, response time, and satisfaction'}
            </p>
          </div>
        </div>

        <div className="analytics-header-actions">
          <div className="analytics-time-badge">
            <Calendar size={13} />
            <span>{t.past7Days || 'Past 7 Days'}</span>
          </div>

          <Button
            variant="primary"
            size="sm"
            icon={Download}
            onClick={handleExport}
            title={t.exportAnalyticsReport || 'Export Analytics Report'}
          >
            {t.exportAnalyticsReport || 'Export Analytics'}
          </Button>
        </div>
      </div>

      {/* 6 Key Performance Metric Cards */}
      <div className="kpi-metrics-grid">
        {/* KPI 1: Conversations */}
        <div className="kpi-card glass-card">
          <div className="kpi-top-row">
            <span className="kpi-label">{t.statTotalConversations || 'Total Conversations'}</span>
            <div className="kpi-icon-box" style={{ color: '#3b82f6', backgroundColor: '#3b82f615' }}>
              <MessageSquare size={16} />
            </div>
          </div>
          <div className="kpi-main-val text-gradient">{totalConversations}</div>
          <div className="kpi-footer">
            <span className="kpi-trend kpi-trend--up">
              <TrendingUp size={12} /> +18.4%
            </span>
            <span className="kpi-sub-text">vs previous period</span>
          </div>
        </div>

        {/* KPI 2: Total Customers */}
        <div className="kpi-card glass-card">
          <div className="kpi-top-row">
            <span className="kpi-label">{t.statTotalCustomers || 'Active Customers'}</span>
            <div className="kpi-icon-box" style={{ color: '#8b5cf6', backgroundColor: '#8b5cf615' }}>
              <Users size={16} />
            </div>
          </div>
          <div className="kpi-main-val">{totalCustomers}</div>
          <div className="kpi-footer">
            <span className="kpi-trend kpi-trend--neutral">100% indexed</span>
            <span className="kpi-sub-text">active partitions</span>
          </div>
        </div>

        {/* KPI 3: Memories Stored */}
        <div className="kpi-card glass-card">
          <div className="kpi-top-row">
            <span className="kpi-label">{t.statMemoriesStored || 'Memories Stored'}</span>
            <div className="kpi-icon-box" style={{ color: '#06b6d4', backgroundColor: '#06b6d415' }}>
              <Database size={16} />
            </div>
          </div>
          <div className="kpi-main-val">{memoriesStored}</div>
          <div className="kpi-footer">
            <span className="kpi-trend kpi-trend--up">
              <TrendingUp size={12} /> +24 new
            </span>
            <span className="kpi-sub-text">retained this week</span>
          </div>
        </div>

        {/* KPI 4: Avg Response Time */}
        <div className="kpi-card glass-card">
          <div className="kpi-top-row">
            <span className="kpi-label">{t.statAvgResponseTime || 'Avg Response Time'}</span>
            <div className="kpi-icon-box" style={{ color: '#10b981', backgroundColor: '#10b98115' }}>
              <Zap size={16} />
            </div>
          </div>
          <div className="kpi-main-val">{avgResponseTimeMs}ms</div>
          <div className="kpi-footer">
            <span className="kpi-trend kpi-trend--up">⚡ High speed</span>
            <span className="kpi-sub-text">LLM inference</span>
          </div>
        </div>

        {/* KPI 5: CSAT Score */}
        <div className="kpi-card glass-card">
          <div className="kpi-top-row">
            <span className="kpi-label">{t.statCSAT || 'Customer Satisfaction'}</span>
            <div className="kpi-icon-box" style={{ color: '#f59e0b', backgroundColor: '#f59e0b15' }}>
              <Award size={16} />
            </div>
          </div>
          <div className="kpi-main-val">{csatScore} / 5.0</div>
          <div className="kpi-footer">
            <span className="kpi-trend kpi-trend--up">★ 98% positive</span>
            <span className="kpi-sub-text">verified ratings</span>
          </div>
        </div>

        {/* KPI 6: Memory Recall Hit Rate */}
        <div className="kpi-card glass-card">
          <div className="kpi-top-row">
            <span className="kpi-label">{t.statRecallHitRate || 'Recall Hit Rate'}</span>
            <div className="kpi-icon-box" style={{ color: '#ec4899', backgroundColor: '#ec489915' }}>
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div className="kpi-main-val">{recallHitRatePercent}%</div>
          <div className="kpi-footer">
            <span className="kpi-trend kpi-trend--up">Top-3 semantic</span>
            <span className="kpi-sub-text">precision</span>
          </div>
        </div>
      </div>

      {/* Grid: Trend Chart & Sentiment Distribution */}
      <div className="analytics-middle-grid">
        {/* Activity Trend Chart */}
        <div className="chart-card glass-card">
          <div className="chart-header">
            <div className="chart-title-group">
              <TrendingUp size={16} className="chart-icon" />
              <h3 className="chart-title">{t.conversationTrend || 'Conversation Activity Trend'}</h3>
            </div>
            <Badge variant="accent" size="xs">
              Daily Turns
            </Badge>
          </div>

          <div className="trend-chart-wrapper">
            <div className="trend-bars-container">
              {trendData.map((item) => {
                const heightPercent = Math.round((item.count / maxCount) * 100);
                const isHovered = hoveredTrend?.day === item.day;
                return (
                  <div
                    key={item.day}
                    className="trend-bar-column"
                    onMouseEnter={() => setHoveredTrend(item)}
                    onMouseLeave={() => setHoveredTrend(null)}
                  >
                    {isHovered && (
                      <div className="trend-tooltip glass-card animate-fade-in">
                        <strong>{item.day}: {item.count} sessions</strong>
                        <span>{item.memoriesRecalled} memories recalled</span>
                        <span>{item.avgLatency}ms avg latency</span>
                      </div>
                    )}
                    <div className="trend-bar-track">
                      <div
                        className={`trend-bar-fill ${isHovered ? 'trend-bar-fill--hover' : ''}`}
                        style={{ height: `${heightPercent}%` }}
                      />
                    </div>
                    <span className="trend-day-label">{item.day}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sentiment Distribution Card */}
        <div className="sentiment-card glass-card">
          <div className="chart-header">
            <div className="chart-title-group">
              <Smile size={16} className="sentiment-icon-header" />
              <h3 className="chart-title">{t.sentimentDistribution || 'Sentiment Distribution'}</h3>
            </div>
          </div>

          <div className="sentiment-bars-stack">
            {/* Positive */}
            <div className="sentiment-row">
              <div className="sentiment-row-label">
                <div className="sentiment-label-text">
                  <Smile size={14} className="sentiment-positive-icon" />
                  <span>{t.positive || 'Positive'}</span>
                </div>
                <strong className="sentiment-pct">{sentimentDistribution.positive}%</strong>
              </div>
              <div className="sentiment-progress-track">
                <div
                  className="sentiment-progress-fill sentiment-progress-fill--positive"
                  style={{ width: `${sentimentDistribution.positive}%` }}
                />
              </div>
            </div>

            {/* Neutral */}
            <div className="sentiment-row">
              <div className="sentiment-row-label">
                <div className="sentiment-label-text">
                  <Meh size={14} className="sentiment-neutral-icon" />
                  <span>{t.neutral || 'Neutral'}</span>
                </div>
                <strong className="sentiment-pct">{sentimentDistribution.neutral}%</strong>
              </div>
              <div className="sentiment-progress-track">
                <div
                  className="sentiment-progress-fill sentiment-progress-fill--neutral"
                  style={{ width: `${sentimentDistribution.neutral}%` }}
                />
              </div>
            </div>

            {/* Negative */}
            <div className="sentiment-row">
              <div className="sentiment-row-label">
                <div className="sentiment-label-text">
                  <Frown size={14} className="sentiment-negative-icon" />
                  <span>{t.negative || 'Negative'}</span>
                </div>
                <strong className="sentiment-pct">{sentimentDistribution.negative}%</strong>
              </div>
              <div className="sentiment-progress-track">
                <div
                  className="sentiment-progress-fill sentiment-progress-fill--negative"
                  style={{ width: `${sentimentDistribution.negative}%` }}
                />
              </div>
            </div>
          </div>

          <div className="sentiment-summary-note">
            <span>Overall Sentiment Score: </span>
            <strong style={{ color: '#10b981' }}>+88 Net Promoter Index</strong>
          </div>
        </div>
      </div>

      {/* Grid: Memory Growth Chart & Language Usage Chart */}
      <div className="analytics-middle-grid">
        {/* Memory Growth Chart */}
        <div className="chart-card glass-card">
          <div className="chart-header">
            <div className="chart-title-group">
              <Database size={16} className="chart-icon text-cyan" />
              <h3 className="chart-title">{t.memoryGrowthTitle || 'Memory Ingestion Growth'}</h3>
            </div>
            <Badge variant="accent" size="xs">
              Cumulative Records
            </Badge>
          </div>

          <div className="trend-chart-wrapper">
            <div className="trend-bars-container">
              {memoryGrowthData.map((item) => {
                const heightPercent = Math.round((item.cumulative / maxCumulative) * 100);
                const isHovered = hoveredMemGrowth?.day === item.day;
                return (
                  <div
                    key={item.day}
                    className="trend-bar-column"
                    onMouseEnter={() => setHoveredMemGrowth(item)}
                    onMouseLeave={() => setHoveredMemGrowth(null)}
                  >
                    {isHovered && (
                      <div className="trend-tooltip glass-card animate-fade-in">
                        <strong>{item.day}: {item.cumulative} total memories</strong>
                        <span>+{item.newRetained} newly retained</span>
                      </div>
                    )}
                    <div className="trend-bar-track">
                      <div
                        className="trend-bar-fill"
                        style={{
                          height: `${heightPercent}%`,
                          background: 'linear-gradient(180deg, #06b6d4, #3b82f6)',
                        }}
                      />
                    </div>
                    <span className="trend-day-label">{item.day}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Language Usage Chart */}
        <div className="chart-card glass-card">
          <div className="chart-header">
            <div className="chart-title-group">
              <Globe size={16} className="chart-icon text-purple" />
              <h3 className="chart-title">{t.languageUsageTitle || 'Language Usage Distribution'}</h3>
            </div>
          </div>

          <div className="language-breakdown-stack">
            {languageUsageData.map((l) => (
              <div key={l.lang} className="lang-usage-row">
                <div className="lang-usage-header">
                  <div className="lang-usage-name">
                    <span>{l.flag}</span>
                    <strong>{l.lang}</strong>
                  </div>
                  <div className="lang-usage-stat">
                    <span>{l.count} sessions</span>
                    <strong style={{ color: l.color }}>{l.percentage}%</strong>
                  </div>
                </div>
                <div className="lang-progress-track">
                  <div
                    className="lang-progress-fill"
                    style={{ width: `${l.percentage}%`, backgroundColor: l.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Issue Categories Breakdown */}
      <div className="categories-card glass-card">
        <div className="chart-header">
          <h3 className="chart-title">{t.categoryBreakdown || 'Issue Categories Breakdown'}</h3>
        </div>
        <div className="categories-grid">
          {categoryBreakdown.map((cat) => (
            <div key={cat.category} className="category-metric-box glass-card">
              <div className="category-top">
                <span className="category-dot" style={{ backgroundColor: cat.color }} />
                <span className="category-name">{cat.category}</span>
              </div>
              <div className="category-val-row">
                <strong className="category-val">{cat.percentage}%</strong>
                <span className="category-count">({cat.count} inquiries)</span>
              </div>
              <div className="category-bar-track">
                <div
                  className="category-bar-fill"
                  style={{ width: `${cat.percentage}%`, backgroundColor: cat.color }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
