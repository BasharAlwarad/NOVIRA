import type { User } from '@/lib/contracts/user';

type UserCardProps = {
  user: User;
};

export function UserCard({ user }: UserCardProps) {
  return (
    <article className="card border border-slate-200 bg-slate-50 shadow-sm transition-transform duration-200 hover:-translate-y-1 hover:shadow-lg">
      <div className="card-body gap-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="card-title text-slate-900">{user.name}</h3>
            <p className="text-sm text-slate-500">{user.email}</p>
          </div>
          <div className="badge badge-outline badge-success border-emerald-300 text-emerald-700">
            {user.status}
          </div>
        </div>

        <div className="space-y-3 text-sm text-slate-600">
          <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3">
            <span>Role</span>
            <span className="font-medium text-slate-900">{user.role}</span>
          </div>
          <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3">
            <span>Department</span>
            <span className="font-medium text-slate-900">
              {user.department}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}
