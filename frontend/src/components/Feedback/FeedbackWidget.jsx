import React, { useState } from 'react';
import { ThumbsUp, ThumbsDown, Star, MessageSquare, Check } from 'lucide-react';
import { Modal } from '../UI/Modal';
import { Button } from '../UI/Button';
import './Feedback.css';

export function FeedbackWidget({ messageId, initialFeedback, onSubmitFeedback, t }) {
  const [feedback, setFeedback] = useState(initialFeedback || null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRating, setSelectedRating] = useState(initialFeedback?.rating || 5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState(initialFeedback?.comment || '');
  const [isSubmitted, setIsSubmitted] = useState(Boolean(initialFeedback));

  const handleQuickThumb = (isHelpful) => {
    const nextFeedback = {
      helpful: isHelpful,
      rating: isHelpful ? 5 : 2,
      comment: feedback?.comment || '',
    };
    setFeedback(nextFeedback);
    setIsSubmitted(true);
    onSubmitFeedback(messageId, nextFeedback);
  };

  const handleOpenDetailedModal = () => {
    setSelectedRating(feedback?.rating || 5);
    setComment(feedback?.comment || '');
    setIsModalOpen(true);
  };

  const handleSubmitDetailed = (e) => {
    e?.preventDefault();
    const nextFeedback = {
      helpful: selectedRating >= 3,
      rating: selectedRating,
      comment: comment.trim(),
    };
    setFeedback(nextFeedback);
    setIsSubmitted(true);
    onSubmitFeedback(messageId, nextFeedback);
    setIsModalOpen(false);
  };

  return (
    <div className="feedback-widget-root">
      <div className="feedback-quick-actions">
        <span className="feedback-prompt-label">{t.wasThisHelpful || 'Was this helpful?'}</span>

        <button
          type="button"
          className={`feedback-icon-btn ${feedback?.helpful === true ? 'feedback-icon-btn--active-positive' : ''}`}
          onClick={() => handleQuickThumb(true)}
          title={t.helpful || 'Helpful'}
          aria-label="Mark helpful"
        >
          <ThumbsUp size={13} />
        </button>

        <button
          type="button"
          className={`feedback-icon-btn ${feedback?.helpful === false ? 'feedback-icon-btn--active-negative' : ''}`}
          onClick={() => handleQuickThumb(false)}
          title={t.notHelpful || 'Not Helpful'}
          aria-label="Mark not helpful"
        >
          <ThumbsDown size={13} />
        </button>

        <button
          type="button"
          className="feedback-rating-trigger"
          onClick={handleOpenDetailedModal}
          title={t.rateExperience || 'Rate response with stars & comment'}
        >
          <div className="feedback-stars-preview">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                size={12}
                className={`feedback-star ${star <= (feedback?.rating || 0) ? 'feedback-star--filled' : ''}`}
              />
            ))}
          </div>
          <span className="feedback-stars-label">
            {feedback?.rating ? `${feedback.rating}/5` : 'Rate'}
          </span>
        </button>

        {isSubmitted && (
          <span className="feedback-confirmed-pill">
            <Check size={11} />
            <span>Saved</span>
          </span>
        )}
      </div>

      {/* Detailed Feedback Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={t.rateExperience || 'Rate Response Experience'}
        maxWidth="460px"
      >
        <form onSubmit={handleSubmitDetailed} className="feedback-modal-form">
          <div className="feedback-modal-stars-row">
            <span className="feedback-modal-label">Satisfaction Rating:</span>
            <div className="feedback-modal-stars-picker">
              {[1, 2, 3, 4, 5].map((star) => {
                const isLit = star <= (hoverRating || selectedRating);
                return (
                  <button
                    key={star}
                    type="button"
                    className="modal-star-btn"
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setSelectedRating(star)}
                    aria-label={`Rate ${star} star`}
                  >
                    <Star
                      size={26}
                      className={`modal-star-icon ${isLit ? 'modal-star-icon--active' : ''}`}
                    />
                  </button>
                );
              })}
            </div>
            <span className="feedback-rating-score-text">
              {selectedRating === 5 && '⭐⭐⭐⭐⭐ Exceptional Recall & Accuracy'}
              {selectedRating === 4 && '⭐⭐⭐⭐ Good Context Awareness'}
              {selectedRating === 3 && '⭐⭐⭐ Satisfactory Baseline Response'}
              {selectedRating === 2 && '⭐⭐ Needs More Context Alignment'}
              {selectedRating === 1 && '⭐ Inaccurate or Missing Context'}
            </span>
          </div>

          <div className="feedback-modal-comment-group">
            <label htmlFor="feedback-comment" className="feedback-modal-label">
              {t.leaveFeedback || 'Optional Feedback / Observations:'}
            </label>
            <textarea
              id="feedback-comment"
              className="feedback-modal-textarea"
              rows={3}
              placeholder="e.g. 'Accurately recalled the Envoy proxy 60s timeout from past tickets...'"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>

          <div className="feedback-modal-actions">
            <Button variant="ghost" size="sm" type="button" onClick={() => setIsModalOpen(false)}>
              {t.cancel || 'Cancel'}
            </Button>
            <Button variant="primary" size="sm" type="submit">
              {t.submitFeedback || 'Submit Feedback'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
