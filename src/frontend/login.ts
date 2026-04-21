import $ from 'jquery';

interface User{
    username: string;
}

//Authentication
export const Authentication = (function () {
    let user: User | null = null;

    const getUser = () => {return user;}

    const signin = (username: string, password: string, onSuccess: ()=>void, onError: (err:string) => void)=>{
        const json = JSON.stringify({username, password});

        fetch("/login", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body:json
        })
        .then((res) => res.json())
        .then((json)=>{
            if (json.error) {onError(json.error); return;}
            user = json.user;
            onSuccess();
        })
        .catch((err) => console.error(err));
    }

    const signup = (username: string, password: string, onSuccess: ()=>void, onError: (err:string) => void)=>{
        const json = JSON.stringify({username, password});

        fetch('/register', {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body:json
        })
        .then((res) => res.json())
        .then((json)=>{
           if (json.error && onError){onError(json.error); return;}
           if (json.success) onSuccess();
        })
        .catch((err) => console.error(err))
    }

    const signout = (onSuccess: ()=>void, onError: (err:string)=>void) => {
        fetch('/signout', {
            method: "GET",
        })
        .then((res) => res.json())
        .then((json)=>{
            if (json.error) {onError(json.error); return;}
            user = null;
            onSuccess();
        })
        .catch((err) => console.error(err))
    }

    const validate = (onSuccess: ()=>void, onError: (err:string)=>void) => {
        fetch('validate',{
            method: "GET",
        })
        .then((res) => res.json())
        .then((json)=>{
            if (json.error && onError){onError(json.error); return;}
            user = json.user;
            onSuccess();
        })
        .catch((err)=>console.error(err))
    }

    return{getUser, signin, signup, signout, validate}
})();


//UI
export function setupLogin() {

   $("#login_btn").on("click", (e) => {
      e.preventDefault();

      const username = String($("#username").val() ?? "").trim();
      const password = String($("#pwd").val() ?? "").trim();

      Authentication.signin(
        username, password,
        () => { $(".login_form").hide(); },
        (err) => { console.error(err); }
      );
    })



    $("#reg_btn").on("click", (e) => {
      e.preventDefault();
      const username = String($("#reg_username").val() ?? "").trim();
      const password = String($("#reg_pwd").val() ?? "").trim();
      const ver_pwd = String($("#ver_pwd").val() ?? "").trim();

      if (password != ver_pwd) {
         alert("入返嗰啱嘅唔該");
         return;
      }

      Authentication.signup(
        username, password,
        () => {
          $(".register_form").hide();
          $(".login_form").show();
        },
        (err) => { console.error(err); }
      );
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
