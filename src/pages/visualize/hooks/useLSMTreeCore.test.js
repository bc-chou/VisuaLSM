import { renderHook, act } from '@testing-library/react';
import useLSMTreeCore from './useLSMTreeCore';

// Mock timers for handling setTimeout calls
jest.useFakeTimers();

// Mock window.alert since it's not implemented in JSDOM
global.alert = jest.fn();

// Mock Math.random to make tests deterministic
const originalRandom = Math.random;
jest.spyOn(Math, 'random').mockImplementation(() => 0.5);

describe('useLSMTreeCore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    global.alert.mockClear();
  });

  afterAll(() => {
    // Restore original Math.random
    Math.random = originalRandom;
  });

  // ============= INITIALIZATION TESTS =============
  it('should initialize with default values', () => {
    const { result } = renderHook(() => useLSMTreeCore());
    
    expect(result.current.state.memtableData).toEqual([]);
    expect(result.current.state.sstables).toEqual([]);
    expect(result.current.state.levels).toEqual([[], [], [], []]);
    expect(result.current.state.operationInProgress).toBeNull();
    expect(result.current.compactionStrategy).toBe('size-tiered');
    expect(result.current.memtableSize).toBe(5);
  });

  // ============= HELPER FUNCTION TESTS =============
  it('should format values correctly', () => {
    const { result } = renderHook(() => useLSMTreeCore());
    
    // Test regular value
    expect(result.current.formatValue(100)).toBe(100);
    expect(result.current.formatValue("test")).toBe("test");
    
    // Test tombstone
    expect(result.current.formatValue(result.current.TOMBSTONE)).toBe("DELETED");
  });
  
  it('should check if key is in range', () => {
    const { result } = renderHook(() => useLSMTreeCore());
    
    // Number range
    expect(result.current.isInRange(5, 1, 10)).toBe(true);
    expect(result.current.isInRange(0, 1, 10)).toBe(false);
    expect(result.current.isInRange(11, 1, 10)).toBe(false);
    
    // String range
    expect(result.current.isInRange("m", "a", "z")).toBe(true);
    expect(result.current.isInRange("a", "b", "z")).toBe(false);
  });

  // ============= PUT OPERATION TESTS =============
