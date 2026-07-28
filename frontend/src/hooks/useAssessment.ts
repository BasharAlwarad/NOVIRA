'use client';

import { useContext } from 'react';
import { AssessmentContext } from '@/context/AssessmentProvider';

export function useAssessment() {
  const context = useContext(AssessmentContext);

  if (!context) {
    throw new Error('useAssessment must be used within an AssessmentProvider.');
  }

  return context;
}
