---
title: Memtable
---

The memtable is an in-memory data structure that **stores recent write data in memory**. Once the memtable reaches its size threshold, the current memtable becomes **immutable** (read-only) and a new memtable is created to receive incoming writes. The content in the immutable memtable is then **flushed into a Sorted String Table file** by a background thread. 
> An immutable memtable becomes read-only while waiting to be flushed to disk. Multiple immutable memtables may exist simultaneously while being flushed to disk.

![LSM Tree Workflow with Memtable](/img/lsm_workflow_03.svg)

The Memtable is typically implemented as a balanced binary search tree (i.e. Red-Black tree/AVL tree) or its probabilistic alternative, a Skip List, which can be used in place of balanced trees. 
> Some modern LSM tree databases like [RocksDB](https://github.com/facebook/rocksdb/wiki/Memtable) and [Cassandra](https://github.com/apache/cassandra/blob/trunk/src/java/org/apache/cassandra/db/memtable/Memtable_API.md) use Skip List as the default implementation of the Memtable.

:::note
It follows several key characteristics as such:
- Maintains sorted key-value pairs
- Provides average time complexity of `O(log n)` for insertion and lookup operations
- Operates at memory speed as an in-memory structure