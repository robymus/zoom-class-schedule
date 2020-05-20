/**
 * Class responsible for registering the push service worker / subscription
 */
class PushServiceRegister {

    private _isSupported:boolean = false;
    private _isDenied:boolean = false;
    private _isSubscribed:boolean = false;

    /** service worker registration reference after init */
    private swReg: ServiceWorkerRegistration;
    /** current subscription if user is subscribed */
    private subscription: PushSubscription;

    /** URL to retrieve public keys from */
    private readonly publicKeyURL: string;
    /** public key of our push server */
    private applicationServerPublicKey: Uint8Array;
    /** service worker js file path */
    private readonly serviceWorkerPath: string;
    /** url to push subscription information to */
    private readonly subscriptionPushURL: string;

    /**
     * Creates a new instance. Do not use after construction. Call init() first, after the Promise is resolved,
     * the instance is ready to use, isSupported and isSubscribed variables are filled.
     *
     * @param publicKeyURL application server public key request URL
     * @param serviceWorkerPath service worker js file path
     * @param subscriptionPushURL url to push subscription information to (POST and DELETE methods are invoked)
     */
    constructor(publicKeyURL: string, serviceWorkerPath: string, subscriptionPushURL: string) {
        this.publicKeyURL = publicKeyURL;
        this.serviceWorkerPath = serviceWorkerPath;
        this.subscriptionPushURL = subscriptionPushURL;
    }

    /**
     * @returns true if Push Messaging is supported
     */
    isSupported():boolean { return this._isSupported }

    /**
     * @returns true if notification permissions are denied
     */
    isDenied():boolean { return this._isDenied }


    /**
     * Initializes service worker and checks subscription status
     * Sets isSupported and isSubscribed, promise is always successful
     * @returns true if user is subscribed
     */
    isSubscribed():boolean { return this._isSubscribed }

    init(): Promise<void> {
        this._isSupported = this._isDenied = this._isSubscribed = false;
        return new Promise((resolve, reject) => {
            fetch(this.publicKeyURL)
                .then((response) => {
                    if (response.ok) {
                        response.json()
                            .then(data => {
                                this.applicationServerPublicKey = PushServiceRegister.urlB64ToUint8Array(data.publicKey);
                                this.pushInit().then(()=>resolve());
                            })
                            .catch(()=>resolve());
                    }
                    else {
                        console.log("Error fetching public key:" + response.status);
                        resolve();
                    }
                })
                .catch((reason) => {
                    console.log("Error fetching public key:" + reason);
                    resolve();
                });
        });
    }

    /**
     * Initializes service worker and checks subscription status
     * Sets isSupported and isSubscribed, promise is always successful
     *
     * @returns always successful promise, use isSupported and isSubscribed to check status
     */
    private pushInit(): Promise<void> {
        if ('serviceWorker' in navigator && 'PushManager' in window) {
            // check if site has permission for notifications
            if (Notification.permission === "denied") {
                this._isSupported = true;
                this._isDenied = true;
                return Promise.resolve();
            }
            return new Promise((resolve, reject) => {
                navigator.serviceWorker.register(this.serviceWorkerPath)
                    .then((swReg) => {
                        this._isSupported = true;
                        this.swReg = swReg;
                        swReg.pushManager.getSubscription()
                            .then((subscription) => {
                                if (subscription !== null) {
                                    this.subscription = subscription;
                                    this._isSubscribed = true;
                                }
                                resolve();
                            })
                            .catch((reason) => resolve());
                    })
                    .catch((reason) => resolve());
            });
        } else {
            return Promise.resolve();
        }
    }

    /**
     * Sends subscription information to server.
     *
     * @returns promise resolved on completion, or error
     */
    private pushSubscriptionToServer(password:String): Promise<void> {
        return new Promise((resolve, reject) => {
            fetch(this.subscriptionPushURL, {
                method: "POST",
                body: JSON.stringify({
                    "password": password,
                    "subscription": this.subscription
                }),
                headers: {
                    'Content-Type': 'application/json'
                }
            })
                .then((response) => {
                    if (response.ok) resolve();
                    else reject({reason: "Error pushing subscription information to server: ", code: response.status});
                })
                .catch((reason) => reject({reason: reason, code: -1}));
        });
    }

    /**
     * Deletes subscription information on server.
     *
     * @returns promise resolved on completion, or error
     */
    private deleteSubscriptionOnServer(): Promise<void> {
        return new Promise((resolve, reject) => {
            fetch(this.subscriptionPushURL, {
                method: "DELETE",
                body: JSON.stringify({
                    "subscription": this.subscription
                }),
                headers: {
                    'Content-Type': 'application/json'
                }
            })
                .then((response) => {
                    if (response.ok) resolve();
                    else reject({reason: "Error deleting subscription information on server: ", code: response.status});
                })
                .catch((reason) => reject({reason: reason, code: -1}));
        });
    }


    /**
     * If user is not subscribed, subscribe to notifications
     *
     * @param password the password to send to the server for subscribing
     * @returns promise resolved on success, or error
     */
    subscribe(password: String): Promise<void> {
        if (this._isSubscribed) return Promise.resolve();
        return new Promise((resolve, reject) => {
            this.swReg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: this.applicationServerPublicKey
            })
                .then((subscription) => {
                    this.subscription = subscription;
                    this.pushSubscriptionToServer(password)
                        .then(() => {
                            this._isSubscribed = true;
                            resolve();
                        })
                        .catch((reasonObj) => {
                            // failed, so delete local subscription as well
                            this.subscription.unsubscribe()
                                .then(()=>reject(reasonObj))
                                .catch(()=>reject(reasonObj));
                        });
                })
                .catch((reason) => reject({reason: reason, code: -1}));
        });
    }

    /**
     * If user is subscribed, unsubscribe from notifications
     *
     * @returns promise resolved on success, or error
     */
    unsubscribe(): Promise<void> {
        if (!this._isSubscribed) return Promise.resolve();
        return new Promise((resolve, reject) => {
            this.subscription.unsubscribe()
                .then((successful) => {
                    if (successful) {
                        this._isSubscribed = false;
                        this.deleteSubscriptionOnServer()
                            .then(() => resolve())
                            .catch((reasonObj) => reject(reasonObj));
                    }
                    else {
                        reject({reason: "Unsubscription failed", code: -1});
                    }
                })
                .catch((reason) => reject({reason: reason, code: -1}))
        });
    }


    /**
     * Helper function to convert from url base64 (used by push service) key to binary
     *
     * @param base64String input string in url base64 format
     * @return key as binary array
     */
    private static urlB64ToUint8Array(base64String: string): Uint8Array {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/\-/g, '+')
            .replace(/_/g, '/');

        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);

        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }

}