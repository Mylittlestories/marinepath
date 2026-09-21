# Security

Do not publish tokens, CVs, backups or personal information in issues, pull requests, screenshots or workflow logs. If a credential is exposed, revoke it at its provider; deleting text does not make an exposed token safe again.

Use GitHub's private vulnerability reporting on the repository if enabled. Otherwise contact the repository owner privately before publishing exploit details.

The frontend does not accept GitHub tokens. Workflows use GitHub's short-lived built-in token with limited permissions. No long-lived personal token is needed for scheduled updates, Pages deployment or tagged releases.

Remote advert content is treated as data, escaped before HTML insertion and embedded with script-closing characters escaped. PDF.js dynamic evaluation is disabled. Review dependency updates and source terms regularly. Do not upload untrusted documents merely to test a suspected vulnerability against someone else's browser.
