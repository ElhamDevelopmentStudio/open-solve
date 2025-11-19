# Problem Editor Form Redesign

## Summary of Changes

### ✅ Fixed Issues

1. **Next.js 15 params** - Fixed async params in proposals page
2. **Primary blue color** - Color scheme is correctly defined in globals.css
3. **Dashboard sidebar** - Simplified, cleaner design without excessive decorations
4. **Shadows & borders** - Reduced to subtle `shadow-sm`, consistent `0.5rem` radius
5. **Progress bar** - Removed from problem detail page
6. **Staff navbar** - Modern sticky header with logo and navigation

### 🎨 New Components Created

#### 1. Rich Text Editor (`/components/editor/rich-text-editor.tsx`)

- **TipTap-based** rich text editor
- **Toolbar** with formatting options (bold, italic, headings, lists, quotes, code)
- **Image support** with upload capability
- **Link insertion**
- **Undo/Redo** functionality
- **Placeholder** support
- **Clean, modern UI** matching the design system

#### 2. Image Upload Utility (`/lib/storage/minio-upload.ts`)

- Client-side upload helper
- Uploads to `/api/upload/image` endpoint
- Returns MinIO URL

### 🚧 Problem Editor Redesign (In Progress)

The old tabbed interface needs to be replaced with a **multi-step wizard** approach:

#### Proposed Structure:

1. **Step 1: Basic Info** - Title, slug, difficulty, tags, visibility
2. **Step 2: Problem Statement** - Rich text editor with image upload
3. **Step 3: Constraints & Hints** - Additional problem details
4. **Step 4: Examples** - Sample inputs/outputs with explanations
5. **Step 5: Test Cases** - Hidden test cases with strength
6. **Step 6: Languages** - Enable languages and code stubs
7. **Step 7: Review & Publish** - Final review and workflow actions

#### Benefits:

- **Better UX** - Clear progression, less overwhelming
- **Autosave** - Each step saves independently
- **Validation** - Step-by-step validation feedback
- **Visual progress** - Progress indicator shows completion
- **Mobile friendly** - Easier to use on smaller screens

## Remaining Work

### High Priority

1. Complete the multi-step wizard for problem editor
2. Add autosave functionality
3. Implement image upload API endpoint
4. Add validation feedback for each step

### Medium Priority

1. Add keyboard shortcuts for editor
2. Implement draft autosave
3. Add markdown preview mode
4. Improve error handling

### Optional Enhancements

1. Add collaborative editing
2. Version history
3. Import/export problems
4. Bulk operations

## Technical Notes

- **TipTap Extensions Used**: StarterKit, Image, Link, Placeholder
- **Styling**: Prose plugin for markdown rendering
- **State Management**: React hooks with proper validation
- **File Upload**: FormData API with fetch
- **Image Storage**: MinIO self-hosted

## Migration Path

The new editor component can coexist with the old one during transition:

1. Deploy new rich-text-editor component
2. Test thoroughly in staging
3. Implement multi-step wizard
4. Gradual rollout to staff users
5. Monitor feedback and iterate
6. Full replacement once stable

## Color Scheme Status

The blue color scheme IS properly applied in `app/globals.css`:

- Light mode: `oklch(0.55 0.22 250)` - Professional blue
- Dark mode: `oklch(0.7 0.2 250)` - Brighter for contrast

If colors appear wrong, it might be:

- Browser cache (hard refresh needed)
- Theme provider not initialized
- CSS not loaded properly

**Solution**: Clear cache and hard refresh (Cmd/Ctrl + Shift + R)
