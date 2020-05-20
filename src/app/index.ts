const serviceWorkerPath = "/push-service-worker.js";
const subscriptionPushURL = "php/subscribe.php";
const publicKeyURL = "php/pubkey.php";

const pushReg = new PushServiceRegister(publicKeyURL, serviceWorkerPath, subscriptionPushURL);

document.addEventListener("DOMContentLoaded", () => {
    pushReg.init().then(() => {
        console.log("isSupported: "+pushReg.isSupported());
        console.log("isDenied: "+pushReg.isDenied());
        console.log("isSubscribed: "+pushReg.isSubscribed());
    }).catch((err)=>console.log(err));
});

function doSubscribe():void {
    pushReg.subscribe('password')
        .then(()=>console.log("subscribed"))
        .catch((err)=>console.log(err));
}

function doUnsubscribe():void {
    pushReg.unsubscribe()
        .then(()=>console.log("unsubscribed"))
        .catch((err)=>console.log(err));
}