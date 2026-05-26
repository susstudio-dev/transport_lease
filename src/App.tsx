import { RouterProvider } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { router } from '@/routes';
import { queryClient } from '@/lib/query-client';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useAuthBootstrap } from '@/hooks/useAuth';

function AppInner() {
  useAuthBootstrap();
  return <RouterProvider router={router} />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AppInner />
        <Toaster richColors closeButton position="top-right" />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
