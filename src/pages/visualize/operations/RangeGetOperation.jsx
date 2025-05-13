import { ArrowDownUp, RefreshCw } from 'lucide-react';
import { Label } from "../../../components/ui/label";
import { Input } from "../../../components/ui/input";
import styles from "../visualize.module.css";

/**
 * Component for handling RANGE-GET operations in the LSM Tree
 */
const RangeGetOperation = ({
  rangeStartInput,
  setRangeStartInput,
  rangeEndInput,
  setRangeEndInput,
  handleRangeGet,
  handleReset,
  isDisabled,
  rangeResults
}) => {
  return (
    <div className="space-y-4">
      <div className={styles.operationRow}>
        <div className={styles.inputGroup}>
          <Label htmlFor="range-start-input" className={styles.inputLabel}>Start Key</Label>
          <Input
            id="range-start-input"
            type="text"
            placeholder="Enter start key"
            value={rangeStartInput}
            onChange={(e) => setRangeStartInput(e.target.value)}
            className={styles.input}
            disabled={isDisabled}
          />
        </div>
        <div className={styles.inputGroup}>
          <Label htmlFor="range-end-input" className={styles.inputLabel}>End Key</Label>
          <Input
            id="range-end-input"
            type="text"
            placeholder="Enter end key"
            value={rangeEndInput}
            onChange={(e) => setRangeEndInput(e.target.value)}
            className={styles.input}
            disabled={isDisabled}
          />
        </div>
        <button
          className={styles.button}
          onClick={handleRangeGet}
          disabled={isDisabled}
        >
          <ArrowDownUp className="mr-2 h-4 w-4" />
          Range Query
        </button>
        <button
          className={styles.resetButton}
          onClick={handleReset}
          disabled={isDisabled}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Reset Data
        </button>
      </div>
      
      {/* Range Results */}
      {rangeResults.length > 0 && (
        <div className={styles.resultsContainer}>
          <h3 className="font-medium mb-2">Range Query Results ({rangeResults.length} items):</h3>
          <div className="grid grid-cols-3 gap-2">
            {rangeResults.map((result, index) => (
              <div key={index} className={styles.rangeResultItem}>
                <strong>{result.key}:</strong> {result.value} 
                <span className="text-xs ml-2">({result.source})</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default RangeGetOperation;