import styles from "../visualize.module.css";

/**
 * Component to visualize SSTables in size-tiered compaction
 */
const SSTableVisualizer = ({ 
  tables, 
  isCompacting, 
  compactionThreshold, 
  formatValue 
}) => {
  return (
    <div className={styles.componentWrapper}>
      <div className={styles.componentHeader}>
        <h3 className={styles.componentTitle}>SSTables ({tables.length})</h3>
      </div>
      <div className={styles.sstablesContainer}>
        {tables.map((table, tableIndex) => (
          <div
            key={tableIndex}
            className={`${styles.sstable} ${
              isCompacting && tableIndex < compactionThreshold
                ? styles.compactingSSTable
                : ''
            }`}
          >
            <div className={styles.sstableHeader}>
              <span className={styles.sstableTitle}>
                SSTable {tableIndex} ({table.length} entries)
              </span>
              {isCompacting && tableIndex < compactionThreshold && (
                <span className={styles.compactionBadge}>
                  Compacting
                </span>
              )}
            </div>
            <div className={styles.sstableItems}>
              {table.slice(0, 10).map((item, i) => (
                <div key={i} className={styles.sstableItem}>
                  {item.key}:{formatValue(item.value)}
                </div>
              ))}
              {table.length > 10 && (
                <span className={styles.moreItems}>
                  +{table.length - 10} more
                </span>
              )}
            </div>
          </div>
        ))}
        
        {tables.length === 0 && (
          <div className={styles.emptyState}>
            No SSTables yet
          </div>
        )}
      </div>
    </div>
  );
};

export default SSTableVisualizer;