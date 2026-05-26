import { Menu, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useUiStore } from '@/store/uiStore';
import { useAuth } from '@/hooks/useAuth';
import { useSignOut } from '@/features/auth/hooks';
import { mapSupabaseError } from '@/lib/errors';

export function TopBar() {
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const { profile, user } = useAuth();
  const signOut = useSignOut();

  function handleSignOut() {
    signOut.mutate(undefined, {
      onError: (error) => toast.error(mapSupabaseError(error)),
    });
  }

  return (
    <header className="flex h-14 items-center justify-between border-b bg-card px-4">
      <Button variant="ghost" size="icon" onClick={toggleSidebar} aria-label="Toggle sidebar">
        <Menu className="h-5 w-5" />
      </Button>
      <div className="flex items-center gap-4">
        <div className="text-right text-sm">
          <div className="font-medium">{profile?.fullName ?? user?.email ?? ''}</div>
          {profile && (
            <div className="text-xs capitalize text-muted-foreground">
              {profile.role.replace('_', ' ')}
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleSignOut}
          disabled={signOut.isPending}
          aria-label="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
