import { UsersPage } from '@/components/users-page';
import { defaultApiBaseUrl, fetchUsers } from '@/lib/api/users';
import type { User } from '@/lib/contracts/user';

export default async function Home() {
  let users: User[] = [];
  let errorMessage = '';

  try {
    users = await fetchUsers();
  } catch {
    errorMessage =
      'The backend is not available yet. Start the ASP.NET API to see live users here.';
  }

  return (
    <UsersPage
      users={users}
      errorMessage={errorMessage}
      apiBaseUrl={defaultApiBaseUrl}
    />
  );
}
