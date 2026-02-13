# Copilot Instructions

## Terminal State

Always read the `<context>` block provided at the top of each user message. It contains terminal states including:

- Terminal type
- Last command run
- Working directory
- Exit code (0 = success)

Use this to determine whether commands completed successfully. Do NOT use extra tool calls or ask the user for terminal output when the answer is already in the context block.

## Deployment

- Cloudflare Workers: `npm run deploy` (wrangler deploy)
- Deployed URL: https://distance-guesstimation.wwn.workers.dev/
- After deploy, check exit code in context block to confirm success.

## Workflow

Standard change workflow: edit → commit → push → `npm run deploy`.
