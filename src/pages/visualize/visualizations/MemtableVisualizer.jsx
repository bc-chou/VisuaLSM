import styles from "../visualize.module.css";

/**
 * Component to visualize the memtable in the LSM Tree
 */
const MemtableVisualizer = ({ data, size, formatValue }) => {
  return (
    <div className={styles.componentWrapper}>
      <div className={styles.componentHeader}>
        <h3 className={styles.componentTitle}>Memtable ({data.length}/{size} entries)</h3>
        {data.length >= size && (
          <span className={styles.flushBadge}>
            Ready to flush
          </span>
        )}
      </div>
      
      <div className={styles.dataVisualizer}>
        {data.length > 0 ? (
          data.map((item, i) => (
            <div key={i} className={styles.memtableItem}>
              {item.key}:{formatValue(item.value)}
            </div>
          ))
        ) : (
          <div className={styles.emptyState}>
            Empty memtable
          </div>
        )}
      </div>
    </div>
  );
};

export default MemtableVisualizer;