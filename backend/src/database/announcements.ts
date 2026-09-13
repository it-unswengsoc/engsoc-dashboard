import { Pool, QueryResult } from 'pg';
import { Announcement, CreateAnnouncementInput } from '../functions/announcements';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.VERCEL ? { rejectUnauthorized: false } : false,
});

const ANNOUNCEMENT_SELECT = `
  SELECT a.id, a.author_id, u.first_name, u.last_name, u.role,
         a.content, a.image_url, a.like_count, a.comment_count, a.created_at,
         EXISTS (
           SELECT 1 FROM announcement_likes al
           WHERE al.announcement_id = a.id AND al.user_id = $1
         ) AS is_liked_by_me
  FROM announcements a
  LEFT JOIN users u ON u.id = a.author_id
`;

/**
 * Maps a raw database row (joined with users) to the Announcement interface,
 * converting snake_case column names to camelCase.
 */
function rowToAnnouncement(row: any): Announcement {
  return {
    id: row.id,
    authorId: row.author_id,
    authorName: row.first_name ? `${row.first_name} ${row.last_name}` : null,
    authorRole: row.role,
    content: row.content,
    imageUrl: row.image_url,
    likeCount: row.like_count,
    isLikedByMe: row.is_liked_by_me,
    commentCount: row.comment_count,
    createdAt: row.created_at,
  };
}

/**
 * Fetches every announcement, newest first, with isLikedByMe computed for
 * currentUserId. Returns an array of Announcement objects (empty array if
 * none exist).
 */
export async function dbGetAllAnnouncements(currentUserId: number): Promise<Announcement[]> {
  const result: QueryResult = await pool.query(
    `${ANNOUNCEMENT_SELECT} ORDER BY a.created_at DESC`,
    [currentUserId]
  );
  return result.rows.map(rowToAnnouncement);
}

/**
 * Fetches a single announcement by its ID, with isLikedByMe computed for
 * currentUserId. Returns the Announcement if found, or null if no row
 * matches.
 */
export async function dbGetAnnouncementById(
  announcementId: number,
  currentUserId: number
): Promise<Announcement | null> {
  const result: QueryResult = await pool.query(
    `${ANNOUNCEMENT_SELECT} WHERE a.id = $2`,
    [currentUserId, announcementId]
  );
  if (result.rows.length === 0) return null;
  return rowToAnnouncement(result.rows[0]);
}

/**
 * Inserts a new announcement row and returns the created Announcement.
 * Returns null if the insert did not produce a row.
 */
export async function dbCreateAnnouncement(input: CreateAnnouncementInput): Promise<Announcement | null> {
  const insertResult: QueryResult = await pool.query(
    `INSERT INTO announcements (author_id, content, image_url, created_at, updated_at)
     VALUES ($1, $2, $3, NOW(), NOW())
     RETURNING id`,
    [input.authorId, input.content, input.imageUrl ?? null]
  );
  if (insertResult.rows.length === 0) return null;
  return dbGetAnnouncementById(insertResult.rows[0].id, input.authorId);
}

/**
 * Deletes the announcement with the given ID (its likes cascade with it).
 * Returns true if a row was deleted, false if no announcement with that ID
 * existed.
 */
export async function dbDeleteAnnouncement(announcementId: number): Promise<boolean> {
  const result: QueryResult = await pool.query(
    `DELETE FROM announcements WHERE id = $1 RETURNING id`,
    [announcementId]
  );
  return (result.rowCount ?? 0) > 0;
}

/**
 * Records that userId likes announcementId and increments the
 * announcement's denormalized like_count. A repeat like from the same user
 * is a no-op (the announcement_likes UNIQUE constraint), and like_count is
 * only bumped when a row was actually inserted. Runs as a transaction so
 * the like row and the counter never drift apart.
 */
export async function dbLikeAnnouncement(announcementId: number, userId: number): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const insertResult = await client.query(
      `INSERT INTO announcement_likes (announcement_id, user_id)
       VALUES ($1, $2)
       ON CONFLICT (announcement_id, user_id) DO NOTHING
       RETURNING id`,
      [announcementId, userId]
    );
    if ((insertResult.rowCount ?? 0) > 0) {
      await client.query(
        `UPDATE announcements SET like_count = like_count + 1 WHERE id = $1`,
        [announcementId]
      );
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Removes userId's like from announcementId and decrements the
 * announcement's denormalized like_count (floored at 0). A user who hadn't
 * liked it is a no-op. Runs as a transaction so the like row and the
 * counter never drift apart.
 */
export async function dbUnlikeAnnouncement(announcementId: number, userId: number): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const deleteResult = await client.query(
      `DELETE FROM announcement_likes WHERE announcement_id = $1 AND user_id = $2 RETURNING id`,
      [announcementId, userId]
    );
    if ((deleteResult.rowCount ?? 0) > 0) {
      await client.query(
        `UPDATE announcements SET like_count = GREATEST(like_count - 1, 0) WHERE id = $1`,
        [announcementId]
      );
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
