---
title: Write Ahead Log
---

Before the data is written to the Memtable, it is first written to the Write-Ahead Log (WAL) on disk, which allows for recovery of the most recent Memtable state in event of a system failure or crash. 

![LSM Tree Workflow with WAL](/img/lsm_workflow_02.svg)

This concept is not unique to LSM-Tree databases, and is a standard practice in storage systems to ensure durability and data integrity.