import { Search, RefreshCw } from 'lucide-react';
import { Label } from "../../../components/ui/label";
import { Input } from "../../../components/ui/input";
import styles from "../visualize.module.css";

/**
 * Component for handling GET operations in the LSM Tree
 */
const GetOperation = ({
  keyInput,
  setKeyInput,
  handleGet,
  handleReset,
  isDisabled,
  searchResult
}) => {
  return (
    <div className="space-y-4">
      <div className={styles.operationRow}>
        <div className={styles.inputGroup}>
          <Label htmlFor="get-key-input" className={styles.inputLabel}>Key to Read</Label>
          <Input
            id="get-key-input"
            type="text"
            placeholder="Enter key to find"
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            className={styles.input}
            disabled={isDisabled}
          />
        </div>
        <div className={styles.spacer}></div>
        <button
          className={styles.button}
          onClick={handleGet}
          disabled={isDisabled}
        >
          <Search className="mr-2 h-4 w-4" />
          Read
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
      
      {/* GET Results */}
      {searchResult && (
        <div className={`p-4 rounded-md ${
          searchResult.found ? styles.resultFound : styles.resultNotFound
        }`}>
          {searchResult.found ? (
            <p>
              Found key: <strong>{searchResult.key}</strong> with value: <strong>{searchResult.value} </strong> 
              in <em>{searchResult.source}</em>
            </p>
          ) : (
            <p>
              Key <strong>{searchResult.key}</strong> was not found 
              {searchResult.source !== "none" && ` (deleted record found in ${searchResult.source})`}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default GetOperation;