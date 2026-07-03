import type { User } from '@/lib/contracts/user';
import { UserCard } from '@/components/user-card';

type UsersGridProps = {
  users: User[];
};

export function UsersGrid({ users }: UsersGridProps) {
  if (users.length === 0) {
    return (
      <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
        No users are available yet. Start the backend and refresh to load the
        API contract.
      </div>
    );
  }

  return (
    <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {users.map((user) => (
        <UserCard key={user.id} user={user} />
      ))}
    </div>
  );
}
