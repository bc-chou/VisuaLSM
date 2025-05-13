import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Plus, Trash2, Search, ArrowDownUp, RefreshCw } from 'lucide-react';
import useLSMTreeCore from './hooks/useLSMTreeCore';
import PutOperation from './operations/PutOperation';
import GetOperation from './operations/GetOperation';
import DeleteOperation from './operations/DeleteOperation';
import RangeGetOperation from './operations/RangeGetOperation';
import ConfigControls from './controls/ConfigControls';
import MemorySection from './visualizations/MemorySection';
import DiskSection from './visualizations/DiskSection';
import OperationLog from './common/OperationLog';
import ScenariosPanel from './common/ScenariosPanel';
import styles from "./visualize.module.css";

const LSMTreeVisualizer = () => {
  const lsmTree = useLSMTreeCore();
  
  const {
    state: {
      memtableData,
      immutableMemtableData,
      sstables,
      walEntries,
      operationLog,
      levels,
      isCompacting,
      operationInProgress,
      searchResult,
      rangeResults,
      bloomFilterFalsePositives,
      ioSaved
    },
    handlePut,
    handleGet,
    handleDelete,
    handleRangeGet,
    handleReset,
    keyInput,
    setKeyInput,
    valueInput,
    setValueInput,
    rangeStartInput,
    setRangeStartInput,
    rangeEndInput,
    setRangeEndInput,
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
    setFencePointersEnabled
  } = lsmTree;

  return (
    <div className={styles.mainContainer}>
      {/* Educational Scenarios Panel */}
      <ScenariosPanel />
      
      {/* Operation Tabs */}
      <Tabs defaultValue="put" className="w-full">
        <TabsList className={styles.tabsList}>
          <TabsTrigger value="put" className={styles.tabsTrigger}>
            <Plus className="mr-2 h-4 w-4" /> PUT
          </TabsTrigger>
          <TabsTrigger value="delete" className={styles.tabsTrigger}>
            <Trash2 className="mr-2 h-4 w-4" /> DELETE
          </TabsTrigger>
          <TabsTrigger value="get" className={styles.tabsTrigger}>
            <Search className="mr-2 h-4 w-4" /> GET
          </TabsTrigger>
          <TabsTrigger value="range" className={styles.tabsTrigger}>
            <ArrowDownUp className="mr-2 h-4 w-4" /> RANGE-GET
          </TabsTrigger>
        </TabsList>
        
        {/* PUT Tab */}
        <TabsContent value="put">
          <PutOperation
            keyInput={keyInput}
            setKeyInput={setKeyInput}
            valueInput={valueInput}
            setValueInput={setValueInput}
            handlePut={handlePut}
            handleReset={handleReset}
            isDisabled={operationInProgress || isCompacting}
          />
        </TabsContent>
        
        {/* DELETE Tab */}
        <TabsContent value="delete">
          <DeleteOperation
            keyInput={keyInput}
            setKeyInput={setKeyInput}
            handleDelete={handleDelete}
            handleReset={handleReset}
            isDisabled={operationInProgress || isCompacting}
          />
        </TabsContent>
        
        {/* GET Tab */}
        <TabsContent value="get">
          <GetOperation
            keyInput={keyInput}
            setKeyInput={setKeyInput}
            handleGet={handleGet}
            handleReset={handleReset}
            isDisabled={operationInProgress || isCompacting}
            searchResult={searchResult}
          />
        </TabsContent>
        
        {/* RANGE-GET Tab */}
        <TabsContent value="range">
          <RangeGetOperation
            rangeStartInput={rangeStartInput}
            setRangeStartInput={setRangeStartInput}
            rangeEndInput={rangeEndInput}
            setRangeEndInput={setRangeEndInput}
            handleRangeGet={handleRangeGet}
            handleReset={handleReset}
            isDisabled={operationInProgress || isCompacting}
            rangeResults={rangeResults}
          />
        </TabsContent>
      </Tabs>
      
      {/* Controls & Status */}
      <ConfigControls
        animationSpeed={animationSpeed}
        setAnimationSpeed={setAnimationSpeed}
        memtableSize={memtableSize}
        setMemtableSize={setMemtableSize}
        compactionStrategy={compactionStrategy}
        setCompactionStrategy={setCompactionStrategy}
        compactionThreshold={compactionThreshold}
        setCompactionThreshold={setCompactionThreshold}
        l0CompactionThreshold={l0CompactionThreshold}
        setL0CompactionThreshold={setL0CompactionThreshold}
        bloomFilterEnabled={bloomFilterEnabled}
        setBloomFilterEnabled={setBloomFilterEnabled}
        fencePointersEnabled={fencePointersEnabled}
        setFencePointersEnabled={setFencePointersEnabled}
        operationInProgress={operationInProgress}
        isCompacting={isCompacting}
        bloomFilterFalsePositives={bloomFilterFalsePositives}
        ioSaved={ioSaved}
      />
      
      {/* Main Display */}
      <div className={styles.dataContainer}>
        {/* Memory Section */}
        <MemorySection
          memtableData={memtableData}
          immutableMemtableData={immutableMemtableData}
          memtableSize={memtableSize}
          formatValue={lsmTree.formatValue}
        />
        
        {/* Disk Section */}
        <DiskSection
          walEntries={walEntries}
          sstables={sstables}
          levels={levels}
          compactionStrategy={compactionStrategy}
          isCompacting={isCompacting}
          compactionThreshold={compactionThreshold}
          formatValue={lsmTree.formatValue}
        />
      </div>
      
      {/* Operation Log */}
      <OperationLog entries={operationLog} />
    </div>
  );
};

export default LSMTreeVisualizer;