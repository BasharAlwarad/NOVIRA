type UsersOverviewProps = {
  totalUsers: number;
  errorMessage?: string;
};

export function UsersOverview({
  totalUsers,
  errorMessage,
}: UsersOverviewProps) {
  return (
    <section className="-mt-10 rounded-[2rem] border border-slate-200 bg-white px-4 py-6 shadow-xl shadow-slate-200/60 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">
            Users
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Live data from the backend
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
            This list is fetched directly from the ASP.NET API and rendered on
            the home page.
          </p>
        </div>
        <div className="stats stats-vertical border border-slate-200 bg-slate-50 shadow-sm sm:stats-horizontal">
          <div className="stat py-4 sm:py-2">
            <div className="stat-title text-slate-500">Total users</div>
            <div className="stat-value text-slate-900">{totalUsers}</div>
          </div>
          <div className="stat py-4 sm:py-2">
            <div className="stat-title text-slate-500">Source</div>
            <div className="stat-value text-slate-900 text-xl">ASP.NET</div>
          </div>
        </div>
      </div>

      {errorMessage ? (
        <div className="alert alert-warning mt-6 border border-amber-200 bg-amber-50 text-amber-900">
          <span>{errorMessage}</span>
        </div>
      ) : null}
    </section>
  );
}
