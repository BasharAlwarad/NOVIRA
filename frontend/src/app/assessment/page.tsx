import type { Metadata } from 'next';
import { AssessmentProvider } from '@/context/AssessmentProvider';
import { AssessmentWizard } from '@/components/assessment/AssessmentWizard';
import { SiteFooter } from '@/components/site-footer';
import { SiteNav } from '@/components/site-nav';

export const metadata: Metadata = {
  title: 'Free Assessment',
  description:
    'Answer a few questions about your background and goals to see how your profile fits studying, training, or working in Germany.',
};

export default function AssessmentPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <SiteNav />
      <section className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <AssessmentProvider>
          <AssessmentWizard />
        </AssessmentProvider>
      </section>
      <SiteFooter />
    </main>
  );
}
