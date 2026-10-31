import React, { useLayoutEffect, useRef } from 'react';

const dialogStack = [];
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'iframe',
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function getFocusableElements(dialog) {
  return Array.from(dialog.querySelectorAll(FOCUSABLE_SELECTOR)).filter((element) => (
    !element.hasAttribute('disabled')
    && element.getAttribute('aria-hidden') !== 'true'
    && !element.closest('[inert]')
    && element.getClientRects().length > 0
  ));
}

export default function AccessibleDialog({
  as: Element = 'div',
  ariaLabel,
  ariaLabelledBy,
  onClose,
  children,
  ...props
}) {
  const dialogRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return undefined;

    const previouslyFocused = document.activeElement;
    const inertedSiblings = [];
    let branch = dialog;

    while (branch && branch !== document.body) {
      const parent = branch.parentElement;
      if (!parent) break;

      Array.from(parent.children).forEach((sibling) => {
        if (sibling === branch || !sibling.hasAttribute) return;
        inertedSiblings.push({
          element: sibling,
          hadInert: sibling.hasAttribute('inert'),
          inertValue: sibling.getAttribute('inert'),
        });
        sibling.setAttribute('inert', '');
      });

      branch = parent;
    }

    dialogStack.push(dialog);

    const focusInitialElement = () => {
      const preferred = dialog.querySelector('[data-dialog-autofocus]');
      const focusable = getFocusableElements(dialog);
      (preferred || focusable[0] || dialog).focus();
    };

    const handleKeyDown = (event) => {
      if (dialogStack[dialogStack.length - 1] !== dialog) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current?.();
        return;
      }

      if (event.key !== 'Tab') return;
      const focusable = getFocusableElements(dialog);
      if (focusable.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (!dialog.contains(active)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && (active === first || active === dialog)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    focusInitialElement();

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);

      for (let index = inertedSiblings.length - 1; index >= 0; index -= 1) {
        const { element, hadInert, inertValue } = inertedSiblings[index];
        if (hadInert) element.setAttribute('inert', inertValue ?? '');
        else element.removeAttribute('inert');
      }

      const stackIndex = dialogStack.lastIndexOf(dialog);
      if (stackIndex !== -1) dialogStack.splice(stackIndex, 1);

      if (
        previouslyFocused
        && previouslyFocused !== document.body
        && previouslyFocused.isConnected
        && !previouslyFocused.closest('[inert]')
      ) {
        previouslyFocused.focus();
      } else {
        const previousDialog = dialogStack[dialogStack.length - 1];
        if (previousDialog) previousDialog.focus();
      }
    };
  }, []);

  return (
    <Element
      {...props}
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      tabIndex={props.tabIndex ?? -1}
    >
      {children}
    </Element>
  );
}
