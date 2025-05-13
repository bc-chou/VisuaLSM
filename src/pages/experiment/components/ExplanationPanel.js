import { AlertTriangle, Info, Lightbulb, ChevronUp, ChevronDown } from 'lucide-react';
import styles from '../styles/experiment.module.css';

/**
 * Component for displaying educational explanations about LSM tree performance trade-offs
 */
const ExplanationPanel = ({ 
  selectedPreset, 
  selectedWorkload, 
  changedParameter, 
  parameterValue,
  isExpanded,
  onToggleExpand 
}) => {
  // Different explanations for each preset
  const presetExplanations = {
    "read-heavy": (
      <div>
        <p className={styles.explanationText}>
          The <strong>Read-Optimized</strong> configuration prioritizes quick data retrieval at the cost of write performance.
          It uses leveled compaction with strong bloom filters to minimize read amplification.
        </p>
        <ul className={styles.explanationList}>
          <li><strong>Leveled compaction</strong> ensures keys appear in at most one file per level, significantly reducing read amplification</li>
          <li><strong>Strong bloom filters</strong> (10 bits/key) help avoid unnecessary disk reads with a very low false positive rate</li>
          <li><strong>Medium-small block size</strong> (16KB) balances point lookup efficiency with reasonable space overhead</li>
          <li><strong>Moderate memtable size</strong> (64MB) balances memory usage with write batching</li>
        </ul>
        <div className={styles.tradeoffWarning}>
          <AlertTriangle size={16} className={styles.warningIcon} />
          <span>The main trade-off is significantly higher write amplification because data is rewritten multiple times during compaction.</span>
        </div>
      </div>
    ),
    "write-heavy": (
      <div>
        <p className={styles.explanationText}>
          The <strong>Write-Optimized</strong> configuration prioritizes fast write throughput by minimizing write amplification.
          It uses universal compaction with larger memtables to batch more writes.
        </p>
        <ul className={styles.explanationList}>
          <li><strong>Universal compaction</strong> significantly reduces write amplification compared to leveled compaction</li>
          <li><strong>Large memtables</strong> (256MB) allow more writes to accumulate before flushing, reducing flush frequency</li>
          <li><strong>Higher L0 compaction trigger</strong> (8 files) reduces compaction frequency but increases read amplification</li>
          <li><strong>Larger blocks</strong> (32KB) optimize for sequential access but increase read amplification for point lookups</li>
        </ul>
        <div className={styles.tradeoffWarning}>
          <AlertTriangle size={16} className={styles.warningIcon} />
          <span>The trade-offs are higher read amplification and increased space usage since keys may exist in multiple files.</span>
        </div>
      </div>
    ),
    "balanced": (
      <div>
        <p className={styles.explanationText}>
          The <strong>Balanced</strong> configuration seeks to provide reasonable performance for both reads and writes
          by making moderate trade-offs across all dimensions.
        </p>
        <ul className={styles.explanationList}>
          <li><strong>Leveled compaction</strong> for read efficiency, but with moderate settings to reduce write amplification</li>
          <li><strong>Medium memtable size</strong> (128MB) to balance write batching and flush frequency</li>
          <li><strong>Medium L0 compaction trigger</strong> (6 files) balances write stalls against read amplification</li>
          <li><strong>Moderate bloom filter size</strong> (8 bits/key) improves read performance with a lower false positive rate</li>
        </ul>
        <div className={styles.tradeoffNote}>
          <Info size={16} className={styles.noteIcon} />
          <span>This configuration doesn't excel in any single dimension but performs reasonably well across a variety of workloads.</span>
        </div>
      </div>
    )
  };
  
  // Workload-specific explanations
  const workloadExplanations = {
    "point-lookup": (
      <div className={styles.workloadExplanation}>
        <h4 className={styles.workloadExplanationTitle}>Point Lookup Workload Considerations</h4>
        <p>Point lookups require finding individual keys efficiently. Key optimizations:</p>
        <ul>
          <li><strong>Bloom filters</strong> are critical - they can reduce unnecessary disk reads by 90%+</li>
          <li><strong>Smaller block sizes</strong> minimize read amplification and unnecessary data loading for single key lookups</li>
          <li><strong>Leveled compaction</strong> ensures keys appear in at most one file per level, reducing files checked</li>
          <li><strong>Block cache</strong> keeps frequently accessed keys in memory</li>
        </ul>
      </div>
    ),
    "range-query": (
      <div className={styles.workloadExplanation}>
        <h4 className={styles.workloadExplanationTitle}>Range Query Workload Considerations</h4>
        <p>Range queries scan sequential keys. Key optimizations:</p>
        <ul>
          <li><strong>Larger block sizes</strong> improve sequential read efficiency despite higher amplification for point lookups</li>
          <li><strong>Leveled compaction</strong> organizes data for more efficient scans with minimal overlapping key ranges</li>
          <li><strong>Data locality</strong> keeps adjacent keys in the same data blocks</li>
          <li><strong>Prefetching</strong> loads upcoming blocks during range scans</li>
        </ul>
      </div>
    ),
    "write-heavy": (
      <div className={styles.workloadExplanation}>
        <h4 className={styles.workloadExplanationTitle}>Random Write Workload Considerations</h4>
        <p>Random write workloads need to minimize write amplification. Key optimizations:</p>
        <ul>
          <li><strong>Universal compaction</strong> reduces write amplification at the cost of read performance</li>
          <li><strong>Larger memtables</strong> batch more writes before flushing, reducing flush frequency</li>
          <li><strong>Higher L0 thresholds</strong> reduce compaction frequency but increase read amplification</li>
          <li><strong>Fewer levels</strong> mean data is rewritten fewer times during compaction</li>
        </ul>
      </div>
    ),
    "mixed-balanced": (
      <div className={styles.workloadExplanation}>
        <h4 className={styles.workloadExplanationTitle}>Mixed (Balanced 50/50) Workload Considerations</h4>
        <p>Balanced workloads with equal reads and writes need careful optimization. Key considerations:</p>
        <ul>
          <li><strong>Balanced compaction strategy</strong> - typically leveled with moderate settings</li>
          <li><strong>Medium bloom filter size</strong> (8 bits/key) improves reads with reasonable false positive rates</li>
          <li><strong>Moderate block size</strong> balances point lookup amplification and sequential scan efficiency</li>
          <li><strong>Careful tuning</strong> to avoid optimization extremes that penalize either reads or writes</li>
        </ul>
      </div>
    ),
    "mixed-write": (
      <div className={styles.workloadExplanation}>
        <h4 className={styles.workloadExplanationTitle}>Mixed (Write-Heavy 80/20) Workload Considerations</h4>
        <p>Write-heavy mixed workloads prioritize write throughput while maintaining adequate read performance:</p>
        <ul>
          <li><strong>Write optimization</strong> is prioritized with settings closer to write-optimized configuration</li>
          <li><strong>Basic bloom filters</strong> provide reasonable read support with moderate memory usage</li>
          <li><strong>Universal compaction</strong> is often preferred to reduce write amplification at the cost of read efficiency</li>
          <li><strong>Higher write buffer size</strong> helps batch writes effectively but increases potential data loss during crashes</li>
        </ul>
      </div>
    ),
    "mixed-read": (
      <div className={styles.workloadExplanation}>
        <h4 className={styles.workloadExplanationTitle}>Mixed (Read-Heavy 80/20) Workload Considerations</h4>
        <p>Read-heavy mixed workloads prioritize read performance while handling occasional writes:</p>
        <ul>
          <li><strong>Leveled compaction</strong> optimizes read paths by minimizing read amplification</li>
          <li><strong>Strong bloom filters</strong> (8-10 bits/key) significantly reduce unnecessary disk reads</li>
          <li><strong>Smaller block sizes</strong> for efficient random reads with minimized read amplification</li>
          <li><strong>Sufficient write buffer</strong> to handle occasional write bursts without excessive flush frequency</li>
        </ul>
      </div>
    ),
  };
  
  // Get parameter info based on name
  const getParameterInfo = (name) => {
    switch(name) {
      case 'compaction_style':
        return {
          name: "Compaction Style",
          impact: {
            read: "High impact on read performance. Leveled provides better read performance by reducing the number of files to check for each query but with higher write amplification.",
            write: "High impact on write performance. Universal provides better write throughput with lower write amplification at the cost of more complex reads.",
            space: "Moderate impact on space usage. Leveled typically has lower space amplification because it maintains tighter size ratios between levels."
          }
        };
      case 'write_buffer_size':
        return {
          name: "Write Buffer Size",
          impact: {
            read: "Moderate impact on read performance. Larger memtables can increase lookup latency and affect cache utilization, but reduce likelihood of disk reads for recent data.",
            write: "High impact on write performance. Larger buffers improve write throughput by batching more writes and reducing compaction frequency.",
            space: "Moderate impact on durability and memory usage. Larger buffers use more memory and increase potential data loss during crashes if WAL is disabled."
          }
        };
      case 'level0_file_num_compaction_trigger':
        return {
          name: "L0 Compaction Trigger",
          impact: {
            read: "High impact on read performance. Lower values reduce read amplification because every L0 file must be checked during lookups (L0 files may have overlapping key ranges).",
            write: "High impact on write stalls. Higher values reduce write stalls by allowing more L0 files before triggering potentially expensive compactions.",
            space: "Moderate impact on space usage. Higher values increase space amplification due to more overlapping key ranges in L0."
          }
        };
      case 'bloom_bits_per_key':
        return {
          name: "Bloom Filter Bits",
          impact: {
            read: "Very high impact on point lookup performance. More bits reduce false positives (unnecessary SSTable reads), dramatically improving point lookup speed. Higher bit counts provide exponentially better false positive rates.",
            write: "No direct impact on write performance, but filters must be generated during SSTable creation.",
            space: "Moderate impact on memory usage. More bits increase memory consumption linearly with the number of keys in the database."
          }
        };
      case 'block_size':
        return {
          name: "Block Size",
          impact: {
            read: "High impact on read patterns. Smaller blocks reduce read amplification for point lookups, larger blocks improve range scans but increase read amplification for single key lookups.",
            write: "No direct impact on write performance.",
            space: "Moderate impact on space efficiency. Larger blocks typically have less overhead and better compression ratios."
          }
        };
      default:
        return { name: name, impact: {} };
    }
  };
  
  // Parameter change explanation
  const renderParameterChangeExplanation = () => {
    if (!changedParameter || !parameterValue) return null;
    
    const paramInfo = getParameterInfo(changedParameter);
    
    return (
      <div className={styles.parameterChangeExplanation}>
        <h4 className={styles.parameterChangeTitle}>
          Impact of Changing {paramInfo.name}
        </h4>
        <div className={styles.parameterImpacts}>
          <div className={styles.parameterImpactItem}>
            <strong>Read Impact:</strong> {paramInfo.impact.read}
          </div>
          <div className={styles.parameterImpactItem}>
            <strong>Write Impact:</strong> {paramInfo.impact.write}
          </div>
          <div className={styles.parameterImpactItem}>
            <strong>Space Impact:</strong> {paramInfo.impact.space}
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <div className={styles.explanationPanelContainer}>
      {/* Collapsible header/button */}
      <button 
        className={styles.explanationToggle}
        onClick={onToggleExpand}
        aria-expanded={isExpanded}
      >
        <Lightbulb size={16} className={styles.explanationIcon} />
        <span className={styles.explanationToggleLabel}>Tip: Additional Explanations</span>
        {isExpanded 
          ? <ChevronUp size={16} className={styles.chevronIcon} />
          : <ChevronDown size={16} className={styles.chevronIcon} />
        }
      </button>
      
      {/* Content only shown when expanded */}
      {isExpanded && (
        <div className={styles.explanationPanel}>
          <div className={styles.explanationContent}>
            <div className={styles.explanationColumns}>
              <div className={styles.configExplanation}>
                <h4 className={styles.configExplanationTitle}>Configuration Strategy</h4>
                {presetExplanations[selectedPreset]}
              </div>
              <div className={styles.workloadExplanationColumn}>
                {workloadExplanations[selectedWorkload]}
                {renderParameterChangeExplanation()}
              </div>
            </div>
            
            <div className={styles.generalPrinciples}>
              <h4 className={styles.principlesTitle}>LSM Tree Optimization Principles</h4>
              <div className={styles.principlePoints}>
                <div className={styles.principle}>
                  <strong>Read vs. Write Trade-off:</strong> Improving read performance typically increases write amplification, and vice versa.
                </div>
                <div className={styles.principle}>
                  <strong>Space vs. Performance:</strong> Lower space amplification usually requires more frequent compaction, increasing write amplification.
                </div>
                <div className={styles.principle}>
                  <strong>Memory Allocation:</strong> Bloom filters and block cache significantly improve read performance at the cost of memory usage.
                </div>
                <div className={styles.principle}>
                  <strong>Block Size Trade-off:</strong> Smaller blocks reduce read amplification for point lookups but increase space overhead and reduce sequential read efficiency.
                </div>
                <div className={styles.principle}>
                  <strong>Workload Adaptation:</strong> No single configuration is optimal for all access patterns. Match configuration to your workload.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
};

export default ExplanationPanel