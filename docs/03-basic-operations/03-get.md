---
title: Get
---

## Overview

The GET operation retrieves the value associated with a specific key from the database. While LSM-Tree databases are optimized for write operations, they employ several techniques to make read operations as efficient as possible, despite potentially having to check multiple storage components.

Due to the LSM Tree architecture where data is stored across multiple components (Memtable, immutable Memtables, and various SSTable levels), retrieving a value requires checking these components sequentially to find the most recent version of the key.

## Implementation

The GET operation follows these steps:

1. **Check Active Memtable**: First, search the current active Memtable for the key.
2. **Check Immutable Memtables**: If not found, search any immutable Memtables that haven't yet been flushed to disk.
3. **Check SSTable Levels**: If still not found, search through SSTable levels, starting from the most recent (L0) and moving to older levels.
   - Within L0, SSTables must be checked individually from newest to oldest since key ranges may overlap.
   - For L1 and beyond, binary search can be used to find the SSTable containing the key, as key ranges are non-overlapping.
4. **Return Result**: Return the value from the first location where the key is found, or indicate that the key doesn't exist if not found anywhere.

If a tombstone is encountered during the search, the GET operation returns a "key not found" result, as the key has been logically deleted.


![LSM Tree Workflow(GET)](../../static/img/read_operation.svg)

## Performance Characteristics

GET operations in LSM Tree databases have these performance characteristics:

- **Multi-level Search**: LSM Trees organizes data in increasingly sorted and optimized levels:
    - Memtable provides in-memory access speed
    - SSTables are increasingly organized and optimized down the levels due to compaction, enabling efficient look-up.
- **Compaction improves read performance**: Compaction reduces the number of SSTables to check, alongside enabling efficient binary search for fully compacted levels with non-overlapping key ranges (applicable to leveled compaction).

To improve read performance through faster look-up of SSTable files, LSM-Tree databases typically implement several optimizations such as indexing, bloom filters, etc. which are covered under [Optimizations](/optimizations).

:::tip
Head over to [visualize](/visualize) for a more hands-on approach to exploring the GET operation
:::