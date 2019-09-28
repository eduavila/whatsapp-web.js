'use strict';

exports.WhatsWebURL = 'https://web.whatsapp.com/'

exports.UserAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/72.0.3626.109 Safari/537.36';

exports.DefaultOptions = {
    puppeteer: {
        headless: true,
        devtools: true
    },
    devtools: true,
    session: false
}

exports.Status = {
    INITIALIZING: 0,
    AUTHENTICATING: 1,
    READY: 3
}

exports.Events = {
    AUTHENTICATED: 'authenticated',
    AUTHENTICATION_FAILURE: 'auth_failure',
    READY: 'ready',
    MESSAGE_CREATE: 'message',
    QR_RECEIVED: 'qr',
    DISCONNECTED: 'disconnected'
}

exports.MessageTypes = {
    TEXT: 'chat',
    AUDIO: 'audio',
    VOICE: 'ptt',
    IMAGE: 'image',
    VIDEO: 'video',
    DOCUMENT: 'document',
    STICKER: 'sticker'
}

exports.ChatTypes = {
    SOLO: 'solo',
    GROUP: 'group',
    UNKNOWN: 'unknown'
}

exports.EMPTY_SALT = Buffer.alloc(32, 0);
exports.CRYPT_KEYS = Object.freeze({
    audio: "576861747341707020417564696f204b657973",
    document: "576861747341707020446f63756d656e74204b657973",
    image: "576861747341707020496d616765204b657973",
    ptt: "576861747341707020417564696f204b657973",
    sticker: "576861747341707020496d616765204b657973",
    video: "576861747341707020566964656f204b657973",
});

//
//  
//
exports.QR_CONTAINER_SELECTOR = '._2d3Jz';
exports.QR_VALUE_SELECTOR = '._1pw2F';


exports.KEEP_PHONE_CONNECTED_IMG_SELECTOR = '._1wSzK';