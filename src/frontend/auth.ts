import type { User, AuthResponse } from '../common/auth';

export const Authentication = (function () {
  let user: User | null = null;

  const getUser = () => {
    return user;
  };

  const signin = (
    username: string,
    password: string,
    onSuccess: () => void,
    onError: (err: string) => void,
  ) => {
    const json = JSON.stringify({ username, password });

    fetch('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: json,
    })
      .then((res) => res.json() as Promise<AuthResponse>)
      .then((json) => {
        if (json.error) {
          onError(json.error);
          return;
        }
        user = json.user;
        onSuccess();
      })
      .catch((err: unknown) => {
        console.error(err);
        onError('An error occurred during sign in. Please try again.');
      });
  };

  const signup = (
    username: string,
    password: string,
    onSuccess: () => void,
    onError: (err: string) => void,
  ) => {
    const json = JSON.stringify({ username, password });

    fetch('/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: json,
    })
      .then((res) => res.json() as Promise<AuthResponse>)
      .then((json) => {
        if (json.error) {
          onError(json.error);
          return;
        }
        if (json.success) onSuccess();
      })
      .catch((err: unknown) => {
        console.error(err);
        onError('An error occurred during sign up. Please try again.');
      });
  };

  const signout = (onSuccess: () => void, onError: (err: string) => void) => {
    fetch('/signout', {
      method: 'GET',
    })
      .then((res) => res.json() as Promise<AuthResponse>)
      .then((json) => {
        if (json.error) {
          onError(json.error);
          return;
        }
        user = null;
        onSuccess();
      })
      .catch((err: unknown) => {
        console.error(err);
        onError('An error occurred during sign out. Please try again.');
      });
  };

  const validate = (onSuccess: () => void, onError: (err: string) => void) => {
    fetch('/validate', {
      method: 'GET',
    })
      .then((res) => res.json() as Promise<AuthResponse>)
      .then((json) => {
        if (json.error) {
          onError(json.error);
          return;
        }
        user = json.user;
        onSuccess();
      })
      .catch((err: unknown) => {
        console.error(err);
        onError('An error occurred during validation. Please try again.');
      });
  };

  return { getUser, signin, signup, signout, validate };
})();