it('should add a key-value pair to memtable', () => {
  const { result } = renderHook(() => useLSMTreeCore());
  
  // Reset first for clean state
  act(() => {
    result.current.handleReset();
    jest.runAllTimers();
  });
  
  // Use unique, predictable values instead of relying on Math.random
  const testKey = 'uniqueTestKey123';
  const testValue = 'uniqueTestValue123';
  
  // Store memtable length before operation
  let initialLength;
  act(() => {
    initialLength = result.current.state.memtableData.length;
  });
  
  act(() => {
    result.current.setKeyInput(testKey);
    result.current.setValueInput(testValue);    
    // Ensure all timers run to completion
    jest.runAllTimers();
  });

  act(() => {
    result.current.handlePut();
    // Allow time for the operation to complete
    jest.runAllTimers();
 });

//   // Debug: print the contents of the memtable
//   console.log("Memtable contents:", 
//     result.current.state.memtableData.map(item => ({
//         key: item.key,
//         keyType: typeof item.key,
//         value: item.value,
//         valueType: typeof item.value
//     }))
//   );

  // Verify memtable has grown
  expect(result.current.state.memtableData.length).toBeGreaterThan(initialLength);
  
  // Find our key in the memtable
  const entry = result.current.state.memtableData.find(item => 
    item.key === testKey || 
    JSON.stringify(item.key) === JSON.stringify(testKey)
  );
  
  expect(entry).toBeDefined();
  if (entry) {
    expect(entry.value).toBe(testValue);
  }
  expect(result.current.state.operationInProgress).toBeNull();
});
  
  it('should update existing key in memtable', () => {
    const { result } = renderHook(() => useLSMTreeCore());
    
    // Clean slate for this test
    act(() => {
      result.current.handleReset();
      jest.runAllTimers();
    });
    
    // First add a key-value pair
    act(() => {
      result.current.setKeyInput('testKey');
      result.current.setValueInput('testValue1');
      jest.runAllTimers();
    });

    act(() => {
    result.current.handlePut();
    // Allow time for the operation to complete
    jest.runAllTimers();
    });
    
    // Then update the same key
    act(() => {
      result.current.setKeyInput('testKey');
      result.current.setValueInput('testValue2');
      jest.runAllTimers();
    });

    act(() => {
    result.current.handlePut();
    // Allow time for the operation to complete
    jest.runAllTimers();
   });
    
    // Find our key in the memtable
    const entries = result.current.state.memtableData.filter(item => item.key === 'testKey');
    expect(entries.length).toBe(1); // Should only have one entry for this key
    expect(entries[0].value).toBe('testValue2');
  });

  // ============= GET OPERATION TESTS =============
  it('should find key in memtable', () => {
    const { result } = renderHook(() => useLSMTreeCore());
    
    // Reset first to clear any state
    act(() => {
      result.current.handleReset();
      jest.runAllTimers();
    });
    
    // First add a key-value pair
    act(() => {
      result.current.setKeyInput('testKey');
      result.current.setValueInput('testValue');
      jest.runAllTimers();
    });

    act(() => {
    result.current.handlePut();
    // Allow time for the operation to complete
    jest.runAllTimers();
    });
    
    // Then look up the key - running in a separate act
    act(() => {
      result.current.setKeyInput('testKey');
      jest.runAllTimers();
    });

    act(() => {
    result.current.handleGet();
    // Allow time for the operation to complete
    jest.runAllTimers();
    });

    
    // Check the search result
    expect(result.current.state.searchResult).toBeDefined();
    expect(result.current.state.searchResult.found).toBe(true);
    expect(result.current.state.searchResult.key).toBe('testKey');
    expect(result.current.state.searchResult.value).toBe('testValue');
  });
  
  it('should find key in immutable memtable or SSTable', () => {
    const { result } = renderHook(() => useLSMTreeCore());
    
    // Reset state
    act(() => {
      result.current.handleReset();
      jest.runAllTimers();
    });
    
    // Add keys until memtable is full

    for (let i = 0; i < result.current.memtableSize; i++) {
      act(() => {
        result.current.setKeyInput(`key${i}`);
        result.current.setValueInput(`value${i}`);
        jest.runAllTimers();
      });

      act(() => {
        result.current.handlePut();
        // Allow time for the operation to complete
        jest.runAllTimers();
      });
    };
    
    // Add one more to trigger memtable flush
    act(() => {
      result.current.setKeyInput('extraKey');
      result.current.setValueInput('extraValue');
      jest.runAllTimers();
    });
    
    act(() => {
        result.current.handlePut();
        jest.runAllTimers();
    });

    // Now try to find one of the keys
    act(() => {
      result.current.setKeyInput('key2');
      jest.runAllTimers();
    });

    act(() => {
        result.current.handleGet();
        jest.runAllTimers();
    });
    
    // Verify the search result
    expect(result.current.state.searchResult).toBeDefined();
    expect(result.current.state.searchResult.found).toBe(true);
    expect(result.current.state.searchResult.key).toBe('key2');
    expect(result.current.state.searchResult.value).toBe('value2');
  });
  
  it('should not find non-existent key', () => {
    const { result } = renderHook(() => useLSMTreeCore());
    
    // Reset state
    act(() => {
      result.current.handleReset();
      jest.runAllTimers();
    });
    
    act(() => {
      result.current.setKeyInput('nonExistentKey');
      jest.runAllTimers();
    });

    act(() => {
        result.current.handleGet();
        jest.runAllTimers();
    });
    
    expect(result.current.state.searchResult).toBeDefined();
    expect(result.current.state.searchResult.found).toBe(false);
    expect(result.current.state.searchResult.key).toBe('nonExistentKey');
  });

  // ============= DELETE OPERATION TESTS =============
  it('should add a tombstone to memtable', () => {
    const { result } = renderHook(() => useLSMTreeCore());
    
    // Reset state
    act(() => {
      result.current.handleReset();
      jest.runAllTimers();
    });
    
    act(() => {
      result.current.setKeyInput('keyToDelete');
      jest.runAllTimers();
    });

    // Perform delete operation
    act(() => {
        result.current.handleDelete();
        jest.runAllTimers();
    });
    
    // Find the tombstone in memtable
    const entry = result.current.state.memtableData.find(item => item.key === 'keyToDelete');
    expect(entry).toBeDefined();
    expect(entry.value).toBe(result.current.TOMBSTONE);
  });
  
  it('should mark a previously added key as deleted', () => {
    const { result } = renderHook(() => useLSMTreeCore());
    
    // Reset state
    act(() => {
      result.current.handleReset();
      jest.runAllTimers();
    });
    
    // First add a key
    act(() => {
      result.current.setKeyInput('keyToDelete');
      result.current.setValueInput('originalValue');
      jest.runAllTimers();
    });
    
    act(() => {
        result.current.handlePut();
        jest.runAllTimers();
    });

    // Delete the key
    act(() => {
      result.current.setKeyInput('keyToDelete');
      jest.runAllTimers();
    });

    act(() => {
        result.current.handleDelete();
        jest.runAllTimers();
    });
    
    // Now get the key to verify it's marked as deleted
    act(() => {
      result.current.setKeyInput('keyToDelete');
      jest.runAllTimers();
    });

    act(() => {
        result.current.handleGet();
        jest.runAllTimers();
    });
    
    // The key should be reported as not found due to the tombstone
    expect(result.current.state.searchResult.found).toBe(false);
  });
    
    // ============= RANGE-GET OPERATION TESTS =============
    it('should retrieve all keys in a range', () => {
    const { result } = renderHook(() => useLSMTreeCore());
    
    // Reset state
    act(() => {
        result.current.handleReset();
        jest.runAllTimers();
    });
    
    // Add key1
    act(() => {
        result.current.setKeyInput('key1');
        result.current.setValueInput('value1');
        jest.runAllTimers();
    });
    
    act(() => {
        result.current.handlePut();
        jest.runAllTimers();
    });
    
    // Add key2
    act(() => {
        result.current.setKeyInput('key2');
        result.current.setValueInput('value2');
        jest.runAllTimers();
    });
    
    act(() => {
        result.current.handlePut();
        jest.runAllTimers();
    });
    
    // Add key3
    act(() => {
        result.current.setKeyInput('key3');
        result.current.setValueInput('value3');
        jest.runAllTimers();
    });
    
    act(() => {
        result.current.handlePut();
        jest.runAllTimers();
    });
    
    // Set range inputs
    act(() => {
        result.current.setRangeStartInput('key1');
        result.current.setRangeEndInput('key3');
        jest.runAllTimers();
    });
    
    // Perform range get
    act(() => {
        result.current.handleRangeGet();
        // Use a longer time for range operations
        jest.runAllTimers();
    });
    
    // Check that we have all keys in the range
    expect(result.current.state.rangeResults).toBeDefined();
    expect(result.current.state.rangeResults.length).toBe(3);
    
    // Verify keys are in the results (order may vary)
    const keys = result.current.state.rangeResults.map(r => r.key).sort();
    expect(keys).toEqual(['key1', 'key2', 'key3']);
    });

  // ============= RESET OPERATION TESTS =============
  it('should clear all data structures on reset', () => {
    const { result } = renderHook(() => useLSMTreeCore());
    
    // Add some data
    act(() => {
      result.current.setKeyInput('testKey');
      result.current.setValueInput('testValue');
      jest.runAllTimers();
    });
    
    act(() => {
        result.current.handlePut();
        jest.runAllTimers();
    });
    
    // Reset
    act(() => {
      result.current.handleReset();
      jest.runAllTimers();
    });
    
    // Verify everything is cleared
    expect(result.current.state.memtableData).toEqual([]);
    expect(result.current.state.immutableMemtableData).toEqual([]);
    expect(result.current.state.sstables).toEqual([]);
    expect(result.current.state.walEntries).toEqual([]);
    expect(result.current.state.levels).toEqual([[], [], [], []]);
  });

  // ============= MEMTABLE FLUSHING TESTS =============
    it('should flush memtable to SSTable when it reaches the threshold', () => {
    const { result } = renderHook(() => useLSMTreeCore());
    
    // Reset state
    act(() => {
        result.current.handleReset();
        jest.runAllTimers();
    });
    
    // Insert keys to fill memtable - one by one with separate act calls
    // First 5 entries (default memtableSize is 5)
    for (let i = 0; i < 5; i++) {
        act(() => {
        result.current.setKeyInput(`key${i}`);
        result.current.setValueInput(`value${i}`);
        jest.runAllTimers();
        });
        
        act(() => {
        result.current.handlePut();
        jest.runAllTimers();
        });
    }
    
    // Add one more key to trigger flush
    act(() => {
        result.current.setKeyInput('extraKey');
        result.current.setValueInput('extraValue');
        jest.runAllTimers();
    });
    
    act(() => {
        result.current.handlePut();
        jest.runAllTimers();
    });
    
    // Advance time to complete flushing
    act(() => {
        jest.advanceTimersByTime(3000);
    });
    
    // Check if data is now in SSTable or level
    if (result.current.compactionStrategy === 'size-tiered') {
        expect(result.current.state.sstables.length).toBeGreaterThan(0);
    } else {
        expect(result.current.state.levels[0].length).toBeGreaterThan(0);
    }
    });

    });

