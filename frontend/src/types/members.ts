/* A person who can be assigned work. Shared by requests and tasks — both need
   to name someone, and neither owns the concept. Stands in for a users listing;
   no endpoint returns one yet. */
export interface Member {
  id: number;
  name: string;
  port: string;
}
