# Users API verification matrix

This matrix traces the Trello card “Documentar y probar API de usuarios” to executable tests and reviewed artifacts. Test names below are literal names or parameterized name prefixes from their files. All paths are relative to `backend/`.

## Test sources and isolation

| Reference | File | Method |
| --- | --- | --- |
| U | [test/usersApi.integration.test.js](../test/usersApi.integration.test.js) | New full HTTP contract suite; real isolated local MongoDB, bcrypt and JWT; no mocks; complete snapshots of both fictitious users for rejected writes and account B for successful owner operations. |
| R | [test/register.test.js](../test/register.test.js) | HTTP registration validation/error cases with mocked database queries, real bcrypt. |
| L | [test/login.test.js](../test/login.test.js) | HTTP login/configuration cases with mocked queries, real bcrypt/JWT. |
| J | [test/authMiddleware.test.js](../test/authMiddleware.test.js) | JWT edge cases with mocked queries on an auxiliary protected route; complemented by U on all actual protected routes. |
| P | [test/profiles.test.js](../test/profiles.test.js) | HTTP profiles with real local MongoDB; actual unique-index race, coordinated with a mocked precheck barrier. |
| C | [test/passwordChange.test.js](../test/passwordChange.test.js) | HTTP password changes with real local MongoDB; selected failure/race injection. |
| I | [integration/auth.integration.js](../integration/auth.integration.js) | Separate actual-storage authentication flow and real unique-index races with a precheck barrier. Local MongoDB by default; optional dedicated remote testing mode, not used here. |
| S | [test/security.test.js](../test/security.test.js) | Real HTTP security middleware; explicit configuration/counter boundaries, short windows and selected mocked login data. |
| E | [test/errorMiddleware.test.js](../test/errorMiddleware.test.js) | Safe global error envelopes, parser behavior, Mongoose errors and logs. |

U's database always belongs to a newly launched local memory-server process, irrespective of environment MongoDB URIs. Each subtest seeds two fresh fictitious users and initializes real indexes. HTTP, Mongoose and MongoDB are closed in nested `finally` blocks. The new suite is automatically included in `npm test`; no dependency or production code changes are needed.

## Endpoint coverage

| Endpoint | Positive HTTP verification | Negative / storage verification |
| --- | --- | --- |
| POST `/api/auth/register` | U `HTTP workflow persists registration, profiles, password and existing JWT behavior`; I `register creates a real user in users with a bcrypt hash` | U `registration ... creates no user`; I simultaneous email/username races |
| POST `/api/auth/login` | U full workflow; I `login returns an expiring JWT that protects an HTTP route` | U `login ... preserves storage`; L validation and legacy-password cases |
| GET `/api/users/me` | U full workflow and query manipulation; P own-profile case | U five JWT rejection variants; P deleted user |
| GET `/api/users/:username` | U full workflow; P public projection and legacy-case lookup | P unknown/invalid parameter cases |
| PATCH `/api/users/me` | U full workflow/query ownership; P full/partial/boundary updates | U JWT/URL/body manipulation and complete atomicity checks; P validation and index race |
| PATCH `/api/users/me/password` | U full workflow/query ownership; C hash/timestamps and login transition | U JWT/URL/body manipulation; C invalid current/new passwords, missing/additional fields and concurrency |

## Registration requirements (card §3)

