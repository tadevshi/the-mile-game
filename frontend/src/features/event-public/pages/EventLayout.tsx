import { useParams } from 'react-router-dom';
import { useEventStore } from '@/shared/store/eventStore';
import { ThemeProvider } from '@/shared/theme';

interface EventLayoutProps {
  children: React.ReactNode;
}

export function EventLayout({ children }: EventLayoutProps) {
  const { slug } = useParams<{ slug: string }>();
  const currentEvent = useEventStore((state) => state.currentEvent);

  if (!slug) {
    return <div>Error: No event slug provided</div>;
  }

  return (
    <ThemeProvider eventSlug={slug}>
      <div className="relative min-h-dvh" style={{ backgroundColor: 'var(--color-background)' }}>
        {currentEvent?.name ? (
          <span className="sr-only">{currentEvent.name}</span>
        ) : null}
        <main>{children}</main>
      </div>
    </ThemeProvider>
  );
}
