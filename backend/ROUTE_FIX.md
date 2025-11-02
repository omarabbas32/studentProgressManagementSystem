# Route Order Fix

## Problem
The route `/all/:chapter/:level` was being matched by `/:studentId/:chapter/:level` because Express matches routes in order.

When you called `/api/Problem/all/0/0`, Express was treating "all" as a studentId!

## Solution
Moved `/all/:chapter/:level` to come BEFORE `/:studentId/:chapter/:level` in the route file.

## Action Required
**RESTART YOUR SERVER** for the changes to take effect:

```bash
# Stop the server (Ctrl+C)
# Then restart:
cd backend
npm start
```

After restarting, the route `/api/Problem/all/0/0` should work correctly!

