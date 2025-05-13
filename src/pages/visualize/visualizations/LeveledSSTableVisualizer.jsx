import styles from "../visualize.module.css";

/**
 * Component to visualize SSTables in leveled compaction
 */
const LeveledSSTableVisualizer = ({ 
  levels, 
  isCompacting, 
  formatValue 
}) => {
  return (
    <div className={styles.componentWrapper}>
      <div className={styles.componentHeader}>
        <h3 className={styles.componentTitle}>Leveled SSTables</h3>
      </div>
      <div className={styles.levelsContainer}>
        {levels.map((level, levelIndex) => (
          <div 
            key={levelIndex} 
            className={`${styles.levelContainer} ${
              isCompacting ? styles.compactingLevel : ''
            }`}
          >
            <div className={styles.levelHeader}>
              <span>Level {levelIndex} ({level.length} files)</span>
              <span className={styles.levelCapacity}>
                {levelIndex !== 0 ? `Max: ${Math.pow(10, levelIndex)} entries` : '' }
              </span>
            </div>
            
            {level.length > 0 ? (
              <div className={styles.levelData}>
                {level.map((table, tableIndex) => (
                  <div key={tableIndex} className={styles.levelTable}>
                    <div className={styles.sstableItems}>
                      {table.slice(0, 8).map((item, i) => (
                        <div key={i} className={styles.sstableItem}>
                          {item.key}:{formatValue(item.value)}
                        </div>
                      ))}
                      {table.length > 8 && (
                        <span className={styles.moreItems}>
                          +{table.length - 8} more
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>
                Empty level
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default LeveledSSTableVisualizer;