/**
 * Haptic / Tactile Feedback Utility for NX Network
 * Provides physical tactile feedback on supported devices during user interactions.
 */

export type HapticPattern = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'selection';

export function triggerHaptic(pattern: HapticPattern | number | number[] = 'light') {
  if (typeof window === 'undefined' || !('navigator' in window) || !navigator.vibrate) {
    return;
  }

  try {
    if (typeof pattern === 'number' || Array.isArray(pattern)) {
      navigator.vibrate(pattern);
      return;
    }

    switch (pattern) {
      case 'light':
      case 'selection':
        navigator.vibrate(10);
        break;
      case 'medium':
        navigator.vibrate(22);
        break;
      case 'heavy':
        navigator.vibrate(40);
        break;
      case 'success':
        navigator.vibrate([15, 30, 20]);
        break;
      case 'warning':
        navigator.vibrate([25, 50, 25]);
        break;
      case 'error':
        navigator.vibrate([40, 60, 40, 60, 40]);
        break;
      default:
        navigator.vibrate(12);
    }
  } catch (e) {
    // Ignore permissions or unsupported hardware failures gracefully
  }
}

/**
 * Initializes global haptic listener that fires subtle vibration
 * when users tap buttons, links, or controls on mobile/touch devices.
 */
export function initGlobalHaptics() {
  if (typeof window === 'undefined') return;

  const handlePointerDown = (e: PointerEvent | MouseEvent | TouchEvent) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;

    const clickable = target.closest('button, a, input[type="submit"], input[type="button"], [role="button"], [data-haptic]');
    if (clickable) {
      const customPattern = clickable.getAttribute('data-haptic') as HapticPattern | null;
      triggerHaptic(customPattern || 'light');
    }
  };

  window.addEventListener('pointerdown', handlePointerDown, { passive: true });
}