| Requirement | Tests / evidence |
| --- | --- |
| Valid registration and actual persistence | U `HTTP workflow persists registration, profiles, password and existing JWT behavior`; I `register creates a real user in users with a bcrypt hash`: query stored document and compare bcrypt. |
| Missing fields | U `registration <name/username/email/password>: missing creates no user`; compare full collection before/after. |
| Blank fields | U `registration <field>: blank creates no user`. |
| Incorrect types | U `registration <field>: wrong type creates no user`; R array-body case. |
| Invalid email | U `registration invalid email creates no user`; R `Sign Up rejects long email with HTTP 400 before database access`. |
| Invalid username, name and lengths | U `registration invalid username creates no user`; R short/long name, short/long username and invalid characters; P reserved `me` registration. |
| Invalid password | U `registration short password creates no user`, `registration oversized UTF-8 password creates no user`; R long ASCII password and exact 72-byte acceptance. |
| Duplicate username | U `registration duplicate username creates no user`; I `simultaneous registrations hit the real unique username index` proves one real write, one 409. |
| Duplicate email | U `registration duplicate email creates no user`; I `simultaneous registrations hit the real unique email index`. |
| Trim/lowercase and mixed-case behavior | U full workflow and duplicate cases; I `email and username duplicates are rejected case-insensitively`, `existing mixed-case documents remain readable and block duplicate registrations`. |
| Hash instead of plaintext | U full workflow and I real stored `passwordHash`; R bcrypt cost/space preservation. |
| No hashes/internal data in response | U request helper checks every response for forbidden keys and test secrets; U exact account projection; I schema hash exclusion. |
| Rejected registrations create no users | Every U `registration ... creates no user` compares entire collection including hashes/timestamps; I race cases assert exactly one document per competing identifier. R additionally proves validation returns before querying storage. |

## Login and JWT requirements (card §4)

| Requirement | Tests / evidence |
| --- | --- |
| Successful login and valid JWT | U full workflow verifies local HS256 signature, subject, lifetime and uses that returned token for actual private GET/PATCH/password routes. L checks configurable `2h` lifetime and exact claims. |
| Incorrect password | U `login wrong password preserves storage`; L identical credential-failure payload. |
| Nonexistent email | U `login unknown email preserves storage`; L identical credential-failure payload. |
| Missing/invalid data | U `login missing data preserves storage`, `login invalid email preserves storage`, `login wrong type preserves storage`; L object email, array/blank/oversized password and array body cases. |
| Missing token on EACH actual protected route | U `<GET /api/users/me / PATCH /api/users/me / PATCH /api/users/me/password>: missing token rejects and preserves storage`. |
| Malformed Authorization on EACH | Same U route matrix, `malformed header` (Basic instead of Bearer); J also covers Bearer/header syntax variants. |
| Invalid JWT on EACH | Same U route matrix, `invalid JWT` (malformed local token). |
| Incorrect signature on EACH | Same U route matrix, `wrong signature` signed with an unrelated random local secret. |
| Expired JWT on EACH | Same U route matrix, `expired JWT` generated locally with expiry in the past. |
| Deleted subject / claim constraints | P `GET/PATCH /me rejects a deleted JWT user`; C `deleted JWT users get 401 and disappearance after authentication gets 404`; J invalid algorithm/subject/expiration cases; I deleted-user flow. |
| No real signing secrets | U/I `configureAuth` generates random secrets and restores process variables; U checks response text excludes its local secret. Tests do not load `.env`. |

The U authentication matrix has **15 executed negative HTTP cases: five rejection types × three actual endpoints**. Every case also compares complete database snapshots. Auxiliary J tests alone are not used to claim endpoint authentication coverage.

## Profiles and authorization requirements (card §5)

