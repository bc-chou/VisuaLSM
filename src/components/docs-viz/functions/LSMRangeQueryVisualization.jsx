import React from 'react';
import VisualizationContainer from '../VisualizationContainer';
import { components, steps, insights } from './LSMRangeQueryData';
import './LSMRangeQueryVisualization.css';

const LSMRangeQueryVisualization = () => {
  /**
   * Determines background and border color based on iterator position
   */
  const getValueBoxStyles = (componentIndex, valueIndex, iteratorPositions) => {
    // Current iterator position
    if (valueIndex === iteratorPositions[componentIndex]) {
      return {
        background: 'var(--ifm-color-emphasis-200)',
        borderColor: 'var(--ifm-color-primary)'
      };
    }
    
    // Already processed items
    if (valueIndex < iteratorPositions[componentIndex]) {
      return {
        background: 'var(--ifm-color-emphasis-100)',
        borderColor: 'var(--ifm-color-emphasis-500)',
        opacity: 0.6
      };
    }
    
    // Items not yet processed
    return {
      background: 'transparent',
      borderColor: 'var(--ifm-color-emphasis-300)'
    };
  };

  /**
   * Render function passed to the container
   * Provides the LSM-specific visualization content
   */
  const renderContent = (step, currentStep) => {
    return (
      <>
        {/* Components */}
        <div className="componentWrapper">
          {components.map((component, componentIndex) => (
            <div key={component.name} className="componentCard materialCard">
              <div className="componentHeader">
                <div className="componentName">{component.name}</div>
                <div className="componentRecency">Recency: {component.recency}</div>
              </div>
              
              <div className="componentBody">
                {component.data.map((item, valueIndex) => {
                  const styles = getValueBoxStyles(componentIndex, valueIndex, step.iteratorPositions);
                  
                  return (
                    <div 
                      key={`${component.name}-${item.key}`} 
                      className="keyValueItem"
                      style={styles}
                    >
                      <span className="keyValueKey">{item.key}:</span>
                      <span 
                        className={`keyValueValue ${item.value === 'tombstone' ? 'tombstoneValue' : ''}`}
                      >
                        {item.value}
                      </span>
                      {valueIndex === step.iteratorPositions[componentIndex] && (
                        <span className="iteratorMarker">←</span>
                      )}
                    </div>
                  );
                })}
                
                {step.iteratorPositions[componentIndex] >= component.data.length && (
                  <div className="endMarker">End</div>
                )}
              </div>
            </div>
          ))}
        </div>
        
        {/* Current Processing */}
        <div className="sectionDivider"></div>
        <div className="sectionTitle">Current Processing</div>
        <div className="processingContent">
          {step.currentKey ? (
            <div className="processingData">
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                <div className="processingItem">Key: {step.currentKey}</div>
                <div className="processingItem">Value: {step.currentResult.value}</div>
                <div className="processingItem">Source: {step.currentResult.source}</div>
              </div>
            </div>
          ) : (
            <div className="processingEmpty">No current processing</div>
          )}
        </div>
        
        {/* Result Set */}
        <div className="sectionDivider"></div>
        <div className="sectionTitle">Result Set</div>
        {step.resultSet.length === 0 ? (
          <div className="emptyResultSet">Empty result set</div>
        ) : (
          <div className="resultWrapper">
            {step.resultSet.map((result, index) => (
              <div 
                key={index} 
                className="resultItem materialCard"
              >
                <div className="resultKey">{result.key}: {result.value}</div>
                <div className="resultSource">{result.source}</div>
              </div>
            ))}
          </div>
        )}
      </>
    );
  };

  return (
    <VisualizationContainer
      title="LSM-Tree Range Query"
      steps={steps}
      renderContent={renderContent}
      insights={insights}
    />
  );
};

export default LSMRangeQueryVisualization;