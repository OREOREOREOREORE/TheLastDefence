export interface User {
  username: string;
}

export interface AuthResponse {
  user: User;
  error: string;
  success: string;
}
