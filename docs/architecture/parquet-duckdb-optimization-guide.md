# Fast Employee Lookup by Organization: Optimization Guide

**Setup:** Two datasets (organizations and employees, 17M+ employee records) stored as ZSTD-compressed Parquet on AWS S3 and queried with DuckDB.
**Goal:** Fetch all employees of one organization quickly, without full scans, while supporting many concurrent users and keeping backend load low.

---

## 1. Recommended Setup at a Glance

1. Sort the employees file by organization ID.
2. Use smaller row groups and right-sized files.
3. Split data into hash-based partitions so each query touches one small file.
4. Always filter by organization ID in the query.
5. Cache metadata, hot results, and pages.
6. Return results in pages, not all at once.
7. Run DuckDB in stateless workers so you can scale out.

Expected result: tens to a few hundred milliseconds per organization lookup.

---

## 2. Parquet File Layout

| Technique | What to do | Why it helps |
|---|---|---|
| Sort by organization ID | Write the employees file ordered by `organization_id` (then `employee_id`) | Each organization's rows sit together, so DuckDB skips most row groups using min/max statistics |
| Smaller row groups | Use about 100,000 rows per row group | Finer-grained skipping |
| Hash-bucket partitioning | Partition into about 256 folders using a hash of `organization_id` | A query reads one small folder instead of the whole dataset |
| Right-sized files | Target roughly 128 MB to 1 GB per file | Avoids slow S3 listing and many small requests |
| Compact column types | Store `organization_id` as an integer, not text | Smaller files, faster comparison, better skipping |
| Bloom filters | Use DuckDB 1.2+ so they are written on `organization_id` | Skips row groups that min/max cannot rule out |
| Split wide columns | Move rarely used large columns (bio, address, notes) into a second Parquet file linked by `employee_id` | List queries read far less data |
| Handle skewed organizations | Give very large organizations their own file or partition | Prevents one bucket from becoming a hotspot |
| Sort the organizations file | Also sort it by `organization_id` | Fast lookups on the small table |

---

## 3. Query Design

- **Always filter by `organization_id`** (and the bucket value when partitioned). This is what enables skipping.
- **Do not wrap the filter column in functions** (for example lower-casing it). That disables skipping.
- **Search by name in two steps:** look up the organization ID in the small organizations file first, then filter employees by ID. Never join on names.
- **Select only the columns you need.** Avoid selecting everything, because Parquet reads only the columns requested.
- **Use prepared statements** when the same query shape runs repeatedly with different IDs.
- **Check pruning with `EXPLAIN ANALYZE`.** The scan should show only a few row groups read. If not, the filter is not being applied early.
- **Do not count all rows on every request.** Store per-organization employee counts in a small summary table, or show "50+" instead of an exact number.

---

## 4. Reducing S3 Overhead

- **Avoid wildcard paths.** Compute the exact file path in code so DuckDB does not list S3 folders.
- **Build a manifest:** a small in-memory table mapping each organization ID to its file and row-group range. Then you know exactly what to read without opening file footers.
- **Cache hot files locally** on fast disk (NVMe/EBS). Local reads are much faster than S3.
- **Network setup:**
  - Keep compute in the same AWS region as the bucket.
  - Use an S3 VPC gateway endpoint.
  - Consider S3 Express One Zone for the hottest data.
- **Keep a persistent DuckDB connection.** Do not reopen it per request.

---

## 5. DuckDB Configuration

- Turn on **HTTP metadata caching** and **object caching** so repeated queries do not re-read Parquet footers from S3. Newer DuckDB versions have an external file cache that replaces the older object cache, so check the docs for your version.
- Enable **HTTP keep-alive** to reuse connections.
- Set **threads higher than CPU cores** for S3 workloads, since they are I/O-bound.
- Set a **memory limit per worker** so concurrent queries do not crash the process.

---

## 6. Caching Layers

1. **Redis/ElastiCache result cache:** cache each organization's results (and each page) with a time-to-live. Repeat requests never reach DuckDB.
2. **Precomputed files for popular organizations:** write a small Parquet or JSON file per top organization and serve it directly from S3 or CloudFront.
3. **In-memory lookup table:** keep the small organizations file loaded in memory for instant name-to-ID lookup.
4. **Local DuckDB table for hot data:** optionally load frequently used data into a local DuckDB table (with an index if needed). Parquet stays the source of truth.
5. **CDN or API caching:** for rarely changing data, cache responses at CloudFront or the API gateway.
6. **Pre-warm on deploy:** load the manifest and the top organizations into cache at startup so the first users do not pay the cold-start cost.

---

## 7. Incremental Results (Pagination)

Do not return all records at once. Return them in pages.

