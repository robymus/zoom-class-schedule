const applicationServerKey = "BMe3HIpUhUxzrCRbjlOOOllTRIM8ju-5CDsDfNNUVHuWcOgmqWHDDl_uhA6kpe8vfclnGII80OfTIDvMQC-_yVM";
const serviceWorkerPath = "/push-service-worker.js";
const subscriptionPushURL = "subscribe.php";

const pushReg = new PushServiceRegister(applicationServerKey, serviceWorkerPath, subscriptionPushURL);

document.addEventListener("DOMContentLoaded", () => {
    pushReg.init().then(() => {
        console.log("isSupported: "+pushReg.isSupported());
        console.log("isDenied: "+pushReg.isDenied());
        console.log("isSubscribed: "+pushReg.isSubscribed());
    }).catch((err)=>console.log(err));
});

function doSubscribe():void {
    pushReg.subscribe()
        .then(()=>console.log("subscribed"))
        .catch((err)=>console.log(err));
}