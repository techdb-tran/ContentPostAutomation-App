# Design System

## Color Palette

### Primary
- primary-50:  #eff6ff
- primary-500: #3b82f6   ← màu chính của brand
- primary-600: #2563eb   ← hover state
- primary-700: #1d4ed8   ← active state

### Neutral
- neutral-50:  #f9fafb   ← background trang
- neutral-100: #f3f4f6   ← background card
- neutral-200: #e5e7eb   ← border
- neutral-600: #4b5563   ← text phụ
- neutral-900: #111827   ← text chính

### Semantic
- success: #10b981
- warning: #f59e0b
- error:   #ef4444

## Typography

- font-family: Inter, system-ui, sans-serif
- Heading 1: text-2xl font-bold text-neutral-900
- Heading 2: text-xl font-semibold text-neutral-900
- Body:      text-sm text-neutral-600
- Caption:   text-xs text-neutral-500

## Spacing (dùng Tailwind scale)

- Padding card:    p-6
- Gap giữa items:  gap-4
- Margin section:  mb-8
- Border radius:   rounded-lg (KHÔNG dùng rounded-xl hoặc rounded-full)

## Button

```tsx
// Primary
<button className="px-4 py-2 bg-primary-500 hover:bg-primary-600
  text-white text-sm font-medium rounded-lg transition-colors">

// Secondary  
<button className="px-4 py-2 border border-neutral-200
  hover:bg-neutral-100 text-neutral-700 text-sm rounded-lg">

// Danger
<button className="px-4 py-2 bg-error hover:bg-red-600
  text-white text-sm rounded-lg">
```

## Form Input

```tsx
<input className="w-full px-3 py-2 border border-neutral-200
  rounded-lg text-sm focus:outline-none focus:ring-2
  focus:ring-primary-500 focus:border-transparent" />
```

## Card

```tsx
<div className="bg-white border border-neutral-200 rounded-lg p-6">
```

KHÔNG dùng shadow-lg, shadow-xl — project này không dùng shadow nặng.
