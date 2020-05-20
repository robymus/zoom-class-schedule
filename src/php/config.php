<?php
// please change these to your own value
// use tools/generate-keys.sh to generate new
$applicationServerKey = [
    "public" => "BMe3HIpUhUxzrCRbjlOOOllTRIM8ju-5CDsDfNNUVHuWcOgmqWHDDl_uhA6kpe8vfclnGII80OfTIDvMQC-_yVM",
    "private" => "cxskm5YvZUYKmB2Glig6qre4_cU8aKJmtRZJwcVGUP0"
];
// password for subscription - change it
$subscribePassword = 'password';
// sqlite database path
// this path should be accessible both from web applications and cli/cron applications
// absolute path (outside webroot) is preferred when deployed
$dbFile = '/tmp/subscriptions.db';