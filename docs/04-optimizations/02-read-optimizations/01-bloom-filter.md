---
title: Bloom Filter
---

## Overview

The bloom filter is a space-efficient probabilistic data structure that determines the set membership of an element. 

Given a query key K, the bloom filter either answers `TRUE` or `FALSE`, where if
- bloom filter returns `FALSE`, K does not exist in the set
- bloom filter returns `TRUE`, K **might** exist in the set

![Bloom filter diagram](../../../static/img/bloom_filter.svg)

In the context of LSM Trees, a bloom filter is maintained for each SSTable file.

When a read request arrives, the bloom filter for the associated SSTable is checked if key is present before the SSTable file is accessed.

If the bloom filter returns `FALSE`, we can skip reading that SSTable.
If the bloom filter returns `TRUE`, the associated key **might** be present in the SSTable.

## Performance
Bloom filters depend on two key parameters:
- Number of bits per key (m/n)
- Number of hash functions (k)
> Typical configurations in LSM Trees use 10 bits per key and 4-6 hash functions

:::note
While bloom filters significantly improve point query performance, they offer limited benefits for range queries beyond potentially helping to identify SSTables that don't contain the range boundaries.
:::




TESTING SECTION

## Overview

Bloom filters are space-efficient probabilistic data structures that determine whether an element might be in a set. In LSM Tree databases, bloom filters serve a critical purpose: they allow the system to quickly determine if a key might exist in a particular SSTable without actually reading the SSTable from disk.

This optimization is essential because LSM Trees distribute data across multiple SSTables, and checking each one would result in excessive disk I/O during read operations.


## How Bloom Filters Work

A bloom filter consists of a bit array of m bits and k different hash functions:

1. **Initialization**: All bits in the array are initially set to 0
2. **Adding Elements**: When adding a key to the filter:
   - The key is hashed using each of the k hash functions
   - Each hash function produces a position in the bit array
   - The bits at these positions are set to 1
3. **Querying**: To check if a key might exist:
   - The key is hashed using the same k hash functions
   - If ALL corresponding bits are 1, the key might exist (positive result)
   - If ANY bit is 0, the key definitely does not exist (negative result)

This property makes bloom filters perfect for SSTable lookups – they never produce false negatives (saying a key doesn't exist when it does), but they can produce false positives (saying a key might exist when it doesn't).

## Implementation in LSM Trees

In LSM Tree databases, bloom filters are typically implemented in two ways:

### Per-SSTable Bloom Filters
- A single bloom filter is created for an entire SSTable
- Requires less memory but more prone to false positives in large SSTables

### Per-Block Bloom Filters
- Separate bloom filters for each data block within an SSTable
- More memory-efficient for point lookups but requires more total memory


## Tuning Bloom Filters

The effectiveness of bloom filters depends on two key parameters:

1. **Bits per Entry (m/n)**: The number of bits in the filter divided by the number of entries
   - More bits reduce false positives but increase memory usage
   - Typical values range from 8-16 bits per entry

2. **Number of Hash Functions (k)**: How many positions in the bit array are set per key
   - Optimal k depends on the bits per entry
   - Typically calculated as k = (m/n) * ln(2)

The false positive probability can be estimated as:

<!-- $$ P_{false\ positive} \approx (1 - e^{-kn/m})^k $$ -->

Where:
- m is the bit array size
- n is the number of elements
- k is the number of hash functions

## Performance Impact

Properly configured bloom filters dramatically improve read performance:

- **Without Bloom Filters**: Every SSTable must be checked for potential key existence
- **With Bloom Filters**: Only SSTables with positive bloom filter results are read

For a database with dozens or hundreds of SSTables, this can reduce I/O operations by over 90% for point lookups.

## Memory Considerations

Bloom filters are stored in memory for quick access, so their size impacts overall memory consumption:

- **Size-Quality Tradeoff**: Smaller filters use less memory but have higher false positive rates
- **Adaptive Sizing**: Some implementations vary filter size based on SSTable importance
- **Memory Budget**: Typical bloom filter memory usage is ~1-5% of the data size

:::warning
Bloom filter memory usage should be carefully monitored. Too little memory allocated to filters increases false positives and defeats their purpose, while too much reduces memory available for other critical components like block cache.
:::

:::tip
For read-heavy workloads, allocating more memory to bloom filters often provides better performance improvements than increasing other memory-based optimizations.
:::