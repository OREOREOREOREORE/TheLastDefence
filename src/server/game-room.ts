interface Room{
    roomId: number;
    player1?: Player;
    player2?: Player;
    status: "waiting" | "full" | "playing";
}

interface Player{
    username: string;
    socketId: string;
    ready: boolean;
}

const rooms = new Map<number, Room>();
const waitingQueue: Room[] = []; // room with 1 player only
const usernameToRoomId = new Map<string, number>();
let roomid = 0;


function findRoomByUsername(username: string): Room | null {
    const id = usernameToRoomId.get(username);
    if (id === undefined) return null;
    return rooms.get(id) ?? null;
}

function createRoom(roomId: number, player: Player): Room{
    const room: Room = {
        roomId,
        player1: player,
        status: "waiting"
    }
    rooms.set(roomId, room);
    waitingQueue.push(room);
    usernameToRoomId.set(player.username, roomId);
    return room;
}

function joinRoom(roomId: number, player: Player): Room | null{
    const room = rooms.get(roomId);
    if (!room) return null;
    if (room.status !== "waiting") return null;

    room.player2 = player;
    room.status = "full";
    usernameToRoomId.set(player.username, roomId);
    return room;
}

function startGame(roomId: number): Room | null{
    const room = rooms.get(roomId);
    if (!room) return null;
    if (room.status !== "full") return null;
    room.status = "playing";
    return room;
}

function findOrCreateRoom(player: Player) : Room{
    // Reconnect: same username already has a room → refresh socketId.
    const existing = findRoomByUsername(player.username);
    if (existing){
        if (existing.player1?.username === player.username){
            existing.player1.socketId = player.socketId;
        } else if (existing.player2?.username === player.username){
            existing.player2.socketId = player.socketId;
        }
        return existing;
    }

    let room = waitingQueue.shift();
    if (room){
        joinRoom(room.roomId, player);
    }else{
        const newRoomId = roomid++;
        room = createRoom(newRoomId, player);
    }
    return room;
}

function setReady(roomId: number, username: string): Room | null{
    const room = rooms.get(roomId);
    if (!room) return null;
    if (room.status !== "full" && room.status !== "waiting") return null;

    if (room.player1?.username === username){
        room.player1.ready = true;
    } else if (room.player2?.username === username){
        room.player2.ready = true;
    }
    return room;
}

// Check if both players in the room are ready
function bothReady(room: Room): boolean{
    return !!(room.player1?.ready && room.player2?.ready);
}

function leaveRoom(roomId: number, username: string): void{
    const room = rooms.get(roomId);
    console.log(`Player ${username} is leaving room ${roomId}`);
    console.log(room);
    if (!room) return;

    // If the game is in progress, end it: drop the room entirely.
    if (room.status === "playing"){
        if (room.player1) usernameToRoomId.delete(room.player1.username);
        if (room.player2) usernameToRoomId.delete(room.player2.username);
        rooms.delete(roomId);
        return;
    }

    if (room.player1?.username === username){
        usernameToRoomId.delete(room.player1.username);
        room.player1 = undefined;
    } else if (room.player2?.username === username){
        usernameToRoomId.delete(room.player2.username);
        room.player2 = undefined;
    }

    // Reset the remaining player's ready flag so a new opponent
    // doesn't trigger an immediate auto-start.
    if (room.status === "full"){
        if (room.player1) room.player1.ready = false;
        if (room.player2) room.player2.ready = false;
        room.status = "waiting";
        if (!waitingQueue.includes(room)) waitingQueue.push(room);
    } else if (!room.player1 && !room.player2){
        // status === "waiting" and the room is now empty
        rooms.delete(roomId);
        const index = waitingQueue.findIndex(r => r.roomId === roomId);
        if (index !== -1) {
            waitingQueue.splice(index, 1);
        }
    }
    roomid--;
}

export {rooms, waitingQueue, findOrCreateRoom, findRoomByUsername, setReady, bothReady, startGame, leaveRoom};
