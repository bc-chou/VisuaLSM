import { useState, useEffect, useCallback } from 'react';

// Tombstone marker for deleted items
const TOMBSTONE = Symbol("TOMBSTONE");
const TOMBSTONE_GRACE_PERIOD = 2;

/**
 * Custom hook that encapsulates LSM Tree core logic and state
 */
export const useLSMTreeCore = () => {
  // Core data structures
  const [memtableData, setMemtableData] = useState([]);
  const [sstables, setSSTables] = useState([]);
  const [walEntries, setWalEntries] = useState([]);
  const [operationLog, setOperationLog] = useState([]);
  const [levels, setLevels] = useState([[], [], [], []]);
  
  // UI state
  const [isCompacting, setIsCompacting] = useState(false);
  const [operationInProgress, setOperationInProgress] = useState(null);
  const [animationSpeed, setAnimationSpeed] = useState(500);
  const [compactionStrategy, setCompactionStrategy] = useState("size-tiered");
  const [memtableSize, setMemtableSize] = useState(5);
  const [immutableMemtableData, setImmutableMemtableData] = useState([]);
  const [isMemtableFlushing, setIsMemtableFlushing] = useState(false);
  const [compactionThreshold, setCompactionThreshold] = useState(3);
  const [l0CompactionThreshold, setL0CompactionThreshold] = useState(4);
  const [compactionCounter, setCompactionCounter] = useState(0);

  // Track SSTable generations
  const [sstableGeneration, setSstableGeneration] = useState(0);

  // Optimization toggles
  const [bloomFilterEnabled, setBloomFilterEnabled] = useState(false);
  const [fencePointersEnabled, setFencePointersEnabled] = useState(false);
  const [bloomFilterFalsePositives, setBloomFilterFalsePositives] = useState(0);
  const [ioSaved, setIoSaved] = useState(0);
  
  // Input fields
  const [keyInput, setKeyInput] = useState("");
  const [valueInput, setValueInput] = useState("");
  const [rangeStartInput, setRangeStartInput] = useState("");
  const [rangeEndInput, setRangeEndInput] = useState("");
  const [searchResult, setSearchResult] = useState(null);
  const [rangeResults, setRangeResults] = useState([]);

  // Add a log entry
  const logOperation = useCallback((operation, details) => {
    const newEntry = {
      id: Date.now(),
      timestamp: new Date().toLocaleTimeString(),
      operation,
      details,
    };
    
    // Add to the end of the log for chronological order (oldest first)
    setOperationLog(prev => [...prev.slice(-14), newEntry]);
  }, []);

  // Generate a random key
  const generateRandomKey = useCallback(() => {
    return Math.floor(Math.random() * 100);
  }, []);

  // Generate a random value
  const generateRandomValue = useCallback(() => {
    return Math.floor(Math.random() * 1000);
  }, []);

  // Simulated bloom filter check
  const bloomFilterCheck = useCallback((key, tableIndex) => {
    if (!bloomFilterEnabled) return true; // If not enabled, always check the table
    
    // Simulate bloom filter: 90% true positives, 10% false positives
    const keyInTable = sstables[tableIndex].some(item => item.key === key);
    
    if (keyInTable) {
      return true; // Key is actually in the table, bloom filter correctly says "maybe"
    } else {
      // Simulated false positive rate (10%)
      const falsePositive = Math.random() < 0.1;
      if (falsePositive) {
        setBloomFilterFalsePositives(prev => prev + 1);
        return true; // False positive - bloom filter says "maybe" but key isn't there
      }
      return false; // True negative - bloom filter correctly says "definitely not"
    }
  }, [bloomFilterEnabled, sstables]);

  // Simulated fence pointers to narrow search range
  const useFencePointers = useCallback((table, key) => {
    if (!fencePointersEnabled) return table; // If not enabled, search entire table
    
    // With fence pointers, we can quickly determine the min/max keys in each block
    // and skip entire blocks that don't contain our key
    
    // Simulate blocks of data (each block is 2 entries)
    const blockSize = 2;
    const blocks = [];
    
    for (let i = 0; i < table.length; i += blockSize) {
      const block = table.slice(i, i + blockSize);
      blocks.push(block);
    }
    
    // Use fence pointers to find which blocks might contain the key
    const relevantBlocks = blocks.filter(block => {
      if (block.length === 0) return false;
      
      const minKey = Math.min(...block.map(item => typeof item.key === 'string' ? item.key.charCodeAt(0) : item.key));
      const maxKey = Math.max(...block.map(item => typeof item.key === 'string' ? item.key.charCodeAt(0) : item.key));
      
      // Only search blocks where key is in range
      const numKey = typeof key === 'string' ? key.charCodeAt(0) : key;
      return numKey >= minKey && numKey <= maxKey;
    });
    
    // Count how many blocks we skipped as IO savings
    const blocksSkipped = blocks.length - relevantBlocks.length;
    if (blocksSkipped > 0) {
      setIoSaved(prev => prev + blocksSkipped);
      logOperation("OPTIMIZATION", `Fence pointers skipped ${blocksSkipped} blocks`);
    }
    
    // Return only entries from relevant blocks
    return relevantBlocks.flat();
  }, [fencePointersEnabled, logOperation]);

  // PUT operation
  const handlePut = useCallback(() => {
    let key, value;
    
    // Generate random values if inputs are empty
    if (!keyInput && !valueInput) {
      key = generateRandomKey();
      value = generateRandomValue();
    } else {
      // Parse inputs if provided
      key = keyInput ? (parseInt(keyInput) || keyInput) : generateRandomKey();
      value = valueInput ? (parseInt(valueInput) || valueInput) : generateRandomValue();
    }
    
    const newWrite = { key, value, timestamp: Date.now() };
    
    setOperationInProgress('put');
    
    // Step 1: Write to WAL first
    setWalEntries(prev => [...prev, newWrite]);
    logOperation("WAL Write", `Key: ${key}, Value: ${value}`);
    
    // Step 2: After WAL is updated, write to memtable
    setTimeout(() => {
      setMemtableData(prev => {
        // Remove any existing entry with the same key
        const filtered = prev.filter(item => item.key !== key);
        // Add new entry and sort
        return [...filtered, newWrite].sort((a, b) => 
          typeof a.key === 'string' && typeof b.key === 'string' 
            ? a.key.localeCompare(b.key) 
            : a.key - b.key
        );
      });
      
      logOperation("PUT", `Key: ${key}, Value: ${value}`);
      setOperationInProgress(null);
      setKeyInput("");
      setValueInput("");
    }, animationSpeed);
  }, [keyInput, valueInput, animationSpeed, generateRandomKey, generateRandomValue, logOperation]);

  // DELETE operation
  const handleDelete = useCallback(() => {
    if (!keyInput) {
      alert("Please enter a key to delete");
      return;
    }
    
    const key = parseInt(keyInput) || keyInput;
    const tombstoneWrite = { 
      key, 
      value: TOMBSTONE, 
      timestamp: Date.now(),
      // Store the current max generation - tombstone needs to reach this generation
      maxGeneration: sstableGeneration,
      // Track when it was created (for visualization purposes)
      compactionCreated: compactionCounter
    };
    
    setOperationInProgress('delete');
    
    // Step 1: Write tombstone to WAL
    setWalEntries(prev => [...prev, tombstoneWrite]);
    logOperation("WAL Write", `DELETE Key: ${key}`);
    
    // Step 2: Write tombstone to memtable
    setTimeout(() => {
      setMemtableData(prev => {
        // Remove any existing entry with the same key
        const filtered = prev.filter(item => item.key !== key);
        // Add tombstone entry and sort
        return [...filtered, tombstoneWrite].sort((a, b) => 
          typeof a.key === 'string' && typeof b.key === 'string' 
            ? a.key.localeCompare(b.key) 
            : a.key - b.key
        );
      });
      
      logOperation("DELETE", `Key: ${key}`);
      setOperationInProgress(null);
      setKeyInput("");
    }, animationSpeed);
  }, [keyInput, animationSpeed, logOperation, sstableGeneration, compactionCounter]);

  // GET operation
  const handleGet = useCallback(() => {
    if (!keyInput) {
      alert("Please enter a key to search");
      return;
    }
    
    const key = parseInt(keyInput) || keyInput;
    setOperationInProgress('get');
    logOperation("GET", `Searching for key: ${key}`);
    
    // First check memtable
    setTimeout(() => {
      const memtableResult = memtableData.find(item => item.key === key);
      
      if (memtableResult) {
        if (memtableResult.value === TOMBSTONE) {
          setSearchResult({ found: false, source: "memtable", key });
          logOperation("GET Result", `Key ${key} was deleted (found in memtable)`);
        } else {
          setSearchResult({ 
            found: true, 
            source: "memtable", 
            key: memtableResult.key, 
            value: memtableResult.value 
          });
          logOperation("GET Result", `Found in memtable: ${key} -> ${memtableResult.value}`);
        }
        setOperationInProgress(null);
        return;
      }
  
      // Check immutable memtable if it's not empty
      if (immutableMemtableData.length > 0) {
        const immutableResult = immutableMemtableData.find(item => item.key === key);
        
        if (immutableResult) {
          if (immutableResult.value === TOMBSTONE) {
            setSearchResult({ found: false, source: "immutable memtable", key });
            logOperation("GET Result", `Key ${key} was deleted (found in immutable memtable)`);
          } else {
            setSearchResult({ 
              found: true, 
              source: "immutable memtable", 
              key: immutableResult.key, 
              value: immutableResult.value 
            });
            logOperation("GET Result", `Found in immutable memtable: ${key} -> ${immutableResult.value}`);
          }
          setOperationInProgress(null);
          return;
        }
      }
      
      logOperation("GET", `Key ${key} not found in memory, checking SSTables`);
      
      if (compactionStrategy === "size-tiered") {
        // For size-tiered, search through SSTables
        searchSizeTieredSSTables(key);
      } else {
        // For leveled, search through levels
        searchLeveledSSTables(key);
      }
    }, animationSpeed);
    
    // Function to search through size-tiered SSTables
    const searchSizeTieredSSTables = (key) => {
      // Then check SSTables in order (most recent first)
      let sstableIndex = -1;
      let sstableResult = null;
      
      // Visual search through SSTables
      const searchSSTables = (index) => {
        if (index >= sstables.length) {
          // Finished searching all SSTables
          if (sstableResult) {
            if (sstableResult.value === TOMBSTONE) {
              setSearchResult({ found: false, source: `sstable-${sstableIndex}`, key });
              logOperation("GET Result", `Key ${key} was deleted (found in SSTable ${sstableIndex})`);
            } else {
              setSearchResult({ 
                found: true, 
                source: `sstable-${sstableIndex}`, 
                key: sstableResult.key, 
                value: sstableResult.value 
              });
              logOperation("GET Result", `Found in SSTable ${sstableIndex}: ${key} -> ${sstableResult.value}`);
            }
          } else {
            setSearchResult({ found: false, source: "none", key });
            logOperation("GET Result", `Key ${key} not found`);
          }
          setOperationInProgress(null);
          return;
        }
        
        // Check if we can skip this SSTable using bloom filter
        if (bloomFilterEnabled) {
          const shouldCheck = bloomFilterCheck(key, index);
          if (!shouldCheck) {
            logOperation("OPTIMIZATION", `Bloom filter: Key ${key} definitely not in SSTable ${index}`);
            searchSSTables(index + 1);
            return;
          }
        }
        
        logOperation("GET", `Searching SSTable ${index}`);
        
        // Apply fence pointers to narrow search space
        let tableToSearch = sstables[index];
        if (fencePointersEnabled) {
          tableToSearch = useFencePointers(sstables[index], key);
        }
        
        // Search current SSTable
        setTimeout(() => {
          const result = tableToSearch.find(item => item.key === key);
          if (result && (!sstableResult || result.timestamp > sstableResult.timestamp)) {
            sstableResult = result;
            sstableIndex = index;
          }
          
          // Continue with next SSTable
          searchSSTables(index + 1);
        }, animationSpeed / 2); // Faster search through SSTables
      };
      
      searchSSTables(0);
    };
    
    // Function to search through leveled SSTables
    const searchLeveledSSTables = (key) => {
      // For leveled compaction, search through levels in order
      let levelIndex = -1;
      let sstableIndex = -1;
      let resultFound = null;
      
      // Recursive function to search through levels
      const searchLevel = (level) => {
        if (level >= levels.length) {
          // Finished searching all levels
          if (resultFound) {
            if (resultFound.value === TOMBSTONE) {
              setSearchResult({ found: false, source: `L${levelIndex}-${sstableIndex}`, key });
              logOperation("GET Result", `Key ${key} was deleted (found in L${levelIndex}-${sstableIndex})`);
            } else {
              setSearchResult({ 
                found: true, 
                source: `L${levelIndex}-${sstableIndex}`, 
                key: resultFound.key, 
                value: resultFound.value 
              });
              logOperation("GET Result", `Found in L${levelIndex}-${sstableIndex}: ${key} -> ${resultFound.value}`);
            }
          } else {
            setSearchResult({ found: false, source: "none", key });
            logOperation("GET Result", `Key ${key} not found`);
          }
          setOperationInProgress(null);
          return;
        }
        
        logOperation("GET", `Searching Level ${level}`);
        
        // L0 files might overlap, need to check all of them
        if (level === 0) {
          searchL0Tables(key, level, () => {
            searchLevel(level + 1);
          });
        } else {
          // For levels >0, files are non-overlapping, can do binary search
          searchSortedLevel(key, level, () => {
            searchLevel(level + 1);
          });
        }
      };
      
      // Function to search L0 tables (which may have overlapping ranges)
      const searchL0Tables = (key, level, callback) => {
        let currentTable = 0;
        
        const checkNextTable = () => {
          if (currentTable >= levels[level].length) {
            callback(); // Move to next level
            return;
          }
          
          // Check if we can skip this table using bloom filter
          if (bloomFilterEnabled) {
            // Simulate bloom filter for L0
            const tableHasKey = levels[level][currentTable].some(item => item.key === key);
            const falsePositive = !tableHasKey && Math.random() < 0.1;
            
            if (!tableHasKey && !falsePositive) {
              logOperation("OPTIMIZATION", `Bloom filter: Key ${key} definitely not in L${level}-${currentTable}`);
              currentTable++;
              checkNextTable();
              return;
            }
          }
          
          logOperation("GET", `Searching L${level}-${currentTable}`);
          
          // Apply fence pointers if enabled
          let tableToSearch = levels[level][currentTable];
          if (fencePointersEnabled) {
            // Create blocks and find relevant ones
            const blockSize = 2;
            const blocks = [];
            let skippedBlocks = 0;
            
            for (let i = 0; i < tableToSearch.length; i += blockSize) {
              const block = tableToSearch.slice(i, i + blockSize);
              if (block.length > 0) {
                const minKey = Math.min(...block.map(item => 
                  typeof item.key === 'string' ? item.key.charCodeAt(0) : item.key
                ));
                const maxKey = Math.max(...block.map(item => 
                  typeof item.key === 'string' ? item.key.charCodeAt(0) : item.key
                ));
                
                const numKey = typeof key === 'string' ? key.charCodeAt(0) : key;
                if (numKey >= minKey && numKey <= maxKey) {
                  blocks.push(block);
                } else {
                  skippedBlocks++;
                }
              }
            }
            
            if (skippedBlocks > 0) {
              setIoSaved(prev => prev + skippedBlocks);
              logOperation("OPTIMIZATION", `Fence pointers skipped ${skippedBlocks} blocks in L${level}-${currentTable}`);
            }
            
            tableToSearch = blocks.flat();
          }
          
          // Check the table
          setTimeout(() => {
            const result = tableToSearch.find(item => item.key === key);
            if (result && (!resultFound || result.timestamp > resultFound.timestamp)) {
              resultFound = result;
              levelIndex = level;
              sstableIndex = currentTable;
            }
            
            currentTable++;
            checkNextTable();
          }, animationSpeed / 2);
        };
        
        checkNextTable();
      };
      
      // Function to search sorted levels (L1 and beyond, with non-overlapping ranges)
      const searchSortedLevel = (key, level, callback) => {
        if (levels[level].length === 0) {
          callback(); // No files in this level, move to next level
          return;
        }
        
        // In real LSM Tree, we'd use binary search to find the right file
        // For simplicity in visualization, we'll check each file
        let fileIndex = 0;
        
        const checkNextFile = () => {
          if (fileIndex >= levels[level].length) {
            callback(); // Move to next level
            return;
          }
          
          const file = levels[level][fileIndex];
          
          // In sorted levels, we can skip files based on key range
          if (file.length > 0) {
            const minKey = file[0].key;
            const maxKey = file[file.length - 1].key;
            
            // Check if key is in range of this file
            if ((typeof key === 'string' && (key < minKey || key > maxKey)) || 
                (typeof key === 'number' && (key < minKey || key > maxKey))) {
              logOperation("OPTIMIZATION", `Skipping L${level}-${fileIndex} (key out of range)`);
              fileIndex++;
              checkNextFile();
              return;
            }
          }
          
          // Apply fence pointers if enabled and key is in range
          let tableToSearch = file;
          if (fencePointersEnabled) {
            // Use fence pointers to narrow search
            const filteredTable = useFencePointers(file, key);
            tableToSearch = filteredTable;
          }
          
          logOperation("GET", `Searching L${level}-${fileIndex}`);
          
          setTimeout(() => {
            const result = tableToSearch.find(item => item.key === key);
            if (result && (!resultFound || result.timestamp > resultFound.timestamp)) {
              resultFound = result;
              levelIndex = level;
              sstableIndex = fileIndex;
            }
            
            fileIndex++;
            checkNextFile();
          }, animationSpeed / 2);
        };
        
        checkNextFile();
      };
      
      // Start search from L0
      searchLevel(0);
    };
    
  }, [keyInput, memtableData, immutableMemtableData, sstables, levels, animationSpeed, bloomFilterEnabled, fencePointersEnabled, compactionStrategy, bloomFilterCheck, useFencePointers, logOperation]);

  // Reset function to clear all data
  const handleReset = useCallback(() => {
    setMemtableData([]);
    setImmutableMemtableData([]);
    setWalEntries([]);
    setSSTables([]);
    setLevels([[], [], [], []]);
    setOperationLog([]);
    setSearchResult(null);
    setRangeResults([]);
    setBloomFilterFalsePositives(0);
    setIoSaved(0);
    setCompactionCounter(0);
    setSstableGeneration(0);
    logOperation("SYSTEM", "Data reset");
  }, [logOperation]);

  // Helper to check if key is in range
  const isInRange = useCallback((key, start, end) => {
    if (typeof key === 'string' && (typeof start === 'string' || typeof end === 'string')) {
      return key >= start && key <= end;
    }
    return key >= start && key <= end;
  }, []);

  // RANGE-GET operation
  const handleRangeGet = useCallback(() => {
    // Validate inputs
    const start = rangeStartInput ? (parseInt(rangeStartInput) || rangeStartInput) : "";
    const end = rangeEndInput ? (parseInt(rangeEndInput) || rangeEndInput) : "";
    
    if (start === "" || end === "") {
      alert("Please enter both start and end keys");
      return;
    }
    
    setOperationInProgress('range');
    logOperation("RANGE-GET", `Range: ${start} to ${end}`);
    
    // Get all matching keys from memtable and SSTables
    const results = new Map();
    
    // First check memtable
    setTimeout(() => {
      // Find keys in memtable that are in range
      memtableData.forEach(item => {
        if (isInRange(item.key, start, end)) {
          // Only add if there isn't already a newer entry or it's not a tombstone
          if (item.value !== TOMBSTONE) {
            results.set(item.key, {
              key: item.key,
              value: item.value,
              timestamp: item.timestamp,
              source: "memtable"
            });
          } else {
            // If it's a tombstone, mark for removal from results
            results.delete(item.key);
          }
        }
      });
      
      // Check immutable memtable if not empty
      if (immutableMemtableData.length > 0) {
        immutableMemtableData.forEach(item => {
          if (isInRange(item.key, start, end)) {
            const existingEntry = results.get(item.key);
            
            // Only update if this is newer than what we have
            if (!existingEntry || item.timestamp > existingEntry.timestamp) {
              if (item.value !== TOMBSTONE) {
                results.set(item.key, {
                  key: item.key,
                  value: item.value,
                  timestamp: item.timestamp,
                  source: "immutable memtable"
                });
              } else {
                // If it's a tombstone, remove entry
                results.delete(item.key);
              }
            }
          }
        });
      }
      
      logOperation("RANGE-GET", `Found ${results.size} entries in memory`);
      
      if (compactionStrategy === "size-tiered") {
        // For size-tiered, process SSTables
        processRangeSizeTiered(start, end, results);
      } else {
        // For leveled, process levels
        processRangeLeveled(start, end, results);
      }
    }, animationSpeed);
    
    // Function to process range query for size-tiered SSTables
    const processRangeSizeTiered = (start, end, results) => {
      // Process all SSTables in order (newest to oldest)
      let tableIndex = 0;
      
      const processSSTable = (index) => {
        if (index >= sstables.length) {
          // All SSTables processed, show results
          const finalResults = Array.from(results.values()).sort((a, b) => 
            typeof a.key === 'string' && typeof b.key === 'string' 
              ? a.key.localeCompare(b.key) 
              : a.key - b.key
          );
          
          setRangeResults(finalResults);
          logOperation("RANGE-GET Result", `Found ${finalResults.length} entries in range`);
          setOperationInProgress(null);
          return;
        }
        
        // Use fence pointers for range queries if enabled
        let tableToProcess = sstables[index];
        
        if (fencePointersEnabled) {
          // Simulate fence pointers for range queries - only process blocks that overlap with range
          const blockSize = 2;
          const blocks = [];
          let skippedBlocks = 0;
          
          for (let i = 0; i < tableToProcess.length; i += blockSize) {
            const block = tableToProcess.slice(i, i + blockSize);
            if (block.length > 0) {
              const minKey = Math.min(...block.map(item => 
                typeof item.key === 'string' ? item.key.charCodeAt(0) : item.key
              ));
              const maxKey = Math.max(...block.map(item => 
                typeof item.key === 'string' ? item.key.charCodeAt(0) : item.key
              ));
              
              // Check if block overlaps with range
              const numStart = typeof start === 'string' ? start.charCodeAt(0) : start;
              const numEnd = typeof end === 'string' ? end.charCodeAt(0) : end;
              
              if (maxKey >= numStart && minKey <= numEnd) {
                blocks.push(block);
              } else {
                skippedBlocks++;
              }
            }
          }
          
          if (skippedBlocks > 0) {
            setIoSaved(prev => prev + skippedBlocks);
            logOperation("OPTIMIZATION", `Fence pointers skipped ${skippedBlocks} blocks in range query for SSTable ${index}`);
          }
          
          tableToProcess = blocks.flat();
        }
        
        logOperation("RANGE-GET", `Searching SSTable ${index}`);
        
        setTimeout(() => {
          tableToProcess.forEach(item => {
            if (isInRange(item.key, start, end)) {
              const existingEntry = results.get(item.key);
              
              // Only update if this is newer than what we have
              if (!existingEntry || item.timestamp > existingEntry.timestamp) {
                if (item.value === TOMBSTONE) {
                  // If it's a tombstone, remove entry
                  results.delete(item.key);
                } else {
                  results.set(item.key, {
                    key: item.key,
                    value: item.value,
                    timestamp: item.timestamp,
                    source: `sstable-${index}`
                  });
                }
              }
            }
          });
          
          // Move to next SSTable
          processSSTable(index + 1);
        }, animationSpeed / 2);
      };
      
      processSSTable(0);
    };
    
    // Function to process range query for leveled SSTables
    const processRangeLeveled = (start, end, results) => {
      // Process each level in order (L0 to L3)
      let currentLevel = 0;
      
      const processLevel = (level) => {
        if (level >= levels.length) {
          // All levels processed, show results
          const finalResults = Array.from(results.values()).sort((a, b) => 
            typeof a.key === 'string' && typeof b.key === 'string' 
              ? a.key.localeCompare(b.key) 
              : a.key - b.key
          );
          
          setRangeResults(finalResults);
          logOperation("RANGE-GET Result", `Found ${finalResults.length} entries in range`);
          setOperationInProgress(null);
          return;
        }
        
        logOperation("RANGE-GET", `Searching Level ${level}`);
        
        // Process each file in the level
        let fileIndex = 0;
        
        const processFile = () => {
          if (fileIndex >= levels[level].length) {
            // Move to next level
            processLevel(level + 1);
            return;
          }
          
          const file = levels[level][fileIndex];
          
          // In sorted levels (L1+), we can skip files based on key range
          if (level > 0 && file.length > 0) {
            const minKey = file[0].key;
            const maxKey = file[file.length - 1].key;
            
            // Check if range overlaps with file range
            const rangeOverlaps = (
              (typeof start === 'string' && typeof minKey === 'string' && start <= maxKey && end >= minKey) ||
              (typeof start === 'number' && typeof minKey === 'number' && start <= maxKey && end >= minKey)
            );
            
            if (!rangeOverlaps) {
              logOperation("OPTIMIZATION", `Skipping L${level}-${fileIndex} (range doesn't overlap)`);
              fileIndex++;
              processFile();
              return;
            }
          }
          
          // Process file with fence pointers if enabled
          let fileToProcess = file;
          
          if (fencePointersEnabled) {
            // Simulate fence pointers for range queries 
            const blockSize = 2;
            const blocks = [];
            let skippedBlocks = 0;
            
            for (let i = 0; i < fileToProcess.length; i += blockSize) {
              const block = fileToProcess.slice(i, i + blockSize);
              if (block.length > 0) {
                const minKey = Math.min(...block.map(item => 
                  typeof item.key === 'string' ? item.key.charCodeAt(0) : item.key
                ));
                const maxKey = Math.max(...block.map(item => 
                  typeof item.key === 'string' ? item.key.charCodeAt(0) : item.key
                ));
                
                // Check if block overlaps with range
                const numStart = typeof start === 'string' ? start.charCodeAt(0) : start;
                const numEnd = typeof end === 'string' ? end.charCodeAt(0) : end;
                
                if (maxKey >= numStart && minKey <= numEnd) {
                  blocks.push(block);
                } else {
                  skippedBlocks++;
                }
              }
            }
            
            if (skippedBlocks > 0) {
              setIoSaved(prev => prev + skippedBlocks);
              logOperation("OPTIMIZATION", `Fence pointers skipped ${skippedBlocks} blocks in range query for L${level}-${fileIndex}`);
            }
            
            fileToProcess = blocks.flat();
          }
          
          logOperation("RANGE-GET", `Processing L${level}-${fileIndex}`);
          
          setTimeout(() => {
            fileToProcess.forEach(item => {
              if (isInRange(item.key, start, end)) {
                const existingEntry = results.get(item.key);
                
                // Only update if this is newer than what we have
                if (!existingEntry || item.timestamp > existingEntry.timestamp) {
                  if (item.value === TOMBSTONE) {
                    // If it's a tombstone, remove entry
                    results.delete(item.key);
                  } else {
                    results.set(item.key, {
                      key: item.key,
                      value: item.value,
                      timestamp: item.timestamp,
                      source: `L${level}-${fileIndex}`
                    });
                  }
                }
              }
            });
            
            // Move to next file
            fileIndex++;
            processFile();
          }, animationSpeed / 2);
        };
        
        processFile();
      };
      
      // Start from L0
      processLevel(0);
    };
    
  }, [rangeStartInput, rangeEndInput, memtableData, immutableMemtableData, sstables, levels, animationSpeed, fencePointersEnabled, isInRange, logOperation]);


  // Flush memtable to SSTable when it reaches threshold
  useEffect(() => {
    if (memtableData.length >= memtableSize && !isMemtableFlushing) {
      // Move memtable data to immutable memtable
      setIsMemtableFlushing(true);
      
      logOperation("FLUSH", `Memtable full (${memtableData.length}/${memtableSize}), moving to immutable memtable`);
      
      // Create a copy of the current memtable data before clearing it
      const dataToFlush = [...memtableData];
      
      // Move data to immutable memtable
      setImmutableMemtableData(dataToFlush);
      setMemtableData([]);
      
      // Schedule the flush of immutable memtable to disk
      setTimeout(() => {
        logOperation("FLUSH", `Flushing immutable memtable to SSTable`);
        
        // Increment the generation for new SSTables
        const newGeneration = sstableGeneration + 1;
        setSstableGeneration(newGeneration);
        
        setTimeout(() => {
          if (compactionStrategy === "size-tiered") {
            // Ensure we're using the captured data, not the current state
            // Tag with the generation
            const newSSTable = dataToFlush.map(item => ({
              ...item,
              generation: newGeneration
            }));
            
            setSSTables(prev => [newSSTable, ...prev]);
          } else { // leveled strategy
            // For leveled compaction, add directly to L0
            const newSSTable = dataToFlush.map(item => ({
              ...item,
              generation: newGeneration
            }));
            
            setLevels(prev => {
              const newLevels = [...prev];
              newLevels[0] = [...newLevels[0], newSSTable];
              return newLevels;
            });
          }
          
          setImmutableMemtableData([]);
          setWalEntries([]);
          setIsMemtableFlushing(false);
          logOperation("FLUSH", `Created new SSTable with ${dataToFlush.length} entries (generation ${newGeneration})`);
        }, animationSpeed);
      }, animationSpeed * 2);
    }
  }, [memtableData, memtableSize, compactionStrategy, animationSpeed, logOperation, isMemtableFlushing, sstableGeneration]);

  // Group SSTables by similar size
  const groupSimilarSizedSSTables = useCallback((tables) => {
    const groups = [];
    
    tables.forEach((table, index) => {
      const tableSize = table.length;
      let foundGroup = false;
      
      // Try to find a group where this table fits
      for (let group of groups) {
        // Check if table size is within 10% of group size
        if (Math.abs(tableSize - group.size) / group.size <= 0.1) {
          group.indexes.push(index);
          // Recalculate average size for the group
          group.size = group.indexes.reduce((sum, idx) => sum + tables[idx].length, 0) / group.indexes.length;
          foundGroup = true;
          break;
        }
      }
      
      // If no suitable group found, create a new one
      if (!foundGroup) {
        groups.push({
          size: tableSize,
          indexes: [index]
        });
      }
    });
    
    return groups;
  }, []);

  // Helper to merge multiple tables
  const mergeTables = useCallback((tables) => {
    // Increment compaction counter
    const currentCompactionCount = compactionCounter + 1;
    setCompactionCounter(currentCompactionCount);
    
    // Find the minimum and maximum generations being included in this compaction
    let minCompactionGeneration = Infinity;
    let maxCompactionGeneration = 0;
    
    tables.forEach(table => {
      table.forEach(item => {
        const gen = item.generation || 0;
        minCompactionGeneration = Math.min(minCompactionGeneration, gen);
        maxCompactionGeneration = Math.max(maxCompactionGeneration, gen);
      });
    });
    
    // Find the minimum generation of any SSTable in all levels
    let allGenerations = [];
    levels.forEach(level => {
      level.forEach(table => {
        table.forEach(item => {
          allGenerations.push(item.generation || 0);
        });
      });
    });
    
    const minGlobalGeneration = allGenerations.length > 0 ? Math.min(...allGenerations) : 0;
    
    // Flatten and group by key to keep latest version
    const mergedMap = new Map();
    
    tables.flat().forEach(item => {
      const existingEntry = mergedMap.get(item.key);
      
      // Only update if this is newer than what we have
      if (!existingEntry || item.timestamp > existingEntry.timestamp) {
        // Check if it's a tombstone
        if (item.value === TOMBSTONE) {
          // Only remove tombstone if:
          // 1. It's been through enough compactions (grace period)
          // 2. It has propagated to all older SSTables that might contain the key
          const tombstoneAge = currentCompactionCount - (item.compactionCreated || 0);
          const hasPropagatedFully = minCompactionGeneration <= minGlobalGeneration;
          
          if (tombstoneAge >= TOMBSTONE_GRACE_PERIOD && hasPropagatedFully) {
            // Tombstone is old enough and has propagated to all older data
            logOperation("COMPACTION", `Removing tombstone for key ${item.key} (exceeded grace period and fully propagated)`);
            // Don't add it to mergedMap, effectively removing it
          } else {
            // Tombstone still needs to be retained
            if (!hasPropagatedFully) {
              logOperation("COMPACTION", `Keeping tombstone for key ${item.key} (needs to reach older SSTables)`);
            } else if (tombstoneAge < TOMBSTONE_GRACE_PERIOD) {
              logOperation("COMPACTION", `Keeping tombstone for key ${item.key} (within grace period)`);
            }
            
            mergedMap.set(item.key, {
              ...item,
              compactionCreated: item.compactionCreated || currentCompactionCount
            });
          }
        } else {
          // Regular value, just update it
          mergedMap.set(item.key, item);
        }
      }
    });
    
    // Convert map to array and sort by key
    const result = Array.from(mergedMap.values()).sort((a, b) => 
      typeof a.key === 'string' && typeof b.key === 'string' 
        ? a.key.localeCompare(b.key) 
        : a.key - b.key
    );
    
    // Assign generation to all items in the result
    return result.map(item => ({
      ...item,
      generation: maxCompactionGeneration
    }));
  }, [logOperation, compactionCounter, levels]);

  // Size-tiered compaction
  const performSizeTieredCompaction = useCallback((tablesToCompact, tableIndexes) => {
    logOperation("COMPACTION", `Compacting ${tablesToCompact.length} SSTables of similar size`);
    
    // Increment compaction counter
    const currentCompactionCount = compactionCounter + 1;
    setCompactionCounter(currentCompactionCount);
    
    // Find the minimum generation being included in this compaction
    const minCompactionGeneration = Math.min(
      ...tablesToCompact.map(table => 
        Math.min(...table.map(item => item.generation || 0))
      )
    );
    
    // Find the maximum generation being included in this compaction
    const maxCompactionGeneration = Math.max(
      ...tablesToCompact.map(table => 
        Math.max(...table.map(item => item.generation || 0))
      )
    );
    
    // Find the minimum generation of any SSTable (to know what's the oldest data)
    const allGenerations = sstables.flat().map(item => item.generation || 0);
    const minGlobalGeneration = allGenerations.length > 0 ? Math.min(...allGenerations) : 0;
    
    // Create a map to store the latest version of each key
    const mergedData = new Map();
    
    // Process all tables
    tablesToCompact.forEach(table => {
      table.forEach(item => {
        const existingEntry = mergedData.get(item.key);
        
        // Only update if this is newer than what we have
        if (!existingEntry || item.timestamp > existingEntry.timestamp) {
          // Check if it's a tombstone 
          if (item.value === TOMBSTONE) {
            // Only remove tombstone if:
            // 1. It's been through enough compactions (grace period)
            // 2. It has propagated to all older SSTables that might contain the key
            const tombstoneAge = currentCompactionCount - (item.compactionCreated || 0);
            const hasPropagatedFully = minCompactionGeneration <= minGlobalGeneration;
            
            if (tombstoneAge >= TOMBSTONE_GRACE_PERIOD && hasPropagatedFully) {
              // Tombstone is old enough and has propagated to all older data
              logOperation("COMPACTION", `Removing tombstone for key ${item.key} (exceeded grace period and fully propagated)`);
              // Don't add it to mergedData, effectively removing it
            } else {
              // Tombstone still needs to be retained
              if (!hasPropagatedFully) {
                logOperation("COMPACTION", `Keeping tombstone for key ${item.key} (needs to reach older SSTables)`);
              } else if (tombstoneAge < TOMBSTONE_GRACE_PERIOD) {
                logOperation("COMPACTION", `Keeping tombstone for key ${item.key} (within grace period)`);
              }
              
              mergedData.set(item.key, {
                ...item,
                compactionCreated: item.compactionCreated || currentCompactionCount
              });
            }
          } else {
            // Regular value, just update it
            mergedData.set(item.key, item);
          }
        }
      });
    });
    
    // Convert map to array and sort by key
    const newTable = Array.from(mergedData.values()).sort((a, b) => 
      typeof a.key === 'string' && typeof b.key === 'string' 
        ? a.key.localeCompare(b.key) 
        : a.key - b.key
    );
    
    // Assign generation to the new table (take the max of the compacted tables)
    const newTableWithGeneration = newTable.map(item => ({
      ...item,
      generation: maxCompactionGeneration
    }));
    
    // Replace the original tables with the compacted one
    setSSTables(prev => {
      const newSSTables = [...prev];
      
      // Remove the compacted tables (starting from highest index to avoid shift issues)
      tableIndexes.sort((a, b) => b - a).forEach(index => {
        newSSTables.splice(index, 1);
      });
      
      // Add the new compacted table at the beginning
      return [newTableWithGeneration, ...newSSTables];
    });
    
    logOperation("COMPACTION", `Compaction complete, created new SSTable with ${newTableWithGeneration.length} entries (generation ${maxCompactionGeneration})`);
    setIsCompacting(false);
  }, [logOperation, compactionCounter, sstables]);

  // Leveled compaction
  const performLeveledCompaction = useCallback(() => {
    logOperation("COMPACTION", "Starting leveled compaction");
    
    // Create a copy of current levels
    const newLevels = [...levels];
    
    // Check if L0 has enough files to trigger compaction
    if (newLevels[0].length >= l0CompactionThreshold) {
      // Step 1: Merge all L0 files (which may have overlapping key ranges)
      const mergedL0 = mergeTables(newLevels[0]);
      logOperation("COMPACTION", `Merged ${newLevels[0].length} files from L0`);
      
      // Step 2: Find overlapping files in L1
      // For educational visualization, we'll consider all L1 files as overlapping
      const overlappingL1 = newLevels[1];
      
      // Step 3: Merge L0 data with overlapping L1 data
      const mergedL0L1 = mergeTables([mergedL0, ...overlappingL1]);
      
      // Step 4: Determine size limits for each level
      // Each level has a size limit that's ~10x the previous level
      const l1SizeLimit = 10;  // Simplified for visualization
      const l2SizeLimit = 100; // 10x L1
      const l3SizeLimit = 1000; // 10x L2
      
      // Step 5: Partition merged data by levels based on capacity
      // First, calculate how many files we need for each level
      const l1FileCount = Math.min(2, Math.ceil(mergedL0L1.length / 5)); // 2 files max for L1
      const l1FileSize = Math.ceil(Math.min(mergedL0L1.length, l1SizeLimit) / l1FileCount);
      
      // Create files for L1 (sorted, non-overlapping ranges)
      const l1Files = [];
      let remainingData = [...mergedL0L1];
      
      // Fill L1 to capacity
      if (remainingData.length > 0) {
        remainingData.sort((a, b) => 
          typeof a.key === 'string' && typeof b.key === 'string' 
            ? a.key.localeCompare(b.key) 
            : a.key - b.key
        );
        
        // Take data for L1 (up to capacity)
        const dataForL1 = remainingData.slice(0, l1SizeLimit);
        remainingData = remainingData.slice(l1SizeLimit);
        
        // Split L1 data into multiple files with non-overlapping ranges
        for (let i = 0; i < dataForL1.length; i += l1FileSize) {
          l1Files.push(dataForL1.slice(i, Math.min(i + l1FileSize, dataForL1.length)));
        }
        
        newLevels[1] = l1Files;
        logOperation("COMPACTION", `Created ${l1Files.length} files in L1`);
      }
      
      // If we have remaining data, cascade to L2
      if (remainingData.length > 0) {
        // Merge with L2 data
        const mergedL2 = mergeTables([remainingData, ...newLevels[2]]);
        
        // Determine how many files for L2
        const l2FileCount = Math.min(3, Math.ceil(mergedL2.length / 10)); // 3 files max for L2
        const l2FileSize = Math.ceil(Math.min(mergedL2.length, l2SizeLimit) / l2FileCount);
        
        // Create files for L2
        const l2Files = [];
        let l2Remaining = [...mergedL2];
        
        if (l2Remaining.length > 0) {
          l2Remaining.sort((a, b) => 
            typeof a.key === 'string' && typeof b.key === 'string' 
              ? a.key.localeCompare(b.key) 
              : a.key - b.key
          );
          
          // Take data for L2 (up to capacity)
          const dataForL2 = l2Remaining.slice(0, l2SizeLimit);
          l2Remaining = l2Remaining.slice(l2SizeLimit);
          
          // Split L2 data into multiple files
          for (let i = 0; i < dataForL2.length; i += l2FileSize) {
            l2Files.push(dataForL2.slice(i, Math.min(i + l2FileSize, dataForL2.length)));
          }
          
          newLevels[2] = l2Files;
          logOperation("COMPACTION", `Created ${l2Files.length} files in L2`);
        }
        
        // If still remaining data, cascade to L3
        if (l2Remaining.length > 0) {
          // Merge with L3 data
          const mergedL3 = mergeTables([l2Remaining, ...newLevels[3]]);
          
          // Determine how many files for L3
          const l3FileCount = Math.min(4, Math.ceil(mergedL3.length / 15)); // 4 files max for L3
          const l3FileSize = Math.ceil(mergedL3.length / l3FileCount);
          
          // Create files for L3
          const l3Files = [];
          
          if (mergedL3.length > 0) {
            const sortedL3 = [...mergedL3].sort((a, b) => 
              typeof a.key === 'string' && typeof b.key === 'string' 
                ? a.key.localeCompare(b.key) 
                : a.key - b.key
            );
            
            // Split L3 data into multiple files
            for (let i = 0; i < sortedL3.length; i += l3FileSize) {
              l3Files.push(sortedL3.slice(i, Math.min(i + l3FileSize, sortedL3.length)));
            }
            
            newLevels[3] = l3Files;
            logOperation("COMPACTION", `Created ${l3Files.length} files in L3`);
          }
        }
      }
      
      // Clear L0 after compaction
      newLevels[0] = [];
      
      // Update all levels
      setLevels(newLevels);
      logOperation("COMPACTION", "Leveled compaction complete");
    }
    
    // Reset compaction flag
    setTimeout(() => {
      setIsCompacting(false);
    }, 100);
  }, [levels, logOperation, mergeTables, l0CompactionThreshold]);

  // Handle size-tiered compaction when needed
  useEffect(() => {
    if (compactionStrategy === "size-tiered" && sstables.length >= compactionThreshold && !isCompacting) {
      // Group SSTables by similar size (within 10% of each other)
      const sizeGroups = groupSimilarSizedSSTables(sstables);
      
      // Find the first group that has enough SSTables to compact
      const groupToCompact = sizeGroups.find(group => group.indexes.length >= compactionThreshold);
      
      if (groupToCompact) {
        setIsCompacting(true);
        const tablesToCompact = groupToCompact.indexes.map(idx => sstables[idx]);
        const tableIndexes = groupToCompact.indexes;
        
        logOperation("COMPACTION", `Starting size-tiered compaction for ${tablesToCompact.length} SSTables of size ~${groupToCompact.size}`);
        
        setTimeout(() => {
          performSizeTieredCompaction(tablesToCompact, tableIndexes);
        }, animationSpeed * 2);
      }
    }
  }, [sstables, isCompacting, compactionThreshold, compactionStrategy, groupSimilarSizedSSTables, performSizeTieredCompaction, animationSpeed, logOperation]);

  // Handle leveled compaction
  useEffect(() => {
    if (compactionStrategy === "leveled" && !isCompacting) {
      // Check L0 for overflow using the configurable threshold
      if (levels[0].length >= l0CompactionThreshold) {
        setIsCompacting(true);
        logOperation("COMPACTION", `L0 has ${levels[0].length}/${l0CompactionThreshold} SSTables, starting leveled compaction`);
        
        // Ensure we don't start another compaction until this one completes
        setTimeout(() => {
          performLeveledCompaction();
        }, animationSpeed * 2);
      }
    }
  }, [levels, isCompacting, compactionStrategy, l0CompactionThreshold, performLeveledCompaction, animationSpeed, logOperation]);

  // Format values for display
  const formatValue = useCallback((value) => {
    if (value === TOMBSTONE) {
      return "DELETED";
    }
    return value;
  }, []);

  // Return all state and functions
  return {
    // State groups
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
      ioSaved,
    },
    
    // Operation handlers
    handlePut,
    handleGet,
    handleDelete,
    handleRangeGet,
    handleReset,
    
    // Input state and setters
    keyInput,
    setKeyInput,
    valueInput,
    setValueInput,
    rangeStartInput,
    setRangeStartInput,
    rangeEndInput,
    setRangeEndInput,
    
    // Configuration state and setters
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
    
    // Helper functions
    formatValue,
    isInRange,
    
    // Constants
    TOMBSTONE
  };
};

export default useLSMTreeCore;