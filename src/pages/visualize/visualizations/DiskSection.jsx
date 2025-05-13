import WALVisualizer from './WALVisualizer';
import SSTableVisualizer from './SSTableVisualizer';
import LeveledSSTableVisualizer from './LeveledSSTableVisualizer';
import styles from "../visualize.module.css";

/**
 * Component to visualize the disk section of the LSM Tree
 */
const DiskSection = ({ 
  walEntries, 
  sstables, 
  levels, 
  compactionStrategy, 
  isCompacting, 
  compactionThreshold, 
  formatValue 
}) => {
  return (
    <div className={styles.diskSection}>
      <div className={styles.sectionHeader}>Disk</div>
      
      {/* WAL on Disk */}
      <WALVisualizer data={walEntries} formatValue={formatValue} />
      
      {/* SSTables */}
      {compactionStrategy === "size-tiered" ? (
        <SSTableVisualizer 
          tables={sstables} 
          isCompacting={isCompacting} 
          compactionThreshold={compactionThreshold}
          formatValue={formatValue}
        />
      ) : (
        <LeveledSSTableVisualizer 
          levels={levels}
          isCompacting={isCompacting}
          formatValue={formatValue}
        />
      )}
    </div>
  );
};

export default DiskSection;