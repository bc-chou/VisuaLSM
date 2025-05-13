---
title: Basic Operations
---

## Overview

The LSM Tree supports several basic operations that allow for efficient data manipulation and retrieval. 
These operations include:

1. **PUT**: Insert or update a key-value pair
2. **DELETE**: Remove a key-value pair
3. **GET**: Retrieve the value for a specific key
4. **RANGE GET**: Retrieve all key-value pairs within a specific key range

Each of these operations interacts with both the in-memory and on-disk components of the LSM Tree in different ways.

The following sections will explain each of these operations in detail.