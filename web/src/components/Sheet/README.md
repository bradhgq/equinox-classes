# Sheet/

- `Sheet.tsx`: modal container. A bottom sheet on phones, a centered dialog on tablets, a dialog or right drawer on desktop. Focus trap, Esc, scrim click, scroll lock. On close, focus returns to the opener, or to the element
  with the opener's `data-focus-key` (or `returnFocusKey`) if it re-rendered or never took focus (Safari
  taps). `fit` sizes the phone sheet to its content; `toast` shows a toast inside, above the footer.
