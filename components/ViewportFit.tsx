'use client';

// Makes the layout aware of the on-screen keyboard.
//
// A phone keyboard does not resize the page. It covers it. `100vh` keeps
// reporting the full screen height, the browser keeps believing it has 800px to
// lay out in, and the bottom third of the app ends up underneath the keyboard.
// On the contribute pages that bottom third is the textarea, so contributors
// were typing into a box they could not see. That is the bug this exists for.
//
// `visualViewport` is the only API that reports what is actually visible. Two
// things are published from it:
//
//   --vvh            the visible height in pixels, for anything that needs to
//                    size itself to the real viewport rather than the imagined
//                    one. `dvh` handles most cases now, but not the fixed
//                    full-screen focus editor, which has to be exact.
//   data-keyboard    "open" while the keyboard is up, so CSS can get the fixed
//                    tab bar out of the way and let the editor shrink.
//
// Everything degrades to today's behaviour where `visualViewport` is missing.

import { useEffect } from 'react';

// Pull a focused field into the space the keyboard leaves.
//
// Browsers do this themselves, but they decide where to scroll at the moment of
// focus, which is before the keyboard has finished animating in and therefore
// against the old viewport height. On Android that regularly leaves the field
// exactly where it was, under the keyboard. Waiting for the animation and
// asking again costs nothing and is the difference between seeing your words
// and not.
export function keepFieldVisible(el: HTMLElement | null) {
  if (!el) return;
  window.setTimeout(() => {
    const vv = window.visualViewport;
    if (!vv) {
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      return;
    }

    // `scrollIntoView` centres within the *layout* viewport, which is the one
    // that pretends the keyboard is not there, so on a phone it happily centres
    // the box behind the keyboard. The visible band has to be measured and
    // scrolled to directly.
    const r = el.getBoundingClientRect();
    const top = vv.offsetTop;
    const bottom = vv.offsetTop + vv.height;
    const margin = 12;

    // Prefer showing the bottom of the box, because that is where the caret is
    // while you type. A field taller than the visible band gets its bottom
    // edge, not its top.
    if (r.bottom > bottom - margin) {
      window.scrollBy({ top: r.bottom - bottom + margin, behavior: 'smooth' });
    } else if (r.top < top + margin) {
      window.scrollBy({ top: r.top - top - margin, behavior: 'smooth' });
    }
  }, 320);
}

// The keyboard takes at least a quarter of the screen on any phone, and no
// browser chrome change comes close to that. Anything smaller is address bar
// collapse, which must not be mistaken for a keyboard.
const KEYBOARD_RATIO = 0.75;

export default function ViewportFit() {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const root = document.documentElement;

    const sync = () => {
      root.style.setProperty('--vvh', `${Math.round(vv.height)}px`);

      // Compared against the layout viewport, not a remembered "full" height.
      // A remembered value is wrong the moment the phone is rotated.
      const open = vv.height < root.clientHeight * KEYBOARD_RATIO;
      if (open) root.setAttribute('data-keyboard', 'open');
      else root.removeAttribute('data-keyboard');
    };

    sync();
    vv.addEventListener('resize', sync);
    // Scroll too: iOS shifts the visual viewport without firing resize when the
    // page is scrolled with the keyboard already up.
    vv.addEventListener('scroll', sync);

    return () => {
      vv.removeEventListener('resize', sync);
      vv.removeEventListener('scroll', sync);
      root.removeAttribute('data-keyboard');
      root.style.removeProperty('--vvh');
    };
  }, []);

  return null;
}
