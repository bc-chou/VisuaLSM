import React, { useState, useEffect } from 'react';
import './VisualizationContainer.css';
import PlaybackControls from './PlaybackControls';

const VisualizationContainer = ({ 
  title, 
  steps, 
  renderContent,
  insights 
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1500); // milliseconds per step
  
  const step = steps[currentStep];
  
  useEffect(() => {
    let playbackTimer;
    if (isPlaying && currentStep < steps.length - 1) {
      playbackTimer = setTimeout(() => {
        setCurrentStep(prev => prev + 1);
      }, playbackSpeed);
    } else if (isPlaying && currentStep >= steps.length - 1) {
      setIsPlaying(false);
    }
    
    return () => {
      if (playbackTimer) clearTimeout(playbackTimer);
    };
  }, [isPlaying, currentStep, steps.length, playbackSpeed]);

  const handlePrev = () => {
    setCurrentStep(Math.max(0, currentStep - 1));
    setIsPlaying(false);
  };

  const handleNext = () => {
    setCurrentStep(Math.min(steps.length - 1, currentStep + 1));
    setIsPlaying(false);
  };

  const handleTogglePlayback = () => {
    setIsPlaying(!isPlaying);
  };

  const handleSliderChange = (value) => {
    setCurrentStep(value);
    setIsPlaying(false);
  };
  
  return (
    <div className="visualizationContainer">
      <div className="materialCard">
        <div className="cardHeader">
          <h2 className="cardTitle">{title}</h2>
        </div>
        
        <div className="cardBody">
          {/* Step explanation */}
          <div className="explanationBox">
            <div className="stepTitle">{step.description}</div>
            <div>{step.explanation}</div>
          </div>
          
          {/* Visualization-specific content */}
          {renderContent(step, currentStep)}
        </div>
        
        <div className="cardFooter">
          {/* Playback Controls */}
          <PlaybackControls
            currentStep={currentStep}
            totalSteps={steps.length}
            isPlaying={isPlaying}
            onPrev={handlePrev}
            onNext={handleNext}
            onTogglePlayback={handleTogglePlayback}
            onSliderChange={handleSliderChange}
          />
          
          {/* Insights (collapsible) */}
          <div className="insightsContainer">
            <details>
              <summary className="insightsSummary">Key Insights</summary>
              <ul className="insightsList">
                {insights.map((insight, index) => (
                  <li key={index}>{insight}</li>
                ))}
              </ul>
            </details>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VisualizationContainer;