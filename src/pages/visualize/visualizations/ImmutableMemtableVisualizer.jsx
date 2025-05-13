import styles from "../visualize.module.css";

/**
 * Component to visualize the immutable memtable in the LSM Tree
 */
const ImmutableMemtableVisualizer = ({ data, formatValue }) => {
  return (
    <div className={styles.componentWrapper}>
      <div className={styles.componentHeader}>
        <h3 className={styles.componentTitle}>Immutable Memtable ({data.length} entries)</h3>
        {data.length > 0 && (
          <span className={styles.flushBadge}>
            Ready to flush
          </span>
        )}
      </div>
      
      <div className={styles.dataVisualizer}>
        {data.length > 0 ? (
          data.map((item, i) => (
            <div key={i} className={styles.immutableMemtableItem}>
              {item.key}:{formatValue(item.value)}
            </div>
          ))
        ) : (
          <div className={styles.emptyState}>
            Empty immutable memtable
          </div>
        )}
      </div>
    </div>
  );
};

export default ImmutableMemtableVisualizer;