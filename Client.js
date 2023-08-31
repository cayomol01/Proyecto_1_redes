const readline = require("readline");
const { client, xml, jid } = require("@xmpp/client");
const net = require("net");
const socket = new net.Socket();


const SERV_ADDR = "alumchat.xyz"
const SERV_PORT =  5222


process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";


const r1 = readline.createInterface({
    input: process.stdin,
    output: process.stdout,}
);


function RegisterMenu(){
    let user;
    let password;



    console.log("\n**** Usted eligió Registrarse ****")
    r1.question("Ingrese su usuario: ", usr=>{

        r1.question("Ingrese su contraseña: ", psw=>{
            user = usr
            password = psw

            Register(user, password)

        })

    })
}


async function Register(username, password){

    //Create the Register Request Stanza
    const RegisterStanza = 
    `<iq type="set" id="register1" mechanism='PLAIN'>
        <query xmlns="jabber:iq:register">
            <username>${username}</username>
            <password>${password}</password>
        </query>
    </iq>`

    //Connect to the xmpp server when there is no user yet
    socket.connect(SERV_PORT, SERV_ADDR, ()=>{
        console.log("\nCONNECTED TO XMPP SERVER")
        //Header Stream, start of an xmpp connection/session
        socket.write(
            `<stream:stream to="xmpp-server.com" xmlns="jabber:client" xmlns:stream="http://etherx.jabber.org/streams" version="1.0">`
        )

        socket.write(RegisterStanza);
    })

    //Receiving data from server
    socket.on("data", (data)=>{
        if (data.toString().includes('<iq type="result"')) {
            console.log(`La cuenta con el usuario ${username} se registró exitosamente`)
            socket.end()
        } 
        else if (data.toString().includes('<iq type="error"')) {
            console.log('No se ha logrado registrar correctamente');
            console.log("\n**** ERROR ****\n")
            console.log(data.toString(), '\n')
            console.log("**** ERROR ****\n")
            socket.end()
        }
    })

    socket.on("close", ()=>{
        console.log("Disconnected from XMPP server socket")
        MainMenu()
    })

}


function DeleteAccountMenu(xmpp){

    console.log("\n**** Usted eligió Eliminar cuenta ****")
    r1.question("¿Esta seguro que quiere borrar su cuenta? (s/n) ", ans=>{
            if(ans==="s"){
                DeleteAccount(xmpp)
            }
            else{
                console.log("Ha elegido no borrar la cuenta")
                console.log("Regresando...")
                ConnectedAccountMenu()
            }
        })
}


async function DeleteAccount(xmpp){
    const iqStanza = xml("iq", {
        type: "set",
        id: "delete_account_id"
    });

    iqStanza.c("query", { xmlns: "jabber:iq:register" }).c("remove");

    const response = await xmpp.send(iqStanza);

    console.log("Account deletion response:", response);

    xmpp.on('stanza', (stanza) => {
        if (stanza.is('iq') && stanza.attrs.type === 'result') {

            const from = stanza.attrs.from; 
            const user = from.split('/')[0]; 
            console.log(`El usuario ${user} ha sido eliminado exitosamente`)
          // Additional processing for a successful IQ result
        }
        else{
            console.log("Hubo un error al intentar de borrar la cuenta")
        }
    });

    xmpp.stop();

}


