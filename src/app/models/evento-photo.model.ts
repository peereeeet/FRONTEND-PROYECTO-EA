export interface EventoPhoto {
  _id: string;
  eventId: string;
  userId: string;
  username: string;
  url: string;
  type: 'image' | 'video';
  createdAt: Date | string;
}