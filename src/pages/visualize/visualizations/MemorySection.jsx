import MemtableVisualizer from './MemtableVisualizer';
import ImmutableMemtableVisualizer from './ImmutableMemtableVisualizer';
import styles from "../visualize.module.css";

/**
 * Component to visualize the memory section of the LSM Tree
 */
const MemorySection = ({ 
  memtableData, 
  immutableMemtableData, 
  memtableSize, 
  formatValue 
}) => {
  return (
    <div className={styles.memorySection}>
      <div className={styles.sectionHeader}>Memory</div>
      
      {/* Active Memtable */}
      <MemtableVisualizer 
        data={memtableData} 
        size={memtableSize} 
        formatValue={formatValue} 
      />
      
      {/* Immutable Memtable */}
      <ImmutableMemtableVisualizer 
        data={immutableMemtableData} 
        formatValue={formatValue} 
      />
    </div>
  );
};

export default MemorySection;