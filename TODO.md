# API Backend-Frontend Integration TODO

## Current Status

- [x] Backend server started (port 5000, DB connected assumed)
- [ ] Frontend auth connected to /api/auth
- [ ] Frontend data connected to /api/projects/tasks
- [ ] Test full flow: login → create/fetch/save task

## Steps

1. Update frontend/lib/auth-context.tsx - replace mock with real API calls to backend /api/auth/login/register
2. Add token storage and getAuthHeaders helper
3. Update frontend/lib/data-context.tsx - replace local state with API calls using auth headers
4. Test login, create project/task, verify DB persistence
5. Run frontend dev server if needed
6. Verify end-to-end

Next step: Update auth-context.tsx
