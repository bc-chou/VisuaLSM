export const components = [
    {
      name: "Memtable",
      data: [
        { key: "key5", value: "value5_new" },
        { key: "key8", value: "tombstone" }
      ],
      recency: 1
    },
    {
      name: "Immutable Memtable",
      data: [
        { key: "key3", value: "value3_new" },
        { key: "key5", value: "value5_old" }
      ],
      recency: 2
    },
    {
      name: "SSTable 1",
      data: [
        { key: "key1", value: "value1" },
        { key: "key3", value: "value3_old" },
        { key: "key7", value: "value7" },
        { key: "key8", value: "value8_old" }
      ],
      recency: 3
    },
    {
      name: "SSTable 2",
      data: [
        { key: "key2", value: "value2" },
        { key: "key6", value: "value6" },
        { key: "key9", value: "value9" }
      ],
      recency: 4
    }
  ];
  
  export const steps = [
    {
        description: "Initial state: Each component iterator positioned at its first key",
        explanation: "In the beginning, iterators for each component are positioned at their first keys.",
        iteratorPositions: [0, 0, 0, 0],
        currentKey: null,
        currentResult: null,
        resultSet: []
      },
      {
        description: "Find smallest key: key1 from SSTable 1",
        explanation: "The merging iterator selects the smallest key across all components: 'key1' from SSTable 1.",
        iteratorPositions: [0, 0, 0, 0],
        currentKey: "key1",
        currentResult: { key: "key1", value: "value1", source: "SSTable 1" },
        resultSet: []
      },
      {
        description: "Return key1:value1 and advance SSTable 1 iterator",
        explanation: "After returning key1:value1, ONLY the SSTable 1 iterator advances to its next position.",
        iteratorPositions: [0, 0, 1, 0],
        currentKey: null,
        currentResult: null,
        resultSet: [{ key: "key1", value: "value1", source: "SSTable 1" }]
      },
      {
        description: "Find smallest key: key2 from SSTable 2",
        explanation: "The smallest key is now 'key2' from SSTable 2.",
        iteratorPositions: [0, 0, 1, 0],
        currentKey: "key2",
        currentResult: { key: "key2", value: "value2", source: "SSTable 2" },
        resultSet: [{ key: "key1", value: "value1", source: "SSTable 1" }]
      },
      {
        description: "Return key2:value2 and advance SSTable 2 iterator",
        explanation: "After returning key2:value2, only the SSTable 2 iterator advances.",
        iteratorPositions: [0, 0, 1, 1],
        currentKey: null,
        currentResult: null,
        resultSet: [
          { key: "key1", value: "value1", source: "SSTable 1" },
          { key: "key2", value: "value2", source: "SSTable 2" }
        ]
      },
      {
        description: "Find smallest key: key3 exists in both Immutable Memtable and SSTable 1",
        explanation: "Key3 exists in multiple components. Following recency rules, we take the value from Immutable Memtable.",
        iteratorPositions: [0, 0, 1, 1],
        currentKey: "key3",
        currentResult: { key: "key3", value: "value3_new", source: "Immutable Memtable" },
        resultSet: [
          { key: "key1", value: "value1", source: "SSTable 1" },
          { key: "key2", value: "value2", source: "SSTable 2" }
        ]
      },
      {
        description: "Return key3:value3_new and advance Immutable Memtable iterator",
        explanation: "After returning key3:value3_new, only the Immutable Memtable iterator advances.",
        iteratorPositions: [0, 1, 1, 1],
        currentKey: null,
        currentResult: null,
        resultSet: [
          { key: "key1", value: "value1", source: "SSTable 1" },
          { key: "key2", value: "value2", source: "SSTable 2" },
          { key: "key3", value: "value3_new", source: "Immutable Memtable" }
        ]
      },
      {
        description: "Find smallest key: key3 in SSTable 1, but we've already processed key3",
        explanation: "Key3 in SSTable 1 is skipped because we've already processed a newer version from Immutable Memtable.",
        iteratorPositions: [0, 1, 1, 1],
        currentKey: "key3",
        currentResult: { key: "key3", value: "value3_old", source: "SSTable 1 (skipped - older)" },
        resultSet: [
          { key: "key1", value: "value1", source: "SSTable 1" },
          { key: "key2", value: "value2", source: "SSTable 2" },
          { key: "key3", value: "value3_new", source: "Immutable Memtable" }
        ]
      },
      {
        description: "Advance SSTable 1 iterator without adding to result",
        explanation: "We advance the SSTable 1 iterator without adding anything to the result set.",
        iteratorPositions: [0, 1, 2, 1],
        currentKey: null,
        currentResult: null,
        resultSet: [
          { key: "key1", value: "value1", source: "SSTable 1" },
          { key: "key2", value: "value2", source: "SSTable 2" },
          { key: "key3", value: "value3_new", source: "Immutable Memtable" }
        ]
      },
      {
        description: "Find smallest key: key5 exists in both Memtable and Immutable",
        explanation: "Key5 appears in both Memtable and Immutable. Following recency rules, we select from Memtable.",
        iteratorPositions: [0, 1, 2, 1],
        currentKey: "key5",
        currentResult: { key: "key5", value: "value5_new", source: "Memtable" },
        resultSet: [
          { key: "key1", value: "value1", source: "SSTable 1" },
          { key: "key2", value: "value2", source: "SSTable 2" },
          { key: "key3", value: "value3_new", source: "Immutable Memtable" }
        ]
      },
      {
        description: "Return key5:value5_new and advance Memtable iterator",
        explanation: "After returning key5:value5_new, only the Memtable iterator advances.",
        iteratorPositions: [1, 1, 2, 1],
        currentKey: null,
        currentResult: null,
        resultSet: [
          { key: "key1", value: "value1", source: "SSTable 1" },
          { key: "key2", value: "value2", source: "SSTable 2" },
          { key: "key3", value: "value3_new", source: "Immutable Memtable" },
          { key: "key5", value: "value5_new", source: "Memtable" }
        ]
      },
      {
        description: "Find smallest key: key5 in Immutable, but we've already processed key5",
        explanation: "Key5 in Immutable Memtable is skipped since we've already processed a newer version.",
        iteratorPositions: [1, 1, 2, 1],
        currentKey: "key5",
        currentResult: { key: "key5", value: "value5_old", source: "Immutable Memtable (skipped - older)" },
        resultSet: [
          { key: "key1", value: "value1", source: "SSTable 1" },
          { key: "key2", value: "value2", source: "SSTable 2" },
          { key: "key3", value: "value3_new", source: "Immutable Memtable" },
          { key: "key5", value: "value5_new", source: "Memtable" }
        ]
      },
      {
        description: "Advance Immutable Memtable iterator without adding to result",
        explanation: "We advance the Immutable Memtable iterator without adding to the result set.",
        iteratorPositions: [1, 2, 2, 1],
        currentKey: null,
        currentResult: null,
        resultSet: [
          { key: "key1", value: "value1", source: "SSTable 1" },
          { key: "key2", value: "value2", source: "SSTable 2" },
          { key: "key3", value: "value3_new", source: "Immutable Memtable" },
          { key: "key5", value: "value5_new", source: "Memtable" }
        ]
      },
      {
        description: "Find smallest key: key6 from SSTable 2",
        explanation: "The smallest key is now 'key6' from SSTable 2.",
        iteratorPositions: [1, 2, 2, 1],
        currentKey: "key6",
        currentResult: { key: "key6", value: "value6", source: "SSTable 2" },
        resultSet: [
          { key: "key1", value: "value1", source: "SSTable 1" },
          { key: "key2", value: "value2", source: "SSTable 2" },
          { key: "key3", value: "value3_new", source: "Immutable Memtable" },
          { key: "key5", value: "value5_new", source: "Memtable" }
        ]
      },
      {
        description: "Return key6:value6 and advance SSTable 2 iterator",
        explanation: "After returning key6:value6, only the SSTable 2 iterator advances.",
        iteratorPositions: [1, 2, 2, 2],
        currentKey: null,
        currentResult: null,
        resultSet: [
          { key: "key1", value: "value1", source: "SSTable 1" },
          { key: "key2", value: "value2", source: "SSTable 2" },
          { key: "key3", value: "value3_new", source: "Immutable Memtable" },
          { key: "key5", value: "value5_new", source: "Memtable" },
          { key: "key6", value: "value6", source: "SSTable 2" }
        ]
      },
      {
        description: "Find smallest key: key7 from SSTable 1",
        explanation: "The smallest key is now 'key7' from SSTable 1.",
        iteratorPositions: [1, 2, 2, 2],
        currentKey: "key7",
        currentResult: { key: "key7", value: "value7", source: "SSTable 1" },
        resultSet: [
          { key: "key1", value: "value1", source: "SSTable 1" },
          { key: "key2", value: "value2", source: "SSTable 2" },
          { key: "key3", value: "value3_new", source: "Immutable Memtable" },
          { key: "key5", value: "value5_new", source: "Memtable" },
          { key: "key6", value: "value6", source: "SSTable 2" }
        ]
      },
      {
        description: "Return key7:value7 and advance SSTable 1 iterator",
        explanation: "After returning key7:value7, only the SSTable 1 iterator advances.",
        iteratorPositions: [1, 2, 3, 2],
        currentKey: null,
        currentResult: null,
        resultSet: [
          { key: "key1", value: "value1", source: "SSTable 1" },
          { key: "key2", value: "value2", source: "SSTable 2" },
          { key: "key3", value: "value3_new", source: "Immutable Memtable" },
          { key: "key5", value: "value5_new", source: "Memtable" },
          { key: "key6", value: "value6", source: "SSTable 2" },
          { key: "key7", value: "value7", source: "SSTable 1" }
        ]
      },
      {
        description: "Find smallest key: key8 exists in both Memtable (as tombstone) and SSTable 1",
        explanation: "Key8 has a tombstone in Memtable, indicating it was deleted. We'll skip it in the results.",
        iteratorPositions: [1, 2, 3, 2],
        currentKey: "key8",
        currentResult: { key: "key8", value: "tombstone", source: "Memtable (tombstone - skipped)" },
        resultSet: [
          { key: "key1", value: "value1", source: "SSTable 1" },
          { key: "key2", value: "value2", source: "SSTable 2" },
          { key: "key3", value: "value3_new", source: "Immutable Memtable" },
          { key: "key5", value: "value5_new", source: "Memtable" },
          { key: "key6", value: "value6", source: "SSTable 2" },
          { key: "key7", value: "value7", source: "SSTable 1" }
        ]
      },
      {
        description: "Advance Memtable iterator without adding to result",
        explanation: "We advance the Memtable iterator without adding to the result set due to the tombstone.",
        iteratorPositions: [2, 2, 3, 2],
        currentKey: null,
        currentResult: null,
        resultSet: [
          { key: "key1", value: "value1", source: "SSTable 1" },
          { key: "key2", value: "value2", source: "SSTable 2" },
          { key: "key3", value: "value3_new", source: "Immutable Memtable" },
          { key: "key5", value: "value5_new", source: "Memtable" },
          { key: "key6", value: "value6", source: "SSTable 2" },
          { key: "key7", value: "value7", source: "SSTable 1" }
        ]
      },
      {
        description: "Find key8 in SSTable 1, but we've already processed it as a tombstone",
        explanation: "Key8 in SSTable 1 is skipped because we've already seen its tombstone in the Memtable.",
        iteratorPositions: [2, 2, 3, 2],
        currentKey: "key8",
        currentResult: { key: "key8", value: "value8_old", source: "SSTable 1 (skipped due to tombstone)" },
        resultSet: [
          { key: "key1", value: "value1", source: "SSTable 1" },
          { key: "key2", value: "value2", source: "SSTable 2" },
          { key: "key3", value: "value3_new", source: "Immutable Memtable" },
          { key: "key5", value: "value5_new", source: "Memtable" },
          { key: "key6", value: "value6", source: "SSTable 2" },
          { key: "key7", value: "value7", source: "SSTable 1" }
        ]
      },
      {
        description: "Advance SSTable 1 iterator without adding to result",
        explanation: "We advance the SSTable 1 iterator without adding to the result set due to the tombstone.",
        iteratorPositions: [2, 2, 4, 2],
        currentKey: null,
        currentResult: null,
        resultSet: [
          { key: "key1", value: "value1", source: "SSTable 1" },
          { key: "key2", value: "value2", source: "SSTable 2" },
          { key: "key3", value: "value3_new", source: "Immutable Memtable" },
          { key: "key5", value: "value5_new", source: "Memtable" },
          { key: "key6", value: "value6", source: "SSTable 2" },
          { key: "key7", value: "value7", source: "SSTable 1" }
        ]
      },
      {
        description: "Find smallest key: key9 from SSTable 2",
        explanation: "The smallest key is now 'key9' from SSTable 2.",
        iteratorPositions: [2, 2, 4, 2],
        currentKey: "key9",
        currentResult: { key: "key9", value: "value9", source: "SSTable 2" },
        resultSet: [
          { key: "key1", value: "value1", source: "SSTable 1" },
          { key: "key2", value: "value2", source: "SSTable 2" },
          { key: "key3", value: "value3_new", source: "Immutable Memtable" },
          { key: "key5", value: "value5_new", source: "Memtable" },
          { key: "key6", value: "value6", source: "SSTable 2" },
          { key: "key7", value: "value7", source: "SSTable 1" }
        ]
      },
      {
        description: "Return key9:value9 and advance SSTable 2 iterator",
        explanation: "After returning key9:value9, the SSTable 2 iterator advances to its end.",
        iteratorPositions: [2, 2, 4, 3],
        currentKey: null,
        currentResult: null,
        resultSet: [
          { key: "key1", value: "value1", source: "SSTable 1" },
          { key: "key2", value: "value2", source: "SSTable 2" },
          { key: "key3", value: "value3_new", source: "Immutable Memtable" },
          { key: "key5", value: "value5_new", source: "Memtable" },
          { key: "key6", value: "value6", source: "SSTable 2" },
          { key: "key7", value: "value7", source: "SSTable 1" },
          { key: "key9", value: "value9", source: "SSTable 2" }
        ]
      },
      {
        description: "All iterators at their end - range query complete",
        explanation: "All component iterators have reached the end. The range query is complete with all keys found in sorted order and following LSM-Tree recency rules.",
        iteratorPositions: [2, 2, 4, 3],
        currentKey: null,
        currentResult: null,
        resultSet: [
          { key: "key1", value: "value1", source: "SSTable 1" },
          { key: "key2", value: "value2", source: "SSTable 2" },
          { key: "key3", value: "value3_new", source: "Immutable Memtable" },
          { key: "key5", value: "value5_new", source: "Memtable" },
          { key: "key6", value: "value6", source: "SSTable 2" },
          { key: "key7", value: "value7", source: "SSTable 1" },
          { key: "key9", value: "value9", source: "SSTable 2" }
        ]
      }
  ];
  
  export const insights = [
    "Merging iterator selects the smallest key from all components",
    "When duplicate keys exist, newest component's value is used. If in the same component, most recent one is used.",
    "Only the iterator that provided a value advances",
    "Tombstones cause keys to be skipped in results",
    "Each result is returned immediately, enabling progressive processing"
  ];
  