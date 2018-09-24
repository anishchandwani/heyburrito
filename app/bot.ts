import log from 'bog';
import parseMessage from './lib/parseMessage';
import { validBotMention, validMessage } from './lib/validator';
import  storeminator from './lib/storeminator';

const emojis:Array<object> = [];

interface eventInterface {
    subtype: string,
    channel: string,
    user: string,
    type: string
}

if (process.env.SLACK_EMOJI_INC) {
    const incEmojis = process.env.SLACK_EMOJI_INC.split(',');
    incEmojis.forEach(emoji => emojis.push({ type: 'inc', emoji }));
}

if (process.env.SLACK_EMOJI_DEC) {
    const incEmojis = process.env.SLACK_EMOJI_DEC.split(',');
    incEmojis.forEach(emoji => emojis.push({ type: 'dec', emoji }));
}

module.exports = ((rtm, botUserID:Function, getUserStats:Function, allBots:Function) => {
    function sendToUser(username, data) {
        log.info('Will send to user', username);
        log.info('With data', data);
    }

    function listener() {
        log.info('Listening on slack messages');
        rtm.on('message', (event:eventInterface) => {
            console.log("rtm.on", event)
            if ((!!event.subtype) && (event.subtype === 'channel_join')) {
                log.info('Joined channel', event.channel);
            }

            if (event.type === 'message') {
                if (validMessage(event, emojis, allBots)) {
                    if (validBotMention(event, botUserID)) {
                        // Geather data and send back to user
                        getUserStats(event.user).then((res) => {
                            sendToUser(event.user, res);
                        });
                    } else {
                        const result = parseMessage(event, emojis);
                        if (result) {
                            storeminator(result);
                        }
                    }
                }
            }
        });
    }
    return { listener };
});
