import { Info } from 'lucide-react';
import styles from '../styles/experiment.module.css';

/**
 * Component for selecting parameters to modify and see their impact
 */
const ParameterSelector = ({ 
  baseConfig, 
  parameterOptions,
  changedParameter,
  parameterValue,
  onParameterChange,
  isLoading
}) => {
  // Early return if data isn't loaded yet
  if (!baseConfig || !parameterOptions) return null;
  
  return (
    <div className={styles.parameterSelectorContainer}>
      {/* Impact explanation */}
      <div className={styles.impactExplanation}>
        <Info size={18} className={styles.impactExplanationIcon} />
        <div>
          <strong>Impact Ratings</strong>: These indicators show the relative impact of changing each parameter on different aspects of LSM Tree performance.
          <div className={styles.impactLegend}>
            <div className={styles.impactLegendItem}>
              <span className={styles.highImpact}>High</span> = Major effect
            </div>
            <div className={styles.impactLegendItem}>
              <span className={styles.moderateImpact}>Medium</span> = Moderate effect
            </div>
            <div className={styles.impactLegendItem}>
              <span className={styles.lowImpact}>Low</span> = Minor effect
            </div>
          </div>
        </div>
      </div>
      
      {/* Parameter selection cards with horizontal scrolling */}
      <div className={styles.parameterScrollContainer}>
        {Object.keys(parameterOptions).map(paramKey => {
          const parameter = parameterOptions[paramKey];
          const baseValue = baseConfig.params[paramKey];
          
          // Skip if this parameter doesn't apply to the current config or has no options
          if (!baseValue || !parameter.options || parameter.options.length < 2) return null;
          
          // Find the current value's option object for display
          const currentOption = parameter.options.find(opt => opt.value === baseValue) || {
            value: baseValue,
            label: `${baseValue}`,
            description: "Current setting"
          };
          
          // Group options for display
          // For string options like compaction_style, we want to show all alternatives (excluding current)
          // For numeric options, we want to show them in order (lower values above, higher values below current)
          const isNumericParameter = typeof baseValue === 'number';
          
          let optionsToDisplay = [];
          
          if (isNumericParameter) {
            // For numeric values, organize by lower/higher
            const lowerValueOptions = parameter.options.filter(opt => opt.value < baseValue);
            const higherValueOptions = parameter.options.filter(opt => opt.value > baseValue);
            
            optionsToDisplay = [
              ...lowerValueOptions,
              ...higherValueOptions
            ];
          } else {
            // For string values, just show alternatives (not current)
            optionsToDisplay = parameter.options.filter(opt => opt.value !== baseValue);
          }
          
          return (
            <div 
              key={paramKey}
              className={styles.parameterCard}
            >
              <h4 className={styles.parameterTitle}>{parameter.name}</h4>
              <p className={styles.parameterDescription}>{parameter.description}</p>
              
              <div className={styles.impactIndicators}>
                <div className={styles.impactItem}>
                  <span className={styles.impactLabel}>Read:</span>
                  <span className={getImpactClass(parameter.impact.read)}>
                    {getImpactPrefix(parameter.impact.read)}
                  </span>
                </div>
                <div className={styles.impactItem}>
                  <span className={styles.impactLabel}>Write:</span>
                  <span className={getImpactClass(parameter.impact.write)}>
                    {getImpactPrefix(parameter.impact.write)}
                  </span>
                </div>
                <div className={styles.impactItem}>
                  <span className={styles.impactLabel}>Space:</span>
                  <span className={getImpactClass(parameter.impact.space)}>
                    {getImpactPrefix(parameter.impact.space)}
                  </span>
                </div>
              </div>
              
              <div className={styles.optionButtons}>
                {/* Display lower value options first if numeric */}
                {isNumericParameter && parameter.options
                  .filter(opt => opt.value < baseValue)
                  .map(option => {
                    const isSelected = changedParameter === paramKey && parameterValue === option.value;
                    
                    return (
                      <button
                        key={option.value}
                        className={`${styles.optionButton} ${isSelected ? styles.selectedOption : ''}`}
                        onClick={() => onParameterChange(paramKey, option.value)}
                        disabled={isLoading}
                      >
                        Change to {option.label}
                        <span className={styles.optionDescription}>{option.description}</span>
                      </button>
                    );
                })}
                
                {/* Current Value Button (Unselectable) */}
                <div className={styles.currentOptionButton}>
                  <span className={styles.currentLabel}>Current:</span> 
                  <span className={styles.currentValue}>{currentOption.label}</span>
                  <span className={styles.optionDescription}>{currentOption.description}</span>
                </div>
                
                {/* Display alternatives */}
                {isNumericParameter 
                  // If numeric, show higher values
                  ? parameter.options
                    .filter(opt => opt.value > baseValue)
                    .map(option => {
                      const isSelected = changedParameter === paramKey && parameterValue === option.value;
                      
                      return (
                        <button
                          key={option.value}
                          className={`${styles.optionButton} ${isSelected ? styles.selectedOption : ''}`}
                          onClick={() => onParameterChange(paramKey, option.value)}
                          disabled={isLoading}
                        >
                          Change to {option.label}
                          <span className={styles.optionDescription}>{option.description}</span>
                        </button>
                      );
                    })
                  // If not numeric, show all alternatives
                  : parameter.options
                    .filter(opt => opt.value !== baseValue)
                    .map(option => {
                      const isSelected = changedParameter === paramKey && parameterValue === option.value;
                      
                      return (
                        <button
                          key={option.value}
                          className={`${styles.optionButton} ${isSelected ? styles.selectedOption : ''}`}
                          onClick={() => onParameterChange(paramKey, option.value)}
                          disabled={isLoading}
                        >
                          Change to {option.label}
                          <span className={styles.optionDescription}>{option.description}</span>
                        </button>
                      );
                    })
                }
              </div>
            </div>
          );
        })}
      </div>
      
      {isLoading && (
        <div className={styles.loadingOverlay}>
          <div className={styles.spinner}></div>
          <div className={styles.loadingText}>Loading parameter impact data...</div>
        </div>
      )}
    </div>
  );
};

// Helper function to get CSS class based on impact level
const getImpactClass = (impactText) => {
  if (impactText.includes('High') || impactText.includes('Very high')) {
    return styles.highImpact;
  } else if (impactText.includes('Moderate')) {
    return styles.moderateImpact;
  } else {
    return styles.lowImpact;
  }
};

// Helper function to extract impact prefix
const getImpactPrefix = (impactText) => {
  if (impactText.includes('Very high')) return 'Very High';
  if (impactText.includes('High')) return 'High';
  if (impactText.includes('Moderate')) return 'Medium';
  if (impactText.includes('Minor')) return 'Low';
  if (impactText.includes('Low')) return 'Low';
  return 'None';
};

export default ParameterSelector;