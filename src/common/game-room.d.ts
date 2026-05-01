export interface Player {
  username: string;
  socketId: string;
  ready: boolean;
}

export interface Room {
  roomId: number;
  players: Player[];
  status: 'waiting' | 'full' | 'playing';
}
