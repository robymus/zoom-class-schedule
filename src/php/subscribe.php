<?php
    /*
     * Store or delete subscriptions.
     * POST and DELETE method is supported accordingly.
     *
     * POST method requires a password.
     * Key is subscription['keys']['p256dh'] (this might not be perfect)
     *
     * Possible error codes:
     *  200:    successful operation
     *  400:    can't find key in subscription
     *  401:    wrong password
     *  405:    invalid method
     *  500:    internal error
     */
    require_once 'config.php';

    function openDatabase() {
        global $dbFile;
        $createTable = !file_exists($dbFile);
        $db = new SQLite3($dbFile);
        if ($createTable) {
            $db->exec("CREATE TABLE subscriptions(id VARCHAR(64) PRIMARY KEY, data TEXT NOT NULL)");
        }
        return $db;
    }

    function getKey($subscription) {
        if (!isset($subscription) || !isset($subscription['keys']) || !isset($subscription['keys']['p256dh'])) {
            http_response_code(400);
            die('Bad Request');
        }
        return $subscription['keys']['p256dh'];
    }

    function storeSubscription($subscription) {
        $key = getKey($subscription);
        $db = openDatabase();
        $stmt = $db->prepare("INSERT INTO subscriptions VALUES(:key, :data)");
        $stmt->bindValue(':key', $key);
        $stmt->bindValue(':data', json_encode($subscription));
        $stmt->execute();
        $db->close();
    }

    function deleteSubscription($subscription) {
        $key = getKey($subscription);
        $db = openDatabase();
        $stmt = $db->prepare("DELETE FROM subscriptions where id=:key");
        $stmt->bindValue(':key', $key);
        $stmt->execute();
        $db->close();
    }

    header("Access-Control-Allow-Origin: *");
    header("Access-Control-Allow-Headers: *");
    switch ($_SERVER['REQUEST_METHOD']) {
        case 'POST':
            $body = json_decode(file_get_contents('php://input'), true);
            // check password
            if ($body['password'] !== $subscribePassword) {
                http_response_code(401);
                die('Unauthorized');
            }
            // store subscription
            storeSubscription($body['subscription']);
            echo "OK";
            break;
        case 'DELETE':
            $body = json_decode(file_get_contents('php://input'), true);
            // delete subscription
            deleteSubscription($body['subscription']);
            echo "OK";
            break;
        case 'OPTIONS':
            // allow CORS preflight check
            break;
        default:
            http_response_code(405);
            die('Method Not Allowed');
    }
