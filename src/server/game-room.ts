// import {socket} from "socket.io-client";

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
let roomid = 0;


function createRoom(roomId: number, player: Player): Room{
    const room: Room = {
        roomId,
        player1: player,
        status: "waiting"
    }
    rooms.set(roomId, room);
    waitingQueue.push(room);
    return room;
}

function joinRoom(roomId: number, player: Player): Room | null{
    const room = rooms.get(roomId);
    if (!room) return null;
    if (room.status !== "waiting") return null;

    room.player2 = player;
    room.status = "full";
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
    let room = waitingQueue.shift();
    if (room){
        joinRoom(room.roomId, player);
    }else{
        const newRoomId = roomid++;
        room = createRoom(newRoomId, player);
    }
    return room;
}

function setReady(roomId: number, socketId: string): Room | null{
    const room = rooms.get(roomId);
    if (!room) return null;
    if (room.status !== "full" && room.status !== "waiting") return null;

    if (room.player1?.socketId === socketId){
        room.player1.ready = true;
    } else if (room.player2?.socketId === socketId){
        room.player2.ready = true;
    }
    return room;
}

// Check if both players in the room are ready
function bothReady(room: Room): boolean{
    return !!(room.player1?.ready && room.player2?.ready);
}

function leaveRoom(roomId: number, socketId: string): void{
    const room = rooms.get(roomId);
    console.log(`Player ${socketId} is leaving room ${roomId}`);
    if (!room) return;

    // If the game is in progress, end it: drop the room entirely.
    if (room.status === "playing"){
        rooms.delete(roomId);
        return;
    }

    if (room.player1?.socketId === socketId){
        room.player1 = undefined;
    } else if (room.player2?.socketId === socketId){
        room.player2 = undefined;
    }

    if (room.status === "full"){
        // Reset the remaining player's ready flag so a new opponent
        // doesn't trigger an immediate auto-start.
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
}

export {findOrCreateRoom, setReady, bothReady, startGame, leaveRoom};
