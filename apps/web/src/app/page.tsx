import { Dashboard } from '@/components/dashboard';
import { api } from '@/lib/api';

export default async function Page() {
  const [companies, health] = await Promise.all([
    api.companies().catch(() => []),
    api.health().catch(() => ({ status: 'unreachable', usesFixtures: true })),
  ]);

  return <Dashboard companies={companies} usesFixtures={health.usesFixtures} />;
}
