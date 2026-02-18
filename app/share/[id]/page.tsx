import { notFound } from 'next/navigation';
import { getEventByIdPublic } from '@/lib/db';
import ShareView from './ShareView';

export default async function SharePage({
  params,
}: {
  params: { id: string };
}) {
  const event = await getEventByIdPublic(parseInt(params.id));

  if (!event) {
    notFound();
  }

  return <ShareView event={event} />;
}
