/*
    Copyright (C) 2023 Alexander Emanuelsson (alexemanuelol)

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.

    https://github.com/alexemanuelol/rustplusplus

*/

const Constants = require("../util/constants");

module.exports = {
    inGameChatHandler: async function (rustplus, client, message = null) {
        const guildId = rustplus.guildId;
        const generalSettings = rustplus.generalSettings;
        const commandDelayMs = parseInt(generalSettings.commandDelay) * 1000;
        const trademark = generalSettings.trademark;
        const trademarkString = (trademark === 'NOT SHOWING') ? '' : `${trademark} | `;
        const messageMaxLength = Constants.MAX_LENGTH_TEAM_MESSAGE - trademarkString.length;

        /* Time to write a message from the queue. If message === null, that means that its a timer call. */
        if (message === null) {
            if (rustplus.inGameChatQueue.length !== 0) {
                clearTimeout(rustplus.inGameChatTimeout);
                rustplus.inGameChatTimeout = null;

                const messageFromQueue = rustplus.inGameChatQueue[0];
                rustplus.inGameChatQueue = rustplus.inGameChatQueue.slice(1);

                rustplus.messagesSentByBot.push(messageFromQueue);

                // Remove the first/oldest message in the list if past the history limit
                if (rustplus.messagesSentByBot.length === Constants.BOT_MESSAGE_HISTORY_LIMIT + 1) {
                    rustplus.messagesSentByBot.shift();
                }

                await rustplus.sendTeamMessageAsync(messageFromQueue);
                rustplus.log(client.intlGet(guildId, 'messageCap'), messageFromQueue);
            }
            else {
                clearTimeout(rustplus.inGameChatTimeout);
                rustplus.inGameChatTimeout = null;
            }
        }

        /* if there is a new message, add message to queue. */
        if (message !== null) {
            if (rustplus.team === null || rustplus.team.allOffline ||
                rustplus.generalSettings.muteInGameBotMessages) {
                return;
            }

            function handleMessage(messageStr) {
                const messageSegments = messageStr.match(new RegExp(`.{1,${messageMaxLength}}(\\s|$)`, 'g'));

                for (const messageSegment of messageSegments) {
                    const finalMessage = `${trademarkString}${messageSegment}`;

                    rustplus.inGameChatQueue.push(finalMessage);
                }
            }

            if (Array.isArray(message)) {
                for (const messageStr of message) {
                    handleMessage(messageStr)
                }
            }
            else if (typeof message === 'string') {
                handleMessage(message)
            }
        }

        /* Start new timer? */
        if (rustplus.inGameChatQueue.length !== 0 && rustplus.inGameChatTimeout === null) {
            rustplus.inGameChatTimeout = setTimeout(module.exports.inGameChatHandler, commandDelayMs, rustplus, client);
        }
    },
};
