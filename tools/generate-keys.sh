#!/bin/sh
# see https://github.com/web-push-libs/web-push-php
openssl ecparam -genkey -name prime256v1 -out private_key.pem
openssl ec -in private_key.pem -pubout -outform DER|tail -c 65|base64 -w 0|tr -d '=' |tr '/+' '_-' > public_key.txt
openssl ec -in private_key.pem -outform DER|tail -c +8|head -c 32|base64 -w 0|tr -d '=' |tr '/+' '_-' > private_key.txt
