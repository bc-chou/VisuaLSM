---
title: Range Query
---

## Overview

The RANGE GET operation retrieves multiple key-value pairs where the keys fall within a specified range (from a start key to an end key). This operation is essential for scanning and querying datasets efficiently based on key ranges and is a common requirement in many database applications.

Unlike the single-key GET operation, RANGE GET must collect and merge results from multiple components of the LSM-Tree structure, ensuring that only the most recent version of each key is returned to the client.

## Implementation
Most LSM-Tree databases implement RANGE GET using iterators:
- Separate iterators are created for each component containing relevant data (memtable, immutable memtables, SSTables)
- A snapshot of the database is taken at the start of the scan to ensure consistent point-in-time reads, preventing the scan from seeing updates that occur during its execution
- A merging iterator coordinates these component iterators, handling version conflicts and tombstones according to LSM's recency rules
- For each requested record, the merging iterator advances only the necessary component iterators, maintaining sorted order
- The iterator approach processes and returns records incrementally as it scans through the components, rather than first collecting all matching key-value pairs in memory. This keeps peak memory usage dependent on the number of components being searched, not on the total number of matching records in the range query.

```mdx-code-block
import { LSMRangeQueryVisualization } from '../../src/components/docs-viz/index.js'

<LSMRangeQueryVisualization />
```
#
:::warning
A non-iterator approach would look something like this:
1. Scan through all components (memtables and SSTables)
2. Collect ALL matching key-value pairs in a giant in-memory result collection
3. Apply filtering, deduplication, and tombstone processing to this collection
4. Finally return the complete processed collection to the client

This approach would consume memory proportional to the result set size, making it unsustainable for large range queries and impractical in production environments
:::


## Performance Characteristics

The RANGE GET operation in LSM-Tree databases offers these performance characteristics:

- **Memory-Efficient Iteration**: By processing and returning results incrementally as iterators advance through components, memory usage remains proportional to the number of LSM components being searched rather than the total number of matching records.

- **Progressive Result Processing**: Clients can begin consuming and processing initial results while the database continues scanning for additional matches, avoiding the need to wait for the entire range to be processed.

- **Optimized Component Selection**: LSM-Trees use metadata about key ranges in each SSTable to determine which components need to be searched, avoiding unnecessary I/O operations.

These characteristics make LSM-Tree databases well-suited for range queries even when dealing with very large datasets or wide key ranges.

:::tip
Head over to [visualize](/visualize) for a more hands-on approach to exploring the RANGE GET operation
:::