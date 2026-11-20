# Users API

Verified routes from `src/routes/authRoutes.js` and `src/routes/userRoutes.js`. Examples use fictitious accounts. The base URL for local development is `http://localhost:3000`; change it to match `PORT`.

| Method | Path | Authentication | Success |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | Public | 201, account |
| POST | `/api/auth/login` | Public | 200, token and account |
| GET | `/api/users/me` | Bearer JWT | 200, own profile |
| GET | `/api/users/:username` | Public | 200, public profile |
| PATCH | `/api/users/me` | Bearer JWT | 200, updated own profile |
| PATCH | `/api/users/me/password` | Bearer JWT | 200, confirmation |

## Shared HTTP contract

Send `Content-Type: application/json` for request bodies. `Accept: application/json` is optional. GET requests need no body or Content-Type. Protected routes require:

```http
Authorization: Bearer <token returned by login>
```

No endpoint defines query parameters. Queries do not select the account or change authorization. Own-account operations always use the validated JWT subject. There are no profile or password write routes addressed by another user's ID or username. The public username route intentionally allows anyone to read the public projection.

Success uses `{ "data": ... }`. Failure uses the following envelope; `details` is optional and contains only public field names and developer-authored messages:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data.",
    "details": [{ "field": "email", "message": "Enter a valid email address of up to 254 characters." }]
  }
}
```

Use the HTTP status and `error.code` for client behavior. Do not assume every validation error includes `details`, or that every duplicate error has the same message. Rejected writes do not apply the valid portion of an invalid body.

### Errors shared across endpoints

| HTTP | Code | Cause / example message |
| --- | --- | --- |
| 400 | `INVALID_JSON` | Malformed body: `Request body must contain valid JSON.` |
| 400 | `VALIDATION_ERROR` | Endpoint field rules fail; see individual sections. |
| 400 | `INVALID_VALUE` | Mongoose cast failure: `Invalid request data.` |
| 401 | `UNAUTHORIZED` | On protected routes: missing/malformed Bearer header, invalid/signature mismatch/expired JWT, invalid subject or expiration, unsupported algorithm, or deleted user. `Authentication required.` |
| 403 | `CORS_ORIGIN_DENIED` | An Origin outside the allowlist: `Origin is not allowed.` |
| 404 | `NOT_FOUND` | Unsupported method/path: `Endpoint not found.` |
| 409 | `DUPLICATE_KEY` | Uniqueness conflict. A real MongoDB index race returns `A record with these details already exists.` and may include a public `email`/`username` field detail. |
| 413 | `HTTP_ERROR` | Body exceeds the configured JSON limit: `Payload Too Large`. |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | Nonempty POST/PATCH body without JSON Content-Type: `Content-Type must be application/json.` |
| 429 | `RATE_LIMIT_EXCEEDED` | Register/login limit: `Too many requests. Please try again later.` |
| 500 | `INTERNAL_SERVER_ERROR` | Unexpected failure: `An unexpected server error occurred.` |

CORS, rate limiting, media type and JSON parsing run before the route controller. For example, malformed JSON can return 400 before JWT authentication, and an exhausted login counter returns 429 before credential validation. Authentication errors, with otherwise valid HTTP input, have this shape:

```json
{"error":{"code":"UNAUTHORIZED","message":"Authentication required."}}
```

Responses never contain passwords, `passwordHash`, MongoDB `_id`/`__v`, credentials, database URIs, signing secrets, stack traces or raw database errors. `id` is the intentionally exposed string representation of the account identifier. Only login returns a JWT. Login and successful own-profile/password responses include `Cache-Control: no-store`.

## POST /api/auth/register

Create an account in the `users` collection. Public; no JWT required. Required header: `Content-Type: application/json`. No path or query parameters.

```json
{
  "name": "Alex Morgan",
  "username": "alexcodes",
  "email": "alex@example.com",
  "password": "ExamplePassword123!"
}
```

| Field | Required | Rules and normalization |
| --- | --- | --- |
| `name` | Yes | String; trim outer whitespace; 2–80 JavaScript string code units after trimming. |
| `username` | Yes | String; trim and lowercase; 3–30 ASCII letters, digits or underscores (`^[a-z0-9_]+$`); unique. `me` fails the minimum length. |
| `email` | Yes | String; trim and lowercase; basic non-whitespace `local@domain.suffix` format; maximum 254 JavaScript string code units; unique. This does not verify ownership or deliverability. |
| `password` | Yes | Nonblank string; at least 8 Unicode code points, at most 72 UTF-8 bytes. Preserve spaces and case exactly. No additional composition rule. |

Extra fields are ignored, including attempted IDs or roles. `bio` and `avatar` initially default to empty strings. Email/username duplicate prechecks are case-insensitive, including existing mixed-case documents; MongoDB unique indexes also enforce concurrent normalized writes. Only a bcrypt hash is stored. A rejected registration creates no account.

201 response (no token or timestamps):

```json
{
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "name": "Alex Morgan",
      "username": "alexcodes",
      "email": "alex@example.com",
      "bio": "",
      "avatar": ""
    }
  }
}
```

Errors: 400 `VALIDATION_ERROR` for missing, blank, nonstring or invalid fields; 409 `DUPLICATE_KEY` for an occupied email or username; shared 400/403/413/415/429/500 errors above. Example precheck conflict:

```json
{"error":{"code":"DUPLICATE_KEY","message":"Email or username is already in use."}}
```

This response includes the registering account's email; it is not the public-profile projection. Passwords, hashes and internal fields are always excluded.

## POST /api/auth/login

Authenticate and obtain a JWT. Public; header `Content-Type: application/json`. No path or query parameters.

```json
{"email":"alex@example.com","password":"ExamplePassword123!"}
```

Both fields are required, nonblank strings. Email has the same basic format and maximum length as registration, and is trimmed/lowercased. Password is preserved exactly and limited to 72 UTF-8 bytes. Login accepts existing passwords shorter than 8 characters for compatibility; it does not impose the registration minimum on old accounts. Extra fields are ignored.

200 response; the user fields are exactly the same as registration:

```json
{
  "data": {
    "token": "<JWT returned by the server>",
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "name": "Alex Morgan",
      "username": "alexcodes",
      "email": "alex@example.com",
      "bio": "",
      "avatar": ""
    }
  }
}
```

The token is signed with HS256 and contains `sub` (account ID), `iat` (issued-at seconds) and `exp` (expiration seconds). Duration comes from `JWT_EXPIRES_IN`, default `1d`. It contains no email, password or profile data. Subsequent protected requests must send the actual returned token, not the example placeholder. JWT verification also checks that the account still exists.

Errors: 400 `VALIDATION_ERROR` for invalid input; 401 `INVALID_CREDENTIALS` for either wrong password or nonexistent email; shared 400/403/413/415/429/500 errors. Both credential failures return the same payload:

```json
{"error":{"code":"INVALID_CREDENTIALS","message":"Invalid email or password"}}
```

Login never returns hashes or credentials. An invalid server signing configuration is masked by the shared 500 envelope.

## GET /api/users/me

Read the authenticated account. Required header: `Authorization: Bearer <token>`. No body, path variables or query parameters. Query IDs/usernames are ignored.

200 own-profile response:

```json
{
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "name": "Alex Morgan",
      "username": "alexcodes",
      "email": "alex@example.com",
      "bio": "Software developer",
      "avatar": "https://example.com/avatar.png",
      "createdAt": "2026-11-20T12:00:00.000Z",
      "updatedAt": "2026-11-20T13:00:00.000Z"
    }
  }
}
```

Dates are ISO strings for accounts created through this API. Legacy documents without timestamps may omit those properties. Email and both timestamps belong to the own-profile projection; hashes and internal fields are excluded.

Errors: 401 `UNAUTHORIZED`; 404 `USER_NOT_FOUND` if the account disappears after authentication; shared 403/500. A previously deleted JWT subject normally fails at authentication with 401. The post-authentication disappearance response is:

```json
{"error":{"code":"USER_NOT_FOUND","message":"Profile not found."}}
```

## GET /api/users/:username

Read a public profile. Public; no headers or body required. Required route parameter `username` follows the registration username rules after trim/lowercase. URL-encode path values. Lookup is case-insensitive for legacy documents too. No query parameters. `/me` is the protected own-profile route, including `/ME`.

Example: `GET /api/users/ALEXCODES` returns 200:

```json
{
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "name": "Alex Morgan",
      "username": "alexcodes",
      "bio": "Software developer",
      "avatar": "https://example.com/avatar.png",
      "createdAt": "2026-11-20T12:00:00.000Z"
    }
  }
}
```

Exactly these public fields are serialized; `createdAt` may be omitted on legacy documents. Email, `updatedAt`, passwords and internal fields are excluded. An optional Authorization header does not make this projection private or select the own profile.

Errors: 400 `VALIDATION_ERROR` for an invalid username; 404 `USER_NOT_FOUND` for a valid absent username (`Profile not found.`); shared 403/500. Invalid parameter example:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid username.",
    "details": [{ "field": "username", "message": "Username must contain 3 to 30 letters, numbers, or underscores." }]
  }
}
```

