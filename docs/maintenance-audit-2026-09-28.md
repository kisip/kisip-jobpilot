# JobPilot scan and remaining-work audit — September 28, 2026

## Decision: overdue is correct

Audited at approximately 13:05 UTC (18:35 IST). Production commit before this audit: `fd70a664d0a0e5d621bf32389b00af4733152c73`.

- Workflow: `.github/workflows/discover-jobs.yml`, cron `17 */6 * * *`, no timezone override. GitHub reports the workflow `active`.
- Slots: 00:17, 06:17, 12:17, 18:17 UTC; 05:47, 11:47, 17:47, 23:47 Asia/Kolkata (IST).
- Live `lastScan` and `lastSuccessfulScan`: `2026-09-28T05:33:11.674Z` (11:03:11.674 IST).
- Recorded next expected scan: `2026-09-28T06:17:00.000Z` (11:47 IST).
- `scanHealth` becomes overdue strictly after nextScan + one hour: 07:17 UTC / 12:47 IST. JavaScript compares absolute instants; browser locale only changes the displayed time.
- Latest discovery run observed: [36382381277](https://github.com/kisip/kisip-jobpilot/actions/runs/36382381277), event `schedule`, success. Subsequent 09:00 and 09:10 runs were deployment-only and did not scan feeds.
- No later discovery run was present in the history at the audit time. The exact reason the expected scans did not appear is unverified. GitHub documents that scheduled events can be delayed or dropped under load; that is a possible explanation, not a proven diagnosis.
- `Overdue · Active` means the last delivered scan succeeded but a newer expected scan has not arrived. The three-job dataset is unchanged. A deployment must not fabricate a successful scan timestamp.

No production calculation or schedule change is justified. Added regression coverage for the real timestamp, UTC/IST equivalence, all four slots, the one-hour boundary, and deployment-versus-scan freshness.

## Prioritized remaining work

| Priority | Work | Verified evidence | Completion criteria |
| --- | --- | --- | --- |
| P0 | Restore timely discovery delivery | Enabled workflow, overdue public dataset, no newer discovery run in the observed run list. | Investigate scheduler/run history and authenticate for deeper logs if needed; verify a real subsequent scan and its published data. Keep the warning until then. |
| P1 | Broaden Linux/sysadmin/support discovery | `sources.json` requests Remotive `search=devops`, Himalayas `q=devops` and `q=cloud engineer`, Jobicy `tag=devops`. Preferences and title acceptance already include Linux Administrator, System Administrator, Sysadmin, Linux/Cloud/Technical Support Engineer, but these do not generate provider queries. Generic Support Engineer, IT Support Engineer and Help Desk Technician are currently rejected. | Add documented queries/categories or broader bounded retrieval; explicitly decide which support titles belong in scope; measure unique eligible jobs per query. Respect provider request limits and deduplicate across queries. |
| P1 | Implement provider-aware pagination and completeness reporting | `fetchSource` requests each configured endpoint once, reads `payload.jobs`, and ignores page/cursor/total metadata. Read-only Himalayas probes returned 1 record on page 1 and 9 on page 2; current code never asks for page 2. Returned totalCount was 5000 and should not be assumed to be the count matching the search. Remotive and Jobicy are locally capped at 100. | For Himalayas search use documented 1-based `page`; cursor applies to its browse endpoint. Validate response metadata and use request/page budgets, repeated-page protection, and explicit incomplete/partial reporting. Preserve existing jobs when a later page fails. Do not invent pagination parameters for other providers. |
| P1 | Connect the notification match threshold | Settings stores `settings.threshold`, default 80. `App.jsx` calls `buildNotifications(jobs)` without it; notification service hardcodes 80 and 90. An 85% fixture yields a high-match item regardless of a stored 95% preference. | Pass a validated threshold to in-app notification calculation and define whether it affects match alerts only or all new-job alerts. Test settings changes, boundary scores, stable notification identities, and follow-up/interview independence. |
| P2 | Implement email/Telegram delivery | Only browser-local in-app notifications exist. README explicitly lists outbound notifications as future work; no email/Telegram sender or delivery workflow is implemented. | Add a backend-only opted-in delivery worker, configured recipient/channel, secret handling, delivery deduplication, retries, and persisted delivery state. Decide how a browser-local threshold reaches that worker. Verify with mocked transports; no real test messages without explicit authorization. |

## Provider and UI limits

- Remotive recommends at most four API requests per day; adding one request per keyword at every six-hour scan would exceed that guidance. Prefer a broader fetch plus local matching, or budget/rotate requests.
- Himalayas documents once-daily cached data and rate limiting. Search supports `page`; browse supports `nextCursor`. The two sampled search responses were HTTP 200 but had differing update metadata; validate actual pagination semantics and freshness before claiming exhaustive coverage.
- Jobicy currently documents `count` 1–200; the project requests 100. Its documented query list has no page/offset parameter. A larger count still does not prove full historical coverage.
- The Jobs UI renders all filtered rows with `.map`; there is no UI pagination/virtualization. This is a later scaling concern, separate from missing source pages.
- The last deployed scan reports HTTP 200 for all three sources and no feed errors. This audit did not rerun all feeds, send notifications, or apply for jobs.

## Sources

- [Live scan status](https://kisip.github.io/kisip-jobpilot/data/scan-status.json)
- [Discovery workflow](https://github.com/kisip/kisip-jobpilot/blob/main/.github/workflows/discover-jobs.yml)
- [GitHub schedule behavior and UTC default](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule)
- [Himalayas API documentation](https://himalayas.app/docs/remote-jobs-api)
- [Remotive API usage guidance](https://github.com/remotive-com/remote-jobs-api)
- [Jobicy API query parameters](https://jobicy.com/jobs-rss-feed)
