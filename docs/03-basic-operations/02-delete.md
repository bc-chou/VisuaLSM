---
title: Delete
---

## Overview

The DELETE operation in an LSM-Tree database is used to remove a key-value pair from the database. Due to the immutable nature of SSTables, deletions are handled through a special mechanism known as "tombstoning" rather than direct data removal.

A tombstone is a special marker that indicates a key has been deleted. The actual data may still exist in older SSTables but is considered logically deleted. Physical removal occurs later during compaction.

## Implementation

The DELETE operation follows these steps (identical to an insert/update operation):

1. **Write to WAL**: A tombstone marker is appended to the Write-Ahead Log (WAL) for durability.
2. **Insert into Memtable**: The tombstone marker is inserted into the Memtable, associated with the key being deleted.
3. **Check Memtable Size**: Same as with PUT operations, if the Memtable exceeds its size threshold:
   - Current Memtable becomes immutable
   - A new Memtable is created for subsequent operations
   - A background process flushes the immutable Memtable to disk as an SSTable in L0

![LSM Tree Workflow(DELETE)](/img/delete_operation.svg)

Tombstones are eventually cleaned up during the compaction process:

1. **Tombstone Propagation**: During SSTable creation and compaction, tombstones are preserved and propagated.
2. **Tombstone Cleanup**: When SSTables are compacted, if a key with a tombstone is found, and all older SSTable levels have been checked (ensuring no older versions exist), the key and its tombstone can be safely removed.
3. **Policy-Specific Behaviors**:
   - **Leveled Compaction**: Tombstones propagate down through the levels until reaching the lowest level. Once at the lowest level, tombstones are removed during subsequent compactions after they've exceeded the grace period (typically hours to days).
   - **Size-Tiered Compaction**: Tombstones remain until they've exceeded the grace period (typically 10 days) **AND** are included in a compaction operation. Since compaction is based on accumulating similarly-sized files rather than a strict hierarchy, tombstones may persist considerably longer than in leveled compaction.
4. **Grace Period**: All strategies use a configurable grace period (e.g., `gc_grace_seconds` in Cassandra) that ensures tombstones persist long enough for deletion information to propagate to all replicas

<!-- ![Delete compaction process](/img/delete_compaction.svg) -->
```mdx-code-block
import { LSMDeleteVisualization } from '../../src/components/docs-viz/index.js'

<LSMDeleteVisualization />
```

:::warning
Tombstones must be preserved for a sufficient time and propagate through all levels to ensure that any older versions of the deleted key are properly masked. Premature removal can lead to "zombie" data, where deleted values reappear during reads from older SSTables or replicas that have not seen the deletion.
:::

## Performance Characteristics

In many LSM-Tree implementations, the DELETE operation is essentially a special case of PUT, where the value is a tombstone marker rather than regular data. This means it shares many performance characteristics with the PUT operation:

- **Write Optimized**: Deletions are as fast as writes since they follow the same path
- **Space Overhead**: Tombstones temporarily consume additional space until compaction processes them
- **Eventual Consistency**: There is a delay between when a deletion is issued and when the data is physically removed from disk

:::tip
Head over to [visualize](/visualize) for a more hands-on approach to exploring the DELETE operation
:::