// ============= SIZE-TIERED COMPACTION TESTS =============
it('should trigger size-tiered compaction when threshold is reached', () => {
  const { result } = renderHook(() => useLSMTreeCore());
  
  // Reset state and set compaction strategy
  act(() => {
    result.current.handleReset();
    result.current.setCompactionStrategy("size-tiered");
    result.current.setCompactionThreshold(2); // Lower threshold for testing
    jest.runAllTimers();
  });
  
  // Fill memtable and trigger flush to create first SSTable
  for (let i = 0; i < result.current.memtableSize; i++) {
    act(() => {
      result.current.setKeyInput(`key${i}`);
      result.current.setValueInput(`value${i}`);
      jest.runAllTimers();
    });
    
    act(() => {
      result.current.handlePut();
      jest.runAllTimers();
    });
  }
  
  // Add one more to trigger flush
  act(() => {
    result.current.setKeyInput('extraKey');
    result.current.setValueInput('extraValue');
    jest.runAllTimers();
  });
  
  act(() => {
    result.current.handlePut();
    jest.runAllTimers();
  });
  
  // Verify SSTable was created
  expect(result.current.state.sstables.length).toBe(1);
  
  // Fill memtable again to create a second SSTable
  for (let i = 0; i < result.current.memtableSize; i++) {
    act(() => {
      result.current.setKeyInput(`secondBatch${i}`);
      result.current.setValueInput(`value${i}`);
      jest.runAllTimers();
    });
    
    act(() => {
      result.current.handlePut();
      jest.runAllTimers();
    });
  }
  
  // Add one more to trigger flush
  act(() => {
    result.current.setKeyInput('extraKey2');
    result.current.setValueInput('extraValue2');
    jest.runAllTimers();
  });
  
  act(() => {
    result.current.handlePut();
    jest.runAllTimers();
  });
  
  // Ensure all timers run to complete flush and compaction
  act(() => {
    jest.advanceTimersByTime(5000);
  });
  
  // Verify compaction occurred - we should now have 1 SSTable instead of 2
  expect(result.current.state.sstables.length).toBe(1);
  
  // Verify the compacted SSTable contains all our data
  const compactedSSTable = result.current.state.sstables[0];
  expect(compactedSSTable.length).toBeGreaterThan(result.current.memtableSize);
  
  // Check that keys from both SSTables are present
  expect(compactedSSTable.some(item => item.key === 'key0')).toBe(true);
  expect(compactedSSTable.some(item => item.key === 'secondBatch0')).toBe(true);
});

