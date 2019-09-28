'use strict';

const EventEmitter = require('events');
const puppeteer = require('puppeteer');
const Util = require('./util/Util');
const { 
    QR_CONTAINER_SELECTOR, 
    QR_VALUE_SELECTOR,
    KEEP_PHONE_CONNECTED_IMG_SELECTOR, 
    WhatsWebURL, 
    UserAgent, 
    DefaultOptions, 
    Events 
} = require('./util/Constants');

const { ExposeStore, LoadExtraProps, LoadCustomSerializers } = require('./util/Injected');

const { ExpodeWApi } = require('./util/wapi');

const ChatFactory = require('./factories/ChatFactory');
const Chat = require('./structures/Chat');
const Message = require('./structures/Message')
const Media = require('./structures/Media')

/**
 * Starting point for interacting with the WhatsApp Web API
 * @extends {EventEmitter}
 */
class Client extends EventEmitter {
    constructor(options = {}) {
        super();

        this.options = Util.mergeDefault(DefaultOptions, options);
        this.pupBrowser = null;
        this.pupPage = null;
    }

    /**
     * Sets up events and requirements, kicks off authentication request
     */
    async initialize() {

        const browser = await puppeteer.launch(this.options.puppeteer);
        const page = await browser.newPage();
        page.setUserAgent(UserAgent);

        // Set intance objects
        this.pupBrowser = browser;
        this.pupPage = page;

        if(this.options.session) {
            await page.evaluateOnNewDocument (
                session => {
                    localStorage.clear();
                    localStorage.setItem("WABrowserId", session.WABrowserId);
                    localStorage.setItem("WASecretBundle", session.WASecretBundle);
                    localStorage.setItem("WAToken1", session.WAToken1);
                    localStorage.setItem("WAToken2", session.WAToken2);
            }, this.options.session);
        }
        
        await page.goto(WhatsWebURL);

        if(this.options.session) {
            // Check if session restore was successfull 
            try {
                await page.waitForSelector(KEEP_PHONE_CONNECTED_IMG_SELECTOR, {timeout: 5000});
            } catch(err) {
                if(err.name === 'TimeoutError') {
                    this.emit(Events.AUTHENTICATION_FAILURE, 'Unable to log in. Are the session details valid?');
                    // browser.close();
                    
                    await this.waitQRCode();
                    return;
                } 

                throw err;
            }
           
       } else {
           await this.waitQRCode();
       }
       
        //await page.evaluate(ExposeStore);
        await page.evaluate(ExpodeWApi);
        
        // Get session tokens
        const localStorage = JSON.parse(await page.evaluate(() => {
			return JSON.stringify(window.localStorage);
        }));
                
        const session = {
            WABrowserId: localStorage.WABrowserId,
            WASecretBundle: localStorage.WASecretBundle,
            WAToken1: localStorage.WAToken1,
            WAToken2: localStorage.WAToken2
        }
        this.emit(Events.AUTHENTICATED, session);

        // Check Store Injection
        await page.waitForFunction('window.Store != undefined');
        
        //Load extra serialized props
        const models = [Message];
        for (let model of models) {
            await page.evaluate(LoadExtraProps, model.WAppModel, model.extraFields);
        }

        await page.evaluate(LoadCustomSerializers);

        // Register events
        await page.exposeFunction('onAddMessageEvent', data => {
          
            if (data.id.fromMe || !data.isNewMsg) return;
            let message = null;

            if(['ptt','image'].includes(data.type)){
                message = new Media(this,data); 
            }else{
                message = new Message(this,data); 
            }
            this.emit(Events.MESSAGE_CREATE, message);
        });

        await page.exposeFunction('onConnectionChangedEvent', (conn, connected) => {
            console.log(connected);
            if (!connected) {
                this.emit(Events.DISCONNECTED);
                //this.destroy();
            }
        })

        await page.evaluate(() => {
            Store.Msg.on('add', onAddMessageEvent);
            Store.Conn.on('change:connected', onConnectionChangedEvent);
        })

        this.emit(Events.READY);
    }

    async waitQRCode(){
        // Wait for QR Code
        await this.pupPage.waitForSelector(QR_CONTAINER_SELECTOR);

        const qr = await this.pupPage.$eval(QR_VALUE_SELECTOR, node => node.getAttribute('data-ref'));
        this.emit(Events.QR_RECEIVED, qr);

        // Wait for code scan
        await this.pupPage.waitForSelector(KEEP_PHONE_CONNECTED_IMG_SELECTOR, {timeout: 0});
    }

    async destroy() {
        await this.pupBrowser.close();
    }

    /**
     * 
     * Send a message to a specific chatId
     
     * @param {string} chatId
     * @param {string} message 
     */
    async sendMessage(chatId, message) {
        await this.pupPage.evaluate((chatId, message) => {
            window.WAPI.sendMessage2(chatId, message);
        }, chatId, message)
    }

    /**
     *  Send image to a specific chatId
     * 
     * @param {string} imgBase64 
     * @param {string} chatid 
     * @param {string} filename 
     * @param {string} caption 
     */
    async sendImage(imgBase64, chatid, filename, caption){        
        await this.pupPage.evaluate((imgBase64, chatid, filename, caption) => {
            window.WAPI.sendImage(imgBase64, chatid, filename, caption)
        },imgBase64, chatid, filename, caption)
    }

    /**
     * Get all current chat instances
     */
    async getChats() {
        let chats = await this.pupPage.evaluate(() => {
            return WAPI.getAllChats()
        });

        return chats;
    }

    /**
     * Get chat instance by ID
     * @param {string} chatId 
     */
    async getChatById(chatId) {
        let chat = await this.pupPage.evaluate(chatId => {
            return WWebJS.getChat(chatId);
        }, chatId);

        return ChatFactory.create(this, chat);
    }
}

module.exports = Client;