| Requirement | Tests / evidence |
| --- | --- |
| Own profile | U full workflow; P `own profile uses JWT identity and includes email and timestamps`. |
| Public profile by username | U full workflow uppercase lookup; P `public profile works without JWT and exposes only the public projection`. |
| Missing profile | P `unknown public profile returns 404`. |
| Invalid path parameter | P `invalid public username returns 400`; reserved `/me` case. |
| Email/private field separation | U compares exact public and private key sets; P projection cases. Public has no email/updatedAt; own does. |
| Valid update and persistence | P `PATCH updates all editable fields and returns private profile and new timestamps`; U full workflow reads persisted bio. |
| Partial update preserves omitted data | P `partial PATCH preserves unspecified fields and authentication data`; U full workflow compares name, username, email, avatar, hash and createdAt. |
| Invalid data and non-editable fields | P `PATCH rejects invalid or unauthorized input <n> atomically` covers types, lengths, avatar protocol/credentials, forbidden fields/operators; U invalid name/avatar complete snapshots. |
| Duplicate username update | U `profile duplicate username preserves complete documents`; P `PATCH rejects a duplicate username including legacy uppercase values`. |
| Actual unique index under concurrent edits | P `real unique index resolves concurrent username claims with HTTP 409`; real database and index, with a barrier only around prechecks. |
| Two users, URL IDs/usernames | U five `URL manipulation: ... cannot write either account` cases: profile by ID/username, extra profile ID, password by ID/username. All reject 404 and preserve both full records. Public GET by B's username remains deliberately public. |
| Query manipulation | U `query manipulation: <method> <path> acts only on JWT owner` for all three protected routes; sends `id`, `_id`, `userId`, `username` of B; reads A/updates A and directly compares complete B record. |
| Body identifiers | U ten `body manipulation: <path> rejects <field> atomically` cases on profile/password: `id`, `_id`, `userId`, `email`, `username`. Profile username is editable but B's occupied username returns 409; the other cases return 400. Both records remain identical. |
| JWT determines own identity | U query matrix proves successful writes affect A and preserve B, while URL/body attempts cannot redirect writes. |
| Rejected writes have no partial changes | U `unchangedRejection` compares all persisted fields, hash, timestamps and record count for every rejected mutation; invalid name/avatar and duplicate username are mixed with otherwise valid field changes. P/C supplement with detailed validation/storage snapshots. |
| Concurrent partial edits | P `concurrent partial updates preserve both independently edited fields`. |

## Password-change requirements (card §6)

| Requirement | Tests / evidence |
| --- | --- |
| Correct current password succeeds | U full workflow; C `password change updates only the hash and updatedAt, returns a safe 200, and retains existing JWT access`. |
| Incorrect current password rejected | C `incorrect current password returns the required safe 401 error and preserves all data`. |
| New password policy | C `password change rejects invalid or extra fields <n> without modifying storage`: blank, short, >72-byte ASCII/multibyte, same password; `password change preserves spaces and case and accepts exactly 72 UTF-8 bytes`. |
| Legacy current password supported | C `existing short passwords can be replaced with a password meeting the registration policy`; L legacy login. |
| Missing/additional fields | C invalid-body matrix: missing current/new, wrong types, extra ID/username/email/hash/confirmPassword/operators/roles; U adds `userId` against real storage. |
| JWT protection | U five password-route JWT rejection cases, C missing/invalid/expired and deleted-subject cases. |
| Cannot change another account | U password URL/query/body matrices directly compare B's full stored document including hash; C `client identifiers cannot target a different account`. |
| Hash updated and other fields preserved | U full workflow reads new hash and verifies old/new bcrypt comparisons; C exact document comparison excluding changed hash/updatedAt. |
| Old password login rejected | U full workflow; C `old password stops working in Login and the new password succeeds`. |
| New password login succeeds | Same U/C workflow cases. |
| No secrets in responses | U shared response assertions and exact password success envelope; C helper excludes current/new password, hash and bearer token. |
| Earlier JWT remains valid | U uses the same login token before/after password change for GET /me; C old-token case; documented in [the API contract](users-api.md). No revocation added. |
| Concurrent password write cannot overwrite obsolete hash | C `concurrent changes cannot overwrite a password based on an obsolete hash` checks 200/409 `PASSWORD_UPDATE_CONFLICT`. |

## Operational, documentation and scope requirements (card §§1–2, 7–10)

