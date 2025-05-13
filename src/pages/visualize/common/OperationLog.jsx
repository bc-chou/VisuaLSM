import styles from "../visualize.module.css";

/**
 * Component to display the operation log
 */
const OperationLog = ({ entries }) => {
  return (
    <div className={styles.operationLogSection}>
      <div className={styles.componentHeader}>
        <h3 className={styles.componentTitle}>Operation Log</h3>
      </div>
      <div className={styles.operationLog}>
        {entries.map((entry) => (
          <div key={entry.id} className={styles.logEntry}>
            <span className={styles.logTimestamp}>{entry.timestamp}</span>
            <span className={styles.logOperation}>{entry.operation}</span>
            <span className={styles.logDetails}>{entry.details}</span>
          </div>
        ))}
        {entries.length === 0 && (
          <div className={styles.emptyState}>
            No operations yet
          </div>
        )}
      </div>
    </div>
  );
};

export default OperationLog;