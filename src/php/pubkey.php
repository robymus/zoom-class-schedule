<?php
    /*
     * Returns the web push server public key
     */
    require_once 'config.php';
    header("Access-Control-Allow-Origin: *");
    header("Access-Control-Allow-Headers: *");
    header('Content-type: application/json');
    echo json_encode(["publicKey" => $applicationServerKey['public']]);
