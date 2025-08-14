VPS Agent Knowledge

- Use the stack script resolver to pick correct script; never trigger a full reinstall without explicit instruction.
- Sanity-check environment variables; redact secrets in logs.
- Validate SSH connectivity and disk/memory before deployment.
- Keep deployment logs and mark server status appropriately.
