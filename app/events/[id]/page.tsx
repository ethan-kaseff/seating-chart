import { notFound } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { getEventById } from '@/lib/db';
import SeatingChartWrapper from './SeatingChartWrapper';

export default async function EventPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();
  const event = await getEventById(
    parseInt(params.id),
    parseInt(session!.user!.id!)
  );

  if (!event) {
    notFound();
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Back link */}
      <div className="absolute top-3 left-4 z-10">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 bg-white px-3 py-1.5 rounded-lg shadow-sm"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          <span className="text-sm">Dashboard</span>
        </Link>
      </div>

      <SeatingChartWrapper event={event} />
    </div>
  );
}
