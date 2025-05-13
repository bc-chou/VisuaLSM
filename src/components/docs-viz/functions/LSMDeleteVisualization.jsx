import React from 'react';
import VisualizationContainer from '../VisualizationContainer';
import { components, steps, insights } from './LSMDeleteData';
import './LSMDeleteVisualization.css';

const LSMDeleteVisualization = () => {
  /**
   * Determines background and border color based on highlighted key
   */
  const getValueBoxStyles = (item, highlightedKey, state) => {
    // Highlight the targeted key
    if (item.key === highlightedKey) {
      if (item.value === 'tombstone') {
        return {
          background: 'var(--ifm-color-danger-lightest)',
          borderColor: 'var(--ifm-color-danger)',
          fontWeight: 'bold'
        };
      } else {
        return {
          background: 'var(--ifm-color-primary-lightest)',
          borderColor: 'var(--ifm-color-primary)',
          fontWeight: 'bold'
        };
      }
    }
    
    // Tombstone styling
    if (item.value === 'tombstone') {
      return {
        background: 'var(--ifm-color-danger-lightest)',
        borderColor: 'var(--ifm-color-emphasis-500)'
      };
    }
    
    // Default styling
    return {
      background: 'transparent',
      borderColor: 'var(--ifm-color-emphasis-300)'
    };
  };

  /**
   * Render function passed to the container
   * Provides the LSM Delete visualization content
   */
  const renderContent = (step, currentStep) => {
    return (
      <>
        {/* Components */}
        <div className="componentWrapper">
          {step.components.map((component, componentIndex) => (
            <div key={componentIndex} className="componentCard materialCard">
              <div className="componentHeader">
                <div className="componentName">{component.name}</div>
                {component.recency > 0 && (
                  <div className="componentRecency">Recency: {component.recency}</div>
                )}
              </div>
              
              <div className="componentBody">
                {component.data.length === 0 ? (
                  <div className="emptyComponent">
                    {component.name.startsWith("No ") ? component.name : "Empty"}
                  </div>
                ) : (
                  component.data.map((item, itemIndex) => {
                    const styles = getValueBoxStyles(item, step.highlightedKey, step.state);
                    
                    return (
                      <div 
                        key={`${componentIndex}-${itemIndex}`} 
                        className="keyValueItem"
                        style={styles}
                      >
                        <span className="keyValueKey">{item.key}:</span>
                        <span 
                          className={`keyValueValue ${item.value === 'tombstone' ? 'tombstoneValue' : ''}`}
                        >
                          {item.value}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ))}
        </div>
        
        {/* WAL Section */}
        {step.walContent && (
          <>
            <div className="sectionDivider"></div>
            <div className="sectionTitle">Write-Ahead Log (WAL)</div>
            <div className="walContent">
              <div className="walEntry">
                <div className="walOperation">{step.walContent.operation}</div>
                <div className="walKey">Key: {step.walContent.key}</div>
                <div className="walTimestamp">Timestamp: {step.walContent.timestamp}</div>
              </div>
            </div>
          </>
        )}
        
        {/* Compaction Status */}
        {step.compactionStatus && (
          <>
            <div className="sectionDivider"></div>
            <div className="sectionTitle">Status</div>
            <div className={`statusContent ${step.compactionStatus.actionType}`}>
              {step.compactionStatus.message}
            </div>
          </>
        )}
      </>
    );
  };

  return (
    <VisualizationContainer
      title="LSM-Tree Delete Operation"
      steps={steps}
      renderContent={renderContent}
      insights={insights}
    />
  );
};

export default LSMDeleteVisualization;