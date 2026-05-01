import $ from 'jquery';
import { connectSocket, socket } from './socket.ts';

import type { Room } from '../common/game-room';
import type { Player } from '../common/game-room';

interface User {
  username: string;
}

interface Res {
  user: User;
  error: string;
  success: string;
}

// type Screen = 'login' | 'start-menu' | 'game-room' | 'gaming';

// export const ScreenState = {
//   get(): Screen {
//     return (sessionStorage.getItem('screen') as Screen | null) ?? 'login';
//   },
//   set(s: Screen): void {
//     sessionStorage.setItem('screen', s);
//   },
//   clear(): void {
//     sessionStorage.removeItem('screen');
//   },
// };

let currentRoom: Room | null = null;

//Authentication
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
    console.log(json);

    fetch('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: json,
    })
      .then((res) => res.json() as Promise<Res>)
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
      .then((res) => res.json() as Promise<Res>)
      .then((json) => {
        if (json.error) {
          onError(json.error);
          return;
        }
        if (json.success) onSuccess();
      })
      .catch((err: unknown) => {
        console.error(err);
      });
  };

  const signout = (onSuccess: () => void, onError: (err: string) => void) => {
    fetch('/signout', {
      method: 'GET',
    })
      .then((res) => res.json() as Promise<Res>)
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
      });
  };

  const validate = (onSuccess: () => void, onError: (err: string) => void) => {
    fetch('/validate', {
      method: 'GET',
    })
      .then((res) => res.json() as Promise<Res>)
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
      });
  };

  return { getUser, signin, signup, signout, validate };
})();

//UI

function generatePlayerLabel(
  player: Player | undefined,
  currentUsername: string,
) {
  if (!player) {
    return 'Waiting for player...';
  }

  return `${player.username === currentUsername ? 'You' : player.username}${player.ready ? ' (Ready)' : ''}`;
}

export function initializeUI() {
  socket.on('roomUpdate', (room: Room) => {
    currentRoom = room;

    // Should not be null at this point, but just in case
    const currentUsername = Authentication.getUser()?.username ?? '';

    console.log('Received roomUpdate for room', room);

    $('#player1-label').text(
      generatePlayerLabel(room.players[0], currentUsername),
    );
    $('#player2-label').text(
      generatePlayerLabel(room.players[1], currentUsername),
    );
  });

  socket.on('gameStart', () => {
    $('#game-room-container').addClass('hidden').removeClass('flex');
    $('#game-container').removeClass('hidden');

    import('./game.ts')
      .then(({ initializeGame }) => {
        initializeGame();
      })
      .catch((error: unknown) => {
        console.error('Error loading game module:', error);
      });
  });

  const messageElements = $('.message');

  $('#login-btn').on('click', (e) => {
    e.preventDefault();

    const username = String($('#username').val() ?? '').trim();
    const password = String($('#pwd').val() ?? '').trim();

    if (!username || !password) {
      messageElements.text('password/username cannot be empty!');
      return;
    }

    Authentication.signin(
      username,
      password,
      () => {
        ($('#login-form').get(0) as HTMLFormElement).reset();
        messageElements.text('');
        $('#login-form').addClass('hidden').removeClass('flex');
        $('#start-menu').removeClass('hidden').addClass('flex');
        // ScreenState.set('start-menu');
        // messageElement.text('play得!');
        connectSocket(username);
      },
      (err) => {
        messageElements.text(err);
      },
    );
  });

  $('#reg-btn').on('click', (e) => {
    e.preventDefault();
    const username = String($('#reg-username').val() ?? '').trim();
    const password = String($('#reg-pwd').val() ?? '').trim();
    const verifyPassword = String($('#ver-pwd').val() ?? '').trim();

    if (password !== verifyPassword) {
      messageElements.text('Passwords do not match!');
      return;
    }

    Authentication.signup(
      username,
      password,
      () => {
        ($('#register-form').get(0) as HTMLFormElement).reset();
        messageElements.text('');
        $('#register-form').addClass('hidden').removeClass('flex');
        $('#login-form').removeClass('hidden').addClass('flex');
      },
      (err) => {
        messageElements.text(err);
      },
    );
  });

  $('#btn-logout').on('click', (e) => {
    e.preventDefault();
    Authentication.signout(
      () => {
        $('#start-menu').addClass('hidden').removeClass('flex');
        $('#login-form').removeClass('hidden').addClass('flex');
        // $('#img-bg').attr('src', 'asset/background.png');
        // ScreenState.set('login');
        socket.disconnect();
      },
      (err) => {
        messageElements.text(err);
      },
    );
  });

  $('#btn-start').on('click', (e) => {
    e.preventDefault();
    $('#home-container').addClass('hidden').removeClass('flex');
    $('#game-room-container').removeClass('hidden').addClass('flex');
    socket.emit('start', null, (room: Room) => {
      const currentUsername = Authentication.getUser()?.username ?? '';

      currentRoom = room;

      $('#player1-label').text(
        generatePlayerLabel(room.players[0], currentUsername),
      );
      $('#player2-label').text(
        generatePlayerLabel(room.players[1], currentUsername),
      );

      $('#room-number').text(room.roomId.toString());
    });
  });

  $('#ready-button').on('click', (e) => {
    e.preventDefault();
    console.log(socket.connected);
    socket.emit('ready', currentRoom?.roomId.toString());
    console.log(currentRoom?.roomId);
  });

  $('#leave-room-button').on('click', (e) => {
    e.preventDefault();
    $('#home-container').removeClass('hidden').addClass('flex');
    $('#game-room-container').addClass('hidden').removeClass('flex');
    socket.emit('leaveRoom', currentRoom?.roomId.toString(), () => {
      currentRoom = null;
    });
  });

  $('#register-link').on('click', (e) => {
    e.preventDefault();
    messageElements.text('');
    $('#login-form').addClass('hidden').removeClass('flex');
    $('#register-form').removeClass('hidden').addClass('flex');
  });

  $('#login-link').on('click', (e) => {
    e.preventDefault();
    messageElements.text('');
    $('#register-form').addClass('hidden').removeClass('flex');
    $('#login-form').removeClass('hidden').addClass('flex');
  });

  Authentication.validate(
    () => {
      const user = Authentication.getUser();
      // const screen = ScreenState.get();
      if (user) {
        connectSocket(user.username);

        $('#start-menu').removeClass('hidden').addClass('flex');
        $('#login-form').addClass('hidden').removeClass('flex');
      }

      console.log('Welcome back', Authentication.getUser()?.username);
    },
    () => {
      $('#login-form').removeClass('hidden').addClass('flex');
      console.log('validate failed');
    },
  );
}