// ============= LEVELED COMPACTION TESTS =============
it('should trigger leveled compaction when L0 threshold is reached', () => {
  const { result } = renderHook(() => useLSMTreeCore());
  
  // Reset state and set compaction strategy
  act(() => {
    result.current.handleReset();
    result.current.setCompactionStrategy("leveled");
    result.current.setL0CompactionThreshold(2); // Lower threshold for testing
    jest.runAllTimers();
  });
  
  // Create first L0 SSTable
  for (let i = 0; i < result.current.memtableSize; i++) {
    act(() => {
      result.current.setKeyInput(`l0key${i}`);
      result.current.setValueInput(`value${i}`);
      jest.runAllTimers();
    });
    
    act(() => {
      result.current.handlePut();
      jest.runAllTimers();
    });
  }
  
  // Trigger memtable flush
  act(() => {
    result.current.setKeyInput('extraL0Key');
    result.current.setValueInput('extraValue');
    jest.runAllTimers();
  });
  
  act(() => {
    result.current.handlePut();
    jest.runAllTimers();
  });
  
  // Create second L0 SSTable to trigger compaction
  for (let i = 0; i < result.current.memtableSize; i++) {
    act(() => {
      result.current.setKeyInput(`l0key2${i}`);
      result.current.setValueInput(`value2${i}`);
      jest.runAllTimers();
    });
    
    act(() => {
      result.current.handlePut();
      jest.runAllTimers();
    });
  }
  
  // Trigger memtable flush
  act(() => {
    result.current.setKeyInput('extraL0Key2');
    result.current.setValueInput('extraValue2');
    jest.runAllTimers();
  });
  
  act(() => {
    result.current.handlePut();
    jest.runAllTimers();
  });
  
  // Advance timers to complete flush and compaction
  act(() => {
    jest.advanceTimersByTime(5000);
  });
  
  // Verify L0 is now empty (data moved to lower levels)
  expect(result.current.state.levels[0].length).toBe(0);
  
  // Verify L1 now has data
  expect(result.current.state.levels[1].length).toBeGreaterThan(0);
  
  // Check that L1 contains keys from both L0 SSTables
  const l1Data = result.current.state.levels[1].flat();
  expect(l1Data.some(item => item.key === 'l0key0')).toBe(true);
  expect(l1Data.some(item => item.key === 'l0key20')).toBe(true);
});

