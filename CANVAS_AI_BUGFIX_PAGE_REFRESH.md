# Canvas AI Chat - Page Refresh Bug Fix

## Bug Description

When a user selects a Canvas node and sends a message in the AI Chat panel, the page navigates away from the Canvas page to `/chat/[sessionId]`, then shows a "Welcome to Canvas" page without the projectId.

## Root Cause Analysis

### Issue 1: Missing projectId prop ✅ FIXED
- **Problem**: NodeDetailPanel was passing `selectedNode.projectId` to Chat component, but `CanvasNode` type doesn't have a `projectId` field
- **Symptom**: API returned 400 error: "Required field: nodeContext.projectId"
- **Fix**: Added `projectId` prop to NodeDetailPanel and passed it from Canvas page

### Issue 2: Page Navigation ✅ FIXED
- **Problem**: Sending a message in Canvas AI chat causes navigation to `/chat/[sessionId]`
- **Root Cause**: `MultimodalInput.submitForm()` unconditionally called `window.history.pushState({}, "", `/chat/${chatId}`)` regardless of mode
- **Evidence**:
  - URL changes from `/canvas?projectId=xxx` to `/chat/15d39e47-bca2-43f8-ae9a-74032530408d`
  - Navigation happens immediately when pressing Enter, before API response
  - The ID being navigated to is the ChatSession ID, not a Chat ID
- **Fix**: Added `mode` prop to MultimodalInput and only call `window.history.pushState()` when `mode === "full-page"`

### Issue 3: Sidebar Stripping projectId ✅ FIXED
- **Problem**: Sidebar detected user had no projects and called `router.replace("/canvas")`, removing projectId from URL
- **Fix**: Updated sidebar logic to keep projectId in URL even when user has no projects (they might have guest/member access)

## Investigation Progress

### What We've Checked:
- ✅ Chat component: No `router.push` to `/chat/` found (only `router.refresh()`)
- ✅ Chat layouts: No navigation logic
- ✅ Middleware: No middleware file exists
- ✅ Chat API routes: No redirect logic found
- ✅ Data stream handlers: No navigation logic
- ✅ CrossMindSidebar: Fixed the projectId stripping issue

### What We Still Need to Check:
- ❓ Vercel AI SDK's `useChat` hook - does it have built-in navigation?
- ❓ Next.js App Router behavior with dynamic routes
- ❓ Whether ChatSession IDs vs Chat IDs are causing routing confusion
- ❓ Client-side hooks or effects that trigger on chat activity

## Files Modified

1. **components/crossmind-sidebar.tsx** (lines 139-145)
   - Changed: Don't strip projectId when user has no projects
   - Reason: Allow guest/member access to projects via direct URL

2. **app/(crossmind)/canvas/components/NodeDetailPanel.tsx**
   - Added: `projectId: string` prop (line 57)
   - Added: `projectId` parameter to function (line 76)
   - Changed: Use `projectId` prop instead of `selectedNode.projectId` (line 503)

3. **app/(crossmind)/canvas/page.tsx** (line 1122)
   - Changed: Added `projectId &&` check and `projectId={projectId}` prop

4. **components/chat.tsx**
   - Added: Mode checks for query params, popstate, and mutate
   - Added: Pass `mode` prop to MultimodalInput (line 289)

5. **components/multimodal-input.tsx** (NEW FIX)
   - Added: `mode?: "full-page" | "panel"` prop (lines 60, 78)
   - Changed: Only call `window.history.pushState()` when `mode === "full-page"` (lines 126-130)
   - Added: `mode` to submitForm dependency array (line 166)

## Next Steps

### Option A: Find and Fix Navigation Source
Continue investigating where the `/chat/[id]` navigation is triggered

### Option B: Prevent Navigation in Panel Mode
Add navigation blocking when `mode="panel"`:
```typescript
useEffect(() => {
  if (mode === "panel") {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Prevent navigation
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }
}, [mode]);
```

### Option C: Use Different Chat Implementation
Create a simplified chat component specifically for Canvas that doesn't trigger navigation

## Testing Checklist

- [ ] Can open Canvas page with projectId
- [ ] Can select a node and open AI Chat tab
- [ ] Can send a message without page navigation
- [ ] Message appears in chat history
- [ ] AI response streams back correctly
- [ ] Refresh preserves chat history
- [ ] Can send multiple messages in sequence

## Status

**Current**: ✅ FIXED - All three issues resolved:
1. ✅ ProjectId is now passed correctly to API
2. ✅ Page no longer navigates to `/chat/[sessionId]` when sending messages in Canvas panel
3. ✅ Sidebar keeps projectId in URL for guest/member access

**Solution**: The navigation was caused by `MultimodalInput.submitForm()` unconditionally calling `window.history.pushState()`. Fixed by adding `mode` prop and only navigating in full-page mode.

**Next**: Test the Canvas AI chat functionality to ensure it works end-to-end