- **Use keyset pagination.** Ask for the next page "after the last employee ID seen," not "skip N rows." Skipping rows re-reads everything before it and gets slower on deep pages.
- **Keep a stable sort order** with a unique tiebreaker (such as `employee_id`) so pages never overlap or miss rows.
- **Use opaque cursor tokens.** Encode the cursor (for example, base64) instead of exposing raw IDs. You can change the internals later without breaking clients.
- **Custom sorting:** if users sort by another field such as name, use that field plus `employee_id` together as the cursor.
- **Cap page size** on the server (50 to 100 rows is a good default).
- **Prefetch the next page** in the background and store it in Redis, so the next click is instant.
- **Early termination happens automatically:** DuckDB stops reading once the page limit is reached. With sorted data, page one reads only one or two row groups.
- **Snapshot complex searches:** for fuzzy or multi-filter searches that cannot use a cursor, run the query once, save the result to a temporary Parquet file, and page through that file. Expire it after a few minutes.

---

## 8. Streaming Results to Clients

| Need | Approach |
|---|---|
| Standard UI with "load more" or infinite scroll | Cursor-paginated API |
| Processing or exporting large result sets in code | Fetch results in batches (`fetchmany`) or Arrow record batches |
| Show first rows immediately | Chunked HTTP, Server-Sent Events, or NDJSON (one JSON object per line) |
| Two-way control | WebSocket |
| Service-to-service streaming | gRPC server streaming |
| Very fast bulk transfer | Apache Arrow Flight |
| Existing GraphQL API | GraphQL connections (`first` / `after`) |

---

## 9. Scaling and Protecting the Backend

- **Stateless workers:** run DuckDB in Lambda, ECS, or Fargate behind an API or queue. The data is read-only, so you can add workers freely.
- **Autoscale** on queue depth or latency.
- **Request coalescing (single-flight):** if many users ask for the same organization at once, run one query and share the result.
- **Concurrency limits and timeouts:** cap running queries per worker and queue the rest.
- **Per-user rate limiting:** stops one heavy user from starving others.
- **DuckDB-WASM in the browser:** users query Parquet directly through presigned URLs or CloudFront, so the backend does no work. Use this only if the data is safe to expose to users.

---

## 10. Handling Data Updates

Parquet files are immutable, so:

- Write new data as separate daily or hourly files and query them together with the main files.
- Rebuild the sorted partitions on a schedule (nightly or weekly) and merge the small files back in.
- Invalidate affected Redis keys when an organization's data changes.

---

## 11. Monitoring

Track these to confirm the setup is working:

- **p50 and p95 query latency**
- **Cache hit rate** (Redis and DuckDB metadata)
- **Bytes read from S3 per query.** This is the best signal that skipping works. If it is high, the sort order, partitioning, or filter needs attention.
- **Queue depth and rejected requests**

---

## 12. If Parquet Alone Is Not Enough

If requirements change later (frequent updates, millisecond single-key lookups, text search), these are the common alternatives. They are not needed for the current setup.

| Need | Option |
|---|---|
| Frequent updates, many users | PostgreSQL with an index on `organization_id`, plus Redis |
| Simple key lookups at massive scale | DynamoDB (partition key `organization_id`) |
| Analytics plus lookups | ClickHouse |
| Fuzzy or text search within an organization | OpenSearch or Typesense |
| DuckDB workflow with better concurrency | MotherDuck |

Supporting database practices (if you adopt one): connection pooling (PgBouncer or RDS Proxy), read replicas for search traffic, and covering indexes.

---

## 13. Implementation Checklist

**Data**
- [ ] Rewrite employees Parquet sorted by `organization_id`, then `employee_id`
- [ ] Use integer IDs and about 100k-row row groups
- [ ] Partition by hash bucket (about 256) and keep files in the 128 MB to 1 GB range
- [ ] Separate rarely used wide columns into their own file
- [ ] Isolate very large organizations
- [ ] Build the organization-to-file manifest and the per-organization counts table

**Query**
- [ ] Filter by organization ID (and bucket) on every query
- [ ] Select only needed columns
- [ ] Resolve organization names to IDs through the in-memory lookup
- [ ] Verify pruning with `EXPLAIN ANALYZE`

**Runtime**
- [ ] Enable metadata and object caching, keep-alive, tuned threads, and memory limit
- [ ] Use one persistent connection per worker, in the same region as the bucket
- [ ] Add Redis caching with prefetch for the next page
- [ ] Add request coalescing, concurrency limits, timeouts, and rate limits

**API**
- [ ] Keyset pagination with opaque cursors and a server-side page size cap
- [ ] Optional streaming (chunked HTTP, SSE, or NDJSON) for large results

**Operations**
- [ ] Update strategy: delta files plus scheduled rebuild
- [ ] Cache invalidation on data change
- [ ] Dashboards for latency, cache hit rate, and bytes read from S3