## PATCH /api/users/me

Partially update the authenticated profile. Required headers: `Authorization: Bearer <token>` and `Content-Type: application/json`. No path or query parameters.

```json
{
  "name": "Alex Morgan",
  "username": "alexdev",
  "bio": "Software developer",
  "avatar": "https://example.com/avatar.png"
}
```

| Field | Required | Rules |
| --- | --- | --- |
| `name` | Optional | String; trim; 2–80 JavaScript string code units. |
| `username` | Optional | String; trim/lowercase; 3–30 ASCII letters, digits or underscores; unique, excluding the current account. Keeping the current username is allowed. |
| `bio` | Optional | String; trim; at most 500 JavaScript string code units; `""` clears it. |
| `avatar` | Optional | String; trim; at most 2048 JavaScript string code units; absolute `http://` or `https://` URL with hostname, no embedded credentials or whitespace; `""` clears it. Stores a URL reference, not an uploaded image. |

At least one field is required. An empty object, array, null, wrong type or unknown field rejects the entire request. This includes `id`, `_id`, `userId`, `email`, password fields, timestamps, roles and MongoDB operators. Unlike register/login, extra fields are errors. Omitted fields remain unchanged. Only the JWT account is updated; changing `username` cannot select another account.

200 returns `{ "data": { "user": ... } }` with the **complete own-profile shape shown for GET /me**, including email and timestamps. `createdAt` is preserved; `updatedAt` changes. Hashes and internal fields are excluded.

