const readline = require("readline");
const { client, xml, jid } = require("@xmpp/client");
const net = require("net");
const socket = new net.Socket();
const fs = require('fs');



const SERV_ADDR = "alumchat.xyz"
const SERV_PORT =  5222
const requests = []
const files = []

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

    await xmpp.send(iqStanza);


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

async function getContactDetails(xmpp){
    console.log("\n**** DETALLES DE CONTACTO ****")
    r1.question("Ingrese el nombre de usuario deseado: ", (user)=>{
        const userJID = user.toLowerCase()+"@alumchat.xyz"

        //Get info from stanza
        const rosterStanza = xml(
            'iq',
            { type: 'get', id: 'roster' }, 
            xml('query', { xmlns: 'jabber:iq:roster' })
        );

        xmpp.send(rosterStanza).then(()=>{
            xmpp.on("stanza", (stanza)=>{

                if (stanza.is('iq') && stanza.attrs.type === 'result') {
                    const query = stanza.getChild('query', 'jabber:iq:roster');
                    const contacts = query.getChildren('item');
                    //Check if you have any contacts
                    if(contacts.length>0){
                        //Find the specified user
                        const usr = contacts.find((contact) => contact.attrs.jid===userJID)
                        if(usr){
                            console.log("\nMostrando detalles de usuario....")
                            console.log(`- Nombre: ${user} | JID: ${userJID} | Subscription: ${usr.attrs.subscription}`)
                        }
                        else{
                            console.log("\nNo se ha encontrado al usuario especificado...\n")
                        }
                    }
                    else{
                        console.log("Lista de contactos vacía...")
                    }
        
                    ConnectedAccountMenu(xmpp)
                }
        
            })
        
        }).catch((err)=>{
            console.log("\nError al mandar la información...\n")
        })
    })
}

