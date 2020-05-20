<?php
    require_once 'vendor/autoload.php';
    require_once '../src/php/config.php';

    use Minishlink\WebPush\WebPush;
    use Minishlink\WebPush\Subscription;

    // see https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerRegistration/showNotification
    $payload = json_encode([
        "title" => "Test title",
        "options" => [
            "body" => "Test notification",
            "icon" => "https://r2.io/favicon.ico",
            "badge" => "https://r2.io/favicon.ico",
            "data" => [
                "url" => "https://r2.io"
            ]
        ]
    ]);

    $notifications = [];

    $db = new SQLite3($dbFile);

    $subs = $db->query("SELECT data FROM subscriptions");
    while ($sub = $subs->fetchArray(SQLITE3_NUM)) {
        $notifications[] = Subscription::create(json_decode($sub[0], true));
    }
    $subs->finalize();

    // create VAPID authenticated push instance
    $auth = [
        'VAPID' => [
            'subject' => 'mailto:r@r2.io',
            'publicKey' => $applicationServerKey['public'],
            'privateKey' => $applicationServerKey['private']
        ],
    ];
    $webPush = new WebPush($auth);

    // queue all notifications
    foreach ($notifications as $notification) {
        $webPush->sendNotification(
            $notification,
            $payload
        );
    }

    $unsub = $db->prepare("DELETE FROM subscriptions WHERE id=:key");

    // send all and check reports
    foreach ($webPush->flush() as $report) {
        $endpoint = $report->getRequest()->getUri()->__toString();

        if ($report->isSuccess()) {
            echo "[v] Message sent successfully for subscription {$endpoint}.\n";
        } else {
            if ($report->getResponse()->getStatusCode() == 410) {
                // 410 Gone - subscription expired or invalid
                echo "[d] Deleting expired subscription {$endpoint}.\n";
                $unsub->bindValue(':key', $endpoint);
                $unsub->execute();
            }
            else {
                echo "[x] Message failed to sent for subscription {$endpoint}: {$report->getReason()}\n";
            }
        }
    }

    // close database connection
    $unsub->close();
    $db->close();