| Requirement | Verification / artifact |
| --- | --- |
| Branch/status/instructions/scripts reviewed before edits | Initial `git status --short --branch`: clean `backend...origin/backend`; checked repository instructions (no applicable AGENTS.md found), package scripts, routes/controllers/services/User/JWT/errors and README/tests. Baseline completed before edits. |
| Preserve architecture, previous changes, contracts | Initial working tree clean; no `src/`, dependencies, environment or module-system changes. Only documentation and a new test file. |
| All six real endpoints documented | [users-api.md](users-api.md): table and individual method/path, purpose, authentication, headers, path/query/body, rules, normalization, success/errors and serialized fields. All expected routes exist. |
| JWT acquisition/usage, own vs public | Login, shared HTTP, individual profile sections and frontend workflow in the contract; verified by U. |
| Safe errors preserved | E safe parser/validation/duplicate/500/log tests; R/L/P/C unexpected storage-error cases. No error middleware changes. |
| Real integration, persistence and uniqueness | U/P/C local processes; I real unique indexes with concurrent registration races. Mocks are not the sole evidence for persistence/index assertions. |
| Tools reused; no unnecessary dependencies/resources | Uses existing node:test/assert/fetch, MongoMemoryServer, bcrypt, JWT and test helpers. No added package, Postman/OpenAPI duplication or production data. |
| Isolation and cleanup | U explicit local URI only, local secrets, two fictitious users, finally cleanup. I unique temporary database with guarded cleanup; executed in default local mode. |
| README setup/variables/install/start/tests | Existing environment and installation sections retained; targeted documentation links, frontend flow and focused test command added. README explains `npm ci`, `npm run dev`, `npm start`, `npm test`, separate integration and local-only selection. |
| Rate limiting | S `login counts failed validation and emits standard rate/retry headers and JSON 429`, independent-counter, malformed-input, success/failure counter and reset cases. Actual defaults and functional-suite quotas documented. |
| CORS | S allowed/denied origin, Authorization+JSON preflight, no-Origin and production allowlist cases. Contract documents defaults, credentials=false and browser headers. |
| JSON limits and JWT expiry | S `JSON parser enforces the configured size and the API survives invalid payloads`; E size/charset cases; L lifetime case and U expired-token matrix. |
| Minimal bug correction only if proven | No API defect found by executed cases; production code unchanged. New tests close coverage gaps rather than alter behavior. |
| No production/credentials/frontend/deploy/Git publication | Changes restricted to `backend/`; `.env` unchanged; no production connections or real users needed; no commit/push/merge/worktree. Final diff/status checks verify file scope. |
| Reproduction and final criteria | Commands and result record below; every module endpoint has positive and negative executed HTTP coverage. |

## Execution record

Verification date: 2026-11-20. Node.js 24.13.0, Windows, branch `backend`.

| Stage | Command from `backend/` | Result |
| --- | --- | --- |
| Baseline, before edits | `npm test -- --test-reporter=dot` | 244 passed; exit 0. |
| Baseline integration | `npm run test:integration` | 8 passed; 0 failed/skipped. Local temporary database removed. |
| New focused contract suite | `npm test -- --test-reporter=spec test/usersApi.integration.test.js` | 61 passed (60 cases + parent test); 0 failed/skipped. |
| Final main suite | `npm test -- --test-reporter=spec` | 305 passed; 0 failed/cancelled/skipped/todo; exit 0. |
| Final separate integration | `npm run test:integration` | 8 passed; 0 failed/cancelled/skipped/todo; exit 0. Temporary database removed. |

Counts include parent tests as reported by node:test. The new suite adds 61 to the 244-test baseline; the separate eight-test integration command is not discovered by `npm test` because its filename is `auth.integration.js`.

Completion criterion met: all six routes are documented and exercised over HTTP, with the card's required negative cases, actual persistence/unique-index checks and two-account authorization verification. No required verification is blocked. No implementation bug was found; all changes are documentation or tests and remain uncommitted for review.

No production/Atlas validation or manual frontend session is claimed. They are unnecessary for the card's isolated API verification. Frontend integration has a documented reproducible request flow; CORS, expiry and rate limits are covered automatically. The first MongoDB binary download can require Internet; failure to start MongoDB must be reported as blocked, never replaced with mocked persistence. Existing session non-revocation and in-memory rate limits are documented behavior, not new features in this card.