async function getConnectedUsers(xmpp){

    const rosterStanza = xml(
        'iq',
        { type: 'get', id: 'roster' }, 
        xml('query', { xmlns: 'jabber:iq:roster' })
    );

    xmpp.send(rosterStanza).then(()=>{
        console.log('Mostrando todos los usuarios y su estado...');
    }).catch((err)=>{
        console.log("Error al enviar la solicitud al servidor", err)
    })

    xmpp.on("stanza", (stanza)=>{

        if (stanza.is('iq') && stanza.attrs.type === 'result') {
            const query = stanza.getChild('query', 'jabber:iq:roster');
            const contacts = query.getChildren('item');
            if(contacts.length>0){
                console.log("a")
                console.log('Lista de contactos:');
                contacts.forEach((contact) => {
                    const jid = contact.attrs.jid;
                    const name = contact.attrs.name || jid.split('@')[0];
                    const subscription = contact.attrs.subscription;
    
                    console.log(`- JID: ${jid}, Nombre: ${name}, Suscripción: ${subscription}`);
                })
            }
            else{
                console.log("Lista de contactos vacía...")
            }

            // Imprimiendo la lista de contactos.
           
            xmpp.on('stanza', stanza => {
                if (stanza.is('presence')) {
                    const from = stanza.attrs.from;
                    const type = stanza.attrs.type;
                    const show = stanza.getChildText('show');


                    // Si el tipo es undefined, entonces es online.
                    if (type === undefined) {
                      console.log(`Presence from ${from}: type=online`);
                    }else{
                      console.log(`Presence from ${from}: type=${type}, show=${show}`);
                    }
                }
                MainMenu()
            });

        }
    })

}




//Menu to appear when the user is already connected
function ConnectedAccountMenu(client=null){

    const xmpp = client

    console.log("\n**** MENU WhatAlumChat ****")
    console.log("Para comenzar por favor eliga alguna opción")
    console.log("\t- 1. Mostrar todos los usuarios/contactos y su estado")
    console.log("\t- 2. Agregar un usuario a los contactos")
    console.log("\t- 3. Mostrar detalles de contacto de un usuario")
    console.log("\t- 4. Comunicación 1 a 1 con cualquier usuario")
    console.log("\t- 5. Participar en conversaciones grupales")
    console.log("\t- 6. Definir mensaje de presencia")
    console.log("\t- 7. Enviar/recibir notificaciones")
    console.log("\t- 8. Enviar/recibir archivos")
    console.log("\t- 9. Eliminar cuenta")
    r1.question("\n* Ingrese el número de alguna opción para empezar: ", option=>{
        if(option==="1"){
            getConnectedUsers(xmpp)
        }
        else if(option==="9"){
            DeleteAccountMenu(xmpp)
        }
    })
}



function LoginMenu(){


    let user;
    let password;



    console.log("\n**** Usted eligió Login ****")
    r1.question("Ingrese su usuario: ", usr=>{

        r1.question("Ingrese su contraseña: ", psw=>{
            user = usr
            password = psw

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

    try {
        xmpp.on("error", (err) => {
            console.log("\nUsername or password are incorrect...");
            xmpp.stop()
          });
        
          xmpp.on("offline", () => {
            console.log("Disconnected from XMPP server, returning to Main Menu");
            MainMenu()
            // Implement XMPP disconnection logic here
          });
        
        xmpp.on("online", (address) => {
            console.log("Connected to XMPP server as:", address.toString());
            ConnectedAccountMenu(xmpp)
        
            // Implement your XMPP logic here
        
            // To disconnect from the server when desired
            //console.log("Disconnected")
            //xmpp.stop();
          });

        await xmpp.start();
    } catch (error) {
        console.error("Error during connection, returning to main Menu");
    }


}



function MainMenu(){
    console.log("\n**** Bienvenido a WhatAlumChat ****")
    console.log("Para comenzar por favor eliga alguna opción")
    console.log("\t- 1. Registrarse")
    console.log("\t- 2. Iniciar Sesión")
    console.log("\t- 3. Salir")
    r1.question("\n* Ingrese el número de alguna opción para empezar: ", option => {
        if(option==='1'){
            RegisterMenu()
        }else if(option==='2'){
            LoginMenu()
        }
        else if(option==='3'){
            console.log("\n Gracias por usar WhatAlumChat, vuelva pronto!")
            r1.close()
            r1.close()
        }
        else{
            console.log("Ninguna opción ingresada, se desconectará")
            r1.close()
        }
    });


}


MainMenu()