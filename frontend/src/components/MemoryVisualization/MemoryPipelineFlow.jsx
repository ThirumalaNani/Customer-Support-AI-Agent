import React, { useState } from 'react';
import { Database, FileText, Cpu, HardDrive, ArrowRight, CheckCircle2, Sparkles, Layers } from 'lucide-react';
import { Badge } from '../UI/Badge';

export function MemoryPipelineFlow({
  activeCustomerId,
  recalledCount = 0,
  retentionState,
  t,
}) {
  const [activeStep, setActiveStep] = useState(null);

  const PIPELINE_STEPS = [
    {
      id: 'recall',
      step: 1,
      title: t.step1Recall || '1. Recall',
      desc: t.step1Desc || 'Queries history provider with customer ID partition',
      icon: Database,
      badge: `${recalledCount} records`,
      color: '#3b82f6',
      details: `Executes semantic vector / keyword recall against partition '${activeCustomerId}'. Filters top-k past resolutions and architectural preferences.`,
    },
    {
      id: 'context',
      step: 2,
      title: t.step2Context || '2. Context',
      desc: t.step2Desc || 'Injects retrieved history into prompt with system persona',
      icon: Layers,
      badge: 'Prompt Injected',
      color: '#8b5cf6',
      details: 'Structures historical context block within system prompt, establishing technical continuity without forcing the customer to re-explain.',
    },
    {
      id: 'response',
      step: 3,
      title: t.step3Response || '3. Response',
      desc: t.step3Desc || 'AI generates personalized reply with past resolution awareness',
      icon: Cpu,
      badge: 'Gemini 3.8 Flash',
      color: '#06b6d4',
      details: 'LLM performs inference using context memories and user query, prioritizing existing configurations, resolved issues, and language preferences.',
    },
    {
      id: 'retain',
      step: 4,
      title: t.step4Retain || '4. Retain',
      desc: t.step4Desc || 'Commits new interaction back to memory partition',
      icon: HardDrive,
      badge: retentionState?.lastRetained === false ? 'Degraded' : 'Active Retain',
      color: '#10b981',
      details: `Persists current Q&A summary to partition '${activeCustomerId}'. Updates interaction counter and last seen timestamp non-blockingly.`,
    },
  ];

  return (
    <div className="pipeline-flow-container glass-card">
      <div className="pipeline-header">
        <div className="pipeline-title-group">
          <Sparkles size={18} className="pipeline-icon" />
          <div>
            <h3 className="pipeline-title">{t.memoryFlowTitle || 'Memory Lifecycle Pipeline'}</h3>
            <span className="pipeline-sub">{t.memoryFlowSubtitle || 'Recall → Context → Response → Retain'}</span>
          </div>
        </div>
        <Badge variant={retentionState?.lastRetained === false ? 'warning' : 'success'} size="xs" icon={CheckCircle2}>
          {retentionState?.lastRetained === false ? t.retentionDegraded : t.retentionActive}
        </Badge>
      </div>

      {/* Visual Flow Grid */}
      <div className="pipeline-steps-grid">
        {PIPELINE_STEPS.map((stepItem, idx) => {
          const Icon = stepItem.icon;
          const isSelected = activeStep === stepItem.id;
          return (
            <React.Fragment key={stepItem.id}>
              <div
                className={`pipeline-step-card ${isSelected ? 'pipeline-step-card--active' : ''}`}
                onClick={() => setActiveStep(isSelected ? null : stepItem.id)}
                style={{ '--step-accent': stepItem.color }}
              >
                <div className="step-card-top">
                  <div className="step-icon-wrapper" style={{ color: stepItem.color, backgroundColor: `${stepItem.color}15` }}>
                    <Icon size={18} />
                  </div>
                  <span className="step-badge-pill" style={{ color: stepItem.color, borderColor: `${stepItem.color}40`, backgroundColor: `${stepItem.color}10` }}>
                    {stepItem.badge}
                  </span>
                </div>
                <h4 className="step-title">{stepItem.title}</h4>
                <p className="step-desc">{stepItem.desc}</p>
              </div>

              {idx < PIPELINE_STEPS.length - 1 && (
                <div className="pipeline-connector-arrow">
                  <ArrowRight size={16} />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Interactive Detail Drawer */}
      {activeStep && (
        <div className="pipeline-step-detail-drawer animate-fade-in glass-panel">
          <div className="step-detail-header">
            <strong>Deep Dive: {PIPELINE_STEPS.find((s) => s.id === activeStep)?.title}</strong>
            <button className="step-detail-close" onClick={() => setActiveStep(null)}>
              &times;
            </button>
          </div>
          <p className="step-detail-text">
            {PIPELINE_STEPS.find((s) => s.id === activeStep)?.details}
          </p>
        </div>
      )}
    </div>
  );
}
