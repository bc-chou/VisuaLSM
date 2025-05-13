---
title: SSTable
---

## Overview
The Sorted String Table (SSTable) is a **persistent disk-based data structure** that stores sorted key-value pairs. When an immutable memtable is flushed to disk, it creates a new immutable SSTable file that persists on disk.

A typical SSTable file consists of multiple sections that looks something like this ([ref](https://github.com/facebook/rocksdb/wiki/Rocksdb-BlockBasedTable-Format)):
```
<start_of_file>
[data block]
[data block]
...
[meta block]
[meta block]
...
[metaindex block]
[Footer]    (fixed size, contains offsets to metaindex/index blocks)
<end_of_file>
```
Data blocks contain the actual data, where each data block typically contains multiple key-value pairs sorted by key. Each data block may also be optionally compressed (i.e. Snappy, ZLib) to reduce storage space.

Meta blocks contain information that provides indexing or other functions that allow for optimizations for the SSTable.
> Common meta blocks include bloom filters for efficient key lookups and statistics for query optimization. Specific details on these optimizations are covered in later sections.

SSTables are organised into levels, where each subsequent level contains more SSTables than the previous level (i.e. L1 is larger than L0). New Memtable flushes create new SSTable files in L0, where SSTable files are then **compacted** depending on the **compaction policy** to create new SSTable files in subsequent levels (L1, L2, ...) 

![LSM Tree Workflow with SSTable levels](/img/lsm_workflow_04.svg)

## Compaction
Compaction is the process of merging SSTables to manage the data on disk. 

This helps to: 
- Merge different versions of keys (Newest version of keys are kept)
- Clean up deleted entries
- Organize data into different levels for efficient reads
- Free up disk space

![Simple SSTable Merge Example](/img/sstable_compaction.svg)

:::info
Different compaction policies used will introduce trade-offs between performance characteristics (i.e. read-write amplification, space amplification) of the database. These policies will be covered in detail in later sections.