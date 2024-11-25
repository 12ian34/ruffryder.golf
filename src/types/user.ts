export interface User {
  id: string;
  email: string;
  name: string;
  profilePicUrl?: string;
  isAdmin: boolean;
  linkedPlayerId: string | null;
  team: 'USA' | 'EUROPE' | null;
  createdAt: any; // Firestore Timestamp
}