async function getConnectedUsers(xmpp){
    //Use an infoquery stanza for the roster
    const rosterStanza = xml(
        'iq',
        { type: 'get', id: 'roster' }, 
        xml('query', { xmlns: 'jabber:iq:roster' })
    );
    
    //Send info query stanza
    xmpp.send(rosterStanza).then(()=>{
        console.log('\nMostrando todos los usuarios y su estado...\n');
    }).catch((err)=>{
        console.log("Error al enviar la solicitud al servidor", err)
    })

    xmpp.on("stanza", (stanza)=>{

        if (stanza.is('iq') && stanza.attrs.type === 'result') {
            const query = stanza.getChild('query', 'jabber:iq:roster');
            const contacts = query.getChildren('item');
            if(contacts.length>0){
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

            ConnectedAccountMenu(xmpp)
        }

    })

}

async function SendFriendRequest(xmpp){
    console.log("\nHas elegido agregar un usuario a tus contactos ")
    r1.question("Ingresa el nombre del usuario que deseas agregar: ", (res)=>{
        const server_name = "@alumchat.xyz"
        const userJID = res+server_name
        const contactRequestStanza = xml(
            'presence',
            { to: userJID, type: 'subscribe' }
        )
        //Send contact request stanza of the userjid specified
        xmpp.send(contactRequestStanza).then(()=>{
            console.log(`\nContact request sent to ${res}`)
            ConnectedAccountMenu(xmpp)

        }).catch((err)=>{
            console.log('\nError sending request', err)
            console.log("Returning to menu...")
            ConnectedAccountMenu(xmpp)
        })

       
    })
}

async function changePresence(xmpp){
    console.log("\n**** Definir mensaje de presencia ****")
    r1.question("Escribe el mensaje de presencia que deseas enseñar: ", (ans1)=>{
        r1.question("Escribe el estado de presencia que quieres enseñar: ",  (ans2)=>{

            //Send a presence stanza with new show and status
            const presenceMessage = xml('presence', {}, [
                xml('status', {}, ans1),
                xml('show', {}, ans2),
              ]);
            xmpp.send(presenceMessage)
            ConnectedAccountMenu(xmpp)

        })
    })
}

async function sendMessage(xmpp){
    console.log("**** Comunicación 1 a 1 con cualquier usuario ****")
    r1.question("Escriba el nombre del receptor: ", (usr)=>{
        r1.question("Escriba el mensaje que desea mandar: ", (mssg)=>{
            const userJID = usr + "@alumchat.xyz"

            //Send message stanza of type chat with userjid
            const messageStanza = xml(
                "message",
                { to: userJID, type: "chat" },
                xml("body", {}, mssg)
            );
            
            xmpp.send(messageStanza).catch(console.error);

            ConnectedAccountMenu(xmpp)
        })
    })
}

//Handle notifications
function Notifications(xmpp){
    console.log("**** Enviar/recibir notificaciones ****")
    console.log("\t- 1. Revisar solicitudes")
    r1.question("Eliga una opción: ", (option)=>{
        //Check requests
        if(option==="1"){
            //If there are any contact requests
            if(requests.length>0){
                console.log("\nMostrando usuarios que han enviado solicitudes: ")
                for(let i = 0; i<requests.length;i++){
                    console.log(`- ${requests[i]}`)
                }
                r1.question("Escriba el nombre de usuario que desea aceptar: ", (usr)=>{
                     //check if the name input actually exists in the requests
                    const usrJID = usr+"@alumchat.xyz"
                    if(requests.includes(usr.toLowerCase())){
                        const index = requests.indexOf(usr);
                        requests.splice(index, 1); 
                        // Remove one element at the specified index
                        //Send subscribed response
                        const subscribedStanza = xml("presence", { to: usrJID, type: "subscribed" });
                        xmpp.send(subscribedStanza).then(() => {
                            console.log(`\nAccepted contact request from: ${usr}\n`);
                        }).catch((error) => {
                            console.error(`Error sending subscribed response: ${error}\n`);
                        });
                    }
                    else{
                        console.log("Could not find user...")
                    }
                    ConnectedAccountMenu(xmpp)
                })
            } 
            else{
                console.log("La bandeja de solicitudes se encuentra vacía. ")
                ConnectedAccountMenu(xmpp)
            }
        }
        else{
            console.log("Ninguna opción valida ingresada, regresando al menú...")
            ConnectedAccountMenu(xmpp)
        }
    })
}

function GroupChat(xmpp){
    console.log("**** Participar en conversaciones grupales ****")
    console.log("\t- 1. Crear Sala o unirse a una existente")
    r1.question("Eliga la opción que desea: ", (option)=>{
        if(option==="1"){
            r1.question("Ingrese el nombre de la sala: ", (room)=>{
                r1.question("Ingrese su apodo: ", (apodo)=>{
                    const roomJID = room + "@conference.alumchat.xyz" //room to join
                    //Create group chat stanza and send it
                    xmpp.send(xml('presence', { to: roomJID + '/' + apodo })).then(()=>{
                        console.log("Joined groupchat: ", roomJID)
                    }).catch(console.error);
                    ConnectedAccountMenu(xmpp)

                })

            })
        }
        else{
            console.log("Ninguna opción válida agregada")
            ConnectedAccountMenu(xmpp);
        }
    })
}   

//Send files
function SendFile(xmpp){
    console.log("**** Enviar un archivo ****")
    r1.question("Introduzca la ruta del archivo que desea enviar: ", (route)=>{
        console.log("- 1. Enviar a usuario")
        console.log("- 2. Groupchat")
        r1.question("Introduzca la opción que desea: ", (option)=>{
            if(option==="1"){
                r1.question("Introduzca el usuario de la persona a la que se lo quiere enviar: ", async (user)=>{
                    const recipient = user+"@alumchat.xyz";
                    let filePath
                    console.log(route)
                    if(route.includes('/')){
                        filePath = route.split('/').pop();

                    }
                    else{
                        filePath=route;
                    }
                    // Read and encode the file as base64
                    try{
                        const fileData = fs.readFileSync(route)
                        const base64Data = fileData.toString('base64');


                        // Create an XMPP message stanza
                        const messageStanza = xml(
                            "message",
                            { to: recipient, type: "chat" },
                            xml('filedata', {}, base64Data),
                            xml('subject', {}, `File: ${filePath}`)
                        );
                        console.log(filePath)
                        // Send the  message
                        xmpp.send(messageStanza);
                        ConnectedAccountMenu(xmpp)
                    }
                    catch(err){
                        console.log("File not found")
                        ConnectedAccountMenu(xmpp)
                    }
                  
                    
                })
            }
            else if(option==="2"){
                r1.question("Introduzca el groupchat destinatario: ", (user)=>{
                    const recipient = user+"@conference.alumchat.xyz";
                    let filePath
                    if(route.includes('/')){
                        filePath = route.split('/').pop();

                    }
                    else{
                        filePath=route;
                    }
                
                    // Read and encode the file as base64
                    try{
                        const fileData = fs.readFileSync(route)
                        const base64Data = fileData.toString('base64');


                        // Create an XMPP message stanza
                        
                        const messageStanza = xml(
                            "message",
                            { to: recipient, type: "groupchat" },
                            xml('filedata', {}, base64Data),
                            xml('subject', {}, `File: ${filePath}`)

                        );
                        // Send the  message
                        xmpp.send(messageStanza);
                        ConnectedAccountMenu(xmpp)
                    }
                    catch(err){
                        console.log("File not found")
                        ConnectedAccountMenu(xmpp)
                    }
                })
            }
            else{
                console.log("Ninguna opción valida ingresada, regresando al menú...")
                ConnectedAccountMenu(xmpp)
            }
        })
       
    })
    

}

function sendGroupChat(xmpp){
    console.log("**** Mandar Group Chat ****")
    r1.question("Escriba el nombre del grupo receptor: ", (group)=>{
        r1.question("Escriba el mensaje que desea mandar: ", (mssg)=>{
            const userJID = group + "@conference.alumchat.xyz"
            const messageStanza = xml(
                "message",
                { to: userJID, type: "groupchat" },
                xml("body", {}, mssg)
            );
            
            xmpp.send(messageStanza).then(()=>{
                console.log(`Mensaje enviado a: ${userJID}`)
            }).catch(console.error);

            ConnectedAccountMenu(xmpp)
        })
    })
}

//Menu to appear when the user is already connected
function ConnectedAccountMenu(client, user= null){

    const xmpp = client

    console.log("\n**** MENU WhatAlumChat ****")
    console.log("Para comenzar por favor eliga alguna opción")
    console.log("\t- 1.  Mostrar todos los usuarios/contactos y su estado")
    console.log("\t- 2.  Agregar un usuario a los contactos")
    console.log("\t- 3.  Mostrar detalles de contacto de un usuario")
    console.log("\t- 4.  Comunicación 1 a 1 con cualquier usuario")
    console.log("\t- 5.  Participar en conversaciones grupales")
    console.log("\t- 6.  Definir mensaje de presencia")
    console.log("\t- 7.  Enviar/recibir notificaciones")
    console.log("\t- 8.  Enviar/recibir archivos")
    console.log("\t- 9.  Eliminar cuenta")
    console.log("\t- 10. Mandar mensaje grupal")
    console.log("\t- 11. Cerrar Sesión")
    r1.question("\n* Ingrese el número de alguna opción para empezar: ", option=>{
        if(option==="1"){
            getConnectedUsers(xmpp)
        }
        else if(option==="2"){
            SendFriendRequest(xmpp)
        }
        else if(option==="3"){
            getContactDetails(xmpp)
        }
        else if(option==="4"){
            sendMessage(xmpp)
        }
        else if(option==="5"){
            GroupChat(xmpp)
        }
        else if(option==="6"){
            changePresence(xmpp)
        }
        else if(option==="7"){
            Notifications(xmpp)
        }
        else if(option==="8"){
            SendFile(xmpp)
        }
        else if(option==="9"){
            DeleteAccountMenu(xmpp)
        }
        else if(option==="10"){
            sendGroupChat(xmpp)
        }
        else if(option==="11"){
            console.log("\nCerrando sesión...\n")
            xmpp.stop()
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

//All stanzas handler
function handleStanza(xmpp, stanza){
    if (stanza.is("presence")) {
        //Subscription request in notification
        if(stanza.attrs.type === "subscribe"){
            const from = stanza.attrs.from;
            requests.push(from.split('@')[0])
            console.log(`\nReceived contact request from: ${from}`);
        }
        // If someone changed their presence online
        else{
            const to = stanza.attrs.to;
            const from = stanza.attrs.from;
            const type = stanza.attrs.type;
            const show = stanza.getChildText('show');
            const status = stanza.getChildText('status')
            if(to.split('/')[0]!==from.split('/')[0]){
                if (type === undefined) {
                    console.log(`\nPresence from ${from}: type=online`);
                    if(status!==null&& show!==null){
                        console.log(`- Mensaje de presencia: ${status}`)
                        console.log(`- Status: ${show}\n`)
                    }
                }else{
                    console.log(`\nPresence from ${from}: type=${type}`);
                }
            }
        }
    }
    else if (stanza.is("message")) {
        const from = stanza.attrs.from; // Sender's JID
        const messageType = stanza.attrs.type;
        const messageText = stanza.getChildText("body"); // Message body text
        const eventElement = stanza.getChild('event');
        const delayElement = stanza.getChild('delay');
        //console.log(eventElement)
        //console.log(delayElement)
        //console.log(stanza)
        // Handle different types of messages

        const subjectElement = stanza.getChildText("subject");
        const filedata = stanza.getChild('filedata')
            //If the message is not a server message at start
            if(!eventElement){

                //If the message contains any indication that a file is being sent
                if((subjectElement || filedata) && !delayElement){

                    const filepath = subjectElement.split(':')[1].trim() //get only the name of the file
                    const filedata = stanza.getChildText("filedata")
                    console.log(`Se ha recibido un archivo de ${from}, filename: ${subjectElement}`)
                    const buffer = Buffer.from(filedata, "base64"); // Replace with your decoded data

                    //create file
                    fs.promises.writeFile(filepath, buffer)
                    .then(() => {
                        console.log("File written successfully.");
                    })
                    .catch((error) => {
                        console.error("Error writing file:", error);
                    });
                }
                else{
                        
                    if (messageType === "chat" && messageText) {
                        console.log(`\n- Received message from ${from}: ${messageText}`);
                    }
                    else if(messageType === "groupchat" && messageText){
                        console.log(`\n- Received group chat message from ${from}: ${messageText}`);
                    }
                    else {
                        console.log(`\n- Received message of type ${messageType} from ${from}`);
                    }
                }

            }
    

    }
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
            console.log("\nError al tratar de ingresar...");
            xmpp.stop()
          });
        
          xmpp.on("offline", () => {
            console.log("Disconnected from XMPP server, returning to Main Menu");
            MainMenu()
            // Implement XMPP disconnection logic here
          });
        
        //When user is connected to the server.
        xmpp.on("online", (address) => {
            console.log("Connected to XMPP server as:", address.toString());

            const presence = xml('presence', { type: 'available' });
            xmpp.send(presence);
            ConnectedAccountMenu(xmpp, username)

            xmpp.on("stanza", (stanza) => handleStanza(xmpp, stanza))
        
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