import { Plus, RefreshCw } from 'lucide-react';
import { Label } from "../../../components/ui/label";
import { Input } from "../../../components/ui/input";
import styles from "../visualize.module.css";

/**
 * Component for handling PUT operations in the LSM Tree
 */
const PutOperation = ({
  keyInput,
  setKeyInput,
  valueInput,
  setValueInput,
  handlePut,
  handleReset,
  isDisabled
}) => {
  return (
    <div className="space-y-4">
      <div className={styles.operationRow}>
        <div className={styles.inputGroup}>
          <Label htmlFor="key-input" className={styles.inputLabel}>Key</Label>
          <Input
            id="key-input"
            type="text"
            placeholder="Enter key (Leave empty for random key)"
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            className={styles.input}
            disabled={isDisabled}
          />
        </div>
        <div className={styles.inputGroup}>
          <Label htmlFor="value-input" className={styles.inputLabel}>Value</Label>
          <Input
            id="value-input"
            type="text"
            placeholder="Enter value (Leave empty for random value)"
            value={valueInput}
            onChange={(e) => setValueInput(e.target.value)}
            className={styles.input}
            disabled={isDisabled}
          />
        </div>
        <button
          className={styles.button}
          onClick={handlePut}
          disabled={isDisabled}
        >
          <Plus className="mr-2 h-4 w-4" />
          Write
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
    </div>
  );
};

export default PutOperation;