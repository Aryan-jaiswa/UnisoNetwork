// Auth service for REST API
export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  created_at?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002';

export const authService = {
  async login(data: LoginData): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/api/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Login failed');
    }

    return response.json();
  },

  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/api/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: data.name,
        email: data.email,
        password_hash: data.password // Backend expects password_hash for hashing
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Registration failed');
    }

    const result = await response.json();
    
    // After successful registration, login to get the token
    try {
      const loginResult = await this.login({ email: data.email, password: data.password });
      return loginResult;
    } catch (loginError) {
      // If login fails after registration, still return user info but without token
      console.error('Login after registration failed:', loginError);
      throw new Error('Registration successful, but login failed. Please try logging in manually.');
    }
  },

  async getCurrentUser(): Promise<User> {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No token found');
    }

    const response = await fetch(`${API_BASE_URL}/api/users/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to get current user');
    }

    return response.json();
  },

  async logout(): Promise<void> {
    localStorage.removeItem('token');
    // No need to call backend logout as we're using stateless JWT
  }
};

export default authService;
