import $ from 'jquery';
import { connectSocket, socket } from './socket.ts';
import { Authentication } from './auth.ts';

import sounds from './music';

import type { Room } from '../common/game-room';
import type { Player } from '../common/game-room';
import type { GameRecord } from '../common/game-record';

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
  let appDestroyCallback: (() => void) | null = null;

  socket.on('roomUpdate', (room: Room) => {
    currentRoom = room;

    // Should not be null at this point, but just in case
    const currentUsername = Authentication.getUser()?.username ?? '';

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
        if (!currentRoom) {
          console.error('No current room found');
          return;
        }

        const roomId = currentRoom.roomId.toString();
        const playerId =
          currentRoom.players[0]?.username ===
          Authentication.getUser()?.username
            ? 1
            : 2;

        appDestroyCallback = initializeGame(roomId, playerId);
      })
      .catch((error: unknown) => {
        console.error('Error loading game module:', error);
      });
  });

  socket.on(
    'gameEnd',
    (
      reason: string,
      statistics?: Record<
        string,
        Pick<GameRecord, 'hitRate' | 'remainingHealth'>
      > & { isBaseDestroyed: boolean },
      records?: GameRecord[],
      newRecordIds?: [number, number],
    ) => {
      sounds.playBgm('game-room-bg', 0.05);

      if (reason !== 'finished' && reason !== 'gameOver') {
        appDestroyCallback?.();
        $('#game-container').addClass('hidden');
        alert(`Game ended due to unexpected reason: ${reason}`);
        $('#start-menu').removeClass('hidden').addClass('flex');
        $('#home-container').removeClass('hidden').addClass('flex');

        return;
      }

      setTimeout(() => {
        const currentUsername = Authentication.getUser()?.username ?? '';
        appDestroyCallback?.();
        $('#game-container').addClass('hidden');

        // The last page open should be the start menu
        $('#start-menu').removeClass('flex').addClass('hidden');
        $('#end-game-container').removeClass('hidden').addClass('flex');
        $('#home-container').removeClass('hidden').addClass('flex');

        if (statistics && records) {
          const isFailed = reason === 'gameOver';
          const outcome = isFailed
            ? `Mission Failed${statistics.isBaseDestroyed ? ' (Base Destroyed)' : ''}`
            : `Mission Accomplished`;

          const partnerUsername =
            Object.keys(statistics).find((u) => u !== currentUsername) ?? '';

          const hitRate = statistics[currentUsername].hitRate;
          const partnerHitRate = statistics[partnerUsername].hitRate;
          const remainingHealth = statistics[currentUsername].remainingHealth;
          const partnerRemainingHealth =
            statistics[partnerUsername].remainingHealth;

          $('#outcome')
            .text(outcome)
            .css('color', isFailed ? 'crimson' : '#01ff01');
          $('#your-hit-rate').text(`${hitRate.toFixed(2)}%`);
          $('#your-remaining-health').text(remainingHealth.toString());
          $('#your-partner-hit-rate').text(`${partnerHitRate.toFixed(2)}%`);
          $('#your-partner-remaining-health').text(
            partnerRemainingHealth.toString(),
          );

          $('#ranks-table-body').empty();
          for (let i = 0; i < records.length; i++) {
            const record = records[i];
            const isNewRecord = newRecordIds?.includes(record.id) ?? false;

            const row = $('<tr></tr>')
              .append(`<td>${i + 1}</td>`)
              .append(`<td>${record.username}</td>`)
              .append(`<td>${record.hitRate.toFixed(2)}%</td>`)
              .append(`<td>${record.remainingHealth}</td>`)
              .append(
                `<td>${new Date(`${record.timestamp}Z`).toLocaleString()}</td>`,
              );

            if (isNewRecord) {
              row.addClass('new');
            }

            $('#ranks-table-body').append(row);
          }

          console.log('Game records:', records, newRecordIds);
        }
      }, 800);
    },
  );

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

  $('#btn-start, #end-game-restart').on('click', (e) => {
    e.preventDefault();
    $('#start-menu').addClass('hidden').removeClass('flex');
    $('#end-game-container').addClass('hidden').removeClass('flex');
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
    $('#start-menu').removeClass('hidden').addClass('flex');
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

  $('#btn-about').on('click', (e) => {
    e.preventDefault();
    $('#start-menu').addClass('hidden').removeClass('flex');
    $('#about-container').removeClass('hidden').addClass('flex');
  });

  $('#about-back-to-start-menu').on('click', (e) => {
    e.preventDefault();
    $('#about-container').addClass('hidden').removeClass('flex');
    $('#start-menu').removeClass('hidden').addClass('flex');
  });

  $('#end-game-back-to-start-menu').on('click', (e) => {
    e.preventDefault();
    $('#end-game-container').addClass('hidden').removeClass('flex');
    $('#start-menu').removeClass('hidden').addClass('flex');
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
