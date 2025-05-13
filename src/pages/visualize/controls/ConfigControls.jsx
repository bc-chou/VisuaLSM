import { RefreshCw } from 'lucide-react';
import { Label } from "../../../components/ui/label";
import { Slider } from "../../../components/ui/slider";
import { Switch } from "../../../components/ui/switch";
import { RadioGroup, RadioGroupItem } from "../../../components/ui/radio-group";
import styles from "../visualize.module.css";

/**
 * Component for configuring LSM Tree parameters and optimizations
 */
const ConfigControls = ({
  animationSpeed,
  setAnimationSpeed,
  memtableSize,
  setMemtableSize,
  compactionStrategy,
  setCompactionStrategy,
  compactionThreshold,
  setCompactionThreshold,
  l0CompactionThreshold,
  setL0CompactionThreshold,
  bloomFilterEnabled,
  setBloomFilterEnabled,
  fencePointersEnabled,
  setFencePointersEnabled,
  operationInProgress,
  isCompacting,
  bloomFilterFalsePositives,
  ioSaved
}) => {
  return (
    <div className={styles.controlPanel}>
      <div className={styles.controlGroup}>
        <Label className={styles.groupLabel}>Configuration</Label>
        <div className="flex items-center space-x-2">
          <Label className={styles.sliderLabel}>Animation Speed:</Label>
          <Slider
            value={[animationSpeed]}
            min={100}
            max={1000}
            step={100}
            className={styles.slider}
            onValueChange={(val) => setAnimationSpeed(val[0])}
          />
          <span className={styles.sliderValue}>{animationSpeed}ms</span>
        </div>
        
        <div className="flex items-center space-x-2">
          <Label className={styles.sliderLabel}>Memtable Size:</Label>
          <Slider
            value={[memtableSize]}
            min={3}
            max={10}
            step={1}
            className={styles.slider}
            onValueChange={(val) => setMemtableSize(val[0])}
          />
          <span className={styles.sliderValue}>{memtableSize}</span>
        </div>
      </div>
      
      <div className={styles.controlGroup}>
        <Label className={styles.groupLabel}>Compaction Strategy</Label>
        <RadioGroup
          value={compactionStrategy}
          onValueChange={setCompactionStrategy}
          className={styles.radioGroup}
        >
          <div className={styles.radioOption}>
            <RadioGroupItem value="size-tiered" id="size-tiered" className={styles.radio} />
            <Label htmlFor="size-tiered" className={styles.radioLabel}>Size-tiered</Label>
          </div>
          <div className={styles.radioOption}>
            <RadioGroupItem value="leveled" id="leveled" className={styles.radio} />
            <Label htmlFor="leveled" className={styles.radioLabel}>Leveled</Label>
          </div>
        </RadioGroup>
        
        {compactionStrategy === "size-tiered" ? (
          <div className="flex items-center space-x-2">
            <Label className={styles.sliderLabel}>Size threshold:</Label>
            <Slider
              value={[compactionThreshold]}
              min={2}
              max={6}
              step={1}
              className={styles.slider}
              onValueChange={(val) => setCompactionThreshold(val[0])}
            />
            <span className={styles.sliderValue}>{compactionThreshold}</span>
          </div>
        ) : (
          <div className="flex items-center space-x-2">
            <Label className={styles.sliderLabel}>L0 threshold:</Label>
            <Slider
              value={[l0CompactionThreshold]}
              min={2}
              max={8}
              step={1}
              className={styles.slider}
              onValueChange={(val) => setL0CompactionThreshold(val[0])}
            />
            <span className={styles.sliderValue}>{l0CompactionThreshold}</span>
          </div>
        )}
      </div>
      
      <div className={styles.controlGroup}>
        <Label className={styles.groupLabel}>Optimizations</Label>
        <div className={styles.switchGroup}>
          <div className={styles.switchOption}>
            <Switch
              id="bloom-filter"
              checked={bloomFilterEnabled}
              onCheckedChange={setBloomFilterEnabled}
              className={styles.switch}
            />
            <Label htmlFor="bloom-filter" className={styles.switchLabel}>Bloom Filters</Label>
          </div>
          <div className={styles.switchOption}>
            <Switch
              id="fence-pointers"
              checked={fencePointersEnabled}
              onCheckedChange={setFencePointersEnabled}
              className={styles.switch}
            />
            <Label htmlFor="fence-pointers" className={styles.switchLabel}>Fence Pointers</Label>
          </div>
        </div>
        
        {(bloomFilterEnabled || fencePointersEnabled) && (
          <div className={styles.statsContainer}>
            {bloomFilterEnabled && (
              <div className={styles.optimizationStat}>
                Bloom Filter: Avoided {bloomFilterFalsePositives > 0 ? bloomFilterFalsePositives - 1 : 0} unnecessary disk reads
              </div>
            )}
            {fencePointersEnabled && (
              <div className={styles.optimizationStat}>
                Fence Pointers: Skipped {ioSaved} blocks, saved I/O
              </div>
            )}
          </div>
        )}
      </div>
      
      <div className={styles.statusIndicators}>
        {operationInProgress && (
          <div className={styles.statusBadge}>
            <RefreshCw className="h-3 w-3 mr-2 animate-spin" />
            {operationInProgress === 'put' ? 'Writing...' : 
            operationInProgress === 'delete' ? 'Deleting...' :
            operationInProgress === 'get' ? 'Reading...' :
            operationInProgress === 'range' ? 'Range Query...' : 'Processing...'}
          </div>
        )}
        
        {isCompacting && (
          <div className={styles.statusBadge}>
            <RefreshCw className="h-3 w-3 mr-2 animate-spin" />
            Compaction in progress...
          </div>
        )}
      </div>
    </div>
  );
};

export default ConfigControls;