---
name: shared-ui-design
description: Thiết kế và implement React component cho project này.
  Dùng khi tạo page mới, build component (form, table, modal, card,
  dashboard), hoặc cần UI nhất quán với design system của project.
  Trigger khi user nói "tạo trang", "build component", "design UI",
  "implement form", hoặc bất kỳ task nào liên quan đến giao diện.
allowed-tools: Read, Write
---

# UI Design Skill

Trước khi viết bất kỳ dòng code nào, đọc `design-system.md`
để hiểu color palette, typography, và spacing của project.

## Nguyên tắc bắt buộc

**Không được làm:**
- Dùng màu hardcoded (`#3b82f6`) — luôn dùng CSS variable hoặc
  Tailwind token từ design system
- Tạo component trông "AI-generated": card với rounded-xl,
  shadow-lg, gradient tím-hồng
- Dùng Lorem ipsum — placeholder text phải realistic
- Bỏ qua loading state và empty state

**Phải làm:**
- Đọc design-system.md trước khi code
- Đọc component-patterns.md để tái dùng pattern có sẵn
- Mỗi component phải có: default state, loading, empty, error
- TypeScript props interface đầy đủ, không dùng `any`
- Responsive: mobile-first với Tailwind breakpoints

## Quy trình khi nhận task UI

1. Đọc design-system.md để nắm tokens
2. Đọc component-patterns.md để tìm pattern tương tự
3. Hỏi nếu chưa rõ: layout phức tạp cần confirm trước khi code
4. Implement với đúng design token
5. Thêm loading, empty, error state

## Stack
- React 18 + TypeScript
- Tailwind CSS (dùng token từ design-system.md, không class tùy tiện)
- TanStack Query cho data fetching
- Zustand cho state nếu cần