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

    /** public key of our push server */
    private readonly applicationServerPublicKey: Uint8Array;
    /** service worker js file path */
    private readonly serviceWorkerPath: string;
    /** url to push subscription information to */
    private readonly subscriptionPushURL: string;

    /**
     * Creates a new instance. Do not use after construction. Call init() first, after the Promise is resolved,
     * the instance is ready to use, isSupported and isSubscribed variables are filled.
     *
     * @param publicKeyBase64 application server public key in urlbase64 format
     * @param serviceWorkerPath service worker js file path
     * @param subscriptionPushURL url to push subscription information to (POST and DELETE methods are invoked)
     */
    constructor(publicKeyBase64: string, serviceWorkerPath: string, subscriptionPushURL: string) {
        this.applicationServerPublicKey = PushServiceRegister.urlB64ToUint8Array(publicKeyBase64);
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
     * @returns true if user is subscribed
     */
    isSubscribed():boolean { return this._isSubscribed }

    /**
     * Initializes service worker and checks subscription status
     * Sets isSupported and isSubscribed, promise is always successful
     *
     * @returns always successful promise, use isSupported and isSubscribed to check status
     */
    init(): Promise<void> {
        this._isSupported = this._isDenied = this._isSubscribed = false;
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
                                    this.pushSubscriptionToServer()
                                        .then(() => {
                                            this._isSubscribed = true;
                                            resolve();
                                        })
                                        .catch((reason) => {
                                            console.log("Error pushing subscription info to server: "+reason);
                                            resolve();
                                        })
                                }
                                else {
                                    // not subscribed yet
                                    resolve();
                                }
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
    private pushSubscriptionToServer(): Promise<void> {
        return new Promise((resolve, reject) => {
            fetch(this.subscriptionPushURL, {
                method: "POST",
                body: JSON.stringify(this.subscription),
                headers: {
                    'Content-Type': 'application/json'
                }
            })
                .then((response) => {
                    if (response.ok) resolve();
                    else reject("Error pushing subscription information to server: "+response.status);
                })
                .catch((reason) => reject(reason));
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
                body: JSON.stringify(this.subscription),
                headers: {
                    'Content-Type': 'application/json'
                }
            })
                .then((response) => {
                    if (response.ok) resolve();
                    else reject("Error deleting subscription information on server: "+response.status);
                })
                .catch((reason) => reject(reason));
        });
    }


    /**
     * If user is not subscribed, subscribe to notifications
     *
     * @returns promise resolved on success, or error
     */
    subscribe(): Promise<void> {
        if (this._isSubscribed) return Promise.resolve();
        return new Promise((resolve, reject) => {
            this.swReg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: this.applicationServerPublicKey
            })
                .then((subscription) => {
                    this.subscription = subscription;
                    this.pushSubscriptionToServer()
                        .then(() => {
                            this._isSubscribed = true;
                            resolve();
                        })
                        .catch((reason) => reject(reason));
                })
                .catch((reason) => reject(reason));
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
                        this.deleteSubscriptionOnServer()
                            .then(() => resolve())
                            .catch((reason) => reject(reason));
                    }
                    else {
                        reject("Unsubscription failed");
                    }
                })
                .catch((reason) => reject(reason))
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