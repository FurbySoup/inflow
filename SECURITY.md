# Security policy

## Reporting a vulnerability

Please report security issues privately: go to the repository's **Security** tab and choose **Report a vulnerability**. Don't open a public issue.

I'll respond on a best-effort basis. This is a single-maintainer project.

## Supported versions

Only the latest release is supported. Fixes land in a new release, not in older tags.

## Scope

In scope:

- the proxy server (`server/`): open proxy behaviour, path traversal, host or method bypass;
- cross-site scripting in the app's UI.

Out of scope: problems in upstream data sources (NWS, IEM, DOT feeds, YouTube, etc.) and data that is wrong or late. Use a regular issue for those.
