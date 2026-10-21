# Sleep Transition Feature

## Overview

Khi người chơi nhấn nút "Đi ngủ", thời gian sẽ fast-forward qua 8 tiếng với hiệu ứng fade transition mượt mà trong 10 giây thực tế.

## Implementation

### Components

#### 1. **Store State** (`src/game/state/store.ts`)

Thêm state mới cho sleep transition:

```typescript
sleepTransition: {
  active: boolean;
  startTime: number;      // Timestamp khi bắt đầu sleep
  fromMinutes: number;    // Thời gian game hiện tại
  toMinutes: number;      // Thời gian sau khi ngủ (06:00 ngày hôm sau)
} | null;
```

#### 2. **Sleep Action** (`src/game/state/store.ts`)

Hàm `sleep()` được cập nhật để khởi động transition thay vì nhảy thời gian ngay lập tức:

```typescript
sleep: () => {
  const current = get().totalMinutes;
  if (!canSleepAt(current)) return;
  const result = sleepToNextMorning(current);
  
  // Start sleep transition (10 seconds real time)
  set({
    sleepTransition: {
      active: true,
      startTime: Date.now(),
      fromMinutes: current,
      toMinutes: result.totalMinutes,
    },
  });
}
```

#### 3. **SleepTransition Component** (`src/components/game/SleepTransition.tsx`)

Component xử lý fade effect và time animation:

**Timing:**
- **Total duration:** 10 seconds
- **Fade out:** 0-2 seconds (opacity: 0 → 1)
- **Full black:** 2-8 seconds (opacity: 1)
- **Fade in:** 8-10 seconds (opacity: 1 → 0)

**Animation loop:**
- Sử dụng `requestAnimationFrame` để smooth animation
- Cập nhật `opacity` state để render fade effect
- Cập nhật `totalMinutes` progressively (từ fromMinutes → toMinutes)
- Khi hoàn thành (progress = 1):
  - Fire time events (dayStarted, phaseChanged, hourChanged, sleep)
  - Clear sleepTransition state

### Integration

SleepTransition được thêm vào `GameShell.tsx` như một overlay toàn màn hình:

```tsx
<CharacterIntro />
<SleepTransition />
```

Component này:
- Có `z-index: 9999` để luôn ở trên cùng
- `pointer-events-none` để không block interactions (nếu cần thiết)
- Fixed position để cover toàn bộ viewport
- Black background với animated opacity

## User Experience

1. **Người chơi nhấn nút "Đi ngủ"** (chỉ available vào ban đêm)
2. **Màn hình tối dần** trong 2 giây đầu
3. **Màn hình đen hoàn toàn** trong 6 giây giữa, thời gian game chạy nhanh
4. **Màn hình sáng dần** trong 2 giây cuối, hiện cảnh buổi sáng mới (06:00)
5. **Transition hoàn tất**, player thức dậy vào ngày mới

## Technical Details

### Performance
- Sử dụng `willChange: "opacity"` để optimize GPU acceleration
- `requestAnimationFrame` đảm bảo smooth 60fps animation
- State updates được batched qua Zustand

### Edge Cases
- Nếu user navigate away trong khi sleep transition: animation stops và cleanup
- Multiple sleep calls được prevent bởi `canSleepAt()` check
- Time events chỉ fire một lần khi transition hoàn tất

### Constants

```typescript
const SLEEP_DURATION_MS = 10000;  // 10 seconds total
const FADE_OUT_MS = 2000;         // 2 seconds fade to black
const FADE_IN_MS = 2000;          // 2 seconds fade from black
```

Các constants này có thể được điều chỉnh để thay đổi timing của transition.

## Future Enhancements

Có thể cân nhắc thêm:
- Sound effect khi đi ngủ và thức dậy
- Dream sequences hoặc random events trong khi ngủ
- Skip transition button (nếu user muốn nhảy nhanh)
- Pause game clock trong khi transition (hiện tại vẫn chạy)
- Animation cho character ngủ trong transition