// ============= BLOOM FILTER TESTS =============
it('should use bloom filters to optimize lookups', () => {
  const { result } = renderHook(() => useLSMTreeCore());
  
  // Reset state and enable bloom filter
  act(() => {
    result.current.handleReset();
    result.current.setBloomFilterEnabled(true);
    jest.runAllTimers();
  });
  
  // Create an SSTable
  for (let i = 0; i < result.current.memtableSize; i++) {
    act(() => {
      result.current.setKeyInput(`bloomKey${i}`);
      result.current.setValueInput(`value${i}`);
      jest.runAllTimers();
    });
    
    act(() => {
      result.current.handlePut();
      jest.runAllTimers();
    });
  }
  
  // Trigger memtable flush
  act(() => {
    result.current.setKeyInput('extraBloomKey');
    result.current.setValueInput('extraValue');
    jest.runAllTimers();
  });
  
  act(() => {
    result.current.handlePut();
    jest.runAllTimers();
  });
  
  // Reset false positive counter
  act(() => {
    result.current.state.bloomFilterFalsePositives = 0;
    jest.runAllTimers();
  });
  
  // Search for an existing key
  act(() => {
    result.current.setKeyInput('bloomKey1');
    jest.runAllTimers();
  });
  
  act(() => {
    result.current.handleGet();
    jest.runAllTimers();
  });
  
  // Verify key was found
  expect(result.current.state.searchResult.found).toBe(true);
  
  // Search for a non-existent key
  act(() => {
    result.current.setKeyInput('nonExistentBloomKey');
    jest.runAllTimers();
  });
  
  act(() => {
    result.current.handleGet();
    jest.runAllTimers();
  });
  
  // Verify key was not found
  expect(result.current.state.searchResult.found).toBe(false);
});

// ============= FENCE POINTERS TESTS =============
it('should use fence pointers to optimize range queries', () => {
  const { result } = renderHook(() => useLSMTreeCore());
  
  // Reset state and enable fence pointers
  act(() => {
    result.current.handleReset();
    result.current.setFencePointersEnabled(true);
    jest.runAllTimers();
  });
  
  // Create an SSTable with sorted keys
  for (let i = 0; i < 10; i++) {
    act(() => {
      result.current.setKeyInput(`${i}`);
      result.current.setValueInput(`value${i}`);
      jest.runAllTimers();
    });
    
    act(() => {
      result.current.handlePut();
      jest.runAllTimers();
    });
  }
  
  // Trigger memtable flush
  act(() => {
    result.current.setKeyInput('keyExtra');
    result.current.setValueInput('extraValue');
    jest.runAllTimers();
  });
  
  act(() => {
    result.current.handlePut();
    jest.runAllTimers();
  });
  
  // Reset IO saved counter
  act(() => {
    result.current.state.ioSaved = 0;
    jest.runAllTimers();
  });
  
  // Perform a range query
  act(() => {
    result.current.setRangeStartInput('3');
    result.current.setRangeEndInput('7');
    jest.runAllTimers();
  });
  
  act(() => {
    result.current.handleRangeGet();
    jest.runAllTimers();
  });
  
  // Verify IO was saved (blocks skipped)
  expect(result.current.state.ioSaved).toBeGreaterThan(0);
  
  // Verify correct range results
  expect(result.current.state.rangeResults.length).toBe(5); // keys 03, 04, 05, 06, 07
});

