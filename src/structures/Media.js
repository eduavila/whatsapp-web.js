'use strict';
const Base = require('./Base');
const Util = require('../util/Util');
const Crypt = require('../util/Crypto');
const mime = require('mime-types');
const fs = require('fs');
const path = require('path');

const writeFilePromise = (file, data) => {
    return new Promise((resolve, reject) => {
        fs.writeFile(file, data, error => {
            if (error) reject(error);
            resolve("file created successfully with handcrafted Promise!");
        });
    });
};

/**
 * Represents a Media on WhatsApp
 * @extends {Base}
 */

class Media extends Base {
    constructor(client, data) {
        super(client);

        if(data) this._patch(data);
    }

    _patch(data) {
        this.id = data.id;
        this.body = data.body;
        this.type = data.type;
        this.timestamp = data.t;
        this.from = data.from;
        this.to = data.to;
        this.author = data.author;
        this.isForwarded = data.isForwarded;
        this.broadcast  = data.broadcast;
        this.clientUrl  = data.clientUrl;
        this.filehash   = data.filehash;
        this.size       = data.size;
        this.mediaKey   = data.mediaKey;
        this.mimetype   = data.mimetype;

        return super._patch(data);
    }

    /**
     * Returns the Chat this message was sent in
     */
    getChat() {
        return this.client.getChatById(this.from);
    }

    async downloadMedia() {
        const dataBuffer = await Util.downloadFile(this.clientUrl);
        
        try{
            return Crypt.decrypt(dataBuffer,this);
        }catch(error){
            throw error;
        }
    }

    async writeMedia(path) {
        try{
            const file = await this.downloadMedia();
            const ext = mime.extension(file.mimetype);

            var filePath = path.join(path,this.id.id + '.' + ext);
            await writeFilePromise(filePath);
        }catch(err){
            throw new Error(err);
        }
    }


    /**
     * Sends a message as a reply. If chatId is specified, it will be sent 
     * through the specified Chat. If not, it will send the message 
     * in the same Chat as the original message was sent.
     * @param {string} message 
     * @param {?string} chatId 
     */
    async reply(message, chatId) {
        if (!chatId) {
            chatId = this.from;
        }
        
        return await this.client.pupPage.evaluate((chatId, quotedMessageId, message) => {
            let quotedMessage = Store.Msg.get(quotedMessageId);
            if(quotedMessage.canReply()) {
                const chat = Store.Chat.get(chatId);
                chat.composeQuotedMsg = quotedMessage;
                window.Store.SendMessage(chat, message, {quotedMsg: quotedMessage});
                chat.composeQuotedMsg = null;
            } else {
                throw new Error('This message cannot be replied to.');
            }
            
        }, chatId, this.id._serialized, message);
    }

    static get WAppModel() {
        return 'Msg';
    }

    static get extraFields() {
        return [
            'isNewMsg'
        ];
    }
}

module.exports = Media;