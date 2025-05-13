export const components = [
    {
      name: "Memtable",
      data: [
        { key: "key2", value: "value2" },
        { key: "key5", value: "value5" }
      ],
      recency: 1
    },
    {
      name: "Immutable Memtable",
      data: [
        { key: "key1", value: "value1" },
        { key: "key3", value: "value3" },
        { key: "key7", value: "value7" }
      ],
      recency: 2
    },
    {
      name: "SSTable L0-1",
      data: [
        { key: "key4", value: "value4" },
        { key: "key6", value: "value6" },
        { key: "key9", value: "value9" }
      ],
      recency: 3
    },
    {
      name: "SSTable L1-1",
      data: [
        { key: "key8", value: "value8" },
        { key: "key10", value: "value10" }
      ],
      recency: 4
    }
  ];
  
  export const steps = [
    {
      description: "Step 1: Initial state: LSM-Tree with data across components",
      explanation: "The LSM-Tree has data distributed across Memtable, Immutable Memtable, and SSTables at different levels. We'll delete key3.",
      state: "initial",
      components: [
        components[0],
        components[1],
        components[2],
        components[3]
      ],
      highlightedKey: null,
      walContent: null,
      compactionStatus: null
    },
    {
      description: "Step 2: Delete request received for key3",
      explanation: "When a delete request is received, the database doesn't immediately remove the data but uses a special marker called a tombstone.",
      state: "delete_request",
      components: [
        components[0],
        components[1],
        components[2],
        components[3]
      ],
      highlightedKey: "key3",
      walContent: null,
      compactionStatus: null
    },
    {
      description: "Step 3: Write tombstone to Write-Ahead Log (WAL)",
      explanation: "For durability, the tombstone marker is first written to the WAL. This ensures that the delete operation can be recovered in case of a crash.",
      state: "write_wal",
      components: [
        components[0],
        components[1],
        components[2],
        components[3]
      ],
      highlightedKey: "key3",
      walContent: { operation: "DELETE", key: "key3", timestamp: "2025-03-12T10:15:00Z" },
      compactionStatus: null
    },
    {
      description: "Step 4: Insert tombstone into Memtable",
      explanation: "After writing to the WAL, a tombstone marker is inserted into the Memtable, associated with the key being deleted.",
      state: "insert_memtable",
      components: [
        {
          name: "Memtable",
          data: [
            { key: "key2", value: "value2" },
            { key: "key3", value: "tombstone" },
            { key: "key5", value: "value5" }
          ],
          recency: 1
        },
        components[1],
        components[2],
        components[3]
      ],
      highlightedKey: "key3",
      walContent: { operation: "DELETE", key: "key3", timestamp: "2025-03-12T10:15:00Z" },
      compactionStatus: null
    },
    {
      description: "Step 5: Memtable becomes full and is flushed",
      explanation: "When the Memtable reaches its size threshold, it becomes immutable. A new Memtable is created for new operations, and the immutable one is scheduled for flushing to disk.",
      state: "memtable_full",
      components: [
        {
          name: "Memtable (New)",
          data: [],
          recency: 1
        },
        {
          name: "Immutable Memtable (Former)",
          data: [
            { key: "key2", value: "value2" },
            { key: "key3", value: "tombstone" },
            { key: "key5", value: "value5" }
          ],
          recency: 2
        },
        {
          name: "Immutable Memtable (Older)",
          data: [
            { key: "key1", value: "value1" },
            { key: "key3", value: "value3" },
            { key: "key7", value: "value7" }
          ],
          recency: 3
        },
        components[2]
      ],
      highlightedKey: "key3",
      walContent: { operation: "DELETE", key: "key3", timestamp: "2025-03-12T10:15:00Z" },
      compactionStatus: null
    },
    {
      description: "Step 6: Flush older immutable Memtable to SSTable L0",
      explanation: "The older immutable Memtable is flushed first (FIFO order), creating a new SSTable in level 0 with the original value of key3.",
      state: "flush_older_memtable",
      components: [
        {
          name: "Memtable",
          data: [],
          recency: 1
        },
        {
          name: "Immutable Memtable",
          data: [
            { key: "key2", value: "value2" },
            { key: "key3", value: "tombstone" },
            { key: "key5", value: "value5" }
          ],
          recency: 2
        },
        {
          name: "SSTable L0-2 (New)",
          data: [
            { key: "key1", value: "value1" },
            { key: "key3", value: "value3" },
            { key: "key7", value: "value7" }
          ],
          recency: 3
        },
        {
          name: "SSTable L0-1",
          data: [
            { key: "key4", value: "value4" },
            { key: "key6", value: "value6" },
            { key: "key9", value: "value9" }
          ],
          recency: 4
        }
      ],
      highlightedKey: "key3",
      walContent: null,
      compactionStatus: {
        message: "Older Immutable Memtable flushed to SSTable L0-2",
        actionType: "flush_complete"
      }
    },
    {
      description: "Step 7: Flush newer immutable Memtable to SSTable L0",
      explanation: "Now the newer immutable Memtable with the tombstone is flushed, creating another SSTable in level 0.",
      state: "flush_newer_memtable",
      components: [
        {
          name: "Memtable",
          data: [],
          recency: 1
        },
        {
          name: "SSTable L0-3 (New)",
          data: [
            { key: "key2", value: "value2" },
            { key: "key3", value: "tombstone" },
            { key: "key5", value: "value5" }
          ],
          recency: 2
        },
        {
          name: "SSTable L0-2",
          data: [
            { key: "key1", value: "value1" },
            { key: "key3", value: "value3" },
            { key: "key7", value: "value7" }
          ],
          recency: 3
        },
        {
          name: "SSTable L0-1",
          data: [
            { key: "key4", value: "value4" },
            { key: "key6", value: "value6" },
            { key: "key9", value: "value9" }
          ],
          recency: 4
        }
      ],
      highlightedKey: "key3",
      walContent: null,
      compactionStatus: {
        message: "Newer Immutable Memtable with tombstone flushed to SSTable L0-3",
        actionType: "flush_complete"
      }
    },
    {
      description: "Step 8: During read operations, tombstone masks older values",
      explanation: "When a read request comes for key3, the database sees the tombstone in the most recent SSTable (L0-3) and returns 'not found', even though an older version exists in SSTable L0-2.",
      state: "read_with_tombstone",
      components: [
        {
          name: "Memtable",
          data: [],
          recency: 1
        },
        {
          name: "SSTable L0-3",
          data: [
            { key: "key2", value: "value2" },
            { key: "key3", value: "tombstone" },
            { key: "key5", value: "value5" }
          ],
          recency: 2
        },
        {
          name: "SSTable L0-2",
          data: [
            { key: "key1", value: "value1" },
            { key: "key3", value: "value3" },
            { key: "key7", value: "value7" }
          ],
          recency: 3
        },
        {
          name: "SSTable L0-1",
          data: [
            { key: "key4", value: "value4" },
            { key: "key6", value: "value6" },
            { key: "key9", value: "value9" }
          ],
          recency: 4
        }
      ],
      highlightedKey: "key3",
      walContent: null,
      compactionStatus: {
        message: "Read Result: key3 not found (masked by tombstone)",
        actionType: "read"
      }
    },
    {
      description: "Step 9: Compaction begins between L0 SSTables",
      explanation: "During compaction, L0 SSTables are merged and moved to L1. In leveled compaction, this process sorts keys and eliminates duplicates based on recency.",
      state: "compaction_start",
      components: [
        {
          name: "Memtable",
          data: [],
          recency: 1
        },
        {
          name: "SSTable L0-3",
          data: [
            { key: "key2", value: "value2" },
            { key: "key3", value: "tombstone" },
            { key: "key5", value: "value5" }
          ],
          recency: 2
        },
        {
          name: "SSTable L0-2",
          data: [
            { key: "key1", value: "value1" },
            { key: "key3", value: "value3" },
            { key: "key7", value: "value7" }
          ],
          recency: 3
        },
        {
          name: "SSTable L0-1",
          data: [
            { key: "key4", value: "value4" },
            { key: "key6", value: "value6" },
            { key: "key9", value: "value9" }
          ],
          recency: 4
        }
      ],
      highlightedKey: "key3",
      walContent: null,
      compactionStatus: {
        message: "Compaction in progress: Merging L0 SSTables to L1",
        actionType: "compaction"
      }
    },
    {
      description: "Step 10: Compaction creates new L1 SSTable",
      explanation: "After compaction, a new SSTable is created in L1 with the merged data. The tombstone for key3 is preserved and takes precedence over older values of the same key.",
      state: "l1_sstable_created",
      components: [
        {
          name: "Memtable",
          data: [],
          recency: 1
        },
        {
          name: "No SSTables in L0",
          data: [],
          recency: 0
        },
        {
          name: "SSTable L1-2 (New)",
          data: [
            { key: "key1", value: "value1" },
            { key: "key2", value: "value2" },
            { key: "key3", value: "tombstone" },
            { key: "key4", value: "value4" },
            { key: "key5", value: "value5" },
            { key: "key6", value: "value6" },
            { key: "key7", value: "value7" },
            { key: "key9", value: "value9" }
          ],
          recency: 2
        },
        {
          name: "SSTable L1-1",
          data: [
            { key: "key8", value: "value8" },
            { key: "key10", value: "value10" }
          ],
          recency: 5
        }
      ],
      highlightedKey: "key3",
      walContent: null,
      compactionStatus: {
        message: "All L0 SSTables compacted to L1-2, tombstone preserved",
        actionType: "compaction_complete"
      }
    },
    {
      description: "Step 11: L1 becomes too large, triggers compaction to L2",
      explanation: "In leveled compaction, when L1 exceeds its size threshold, some of its data is compacted down to L2. The tombstone for key3 moves to L2.",
      state: "l2_compaction",
      components: [
        {
          name: "Memtable",
          data: [],
          recency: 1
        },
        {
          name: "No SSTables in L0",
          data: [],
          recency: 0
        },
        {
          name: "SSTable L1-3",
          data: [
            { key: "key8", value: "value8" },
            { key: "key10", value: "value10" }
          ],
          recency: 5
        },
        {
          name: "SSTable L2-1 (New)",
          data: [
            { key: "key1", value: "value1" },
            { key: "key2", value: "value2" },
            { key: "key3", value: "tombstone" },
            { key: "key4", value: "value4" },
            { key: "key5", value: "value5" },
            { key: "key6", value: "value6" },
            { key: "key7", value: "value7" },
            { key: "key9", value: "value9" }
          ],
          recency: 2
        }
      ],
      highlightedKey: "key3",
      walContent: null,
      compactionStatus: {
        message: "Compaction of L1 to L2 complete, tombstone propagated down a level",
        actionType: "compaction_complete"
      }
    },
    {
      description: "Step 12: After grace period expires",
      explanation: "After the configured grace period (e.g., hours or days), the tombstone becomes eligible for removal during the next compaction, as long as all older versions have been checked.",
      state: "grace_period_expired",
      components: [
        {
          name: "Memtable",
          data: [],
          recency: 1
        },
        {
          name: "No SSTables in L0",
          data: [],
          recency: 0
        },
        {
          name: "SSTable L1-3",
          data: [
            { key: "key8", value: "value8" },
            { key: "key10", value: "value10" }
          ],
          recency: 5
        },
        {
          name: "SSTable L2-1",
          data: [
            { key: "key1", value: "value1" },
            { key: "key2", value: "value2" },
            { key: "key3", value: "tombstone" },
            { key: "key4", value: "value4" },
            { key: "key5", value: "value5" },
            { key: "key6", value: "value6" },
            { key: "key7", value: "value7" },
            { key: "key9", value: "value9" }
          ],
          recency: 2
        }
      ],
      highlightedKey: "key3",
      walContent: null,
      compactionStatus: {
        message: "Grace period expired: key3 tombstone eligible for removal",
        actionType: "grace_period"
      }
    },
    {
      description: "Step 13: Final compaction removes tombstone",
      explanation: "During a subsequent compaction, since the grace period has expired and all older versions have been checked, both the tombstone and the deleted data are physically removed from the database.",
      state: "final_compaction",
      components: [
        {
          name: "Memtable",
          data: [],
          recency: 1
        },
        {
          name: "No SSTables in L0",
          data: [],
          recency: 0
        },
        {
          name: "SSTable L1-3",
          data: [
            { key: "key8", value: "value8" },
            { key: "key10", value: "value10" }
          ],
          recency: 5
        },
        {
          name: "SSTable L2-2 (Final)",
          data: [
            { key: "key1", value: "value1" },
            { key: "key2", value: "value2" },
            { key: "key4", value: "value4" },
            { key: "key5", value: "value5" },
            { key: "key6", value: "value6" },
            { key: "key7", value: "value7" },
            { key: "key9", value: "value9" }
          ],
          recency: 2
        }
      ],
      highlightedKey: null,
      walContent: null,
      compactionStatus: {
        message: "Final compaction complete: key3 and its tombstone physically removed",
        actionType: "tombstone_removed"
      }
    }
  ];
  
  export const insights = [
    "Deletes are implemented as special 'tombstone' markers, not immediate removals",
    "Tombstones mask older versions of the same key during reads",
    "Tombstones propagate through the system during compaction",
    "In leveled compaction, SSTables are compacted to lower levels (L0 → L1 → L2...)",
    "Physical removal occurs only after a grace period has expired",
    "The grace period ensures deletion information has propagated to all replicas"
  ];