---
title: Put
---

## Overview

The PUT operation is used to insert a new key-value pair or update an existing one in the LSM Tree. This operation is optimized for high-throughput sequential writes, which is one of the primary advantages of LSM-Tree based systems.

In LSM-Tree databases, updating an existing value follows the same path as inserting a new value - the system does not differentiate between inserts and updates during the initial write process. This approach, which follows an "append-only" model, contributes to the high write performance of LSM-Tree systems.

## Implementation

The PUT operation follows these steps:

1. **Write to WAL**: The key-value pair is first appended to the Write-Ahead Log (WAL) for durability in case of system failure.
2. **Insert into Memtable**: The key-value pair is then inserted into the Memtable
3. **Check Memtable Size**: If the Memtable exceeds its size threshold after insertion:
   - Current Memtable becomes immutable
   - A new Memtable is created for subsequent writes
   - A background process begins to flush the immutable Memtable to disk as an SSTable in L0

![LSM Tree Workflow(PUT)](/img/put_operation.svg)

While the immediate PUT operation treats inserts and updates identically, the full update process is completed during compaction:
1. **Initial Update**: When a key is updated, the new value is written to the Memtable (and WAL).
2. **Multiple values of same key coexists**: For a period, multiple versions of the key exist in different components of the system
3. **Resolving different versions of the key through Compaction**: During compaction of SSTables, only the most recent version is retained in the output SSTable. Older versions of the key are discarded, reclaiming storage space.

![Put update operation](/img/put_update_operation.svg)

:::note
The same key can exist across different components of the system with exception of the mutable memtable. The mutable memtable maintains unique keys - inserting a key that already exists will update its value rather than creating a duplicate entry.
:::


## Performance Characteristics

The PUT operation in LSM-Tree databases offers several performance advantages:

- **Fast Writes** - Since data is first written to memory, write operations are typically very fast
- **Sequential I/O** - When data is eventually written to disk, it's done as sequential writes (i.e. sorted immutable memtables to SSTable file), which are much faster than random writes
- **Batched writes** - Multiple writes can be batched together in memory before flushing to disk, reducing the number of disk writes.

The simplicity of the PUT operation is one of the key features that makes LSM-Tree databases highly efficient for write-heavy workloads.

:::tip
Head over to [visualize](/visualize) for a more hands-on approach to exploring the PUT operation
:::