Errors: 400 `VALIDATION_ERROR`; 401 `UNAUTHORIZED`; 404 `USER_NOT_FOUND` (`Profile not found.`) if the account disappears after authentication; 409 `DUPLICATE_KEY` for an occupied username (including a unique-index race); shared 400/403/413/415/500 errors. Precheck duplicate example:

```json
{"error":{"code":"DUPLICATE_KEY","message":"Username is already in use."}}
```

An invalid/forbidden-field example:

```json
{"error":{"code":"VALIDATION_ERROR","message":"Provide only editable profile fields: name, username, bio, avatar."}}
```

## PATCH /api/users/me/password

Change the authenticated account's password. Required headers: `Authorization: Bearer <token>` and `Content-Type: application/json`. No path or query parameters.

```json
{"currentPassword":"ExamplePassword123!","newPassword":"ReplacementPassword456!"}
```

Both fields are required nonblank strings. No other fields are accepted, including `confirmPassword` and account identifiers. Passwords preserve spaces and case. `currentPassword` has a 72 UTF-8 byte maximum and supports legacy passwords shorter than 8 characters. `newPassword` has at least 8 Unicode code points, a 72 UTF-8 byte maximum, and must differ from the current password. The current password is verified before checking the new password's length/difference policy, after required/type/extra-field validation.

200 response:

```json
{"data":{"message":"Password updated successfully"}}
```

Only the password hash and `updatedAt` change. No password, hash, profile or new JWT is returned. Old-password login subsequently fails; new-password login succeeds. Previously issued JWTs **remain valid until expiration** while their account exists and the signing secret stays valid. No session revocation exists in this module.

Errors: 400 `VALIDATION_ERROR` for missing/type/extra fields or the new-password policy; 401 `UNAUTHORIZED` for JWT failures; 401 `INVALID_CURRENT_PASSWORD` for a wrong current password; 404 `USER_NOT_FOUND` (`User not found.`) for post-authentication disappearance; 409 `PASSWORD_UPDATE_CONFLICT` if another request changed the hash between verification and update; shared 400/403/413/415/500 errors. Examples:

```json
{"error":{"code":"INVALID_CURRENT_PASSWORD","message":"Current password is incorrect"}}
```

```json
{"error":{"code":"VALIDATION_ERROR","message":"New password must differ from the current password."}}
```

```json
{"error":{"code":"PASSWORD_UPDATE_CONFLICT","message":"Password changed during this request. Please retry."}}
```

## Frontend workflow and local requests

1. Register; handle field errors and duplicate identifiers. Registration does not log in automatically.
2. Login; take `data.token` and use it as a Bearer header on protected requests. Do not log tokens or passwords.
3. Load `GET /api/users/me` for private account state; use `GET /api/users/:username` for public views.
4. Send only edited allowed fields to `PATCH /api/users/me`, and replace local state with its returned profile. Updating a username changes the public URL; the token subject stays the same ID.
5. Change the password with the current password. Handle `INVALID_CURRENT_PASSWORD` separately from token expiry. Existing JWTs continue to work; the next login requires the new password.

The following PowerShell example sends real requests. Run it only against your own disposable development database; automated tests below create their own local database instead. Repeating this exact registration after success will return 409. No importable collection or extra tool installation is needed.

```powershell
$apiBase = 'http://localhost:3000'
$registerBody = @{name='Alex Morgan';username='alexcodes';email='alex@example.com';password='ExamplePassword123!'} | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri "$apiBase/api/auth/register" -ContentType 'application/json' -Body $registerBody
$loginBody = @{email='alex@example.com';password='ExamplePassword123!'} | ConvertTo-Json
$session = Invoke-RestMethod -Method Post -Uri "$apiBase/api/auth/login" -ContentType 'application/json' -Body $loginBody
$authHeaders = @{Authorization="Bearer $($session.data.token)"}
Invoke-RestMethod -Uri "$apiBase/api/users/me" -Headers $authHeaders
Invoke-RestMethod -Uri "$apiBase/api/users/alexcodes"
Invoke-RestMethod -Method Patch -Uri "$apiBase/api/users/me" -Headers $authHeaders -ContentType 'application/json' -Body '{"bio":"Software developer"}'
Invoke-RestMethod -Method Patch -Uri "$apiBase/api/users/me/password" -Headers $authHeaders -ContentType 'application/json' -Body '{"currentPassword":"ExamplePassword123!","newPassword":"ReplacementPassword456!"}'
```

## Operational limits affecting integration

| Setting | Default / behavior |
| --- | --- |
| `JWT_EXPIRES_IN` | `1d`; positive integer with `s`, `m`, `h` or `d`. Expired tokens require login. |
| `REGISTER_RATE_LIMIT_MAX` | 5 POST attempts per IP per window. |
| `LOGIN_RATE_LIMIT_MAX` | 10 POST attempts per IP per window, separate from registration. |
| `AUTH_RATE_LIMIT_WINDOW_MS` | 900000 (15 minutes). Successful and rejected attempts count, including malformed JSON/media type errors. |
| Rate-limit headers | Standard draft-8 `RateLimit`, `RateLimit-Policy`; 429 also sends `Retry-After`. Respect retry timing. |
| Rate-limit store | In-memory per application process. Restart resets counters; multiple instances require a shared-store design beyond this task. |
| `JSON_BODY_LIMIT_BYTES` | 16384 (16 KiB); configured range 1–1048576 bytes. |
| `CORS_ORIGINS` | Development default: `http://localhost:5173,http://127.0.0.1:5173`. Production requires an explicit list of complete HTTP/S origins, no wildcard, credentials, path, query or fragment. |
| CORS requests | Unknown or `null` Origin: 403. Clients without Origin work. Allowed origins receive reflected origin and `Vary: Origin`; credentials/cookies are not enabled. |
| CORS preflight | OPTIONS supports GET/POST/PATCH and Content-Type/Authorization; 204 for allowed preflight; max age 600 seconds; does not consume login/register limits. Rate-limit response headers are exposed to browsers. |
| `TRUST_PROXY` | `false`; only explicitly configured proxy IPs/CIDRs are trusted. Never spoof `X-Forwarded-For` to test identities. IPv6 clients are grouped by /56 for rate limiting. |

CORS controls browser access, not account identity. Own-profile/password routes have JWT authentication and no dedicated auth-attempt rate limiter. Existing shared error handling and security controls remain enabled in integration tests; functional test apps explicitly increase register/login quotas to avoid interfering with their storage assertions. Rate-limit boundary behavior is exercised separately in `test/security.test.js`.

## Reproducing verification

Use Node.js 24.x and the committed lockfile. From the repository root:

```sh
cd backend
npm ci
npm test
npm run test:integration
```

Only the new complete-contract HTTP suite:

```sh
npm test -- --test-reporter=spec test/usersApi.integration.test.js
```

`npm test` already includes this file, profile/password HTTP tests and the existing unit/security/startup tests. The new suite always starts its own MongoDB process on `127.0.0.1`, ignores both MongoDB environment URIs, uses locally generated JWT secrets, initializes real unique indexes, snapshots both fictitious accounts and cleans up HTTP/Mongoose/MongoDB in `finally`. It does not load `.env`. Stopping the memory server removes its temporary database files. No mocks are used in this new suite.

`npm run test:integration` separately exercises registration races against actual unique indexes. It uses local MongoDB by default. The existing optional `MONGODB_TEST_URI` mode creates and drops `coffee_zone_auth_test_<uuid>` on that server: use only a dedicated testing server/account, never production. For entirely local execution, ensure that variable is unset in the shell. No remote mode was needed for this verification.

`mongodb-memory-server` may download the official MongoDB binary on first execution; network access and permission to run a local process are required. Subsequent runs can use its binary cache. The suite fails if MongoDB cannot start; persistence is never simulated. See [the requirement-to-test matrix](users-api-test-matrix.md) for executed coverage and results. Local server installation, environment variables and startup commands are in the [backend README](../README.md).
