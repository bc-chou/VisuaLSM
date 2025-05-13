import React from 'react';
import './PlaybackControls.css';

const PlaybackControls = ({
  currentStep,
  totalSteps,
  isPlaying,
  onPrev,
  onNext,
  onTogglePlayback,
  onSliderChange
}) => {
  const handleSliderChange = (e) => {
    onSliderChange(parseInt(e.target.value, 10));
  };

  return (
    <div className="controlsContainer">
      <button 
        className="controlButton" 
        onClick={onPrev} 
        disabled={currentStep === 0}
        title="Previous step"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m12 19-7-7 7-7M19 12H5"/>
        </svg>
      </button>
      
      <button 
        className={`controlButton ${isPlaying ? "" : "playButton"}`} 
        onClick={onTogglePlayback}
        title={isPlaying ? "Pause" : "Play"}
      >
        {isPlaying ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="6" y="4" width="4" height="16"/>
            <rect x="14" y="4" width="4" height="16"/>
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="5 3 19 12 5 21 5 3"/>
          </svg>
        )}
      </button>
      
      <button 
        className="controlButton" 
        onClick={onNext} 
        disabled={currentStep === totalSteps - 1}
        title="Next step"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m12 5 7 7-7 7M5 12h14"/>
        </svg>
      </button>
      
      <div className="sliderContainer">
        <input 
          type="range" 
          min="0" 
          max={totalSteps - 1} 
          value={currentStep} 
          onChange={handleSliderChange}
          className="slider"
        />
      </div>
      
      <div className="stepCounter">
        Step {currentStep + 1}/{totalSteps}
      </div>
    </div>
  );
};

export default PlaybackControls;