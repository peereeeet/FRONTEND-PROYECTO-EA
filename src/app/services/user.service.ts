import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { map, Observable, Subject } from 'rxjs';
import { User, ChatMessage, EventChatMessage  } from '../models/user.model';
import { environment } from '../environments/environment';

export interface Page<T> {
  data: T[];
  page: number;
  totalPages: number;
  totalItems: number;
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private apiUrl = environment.apiBaseUrl + '/user';

  constructor(private http: HttpClient) {}

  getUsers(page = 1, limit = 20, q = ''): Observable<Page<User>> {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      ...(q ? { q } : {})
    }).toString();
    return this.http.get<Page<User>>(`${this.apiUrl}?${params}`);
  }

  getVisibleUsers(page = 1, limit = 10, q = ''): Observable<Page<User>> {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      ...(q ? { q } : {})
    }).toString();
    return this.http.get<Page<User>>(`${this.apiUrl}/visibleusers?${params}`);
  }

  getUserById(id: string): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/${id}`);
  }

  getUserEvents(userId: string) {
    return this.http.get<any>(`${this.apiUrl}/${userId}/events`);
  }

  getUserDetail(userId: string): Observable<User>  {
    return this.http.get<User>(`${this.apiUrl}/detail/${userId}`);
  }

  addUser(user: User): Observable<User> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.post<User>(this.apiUrl, user, { headers });
  }

  updateUser(user: User): Observable<User> {
    if (!user._id) throw new Error('Falta _id del usuario a actualizar');
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.put<User>(`${this.apiUrl}/${user._id}`, user, { headers });
  }

  deleteAccountWithPassword(id: string, password: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${id}/delete-with-password`, { password });
  }

  updateMe(id: string, patch: Partial<User & { password?: string }>) {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.put<{ ok: boolean; user: User }>(`${this.apiUrl}/${id}/self`, patch, { headers });
  }

  uploadProfilePhoto(userId: string, file: File): Observable<{ ok: boolean; profilePhoto: string; user: User }> {
    const formData = new FormData();
    formData.append('photo', file);
    
    return this.http.post<{ ok: boolean; profilePhoto: string; user: User }>(
      `${this.apiUrl}/${userId}/profile-photo`,
      formData
    );
  }

  deleteProfilePhoto(userId: string): Observable<{ ok: boolean; message: string }> {
    return this.http.delete<{ ok: boolean; message: string }>(
      `${this.apiUrl}/${userId}/profile-photo`
    );
  }

  checkUserExistsForReset(identifier: string) {
    return this.http.post<void>(`${this.apiUrl}/usuarios/forgot-password/check`, { emailOrUsername: identifier });
  }

  directResetPassword(userId: string, newPassword: string) {
    return this.http.post<void>(`${this.apiUrl}/usuarios/reset-password/direct`, { userId, newPassword });
  }

  disableUser(id: string): Observable<User> {
    return this.http.patch<User>(`${this.apiUrl}/${id}/disable`, { disabled: true });
  }

  addEventToUser(userId: string, eventId: string): Observable<User> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.put<User>(`${this.apiUrl}/${userId}/addEvent`, { eventId }, { headers });
  }

  checkEmailExists(gmail: string, userId?: string): Observable<{ exists: boolean }> {
    const body = userId ? { gmail, userId } : { gmail };
    return this.http.post<{ exists: boolean }>(`${this.apiUrl}/check-email`, body);
  }

  checkUsernameExists(username: string, userId?: string): Observable<{ exists: boolean }> {
    const body = userId ? { username, userId } : { username };
    return this.http.post<{ exists: boolean }>(`${this.apiUrl}/check-username`, body);
  }

  updateUserRole(id: string, rol: 'admin' | 'usuario'): Observable<User> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.put<User>(`${this.apiUrl}/${id}/rol`, { rol }, { headers });
  }

  heartbeat(userId: string): Observable<{ ok: boolean; online: boolean }> {
    return this.http.post<{ ok: boolean; online: boolean }>(`${this.apiUrl}/${userId}/heartbeat`, {});
  }

  setOnline(userId: string): Observable<{ ok: boolean; online: boolean }> {
    return this.http.put<{ ok: boolean; online: boolean }>(`${this.apiUrl}/${userId}/online`, { online: true });
  }

  setOffline(userId: string): Observable<{ ok: boolean; online: boolean }> {
    return this.http.put<{ ok: boolean; online: boolean }>(`${this.apiUrl}/${userId}/offline`, { online: false });
  }

  listFriends(id: string, page = 1, limit = 20, q = ''): Observable<Page<User>> {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      ...(q ? { q } : {})
    }).toString();
    return this.http.get<Page<User>>(`${this.apiUrl}/${id}/friends?${params}`);
  }

  sendFriendRequest(id: string, targetId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/friend-request`, { id, targetId });
  }

  acceptFriendRequest(id: string, requesterId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/friend-accept`, { id, requesterId });
  }

  rejectFriendRequest(id: string, requesterId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/friend-reject`, { id, requesterId });
  }

  getFriendRequests(id: string): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/friend-requests/${id}`);
  }

  getSentRequests(id: string) {
    return this.http.get<{ ok: boolean; data: any[] }>(
      `${this.apiUrl}/${id}/requests/sent`
    );
  }

  removeFriend(id: string, friendId: string) {
    return this.http.delete<{ ok: boolean }>(`${this.apiUrl}/${id}/friends/${friendId}`);
  }

  private friendsBus = new Subject<void>();
  notifyFriendsChanged(): void { 
    this.friendsBus.next(); 
  }

  onFriendsChanged() { 
    return this.friendsBus.asObservable(); 
  }

  getChatWithFriend(myId: string, friendId: string) {
    return this.http.get<ChatMessage[]>(`${this.apiUrl}/${myId}/chat/${friendId}`);
  }

  saveChatMessage(myId: string, friendId: string, text: string) {
    return this.http.post<ChatMessage>(`${this.apiUrl}/${myId}/chat/${friendId}`, { text });
  }

  getEventChat(eventId: string) {
    return this.http.get<EventChatMessage[]>(`${this.apiUrl}/events/${eventId}/chat`);
  }

  postEventChatMessage(eventId: string, userId: string, username: string, text: string) {
    return this.http.post<EventChatMessage>(`${this.apiUrl}/events/${eventId}/chat`, {
      userId,
      username,
      text
    });
  }

  blockUser(userId: string, blockId: string): Observable<{ ok: boolean; message: string }> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.post<{ ok: boolean; message: string }>(
      `${this.apiUrl}/info/block`,
      { id: userId, blockId },
      { headers }
    );
  }

  unblockUser(userId: string, unblockId: string): Observable<{ ok: boolean; message: string }> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    return this.http.post<{ ok: boolean; message: string }>(
      `${this.apiUrl}/info/unblock`,
      { id: userId, unblockId },
      { headers }
    );
  }

  getBlockedUsers(userId: string): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/${userId}/blocked`);
  }

  uploadChatImage(userId: string, friendId: string, file: File): Observable<{ ok: boolean; imageUrl: string }> {
    const formData = new FormData();
    formData.append('image', file);
    
    return this.http.post<{ ok: boolean; imageUrl: string }>(
      `${this.apiUrl}/${userId}/chat/${friendId}/image`,
      formData
    );
  }

  deleteChatMessage(messageId: string): Observable<{ message: string; messageId: string; deletedImage: boolean }> {
    return this.http.delete<{ message: string; messageId: string; deletedImage: boolean }>(
      `${this.apiUrl}/chat/${messageId}`
    );
  }
}