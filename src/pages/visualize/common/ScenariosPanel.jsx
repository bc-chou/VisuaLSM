import { useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
import styles from "../visualize.module.css";

// Array of educational scenarios
const scenarios = [
  {
    title: "Write Amplification in LSM Trees",
    learningGoal: "Understand why LSM Trees are optimized for write-heavy workloads",
    steps: [
      "Configure a small memtable size (3-4 entries) to trigger frequent flushes",
      "Perform a series of 10-15 PUT operations with random keys and values",
      "Observe data flowing through: WAL → memtable → immutable memtable → SSTables",
      "Notice how writes remain efficient even as the database grows because they avoid random disk I/O"
    ],
    keyInsight: "LSM Trees excel for write-heavy workloads because of their append-only structure and batched writes in memory, converting random disk writes into sequential I/O, significantly improving throughput compared to traditional B-Tree structures."
  },
  {
    title: "Compaction Strategies Comparison",
    learningGoal: "Compare size-tiered vs. leveled compaction and understand their trade-offs",
    steps: [
      "Reset the system and set a very small memtable size (3)",
      "Start with size-tiered compaction and perform 15-20 write operations",
      "Observe how multiple small SSTables form and eventually trigger compaction",
      "Reset and switch to leveled compaction",
      "Perform the same operations and observe the different organization",
    ],
    keyInsight: "Size-tiered compaction optimizes for write throughput while leveled compaction provides more predictable read performance at the cost of more disk I/O during compaction.\
    Head over to the Experiment section to observe read/write performance with different compaction strategies."
  },
  {
    title: "Tombstone Propagation and Deletion",
    learningGoal: "Understand the eventual consistency model of deletions in LSM Trees",
    steps: [
      "Write several key-value pairs",
      "Trigger flushes to create multiple SSTables",
      "Delete a key that exists in an older SSTable",
      "Perform GET operations on the deleted key",
      "Observe that the tombstone prevents the old value from being returned",
      "Trigger compactions and observe tombstone propagation",
      "Eventually, see the tombstone being removed after the grace period"
    ],
    keyInsight: "Deletes in LSM-based NoSQL databases aren't immediate physical deletions but logical markers (tombstones) that eventually propagate through the system, demonstrating eventual consistency."
  },
  {
    title: "Read Path Optimizations",
    learningGoal: "Understand how bloom filters and fence pointers optimize reads",
    steps: [
      "Create a database with many entries across multiple SSTables",
      "Perform GET operations with bloom filters and fence pointers disabled",
      "Enable bloom filters and repeat the GET operations",
      "Check the operation log to see which SSTables were skipped",
      "Enable fence pointers and perform GET operations",
      "Observe the I/O savings reported in the optimization stats"
    ],
    keyInsight: "Bloom filters allow LSM Trees to quickly determine if a key definitely doesn't exist in an SSTable, while fence pointers help skip irrelevant blocks during reads, dramatically reducing I/O operations."
  },
  {
    title: "Range Query Process",
    learningGoal: "Visualize how range queries return data",
    steps: [
      "Configure leveled compaction with a low L0 threshold (2)",
      "Perform a large number of writes (25+)",
      "Observe how data are in different components throughout the system",
      "Insert an existing key in an older SSTable with a different value into the memtable",
      "Perform a range query involving a key range across different components and levels",
      "Observe the returned data and notice the range query returns the entire list of most recent keys"
    ],
    keyInsight: "Range queries extract the most recent data across all levels and components (memtable > immutable memtable > sstables) and return all the queried keys. This process typically has higher latency for large ranges due to the need to check and merge results from multiple components."
  }
];

/**
 * Component for displaying educational scenarios and step-by-step guides
 */
const ScenariosPanel = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentScenario, setCurrentScenario] = useState(0);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const goToPreviousScenario = () => {
    setCurrentScenario((prev) => (prev === 0 ? scenarios.length - 1 : prev - 1));
  };

  const goToNextScenario = () => {
    setCurrentScenario((prev) => (prev === scenarios.length - 1 ? 0 : prev + 1));
  };

  const scenario = scenarios[currentScenario];

  return (
    <div className={styles.scenariosPanelContainer}>
      <div className={styles.scenariosPanelHeader} onClick={toggleExpanded}>
        <h3 className={styles.scenariosPanelTitle}>
          Tutorials
          {isExpanded ? (
            <ChevronUp className="ml-2 h-4 w-4" />
          ) : (
            <ChevronDown className="ml-2 h-4 w-4" />
          )}
        </h3>
      </div>

      {isExpanded && (
        <div className={styles.scenariosPanelContent}>
          <div className={styles.scenarioNavigation}>
            <button
              className={styles.scenarioNavButton}
              onClick={goToPreviousScenario}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className={styles.scenarioCounter}>
              Scenario {currentScenario + 1} of {scenarios.length}
            </span>
            <button
              className={styles.scenarioNavButton}
              onClick={goToNextScenario}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          <div className={styles.scenarioContent}>
            <h3 className={styles.scenarioTitle}>{scenario.title}</h3>
            
            <div className={styles.scenarioSection}>
              <h4 className={styles.scenarioSectionTitle}>Learning Goal</h4>
              <p>{scenario.learningGoal}</p>
            </div>
            
            <div className={styles.scenarioSection}>
              <h4 className={styles.scenarioSectionTitle}>Steps</h4>
              <ol className={styles.scenarioSteps}>
                {scenario.steps.map((step, index) => (
                  <li key={index}>{step}</li>
                ))}
              </ol>
            </div>
            
            <div className={styles.scenarioSection}>
              <h4 className={styles.scenarioSectionTitle}>Key Insight</h4>
              <p className={styles.scenarioInsight}>{scenario.keyInsight}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScenariosPanel;