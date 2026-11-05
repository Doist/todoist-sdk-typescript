# Check: security

Every consumer runs this code with a user's API token, and OAuth apps with their client secret. Apply to changes in `src/` and `scripts/`.

## Report

- A token, client secret, `Authorization` header or webhook signature written to an error message, a log, or the data a `TodoistRequestError` carries.
- The token sent to a host it wasn't meant for: a URL built from caller or API data without the host check `viewAttachment` makes (`src/clients/upload-client.ts`), or a redirect followed by a `customFetch` with the header still attached.
- OAuth changes that drop or weaken the `state` parameter, or send the client secret anywhere but the token endpoint (`src/authentication.ts`).
- Webhook verification that stops being constant-time, or accepts a payload before checking its signature (`src/utils/webhook-parser.ts`).
- A file path for an upload built from API data rather than the caller's input.
- `npm run api:request` printing the token, or a `.env` value reaching a commit.

## Fine

- Error messages with status codes, request ids and error tags.
- Test fixtures with fake tokens and secrets (`DEFAULT_AUTH_TOKEN`, `test-client-secret`).
