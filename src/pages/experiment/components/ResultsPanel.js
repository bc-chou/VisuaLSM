import { ArrowUp, ArrowDown, Minus } from 'lucide-react';
import styles from '../styles/experiment.module.css';

/**
 * Component to display performance metrics with before/after comparison
 */
const ResultsPanel = ({ 
  baseConfig, 
  variationConfig, 
  workload, 
  changedParameter,
  parameterValue 
}) => {
  // Early return if data isn't loaded yet
  if (!baseConfig) return null;
  
  // Determine which metrics to highlight based on workload type
  const shouldHighlightMetric = (metricId, metricCategory) => {
    // Always highlight core operation metrics
    if (metricId === 'operation_throughput_ops' || metricId === 'operation_latency_micros') {
      return true;
    }
    
    // Highlight read metrics for read-focused workloads
    if ((workload === 'point-lookup' || workload === 'range-query' || workload === 'mixed-read') &&
        (metricId === 'read_amplification' || 
         metricId === 'block_cache_hit_ratio' || 
         metricId === 'bloom_filter_useful' ||
         metricId === 'read_latency_p50')) {
      return true;
    }
    
    // Highlight write metrics for write-focused workloads
    if ((workload === 'write-heavy' || workload === 'mixed-write') &&
        (metricId === 'write_amplification' || metricId === 'write_latency_p50')) {
      return true;
    }
    
    // For balanced workload, highlight both read and write primary metrics
    if (workload === 'mixed-balanced' && 
        (metricId === 'read_latency_p50' || metricId === 'write_latency_p50')) {
      return true;
    }
    
    return false;
  };
  
  // Organize metrics into categories for better display
  const metricCategories = [
    {
      title: "Core Amplification Metrics",
      metrics: [
        { id: 'read_amplification', name: 'Read Amplification', unit: 'x', lower_is_better: true },
        { id: 'write_amplification', name: 'Write Amplification', unit: 'x', lower_is_better: true },
        { id: 'space_amplification', name: 'Space Amplification', unit: 'x', lower_is_better: true },
      ]
    },
    {
      title: "Performance Metrics",
      metrics: [
        { 
          id: 'operation_throughput_ops', 
          name: 'Operation Throughput (ops/s)', 
          unit: ' ops/s', 
          lower_is_better: false
        },
        { 
            id: 'operation_latency_micros', 
            name: 'Operation Latency', 
            unit: ' µs/op', 
            lower_is_better: true
          }
      ]
    },
    {
      title: "Detailed Latency Distribution (Read)",
      metrics: [
        { id: 'read_latency_p50', name: 'P50 Latency', unit: ' µs', lower_is_better: true },
        { id: 'read_latency_p95', name: 'P95 Latency', unit: ' µs', lower_is_better: true },
        { id: 'read_latency_p99', name: 'P99 Latency', unit: ' µs', lower_is_better: true },
        { id: 'read_latency_p100', name: 'P100 (worst-case) Latency', unit: ' µs', lower_is_better: true }
      ]
    },
    {
      title: "Detailed Latency Distribution (Write)",
      metrics: [
        { id: 'write_latency_p50', name: 'P50 Latency', unit: ' µs', lower_is_better: true },
        { id: 'write_latency_p95', name: 'P95 Latency', unit: ' µs', lower_is_better: true },
        { id: 'write_latency_p99', name: 'P99 Latency', unit: ' µs', lower_is_better: true },
        { id: 'write_latency_p100', name: 'P100 (worst-case) Latency', unit: ' µs', lower_is_better: true }
      ]
    },
    {
      title: "Efficiency Metrics",
      metrics: [
        { id: 'block_cache_hit_ratio', name: 'Block Cache Hit Ratio', unit: '', lower_is_better: false, format: (val) => `${(val * 100).toFixed(1)}%` },
        { id: 'bloom_filter_useful', name: 'Bloom Filter Effectiveness', unit: '', lower_is_better: false, format: (val) => `${(val * 100).toFixed(1)}%` },
        { id: 'compaction_throughput', name: 'Compaction Throughput', unit: ' MB/s', lower_is_better: false },
        { id: 'compaction_latency', name: 'Compaction Latency', unit: ' ms', lower_is_better: true }
      ]
    }
  ];
  
  // Format the parameter change for display
  const getParameterChangeText = () => {
    if (!changedParameter || !parameterValue) return null;
    
    return formatParameterChange(changedParameter, baseConfig.params[changedParameter], parameterValue);
  };
  
  return (
    <div className={styles.resultsPanelContainer}>
      <div className={styles.resultsHeader}>
        <h3 className={styles.resultsTitle}>
          Performance Results
        </h3>
        {variationConfig && (
          <div className={styles.parameterChangeBadge}>
            {getParameterChangeText()}
          </div>
        )}
      </div>
      
      <div className={styles.metricsLayout}>
        {/* Render each category of metrics */}
        {metricCategories.map((category, categoryIndex) => (
          <div key={categoryIndex} className={styles.metricsCategory}>
            <h4 className={styles.categoryTitle}>{category.title}</h4>
            <div className={styles.metricsGrid}>
              {category.metrics.map(metric => {
                const baseValue = baseConfig.results[metric.id];
                const varValue = variationConfig?.results[metric.id];
                const formatValue = metric.format || ((val) => `${val.toFixed(1)}${metric.unit}`);
                
                // Skip if metric is not available in results
                if (baseValue === undefined) return null;
                
                // Determine if this metric should be highlighted
                const highlight = shouldHighlightMetric(metric.id, category.title);
                
                // Calculate comparison indicators if we have a variation
                let comparisonIndicator = null;
                if (variationConfig) {
                  const diff = varValue - baseValue;
                  const percentChange = Math.abs((diff / baseValue) * 100).toFixed(1);
                  
                  if (Math.abs(diff) < 0.01) {
                    comparisonIndicator = (
                      <span className={styles.neutralMetric}>
                        <Minus size={14} /> No change
                      </span>
                    );
                  } else {
                    const isBetter = metric.lower_is_better ? varValue < baseValue : varValue > baseValue;
                    comparisonIndicator = (
                      <span className={isBetter ? styles.betterMetric : styles.worseMetric}>
                        {isBetter ? <ArrowUp size={14} /> : <ArrowDown size={14} />} {percentChange}%
                      </span>
                    );
                  }
                }
                
                return (
                  <div 
                    key={metric.id} 
                    className={`${styles.metricCard} ${highlight ? styles.highlightedMetric : ''}`}
                  >
                    <div className={styles.metricName}>{metric.name}</div>
                    <div className={styles.metricValueContainer}>
                      <div className={styles.baseMetricValue}>
                        {formatValue(baseValue)}
                      </div>
                      
                      {variationConfig && (
                        <div className={styles.metricComparison}>
                          <div className={styles.comparisonArrow}>→</div>
                          <div className={styles.varMetricValue}>
                            {formatValue(varValue)}
                          </div>
                          {comparisonIndicator}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Helper function to format parameter change in a readable way
const formatParameterChange = (parameter, oldValue, newValue) => {
  switch (parameter) {
    case 'compaction_style':
      return `Compaction Style: ${oldValue === 'level' ? 'Leveled' : 'Universal'} → ${newValue === 'level' ? 'Leveled' : 'Universal'}`;
    case 'write_buffer_size':
      return `Write Buffer Size: ${oldValue} MB → ${newValue} MB`;
    case 'level0_file_num_compaction_trigger':
      return `L0 Compaction Trigger: ${oldValue} files → ${newValue} files`;
    case 'bloom_bits_per_key':
      return `Bloom Filter: ${oldValue === 0 ? 'Disabled' : `${oldValue} bits`} → ${newValue === 0 ? 'Disabled' : `${newValue} bits`}`;
    case 'block_size':
      return `Block Size: ${oldValue} KB → ${newValue} KB`;
    default:
      return `${parameter.replace(/_/g, ' ')}: ${oldValue} → ${newValue}`;
  }
};

export default ResultsPanel;