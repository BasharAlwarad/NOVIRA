'use client';

import { useEffect, useState, type ReactNode } from 'react';

interface QuestionTransitionProps {
  transitionKey: string;
  children: ReactNode;
}

export function QuestionTransition({
  transitionKey,
  children,
}: QuestionTransitionProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setIsVisible(true));

    return () => window.cancelAnimationFrame(frame);
  }, [transitionKey]);

  return (
    <div
      key={transitionKey}
      className={[
        'will-change-transform transition-all duration-300 ease-out motion-reduce:transition-none',
        isVisible
          ? 'translate-y-0 opacity-100 scale-100'
          : 'translate-y-3 opacity-0 scale-[0.985]',
      ].join(' ')}
    >
      {children}
    </div>
  );
}
