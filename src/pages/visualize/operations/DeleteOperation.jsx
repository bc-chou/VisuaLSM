import { Trash2, RefreshCw } from 'lucide-react';
import { Label } from "../../../components/ui/label";
import { Input } from "../../../components/ui/input";
import styles from "../visualize.module.css";

/**
 * Component for handling DELETE operations in the LSM Tree
 */
const DeleteOperation = ({
  keyInput,
  setKeyInput,
  handleDelete,
  handleReset,
  isDisabled
}) => {
  return (
    <div className="space-y-4">
      <div className={styles.operationRow}>
        <div className={styles.inputGroup}>
          <Label htmlFor="delete-key-input" className={styles.inputLabel}>Key to Delete</Label>
          <Input
            id="delete-key-input"
            type="text"
            placeholder="Enter key to delete"
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            className={styles.input}
            disabled={isDisabled}
          />
        </div>
        <div className={styles.spacer}></div>
        <button
          className={styles.button}
          onClick={handleDelete}
          disabled={isDisabled}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
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

export default DeleteOperation;