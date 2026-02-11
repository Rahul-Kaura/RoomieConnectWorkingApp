# Security Audit & GitHub Commit Prep

## Security vulnerabilities addressed

### 1. **CRITICAL – Hardcoded Auth0 credentials (fixed)**

- **File:** `scripts/create-auth0-test-users.js`
- **Issue:** Auth0 domain, client ID, and **client secret** were hardcoded as fallbacks. Anyone with repo access could use these to access your Auth0 tenant and Management API.
- **Fix:** Fallbacks were removed. The script now uses placeholders (`YOUR_AUTH0_DOMAIN`, `YOUR_MANAGEMENT_API_CLIENT_ID`, `YOUR_MANAGEMENT_API_CLIENT_SECRET`) and **requires** real values via environment variables when run.
- **Action required:** If this repo was ever pushed to a remote (including GitHub), **rotate the Auth0 client secret immediately** in the Auth0 Dashboard (Application → APIs / Machine to Machine → regenerate secret) and revoke any tokens issued with the old secret.

### 2. **Environment files – defense in depth**

- **Fix:** Plain `.env` was added to `frontend/.gitignore` so a frontend `.env` with API keys cannot be committed by mistake. Root `.gitignore` already ignored `.env`; this reinforces it for the frontend folder.

### 3. **Checked and considered OK**

- **Secrets in code:** No other hardcoded API keys or secrets in app code. `frontend/src/config.js` and `frontend/.env.example` use placeholders only. Firebase/Gemini keys are read from `process.env` in the frontend.
- **XSS:** No `dangerouslySetInnerHTML`, `innerHTML`, or `eval()` found in `frontend/src`.
- **Backend:** No secrets in `backend/index.js`; CORS is restricted by origin; input validation present on key endpoints.
- **Dependency audit:** Run `npm audit` (and `npm audit` in `backend/` and `frontend/`) after restoring network to check for known vulnerable packages.

---

## Pre-commit checklist

- [x] Remove hardcoded Auth0 credentials from `scripts/create-auth0-test-users.js`
- [x] Ensure `.env` is ignored (root + frontend)
- [ ] **If this repo was ever pushed:** Rotate Auth0 client secret in Auth0 Dashboard
- [ ] Run `npm audit` in root, `backend/`, and `frontend/` and fix any high/critical issues
- [ ] Confirm no `.env` or real secrets are staged: `git status` and `git diff --cached`

---

## Suggested commit steps

```bash
# 1. See what will be committed
git status
git diff

# 2. Confirm no .env or secrets
git diff --cached
# If anything looks like a secret, unstage and add to .gitignore

# 3. Stage security-related and other intended changes
git add scripts/create-auth0-test-users.js frontend/.gitignore
# Add other files as needed, e.g.:
# git add frontend/src/HomePage.js frontend/src/HomePage.css frontend/src/App.js ...

# 4. Commit
git commit -m "Security: remove hardcoded Auth0 credentials; tighten .gitignore"
```

Use a separate commit for non-security changes (e.g. HomePage, AnimatedCredits) if you want a clear history.

---

## Optional: dependency audit (requires network)

From the project root:

```bash
npm audit
cd backend && npm audit
cd ../frontend && npm audit
```

Address any reported high or critical vulnerabilities before or soon after pushing.
