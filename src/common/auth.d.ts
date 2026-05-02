export interface User {
  username: string;
  password?: string;
}

export interface AuthResponse {
  user: User;
  error: string;
  success: string;
}
