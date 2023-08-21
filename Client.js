const readline = require("readline");
const { client, xml, jid } = require("@xmpp/client");


const r1 = readline.createInterface({
    input: process.stdin,
    output: process.stdout,}
);


function Register(){
    let user;
    let password;



    console.log("\n**** Usted eligió Registrarse ****")
    r1.question("Ingrese su usuario: ", usr=>{

        r1.question("Ingrese su contraseña: ", psw=>{
            user = usr
            password = psw

            r1.close()
            console.log("hola", user)
            console.log("hola", password)

        })

    })
}


async function LoginMenu(){


    let user;
    let password;



    console.log("\n**** Usted eligió Login ****")
    r1.question("Ingrese su usuario: ", usr=>{

        r1.question("Ingrese su contraseña: ", psw=>{
            user = usr
            password = psw

            r1.close()
            Login(user, password)

        })

    })
}
async function Login(username, password){
        
    const xmpp = client({
        service: "xmpp://alumchat.xyz:5222",
        domain: "alumchat.xyz",
        username: username,
        password: password,

        tls: {
            // Opción para desactivar la verificación de certificados
            rejectUnauthorized: false,
        },
    });

    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

    xmpp.on("error", (err) => {
        console.error("Error:", err);
      });
    
      xmpp.on("offline", () => {
        console.log("Disconnected from XMPP server");
        // Implement XMPP disconnection logic here
      });
    
      xmpp.on("online", (address) => {
        console.log("Connected to XMPP server as:", address.toString());
    
        // Implement your XMPP logic here
    
        // To disconnect from the server when desired
        // xmpp.stop();
      });


    await xmpp.start();

    
}


function Disconnect(){

}

function MainMenu(){
    console.log("**** Bienvenido a WhatAlumChat ****")
    console.log("\t Para comenzar por favor eliga alguna opción")
    console.log("- 1. Registrarse")
    console.log("- 2. Iniciar Sesión")
    console.log("- 3. Salir")

    r1.question("- Ingrese el número de alguna opción para empezar: ", option => {
        if(option==='1'){
            Register()
        }else if(option==='2'){
            LoginMenu()
        }
        else if(option==='3'){
            Disconnect()
        }
        else{
            console.log("Ninguna opción ingresada, se desconectará")
        }
    });


}


MainMenu()