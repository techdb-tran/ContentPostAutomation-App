# Component Patterns

## Data Table

Dùng pattern sau cho mọi table trong project:

```tsx
// Luôn có: header actions, search, filter, pagination
// Loading: skeleton rows thay vì spinner
// Empty: illustration + message + action button
// Error: retry button

interface TableProps<T> {
  data: T[]
  columns: Column<T>[]
  isLoading: boolean
  pagination: PaginationMeta
  onPageChange: (page: number) => void
}
```

## Form

- Dùng React Hook Form + Zod validation
- Error message hiện dưới field, màu error (#ef4444)
- Submit button disabled khi đang loading
- Toast notification sau khi submit thành công/thất bại

## Modal

- Backdrop blur nhẹ: backdrop-blur-sm
- Max width: max-w-lg
- Luôn có X button ở góc phải
- Trap focus khi modal mở

## Dashboard Stats Card

```tsx
// Pattern: icon + label + value + trend
<div className="bg-white border border-neutral-200 rounded-lg p-6">
  <div className="flex items-center justify-between mb-4">
    <span className="text-sm text-neutral-600">{label}</span>
    <Icon className="w-4 h-4 text-neutral-400" />
  </div>
  <p className="text-2xl font-bold text-neutral-900">{value}</p>
  <p className="text-xs text-success mt-1">+{trend}% so với tháng trước</p>
</div>
```
