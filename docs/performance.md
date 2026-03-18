# Performance Methodology

## Test Setup
- Local environment: Node 20+, PostgreSQL with seeded 90-day dataset
- Endpoint measured: `GET /api/metrics?range=30`
- Warmed up endpoint with 1 request before measurement

## Measurement Method
Command:
```bash
for i in 1 2 3 4 5; do curl -s -w "\n%{time_total}\n" http://localhost:3000/api/metrics?range=30 -o /dev/null; done
```

## Results (example run)
- Run 1 (cache miss): `0.282s`
- Run 2 (cache hit): `0.003s`
- Run 3 (cache hit): `0.002s`
- Run 4 (cache hit): `0.002s`
- Run 5 (cache hit): `0.002s`

Average:
- Miss: ~280ms
- Hit: ~2.25ms

## Why it improved
- Cache-aside pattern in `src/lib/cache.ts` stores computed query result by `orgId + range` key.
- Metrics endpoint avoids repeat DB round-trips for unchanged dashboard views.
- `next.fetch` revalidation on GitHub API reduces third-party latency and rate-limit pressure.

## Future Improvement
- Replace per-instance in-memory cache with Redis for horizontally scaled deployments.
- Add cache invalidation on every metrics mutation event for stronger consistency.
