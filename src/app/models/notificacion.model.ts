export interface Notificacion {
  _id: string;
  userId: string;
  type: 
    | 'friend_request' 
    | 'friend_accepted' 
    | 'event_join' 
    | 'event_reminder' 
    | 'new_message' 
    | 'event_spot_available'
    | 'event_invitation';
  title: string;
  message: string;
  relatedUserId?: string;
  relatedEventId?: string;
  relatedUsername?: string;
  relatedEventName?: string;
  read: boolean;
  createdAt: string;
  actionUrl?: string;
}