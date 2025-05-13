import styles from "../visualize.module.css";

/**
 * Component to visualize the Write-Ahead Log (WAL) in the LSM Tree
 */
const WALVisualizer = ({ data, formatValue }) => {
  return (
    <div className={styles.componentWrapper}>
      <div className={styles.componentHeader}>
        <h3 className={styles.componentTitle}>Write-Ahead Log</h3>
      </div>
      <div className={styles.dataVisualizer}>
        {data.length > 0 ? (
          data.map((entry, i) => (
            <div key={i} className={styles.WALItem}>
              {entry.key}:{formatValue(entry.value)}
            </div>
          ))
        ) : (
          <div className={styles.emptyState}>
            WAL is empty (flushed to disk)
          </div>
        )}
      </div>
    </div>
  );
};

export default WALVisualizer;