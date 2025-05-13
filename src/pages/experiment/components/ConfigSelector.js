import styles from '../styles/experiment.module.css';

/**
 * Component for selecting base configuration and workload
 * Designed for horizontal layout at the top of the page
 */
const ConfigSelector = ({ 
  baseConfigs, 
  workloadTypes,
  selectedPreset, 
  selectedWorkload, 
  onPresetChange, 
  onWorkloadChange
}) => {
  // Early return if data isn't loaded yet
  if (!baseConfigs || !workloadTypes) return null;
  
  return (
    <div className={styles.configSelectorContainer}>
      <div className={styles.configSelectorLayout}>
        {/* Base Configuration Section */}
        <div className={styles.configSection}>
          <h3 className={styles.sectionLabel}>Base Configuration</h3>
          <div className={styles.presetCards}>
            {Object.keys(baseConfigs).map((presetKey) => {
              const preset = baseConfigs[presetKey];
              const isSelected = presetKey === selectedPreset;
              
              return (
                <div 
                  key={presetKey}
                  className={`${styles.presetCard} ${isSelected ? styles.selectedPreset : ''}`}
                  onClick={() => onPresetChange(presetKey)}
                >
                  <h4 className={styles.presetTitle}>{preset.name}</h4>
                </div>
              );
            })}
          </div>
        </div>

        {/* Workload Type Section - Cards with equal width */}
        <div className={styles.configSection}>
          <h3 className={styles.sectionLabel}>Workload Type</h3>
          <div className={styles.workloadCards}>
            {workloadTypes.map((workload) => {
              const isSelected = workload.id === selectedWorkload;
              
              return (
                <div 
                  key={workload.id}
                  className={`${styles.workloadCard} ${isSelected ? styles.selectedWorkload : ''}`}
                  onClick={() => onWorkloadChange(workload.id)}
                >
                  <h4 className={styles.workloadTitle}>{workload.name}</h4>
                  <div className={styles.workloadDescription}>
                    {workload.description}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Configuration Description */}
      <div className={styles.configInfo}>
        <div className={styles.selectedConfigInfo}>
          <p className={styles.configDescription}>
            {baseConfigs[selectedPreset].description}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ConfigSelector;