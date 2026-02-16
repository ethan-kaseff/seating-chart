'use client';

import { useCallback } from 'react';
import { Event, SeatingData } from '@/types';
import SeatingChart from '@/components/SeatingChart';

interface SeatingChartWrapperProps {
  event: Event;
}

export default function SeatingChartWrapper({ event }: SeatingChartWrapperProps) {
  const handleSave = useCallback(
    async (data: SeatingData) => {
      const res = await fetch(`/api/events/${event.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seating_data: data }),
      });

      if (!res.ok) {
        console.error('Failed to save');
      }
    },
    [event.id]
  );

  return <SeatingChart event={event} onSave={handleSave} />;
}
