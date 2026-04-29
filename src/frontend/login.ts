import $ from 'jquery';
import { connectSocket, socket } from './socket';

interface User{
    username: string;
}

interface Res{
    user: User;
    error: string;
    success:string;
}

type Screen = "login" | "start_menu" | "game_room" | "gaming";

export const ScreenState = {
    get(): Screen { return (sessionStorage.getItem("screen") as Screen | null) ?? "login"; },
    set(s: Screen): void { sessionStorage.setItem("screen", s); },
    clear(): void {sessionStorage.removeItem("screen");}
}

//Authentication
export const Authentication = (function () {
    let user: User | null = null;

    const getUser = () => {return user;}

    const signin = (username: string, password: string, onSuccess: ()=>void, onError: (err:string) => void)=>{
        const json = JSON.stringify({username, password});
        console.log(json);

        fetch("/login", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body:json
        })
        .then((res) => res.json() as Promise<Res>)
        .then((json)=>{
            if (json.error) {onError(json.error); return;}
            user = json.user;
            onSuccess();
        })
        .catch((err:unknown) => {console.error(err)});
    }

    const signup = (username: string, password: string, onSuccess: ()=>void, onError: (err:string) => void)=>{
        const json = JSON.stringify({username, password});

        fetch('/register', {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body:json
        })
        .then((res) => res.json() as Promise<Res>)
        .then((json)=>{
           if (json.error){onError(json.error); return;}
           if (json.success) onSuccess();
        })
        .catch((err:unknown) => {console.error(err)});
    }

    const signout = (onSuccess: ()=>void, onError: (err:string)=>void) => {
        fetch('/signout', {
            method: "GET",
        })
        .then((res) => res.json() as Promise<Res>)
        .then((json)=>{
            if (json.error) {onError(json.error); return;}
            user = null;
            onSuccess();
        })
        .catch((err:unknown) => {console.error(err)});
    }

    const validate = (onSuccess: ()=>void, onError: (err:string)=>void) => {
        fetch('/validate',{
            method: "GET",
        })
        .then((res) => res.json() as Promise<Res>)
        .then((json)=>{
            if (json.error){onError(json.error); return;}
            user = json.user;
            onSuccess();
        })
        .catch((err:unknown)=>{console.error(err)});
    }

    return{getUser, signin, signup, signout, validate}
})();


//UI
export function setupLogin() {

   $("#login_btn").on("click", (e) => {
      e.preventDefault();

      const username = String($("#username").val() ?? "").trim();
      const password = String($("#pwd").val() ?? "").trim();

      if (!username || !password){$(".message").text("password/username cannot be empty!"); return;}

      Authentication.signin(
        username, password,
        () => { (
            $(".login_form").get(0) as HTMLFormElement).reset();
            $(".login_form").hide();
            $(".start_menu").show();
            ScreenState.set("start_menu");
            $(".message").text("play得!");
            connectSocket(username);
        },

        (err) => { $(".message").text(err);}
      );

    })



    $("#reg_btn").on("click", (e) => {
      e.preventDefault();
      const username = String($("#reg_username").val() ?? "").trim();
      const password = String($("#reg_pwd").val() ?? "").trim();
      const ver_pwd = String($("#ver_pwd").val() ?? "").trim();

      if (password != ver_pwd) {
         $(".message").text("入返嗰啱嘅唔該");
         return;
      }

      Authentication.signup(
        username, password,
        () => {
          ($(".register_form").get(0) as HTMLFormElement).reset();
          $(".register_form").hide();
          $(".login_form").show();
        },
         (err) => { $(".message").text(err);}
      );
    })

    $('#btn_logout').on("click", (e) => {
        e.preventDefault();
        Authentication.signout(
            () => {
                $(".start_menu").hide();
                $(".login_form").show();
                $('#img_bg').attr('src', 'asset/background.png');
                ScreenState.set('login');
                socket.disconnect();
            },
            (err) => { $(".message").text(err); }
        );
    })

    $('#btn_start').on("click", (e) =>{
        e.preventDefault();
        // $('#img_bg').attr('src', 'asset/game_room2.png');
        $('#img_bg').attr({
            'src': 'asset/game_room.png',
            // 'width': 2200,
            // 'height': 1600
        });
        $('.start_menu').hide();
        $('.game_container').show();
        socket.emit('joinRoom');
        console.log('join room');
        ScreenState.set('game_room');

    })

    $('#status-btn').on("click", (e) => {
        e.preventDefault();
        $('#status-btn').text();
        console.log(socket.connected);
        socket.emit('ready');
    })

    $('#status-leave').on('click', (e) =>{
        console.log('leave room');
        e.preventDefault();
        $('#img_bg').attr({
            'src': 'asset/background.png',
            // 'width': 2200,
            // 'height': 1600
        });
        $(".start_menu").show();
        $(".game_container").hide();
        ScreenState.set('start_menu');
        socket.emit('leaveRoom');
    })

    $(".register a").on("click", (e) => {
      e.preventDefault();
      $(".login_form").hide();
      $(".register_form").show();
    })

    $(".register_form a").on("click", (e) => {
      e.preventDefault();
      $(".register_form").hide();
      $(".login_form").show();
    })
}
