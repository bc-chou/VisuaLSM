import parameterOptions from '/data/parameter_options.json';
import styles from '../styles/experiment.module.css';

/**
 * Component for selecting and displaying parameter impacts
 */
const ParameterImpact = ({ 
  baseConfig, 
  selectedWorkload, 
  changedParameter,
  parameterValue,
  onParameterChange,
  isLoading
}) => {
  const parameters = Object.keys(parameterOptions);
  
  return (
    <div className={styles.parameterImpactContainer}>
      {/* Parameter selection cards */}
      <div className={styles.parameterGrid}>
        {parameters.map(paramKey => {
          const parameter = parameterOptions[paramKey];
          const baseValue = baseConfig.params[paramKey];
          
          return (
            <div 
              key={paramKey}
              className={styles.parameterCard}
            >
              <div className={styles.parameterHeader}>
                <h4 className={styles.parameterTitle}>{parameter.name}</h4>
                <div className={styles.currentValue}>
                  Current: <span>{formatParameterValue(paramKey, baseValue)}</span>
                </div>
              </div>
              
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
                {parameter.options.map(option => {
                  // Skip the current value
                  if (option.value === baseValue) return null;
                  
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

// Helper function to format parameter values in a readable way
const formatParameterValue = (parameter, value) => {
  switch (parameter) {
    case 'compaction_style':
      return value === 'level' ? 'Leveled' : 'Universal';
    case 'write_buffer_size':
      return `${value} MB`;
    case 'level0_file_num_compaction_trigger':
      return `${value} files`;
    case 'bloom_bits_per_key':
      return value === 0 ? 'Disabled' : `${value} bits/key`;
    case 'block_size':
      return `${value} KB`;
    default:
      return value;
  }
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

export default ParameterImpact;