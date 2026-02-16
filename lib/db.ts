import { sql } from '@vercel/postgres';
import { Event } from '@/types';

export { sql };

export async function getEventById(id: number, userId: number): Promise<Event | null> {
  const result = await sql`
    SELECT * FROM events
    WHERE id = ${id} AND created_by = ${userId}
  `;
  return (result.rows[0] as Event) || null;
}

export async function getEventsByUser(userId: number) {
  const result = await sql`
    SELECT id, title, description, event_date, location, created_at, updated_at
    FROM events
    WHERE created_by = ${userId}
    ORDER BY updated_at DESC
  `;
  return result.rows;
}

export async function createEvent(
  title: string,
  userId: number,
  description?: string,
  eventDate?: string,
  location?: string
) {
  const result = await sql`
    INSERT INTO events (title, description, event_date, location, created_by, seating_data)
    VALUES (${title}, ${description || null}, ${eventDate || null}, ${location || null}, ${userId}, '{"tables":[],"guests":[],"objects":[],"floorSize":{"width":1200,"height":800},"zoom":1}')
    RETURNING *
  `;
  return result.rows[0];
}

export async function updateEvent(
  id: number,
  userId: number,
  updates: {
    title?: string;
    description?: string;
    event_date?: string;
    location?: string;
    seating_data?: object;
  }
) {
  const event = await getEventById(id, userId);
  if (!event) return null;

  const result = await sql`
    UPDATE events
    SET
      title = COALESCE(${updates.title || null}, title),
      description = COALESCE(${updates.description || null}, description),
      event_date = COALESCE(${updates.event_date || null}, event_date),
      location = COALESCE(${updates.location || null}, location),
      seating_data = COALESCE(${updates.seating_data ? JSON.stringify(updates.seating_data) : null}::jsonb, seating_data),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ${id} AND created_by = ${userId}
    RETURNING *
  `;
  return result.rows[0];
}

export async function deleteEvent(id: number, userId: number) {
  const result = await sql`
    DELETE FROM events
    WHERE id = ${id} AND created_by = ${userId}
    RETURNING id
  `;
  return result.rows[0] || null;
}

export async function getUserByEmail(email: string) {
  const result = await sql`
    SELECT * FROM users WHERE email = ${email}
  `;
  return result.rows[0] || null;
}

export async function createUser(email: string, hashedPassword: string, name?: string) {
  const result = await sql`
    INSERT INTO users (email, password, name)
    VALUES (${email}, ${hashedPassword}, ${name || null})
    RETURNING id, email, name, created_at
  `;
  return result.rows[0];
}