// ============= TOMBSTONE GARBAGE COLLECTION TESTS =============
it('should eventually remove tombstones during compaction', () => {
  const { result } = renderHook(() => useLSMTreeCore());
  
  // Reset state
  act(() => {
    result.current.handleReset();
    result.current.setCompactionStrategy("size-tiered");
    result.current.setCompactionThreshold(2); // Lower threshold for testing
    jest.runAllTimers();
  });
  
  // Add a key
  act(() => {
    result.current.setKeyInput('tombstoneTestKey');
    result.current.setValueInput('originalValue');
    jest.runAllTimers();
  });
  
  act(() => {
    result.current.handlePut();
    jest.runAllTimers();
  });
  
  // Flush memtable
  for (let i = 0; i < result.current.memtableSize; i++) {
    act(() => {
      result.current.setKeyInput(`otherKey${i}`);
      result.current.setValueInput(`value${i}`);
      jest.runAllTimers();
    });
    
    act(() => {
      result.current.handlePut();
      jest.runAllTimers();
    });
  }
  
  // Delete the key
  act(() => {
    result.current.setKeyInput('tombstoneTestKey');
    jest.runAllTimers();
  });
  
  act(() => {
    result.current.handleDelete();
    jest.runAllTimers();
  });
  
  // Force multiple compactions to trigger tombstone removal
  for (let i = 0; i < 5; i++) {
    // Create new SSTables to trigger compaction
    for (let j = 0; j < result.current.memtableSize; j++) {
      act(() => {
        result.current.setKeyInput(`compactionKey${i}${j}`);
        result.current.setValueInput(`value${i}${j}`);
        jest.runAllTimers();
      });
      
      act(() => {
        result.current.handlePut();
        jest.runAllTimers();
      });
    }
    
    // Advance timers to complete flush and compaction
    act(() => {
      jest.advanceTimersByTime(5000);
    });
  }
  
  // Check if the key exists in any SSTable
  const allSSTables = result.current.state.sstables.flat();
  const tombstone = allSSTables.find(item => 
    item.key === 'tombstoneTestKey' && item.value === result.current.TOMBSTONE
  );
  
  // After multiple compactions, tombstone should be removed
  expect(tombstone).toBeUndefined();
});

// ============= CONFIGURATION CHANGE TESTS =============
it('should apply configuration changes correctly', () => {
  const { result } = renderHook(() => useLSMTreeCore());
  
  // Test changing memtable size
  act(() => {
    result.current.setMemtableSize(10);
    jest.runAllTimers();
  });
  
  expect(result.current.memtableSize).toBe(10);
  
  // Test changing compaction strategy
  act(() => {
    result.current.setCompactionStrategy('leveled');
    jest.runAllTimers();
  });
  
  expect(result.current.compactionStrategy).toBe('leveled');
  
  // Test changing compaction threshold
  act(() => {
    result.current.setCompactionThreshold(5);
    jest.runAllTimers();
  });
  
  expect(result.current.compactionThreshold).toBe(5);
  
  // Test changing L0 compaction threshold
  act(() => {
    result.current.setL0CompactionThreshold(3);
    jest.runAllTimers();
  });
  
  expect(result.current.l0CompactionThreshold).toBe(3);
  
  // Test toggling optimization features
  act(() => {
    result.current.setBloomFilterEnabled(true);
    jest.runAllTimers();
  });
  
  expect(result.current.bloomFilterEnabled).toBe(true);
  
  act(() => {
    result.current.setFencePointersEnabled(true);
    jest.runAllTimers();
  });
  
  expect(result.current.fencePointersEnabled).toBe(true);
  
  // Test animation speed
  act(() => {
    result.current.setAnimationSpeed(200);
    jest.runAllTimers();
  });
  
  expect(result.current.animationSpeed).toBe(200);
});