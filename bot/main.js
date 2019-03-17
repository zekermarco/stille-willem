/*
 * Stille Willem discord bot.
 * By Anne Douwe and ZekerMarco.
 */

/**
 * Include necessary files.
 */
const Discord = require('discord.js');
const authCode = require('./auth.json');
const cfg = require('./cfg.json');
const commands = require('./commands.json');
const commandHelp = require('./commandshelp.json');
const fs = require('fs');

const client = new Discord.Client();
const version = '3.1.6';
const prefix = cfg.prefix;
const patatChance = 5;

/**
 * Get IDs from the config file.
 */
const guildId = cfg.guild;
const kokosnootId = cfg.roles.kokosnoot;
const gekoloniseerdId = cfg.roles.gekoloniseerd;
const inhetzonnetjeId = cfg.roles.inhetzonnetje;
const stamkroegverbodId = cfg.roles.stamkroegverbod;
const emoteloosId = cfg.roles.emoteloos;
const makkersId = cfg.roles.makkers;
const internationalId = cfg.roles.international;
const schandpaalId = cfg.channels.schandpaal;
const moderatieId = cfg.channels.moderatiezaken;
const logChannelId = cfg.channels.log;

/**
 * Get default durations from config file.
 */
const kokosnootDuration = cfg.defaultduration.kokosnoot;
const gekoloniseerdDuration = cfg.defaultduration.gekoloniseerd;
const inhetzonnetjeDuration = cfg.defaultduration.inhetzonnetje;
const stamkroegverbodDuration = cfg.defaultduration.stamkroegverbod;
const emoteloosDuration = cfg.defaultduration.emoteloos;

/**
 * Initialize variables.
 */
let guild;
let botId;
let kokosnootRole, gekoloniseerdRole, inhetzonnetjeRole, stamkroegverbodRole, emoteloosRole, makkersRole, internationalRole;
let schandpaalChannel, moderatieChannel, logChannel;

/**
 * Define rolesDb array and assign roles.json to it.
 */
let rolesDb = [];
if (fs.existsSync('./roles.json')) {
    rolesDb = JSON.parse(fs.readFileSync('./roles.json'));
}

/**
 * Used to write to the roles.json file.
 */
['pop', 'push', 'reverse', 'shift', 'unshift', 'splice', 'sort'].forEach((m) => {
    rolesDb[m] = function () {
        Array.prototype[m].apply(rolesDb, arguments);
        fs.writeFileSync('./roles.json', JSON.stringify(rolesDb));
    }
});

/**
 * Adds an entry to the role database
 *
 * @param {Role} role Role to add to the databse
 * @param {GuildMember} member Member who got the role
 * @param {String} reason Reason for the role
 * @param {Date} startTime Start time for the role
 * @param {Date} endTime Expiration time for the role
 * @param {GuildMember} punisher Member who gave the role
 * @param {Boolean} isInternational If the member is international or not
 * @param {String} announcement Announcement message ID
 */
function addToRolesDb(role, member, reason, startTime, endTime, punisher, isInternational, announcement) {
    rolesDb.push({
        role: role.id,
        member: member.id,
        reason: reason,
        startTime: startTime,
        endTime: endTime,
        punisher: punisher.id,
        isInternational: isInternational,
        announcement: announcement
    });
}

/**
 * Function used to format the date. Adds a 0 in front. if the parameter < 10.
 *
 * @param {Number} n Number to format
 * @returns Formatted number or string
 */
function path(n) {
    return n < 10 ? '0' + n : n;
}

/**
 * Formats the date.
 *
 * @param {Date} date Date to format.
 * @returns String that contains the formatted date.
 */
function formatDate(date) {
    return `${path(date.getHours())}:${path(date.getMinutes())} op ${path(date.getDate())}-${path(date.getMonth() + 1)}-${path(date.getFullYear())}`;
};

/**
 * Creates a discord rich embed for announcing the role
 *
 * @param {User} user User who gave the role
 * @param {GuildMember} member Member who received the role
 * @param {String} text Text to display as subtitle
 * @param {Date} time Expiration time for the role
 * @param {Color} color Color of the announcement
 * @param {String} reason Reason for giving the role
 *
 * @returns Discord rich embed representing the announcement for the role
 */
function getAnnouncement(user, member, text, time, color, reason) {
    const announcement = new Discord.RichEmbed();
    announcement.setTimestamp();
    announcement.setTitle('Zeg Makker');
    announcement.setThumbnail(member.user.avatarURL);
    announcement.setColor(color);
    announcement.setAuthor(user.username, user.displayAvatarURL);
    announcement.setDescription(text);

    if (time === 'inf') {
        announcement.addField('Tot', 'Onbepaalde eindtijd');
    }
    else {
        announcement.addField('Tot', formatDate(time));
    }

    if (reason) {
        announcement.addField('Reden', reason);
    }

    return announcement;
}

/**
 * Creates and returns a discord rich embed used for command logging
 *
 * @param {User} user User that used the command
 * @param {String} command Command that was used
 * @param {GuildChannel} channel Channel that the command was used in
 *
 * @returns Discord rich embed representing a command log
 */
function getCommandLog(user, command, channel) {
    const logMessage = new Discord.RichEmbed();
    logMessage.setTimestamp();
    logMessage.setDescription(`${user} heeft een commando gebruikt in ${channel}`);
    logMessage.addField('Commando', command);
    logMessage.setAuthor(user.tag, user.displayAvatarURL);
    logMessage.setColor([225, 225, 0]);

    return logMessage;
}

/**
 * Creates and returns a discord rich embed for logging when a user takes a role
 * from a guild member.
 *
 * @param {User} user User that took the role
 * @param {GuildMember} member Member that the role was taken from
 * @param {Role} role Role that was taken
 *
 * @returns Discord rich embed
 */
function getFreeLog(user, member, role) {
    const freeMessage = new Discord.RichEmbed();
    freeMessage.setTimestamp();
    freeMessage.setDescription(`${user} heeft de ${role} rol van ${member.user} afgenomen.`);
    freeMessage.setAuthor(user.tag, user.displayAvatarURL);
    freeMessage.setColor('GREEN');

    return freeMessage;
}

/**
 * Creates and returns a discord rich embed for logging potential errors.
 *
 * @param {User} user User that used the command that threw an error
 * @param {String} command Command that threw an error
 * @param {String} error Error that was thrown
 *
 * @returns Discord rich embed
 */
function getErrorLog(user, command, error) {
    const errorMessge = new Discord.RichEmbed();
    errorMessge.setTimestamp();
    errorMessge.setDescription(`Error bij het uitvoeren van een commando door ${user}`);
    errorMessge.addField('Commando', command);
    errorMessge.addField('Error', error);
    errorMessge.setAuthor(user.tag, user.displayAvatarURL);
    errorMessge.setColor([225, 0, 0]);

    return errorMessge;
}

/**
 * Sends a message to a channel.
 *
 * @param {GuildChannel} channel Channel to send the message to
 * @param {String} message Message to send
 */
function sendMessage(channel, message) {
    channel.send(message).catch((err) => {
        console.error(`Error sending message to ${channel.name}: `, err);
    });
}

/**
 * Sends an error message to a channel. Error messages are deleted after 10
 * seconds.
 *
 * @param {GuildChannel} channel Channel to send the message to
 * @param {String} message Message to send
 */
function sendErrorMessage(channel, message) {
    channel.send(message).then((msg) => {
        setTimeout(() => {
            msg.delete().catch((err) => {
                console.error(`Could not delete message with ID ${msg.id}: `, err);
            });
        }, 10 * 1000);
    }).catch((err) => {
        console.error(`Error sending message to ${channel.name}: `, err);
    });
}

/**
 * Searches for a role with the specified role ID.
 *
 * @param {Guild} guild Guild to find the role from
 * @param {String} roleId Role ID to find the role from
 *
 * @returns The role with specified role ID
 */
function getRole(guild, roleId) {
    newRole = guild.roles.find((role) => {
        if (roleId === role.id) {
            return role;
        }
    });

    if (!newRole) {
        console.log(`Error: could not find role with ID ${roleId}`);
    }

    return newRole;
}

/**
 * Searches for a role with the specified name.
 * CURRENTLY UNUSED
 *
 * @param {Guild} guild Guild to find the role from
 * @param {String} roleName Role name to search for
 *
 * @returns Role with specified name
 */
function getRoleFromName(guild, roleName) {
    newRole = guild.roles.find((role) => {
        if (roleName === role.name) {
            return role;
        }
    });

    if (!newRole) {
        console.log(`Error: could not find role with neme ${roleName}`);
    }

    return newRole;
}

/**
 * Finds a channel with specified channel ID.
 *
 * @param {Guild} guild Guild to search channel from
 * @param {String} channelId Channel ID to search for
 *
 * @returns Channel with specified ID
 */
function getChannel(guild, channelId) {
    newChannel = guild.channels.find((channel) => {
        if (channelId === channel.id) {
            return channel;
        }
    });

    if (!newChannel) {
        console.log(`Error: could not find channel with ID ${channelId}`);
    }

    return newChannel;
}

/**
 * Searches for a member by tag.
 *
 * @param {Guild} guild Guild to search tag from
 * @param {String} memberTag Tag to search for
 *
 * @returns Member with specified tag
 */
function getMemberFromTag(guild, memberTag) {
    newMember = guild.members.find((member) => {
        if (memberTag === member.user.tag) {
            return member;
        }
    });

    if (!newMember) {
        console.log(`Error: could not find member with tag ${memberTag}`);
    }

    return newMember;
}

/**
 * Searches for a member by ID.
 *
 * @param {Guild} guild Guild to search ID from
 * @param {String} memberId ID to search for
 *
 * @returns Member with specified ID
 */
function getMemberFromId(guild, memberId) {
    newMember = guild.members.find((member) => {
        if (memberId === member.id) {
            return member;
        }
    });

    if (!newMember) {
        console.log(`Error: could not find member with ID ${memberId}`);
    }

    return newMember;
}

/**
 * Checks if a member has a certain role.
 *
 * @param {GuildMember} member Member to check role for
 * @param {String} roleId Role to check for
 *
 * @returns {Boolean} Whether the member has the role
 */
function hasRole(member, roleId) {
    return member.roles.filter((role) => {
        return roleId === role.id;
    }).first();
}

/**
 * Adds a role to a member.
 *
 * @param {GuildMember} member Member to give role to
 * @param {Role} role Role to give
 */
function addRole(member, role) {
    member.addRole(role).then(() => {
        console.log(`Added ${role.name} for member ${member.user.tag} with ID ${member.id}`);
    }).catch((err) => {
        console.error(`Error adding ${role.name} for member ${member.user.tag} with ID ${member.id}`, err);
    });
}

/**
 * Removes a role from a member.
 *
 * @param {GuildMember} member Member to take role from
 * @param {Role} role Role to take
 */
function removeRole(member, role) {
    member.removeRole(role).then(() => {
        console.log(`Removed ${role.name} for member ${member.user.tag} with ID ${member.id}`);
    }).catch((err) => {
        console.error(`Error removing ${role.name} for member ${member.user.tag} with ID ${member.id}`, err);
    });
}

/**
 * Returns the default duration for the specified role in hours. If the role is a
 * string and therefore a timestamp, it calculates the default duration from the
 * timestamp.
 *
 * @param {Role} role Role to get the default duration from
 *
 * @returns The default duration of a role in hours.
 */
function getDefaultDuration(role) {
    const roleId = role.id;
    let duration;

    switch (roleId) {
        case kokosnootId:
            duration = kokosnootDuration;
            break;
        case gekoloniseerdId:
            duration = gekoloniseerdDuration;
            break;
        case inhetzonnetjeId:
            duration = inhetzonnetjeDuration;
            break;
        case stamkroegverbodId:
            duration = stamkroegverbodDuration;
            break;
        case emoteloosId:
            duration = emoteloosDuration;
            break;
    }

    if (typeof duration === 'string') {
        return calculateDurationFromTimestamp(duration);
    }
    else {
        return duration;
    }
}

/**
 * Genarates and returns a random integer between the specified numbers. Both
 * numbers are inclusive.
 *
 * @param {Number} min Minimum number (inclusive)
 * @param {Number} max Maximum number (inclusive)
 *
 * @returns Random number between min and max (inclusive)
 */
function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Every 10 seconds, checks for all members in the roles database if the role
 * has expired. If it has, removes the role and adds back Makkers or International.
 * If the role is Kokosnoot, Gekoloniseerd or Stamkroegverbod, the freedom
 * is announced in the announcement channel.
 * The announcement for giving the role is then removed and the entry is
 * removed from the roles database.
 * Finally, sends a log message to the log channel.
 */
setInterval(() => {
    rolesDb.forEach((item, index, all) => {
        if ((new Date(item.endTime)).getTime() <= (new Date()).getTime()) {
            const member = getMemberFromId(guild, item.member);
            const isInternational = item.isInternational;
            let announceFreedom = false;
            let giveBackRole = false;
            let role;

            switch (item.role) {
                case kokosnootId:
                    removeRole(member, kokosnootRole);
                    role = kokosnootRole;
                    announceFreedom = true;
                    giveBackRole = true;
                    break;
                case gekoloniseerdId:
                    removeRole(member, gekoloniseerdRole);
                    role = gekoloniseerdRole;
                    announceFreedom = true;
                    giveBackRole = true;
                    break;
                case stamkroegverbodId:
                    removeRole(member, stamkroegverbodRole);
                    role = stamkroegverbodRole;
                    announceFreedom = true;
                    break;
                case inhetzonnetjeId:
                    removeRole(member, inhetzonnetjeRole);
                    role = inhetzonnetjeRole;
                    break;
                case emoteloosId:
                    removeRole(member, emoteloosRole);
                    role = emoteloosRole;
                    break;
            }

            if (giveBackRole) {
                if (isInternational) {
                    addRole(member, internationalRole);
                }
                else {
                    addRole(member, makkersRole);
                }
            }

            if (announceFreedom) {
                schandpaalChannel.send(`Zeg Makker, ${member.user} is weer onafhankelijk verklaard!`).then((message) => {
                    setTimeout(() => {
                        message.delete().catch((err) => {
                            console.error(`Could not delete message with ID ${message.id}: `, err);
                        });;
                    }, 60 * 1000);
                }).catch((err) => {
                    console.error("Error posting message to announcement channel: ", err);
                    sendMessage(logChannel, getErrorLog(getMemberFromId(guild, botId).user, "Geen", `Het bevrijdingsbericht kon niet in de schandpaal gestuurd worden.`));
                });
            }

            schandpaalChannel.fetchMessage(item.announcement).then((message) => {
                message.delete().catch((err) => {
                    console.error(`Could not delete message with ID ${message.id}: `, err);
                });;
            }).catch((err) => {
                console.error("Error deleting announcement: ", err);
                sendMessage(logChannel, getErrorLog(getMemberFromId(guild, botId).user, "Geen", `De announcement kon niet verwijderd worden.`));
            });

            all.splice(index, 1);
            sendMessage(logChannel, getFreeLog(getMemberFromId(guild, botId).user, member, role));
        }
    });
}, 10 * 1000);

/**
 * Ready event, triggers when the bot is loaded and logged in.
 * Defines guild, role and channel variables.
 */
client.on('ready', () => {
    guild = client.guilds.find((guild) => {
        return guild.id === guildId;
    });

    botId = client.user.id;

    kokosnootRole = getRole(guild, kokosnootId);
    gekoloniseerdRole = getRole(guild, gekoloniseerdId);
    inhetzonnetjeRole = getRole(guild, inhetzonnetjeId);
    stamkroegverbodRole = getRole(guild, stamkroegverbodId);
    emoteloosRole = getRole(guild, emoteloosId);
    makkersRole = getRole(guild, makkersId);
    internationalRole = getRole(guild, internationalId);

    schandpaalChannel = getChannel(guild, schandpaalId);
    moderatieChannel = getChannel(guild, moderatieId);
    logChannel = getChannel(guild, logChannelId);

    console.log(`Logged in as ${client.user.tag}`);
});

/**
 * Triggers when a member is added to the guild.
 * Gives back the role they had if they are still in the roles database.
 * Removes Makkers and International if applicable.
 */
client.on('guildMemberAdd', (member) => {
    rolesDb.forEach((item, index, all) => {
        if (member.id == item.member) {
            const role = getRole(guild, item.role);

            addRole(member, role);
            if (role == kokosnootRole || role == gekoloniseerdRole) {
                removeRole(member, makkersRole);
                removeRole(member, internationalRole);
            }
        }
    });
});

/**
 * Triggers when a member is removed from the guild.
 * Posts a message in the mod channel indicating that the user has left with
 * a punishment role.
 */
client.on('guildMemberRemove', (member) => {
    rolesDb.forEach((item, index, all) => {
        if (member.id == item.member && (item.role == kokosnootId || item.role == gekoloniseerdId)) {
            sendMessage(moderatieChannel, `${member} heeft de server met een strafrol verlaten! De rol was ${getRole(guild, item.role).name}.`);
        }
    });
});

/**
 * Triggers when a message is sent in any channel where the bot has
 * Read Message permissions.
 * If a message starts with the prefix and the message author has the
 * Manage Roles permission, split the message into arguments, delete it and pass
 * it to handleCommands.
 */
client.on('message', (msg) => {
    if (msg.content.charAt(0) == prefix && (msg.member.hasPermission('MANAGE_ROLES'))) {
        const args = msg.content.slice(prefix.length).split(/ +/);

        msg.delete().catch((err) => {
            console.error(`Could not delete message with ID ${msg.id}: `, err);
        });;

        handleCommands(msg, args);
    }
    else if ((/^[W|w]{1}[A|a]{1}[T|t]{1}[?]*$/).test(msg.content)) {
        if(getRandomInt(1, patatChance) === patatChance) {
            msg.react('🍟');
        }
    }
});

/**
 * Handles the commands.
 *
 * @param {*} msg The message that was detected.
 * @param {*} args The arguments the message conists of.
 */
function handleCommands(msg, args) {
    sendMessage(logChannel, getCommandLog(msg.author, msg.content, msg.channel));

    switch (args[0]) {
        case 'zeg':
            getZegMessage(msg, args);
            break;
        case 'help':
            if (args.length == 1) {
                displayHelpDialog(msg);
            }
            else {
                displayHelp(msg, args[1]);
            }
            break;

        case 'versie':
            sendMessage(msg.channel, `Versie ${version}`);
            break;

        case 'dbcontents':
        case 'todo':
            getDbContent(msg, args);
            break;
        case 'maakschoon':
        case 'dbcleanup':
            dbCleanup(msg);
            break;

        case 'kokosnoot':
            giveRole(msg, args, kokosnootRole, true);
            break;
        case 'ontkokosnoot':
            takeRole(msg, args, kokosnootRole, true, true);
            break;
        case 'koloniseer':
            giveRole(msg, args, gekoloniseerdRole, true);
            break;
        case 'ontkoloniseer':
            takeRole(msg, args, gekoloniseerdRole, true, true);
            break;
        case 'stamkroegverbod':
            giveRole(msg, args, stamkroegverbodRole, false);
            break;
        case 'stamkroegtoelating':
            takeRole(msg, args, stamkroegverbodRole, false, true);
            break;
        case 'inhetzonnetje':
            giveRole(msg, args, inhetzonnetjeRole, false);
            break;
        case 'uithetzonnetje':
            takeRole(msg, args, inhetzonnetjeRole, false, false);
            break;
        case 'emoteloos':
            giveRole(msg, args, emoteloosRole, false);
            break;
        case 'emoterijk':
            takeRole(msg, args, emoteloosRole, false, false);
            break;

        case 'tijd':
            sendMessage(msg.channel, `Het commando -tijd wordt niet meer ondersteund. Je kunt nu de tijd veranderen door het commando dat de rol geeft te gebruiken:\nAls Gebruiker#0001 de Kokosnoot rol heeft, dan kan de tijd worden veranderd door \`-kokosnoot @Gebruiker#0001 3u\` te gebruiken.`)
            break;

        default:
            sendErrorMessage(msg.channel, `Kan commando \`${prefix}${args[0]}\` niet herkennen. Typ \`-help\` voor een lijst met commando's.`);
            sendMessage(logChannel, getErrorLog(msg.author, msg.content, `Commando bestaat niet.`));
    }
}

/**
 * Handles the '-zeg' command.
 * First, the optional channel argument is detected and then processed: the ID
 * of the destination channel is set.
 * Then, the message is composed and sent to the desired channel.
 * If no message was given, but the channel argument is present, returns early.
 * If the destination channel doesn't exist in the guild, returns early.
 *
 * @param {*} msg The message that was detected.
 * @param {*} args The arguments the message is composed of.
 */
function getZegMessage(msg, args) {
    let sendToChannel = false;
    let destinationChannelId;
    let destinationChannel;

    if (args.length - 2 > 1 && args[args.length - 2] == '>') {
        sendToChannel = true;
    }
    else if (args.length - 2 == 1 && args[args.length - 2] == '>') {
        sendErrorMessage(msg.channel, `Er is geen bericht meegegeven!`);
        return;
    }
    else if (args[1] == '-zeg') {
        sendErrorMessage(msg.channel, `Geneste -zeg commando's zijn niet toegestaan.`);
        return;
    }

    if (sendToChannel) {
        destinationChannelId = args[args.length - 1].substring(2, args[args.length - 1].length - 1);

        if (msg.guild.channels.has(destinationChannelId)) {
            destinationChannel = getChannel(guild, destinationChannelId);

            if (destinationChannel.id == logChannel.id) {
                sendErrorMessage(msg.channel, `Je kunt geen bericht in het logkanaal plaatsen.`);
                return;
            }
        }
        else {
            sendErrorMessage(msg.channel, `Kan kanaal \`${args[args.length - 1]}\` niet vinden!`);
            return;
        }
    }
    else {
        destinationChannel = msg.channel;
    }

    sendZegMessage(msg, args, destinationChannel, sendToChannel);
}

/**
 * Composes and sends the message to the desired channel.
 *
 * @param {*} msg The message that was detected.
 * @param {*} args The arguments the message is composed of.
 * @param {*} dest The destinationchannel of the message.
 * @param {boolean} toChannel If the channel argument is present or not.
 */
function sendZegMessage(msg, args, dest, toChannel) {
    let output = '';

    for (let i = 1; i < args.length; i++) {
        const el = args[i];

        if (toChannel && i == args.length - 3) {
            output += el;
            break;
        }
        else if (!toChannel && i == args.length - 1) {
            output += el;
            break;
        }
        else {
            output += el + ' ';
        }
    }

    dest.send(output).catch((err) => {
        sendErrorMessage(msg.channel, `Ik heb geen rechten om in ${dest} te praten :(`);
        console.error(`Error sending message: `, err);
        sendMessage(logChannel, getErrorLog(msg.author, msg.content, `De bot heeft geen rechten om in ${dest} te praten.`));
    });
}

/**
 * Shows a help dialog for all commands.
 *
 * @param {*} msg The message that was detected.
 */
function displayHelpDialog(msg) {
    const message =
        `Lijst van commando's:
\`\`\`
-help [commando]
${commands.misc.help}

-zeg <bericht> [> #kanaal]
${commands.misc.zeg}

-kokosnoot <gebruikers> [reden] [tijd|tijdstip]
${commands.rolecommands.kokosnoot}

-ontkokosnoot <gebruikers>
${commands.rolecommands.ontkokosnoot}

-koloniseer <gebruikers> [reden] [tijd|tijdstip]
${commands.rolecommands.koloniseer}

-ontkoloniseer <gebruikers>
${commands.rolecommands.ontkoloniseer}

-stamkroegverbod <gebruikers> [reden] [tijd|tijdstip]
${commands.rolecommands.stamkroegverbod}

-stamkroegtoelating <gebruikers>
${commands.rolecommands.stamkroegtoelating}

-emoteloos <gebruikers> [reden] [tijd|tijdstip]
${commands.rolecommands.emoteloos}

-emoterijk <gebruikers>
${commands.rolecommands.emoterijk}

-inhetzonnetje <gebruikers> [reden] [tijd|tijdstip]
${commands.rolecommands.inhetzonnetje}

-uithetzonnetje <gebruikers>
${commands.rolecommands.uithetzonnetje}

-tijd <gebruikers> <rolnaam> <tijd|tijdstip>
${commands.misc.tijd}

-dbcontents (alias: -todo)
${commands.databasecommands.dbcontents}

-dbcleanup (alias: -maakschoon)
${commands.databasecommands.dbcleanup}
\`\`\``

    sendMessage(msg.channel, message);
}

/**
 * Shows a help dialog for a specific command.
 *
 * @param {*} msg The message that was detected.
 * @param {*} command The command to show help for.
 */
function displayHelp(msg, command) {
    let foundCommand = false;

    commandHelp.forEach((element) => {
        if (element.command == command) {
            let examples = "";

            element.examples.forEach((ex) => {
                examples += '`' + ex.example + '` - ' + ex.info + '\n';
            });

            sendMessage(msg.channel, `**Commando:** \`-${element.command}\`\n**Functie:** ${element.function}\n**Info:** ${element.info}\n**Gebruik:** \`${element.usage}\`\n**Voorbeelden:**\n${examples}`);
            foundCommand = true;
        }
    });

    if (!foundCommand) {
        sendMessage(msg.channel, `Het commando \`${command}\` bestaat niet. Typ \`-help\` voor een lijst met commando's.`);
    }
}

//******************GIVING A ROLE******************//

/**
 * @param {*} msg
 * @param {*} args
 * @param {*} role
 */
function giveRole(msg, args, role, takeMakkersRole) {
    let members = getMembersFromMessage(msg, args, role, 0);
    let endTime = calculateTime(msg, args, role);
    let reason = getReason(args);
    let hasTime = true;

    if (!members) {
        console.log("Command was run, but nothing was done.");
        sendMessage
        sendMessage(logChannel, getErrorLog(msg.author, msg.content, `Er waren geen gebruikers om de rol aan te geven.`));
        return;
    }
    else if (!endTime) {
        console.log("Wrongly specified time.");
        sendMessage(logChannel, getErrorLog(msg.author, msg.content, `De tijd of het tijdstip was niet in het goede formaat.`));
        return;
    }
    else if (endTime == -1) {
        hasTime = false;
        endTime = new Date((new Date()).getTime() + (getDefaultDuration(role) * 60 * 60 * 1000));
    }
    else if (reason === "") {
        reason = false;
    }

    /*********LOGGING*********/
    console.log("Members:");
    for (let i = 0; i < members.length; i++) {
        const el = members[i];
        console.log("Tag: " + el.user.tag + " - ID: " + el.id);
    }

    console.log("End time: " + endTime);
    console.log("Reason: " + reason);
    /*************************/

    for (let i = 0; i < members.length; i++) {
        const el = members[i];
        let announcement = getAnnouncement(msg.author, el, `${el} heeft nu ${role}`, endTime, role.hexColor, reason);
        let isInternational = false;

        if (hasRole(el, role.id)) {
            rolesDb.forEach((item, index, all) => {
                if (el.id == item.member && role.id == item.role) {
                    if (!reason) {
                        reason = item.reason;
                    }
                    if (!hasTime) {
                        endTime = new Date(item.endTime);
                    }

                    announcement = getAnnouncement(getMemberFromId(guild, item.punisher).user, el, `${el} heeft nu ${role}`, endTime, role.hexColor, reason);
                    schandpaalChannel.fetchMessage(item.announcement).then((message) => {
                        message.edit(message.content, announcement);
                    }).catch((err) => {
                        console.error("Error editing announcement: ", err);
                        sendMessage(logChannel, getErrorLog(getMemberFromId(guild, botId).user, "Geen", `De announcement kon niet bewerkt worden.`));
                    });

                    all.splice(index, 1);

                    addToRolesDb(getRole(guild, item.role),
                        getMemberFromId(guild, item.member),
                        reason,
                        item.startTime,
                        endTime,
                        getMemberFromId(guild, item.punisher),
                        item.isInternational,
                        item.announcement
                    );
                }
            });
        }
        else {
            if (hasRole(el, internationalId)) {
                isInternational = true;
            }
            if (role == gekoloniseerdRole && hasRole(el, kokosnootId)) {
                removeRole(el, kokosnootRole);

                rolesDb.forEach((item, index, all) => {
                    if(item.member == el.id && item.role == kokosnootId) {
                        schandpaalChannel.fetchMessage(item.announcement).then((message) => {
                            message.delete().catch((err) => {
                                console.error(`Could not delete message with ID ${message.id}: `, err);
                            });;
                        }).catch((err) => {
                            console.error("Error deleting announcement: ", err);
                            sendMessage(logChannel, getErrorLog(msg.author, msg.content, `De announcement kon niet verwijderd worden.`));
                        });

                        all.splice(index, 1);
                    }
                });
            }

            // Send announcement to channels
            if (msg.channel != schandpaalChannel) {
                sendMessage(msg.channel, announcement);
            }

            schandpaalChannel.send(announcement).then((message) => {
                addToRolesDb(role, el, reason, new Date(), endTime, msg.author, isInternational, message.id);
            }).catch((err) => {
                console.error("Error posting announcement: ", err);
                sendMessage(logChannel, getErrorLog(msg.author, msg.content, `Het announcement kon niet in de schandpaal worden gestuurd.`));
            });

            sendMessage(logChannel, announcement);

            // Add/Remove roles
            addRole(el, role);
            if (takeMakkersRole) {
                if (isInternational) {
                    removeRole(el, internationalRole);
                }
                else {
                    removeRole(el, makkersRole);
                }
            }
        }
    }
}

function getMembersFromMessage(msg, args, role, mode) {
    let tags = getTags(args);
    let members = [];

    if (tags.length == 0) {
        sendErrorMessage(msg.channel, `Er zijn geen gebruikers opgegeven!`);
        return null;
    }

    for (let i = 0; i < tags.length; i++) {
        const el = tags[i];
        // let type;
        let newMember;

        if ((/^.+#\d{4}$/).test(el)) {
            newMember = getMemberFromTag(guild, el);
            // type = 'tag';
        }
        else if ((/^\d{18}$/).test(el)) {
            newMember = getMemberFromId(guild, el);
            // type = 'id';
        }

        if (newMember) {
            if (mode == 0) {//&& !hasRole(newMember, role.id)) {
                members.push(newMember);
            }
            else if (mode == 1 && hasRole(newMember, role.id)) {
                members.push(newMember);
            }
            // else if (mode == 0) {
            //     sendErrorMessage(msg.channel, `Jij dwaas! \`${newMember.user.tag}\` heeft al ${role.name}!`);
            // }
            else if (mode == 1) {
                sendErrorMessage(msg.channel, `Jij dwaas! \`${newMember.user.tag}\` heeft geen ${role.name}!`);
            }
        }
        else {
            sendErrorMessage(msg.channel, `Kan gebruiker \`${el}\` niet vinden.`);
        }
    }

    if (members.length == 0) {
        return null;
    }

    return members;
}

function getTags(args) {
    let tags = [];

    for (let i = 1; i < args.length; i++) {
        const el = args[i];
        if ((/^.+#\d{4}$/).test(el)) {
            console.log("Found tag: " + el);
            tags.push(el);
        }
        else if ((/^\d{18}$/).test(el)) {
            console.log("Found ID: " + el);
            tags.push(el);
        }
        else if ((/^<@\d{18}>$/).test(el)) {
            const id = el.substring(2, el.length - 1);
            console.log("Found ID: " + id);
            tags.push(id);
        }
        else if ((/^<@!\d{18}>$/).test(el)) {
            const id = el.substring(3, el.length - 1);
            console.log("Found ID: " + id);
            tags.push(id);
        }
        else {
            break;
        }
    }

    return tags;
}

function calculateTime(msg, args, role) {
    let duration = getDuration(msg, args, role);
    let time;

    if (duration == null) {
        return null;
    }
    else if (duration == -1) {
        return -1;
    }
    else {
        time = new Date((new Date()).getTime() + (duration * 60 * 60 * 1000));
    }

    return time;
}

function getDuration(msg, args, role) {
    let useTime = false;
    let useTimestamp = false;
    let time;
    let duration;

    if ((/^[0-9]+[d|u|m|s]{1}$/).test(args[args.length - 1])) {
        useTime = true;
        time = args[args.length - 1];
    }
    else if ((/^[0-9]{1,2}:[0-9]{2}$/).test(args[args.length - 1])) {
        useTimestamp = true;
        time = args[args.length - 1];
    }
    else if ((/[0-9]+[d|u|m|s]{1}/).test(args[args.length - 1])) {
        sendMessage(msg.channel, `\`${args[args.length - 1]}\` is geen geldige tijd.`);
        return null;
    }
    else if ((/[0-9]{0,2}:[0-9]{0,2}$/).test(args[args.length - 1])) {
        sendMessage(msg.channel, `\`${args[args.length - 1]}\` is geen geldige tijd.`);
        return null;
    }

    if (useTime) {
        duration = calculateDuration(time);
    }
    else if (useTimestamp) {
        duration = calculateDurationFromTimestamp(time);
        if(duration == null) {
            sendMessage(msg.channel, `\`${args[args.length - 1]}\` is geen geldige tijd.`);
            return null;
        }
    }
    else {
        // duration = getDefaultDuration(role);
        return -1;
    }

    return duration;
}

function calculateDuration(time) {
    const postfix = time.substring(time.length - 1);
    let duration = time.substring(0, time.length - 1);

    switch (postfix) {
        case 'd':
            return duration * 24;
        case 'u':
            return duration;
        case 'm':
            return duration / 60;
        case 's':
            return duration / 60 / 60;
        default:
            console.log("Something went wrong :(");
            return 0;
    }
}

function calculateDurationFromTimestamp(timestamp) {
    let args = timestamp.split(':');
    let hours = args[0];
    let minutes = args[1];
    let time = new Date();
    let today = new Date();

    if(hours > 23 || minutes > 59) {
        return null;
    }

    if (today.getHours() == hours && today.getMinutes() >= minutes) {
        time.setDate(today.getDate() + 1);
    }
    else if (today.getHours() > hours) {
        time.setDate(today.getDate() + 1);
    }

    time.setHours(hours);
    time.setMinutes(minutes);
    time.setSeconds(0);

    return Math.abs(today - time) / 36e5;
}

function getReason(args) {
    let reason = "";
    let hasTime = false;

    if ((/^[0-9]+[d|u|m|s]{1}$/).test(args[args.length - 1]) || (/^[0-9]{1,2}:[0-9]{2}$/).test(args[args.length - 1])) {
        hasTime = true;
    }

    for (let i = 1; i < args.length; i++) {
        const el = args[i];

        if ((/^.+#\d{4}$/).test(el)) {
            continue;
        }
        else if ((/^\d{18}$/).test(el)) {
            continue;
        }
        else if ((/^<@\d{18}>$/).test(el)) {
            continue;
        }
        else if ((/^<@!\d{18}>$/).test(el)) {
            continue;
        }
        else if (hasTime && i == args.length - 1) {
            break;
        }
        else {
            reason += el + ' ';
        }
    }

    return reason.trim();
}
//*******************************//

//***********TAKE ROLE***********//
function takeRole(msg, args, role, giveBackRole, announceFreedom) {
    let members = getMembersFromMessage(msg, args, role, 1);

    if (!members) {
        console.log("Command was run, but nothing was done.");
        sendMessage(logChannel, getErrorLog(msg.author, msg.content, `Er waren geen gebruikers om de rol van af te nemen.`));
        return;
    }

    for (let i = 0; i < members.length; i++) {
        const el = members[i];
        let found = false;

        // if(el === msg.member) {
        //     sendMessage(msg.channel, `Zeg Makker, je mag jezelf niet bevrijden >:(`);
        //     continue;
        // }

        rolesDb.forEach((item, index, all) => {
            if (el.id == item.member && role.id == item.role) {
                // Add/Remove roles
                removeRole(el, role);

                if (giveBackRole) {
                    if (item.isInternational) {
                        addRole(el, internationalRole);
                    }
                    else {
                        addRole(el, makkersRole);
                    }
                }

                if (announceFreedom) {
                    schandpaalChannel.send(`Zeg Makker, ${el.user} is weer onafhankelijk verklaard!`).then((message) => {
                        setTimeout(() => {
                            message.delete().catch((err) => {
                                console.error(`Could not delete message with ID ${message.id}: `, err);
                            });;
                        }, 60 * 1000);
                    }).catch((err) => {
                        console.error("Error posting message to announcement channel: ", err);
                        sendMessage(logChannel, getErrorLog(msg.author, msg.content, `Het bevrijdingsbericht kon niet in de schandpaal gestuurd worden.`));
                    });
                }

                schandpaalChannel.fetchMessage(item.announcement).then((message) => {
                    message.delete().catch((err) => {
                        console.error(`Could not delete message with ID ${message.id}: `, err);
                    });;
                }).catch((err) => {
                    console.error("Error deleting announcement: ", err);
                    sendMessage(logChannel, getErrorLog(msg.author, msg.content, `De announcement kon niet verwijderd worden.`));
                });

                all.splice(index, 1);
                sendMessage(logChannel, getFreeLog(msg.author, el, role));
                found = true;
            }
        });

        if (!found) {
            sendMessage(msg.channel, `Kan data over ${el.user.tag} niet vinden!`);
        }
    }
}
//*******************************//

//************CONTENT************//

function getDbContent(msg, args) {
    let output = "";

    if (args.length == 1) {
        rolesDb.forEach((item, index, all) => {
            const member = getMemberFromId(guild, item.member);

            if(!member) {
                output += `Kan gebruiker met ID ${item.member} niet vinden!\n\n`;
            }
            else {
                output += `${index + 1}. Gebruiker ${member.user.tag} (ID: ${member.id}) met rol ${getRole(guild, item.role).name} van ${formatDate(new Date(item.startTime))} tot ${formatDate(new Date(item.endTime))} gegeven door ${getMemberFromId(guild, item.punisher).user.tag} met reden '${item.reason}'\n\n`;
            }
        });

        if(output === "") {
            output = "Database is leeg.";
        }

        sendMessage(msg.channel, `\`\`\`Database inhoud:\n\n${output}\`\`\``);
    }
    else {
        const members = getMembersFromMessage(msg, args, null, 0);

        if(!members) {
            sendErrorMessage(msg.channel, `Er zijn geen geldige gebruikers gespecificeerd.`);
            sendMessage(logChannel, getErrorLog(msg.author, msg.content, `Er zijn geen geldige gebruikers gespecificeerd.`));
            return;
        }

        for (let i = 0; i < members.length; i++) {
            const el = members[i];
            let found = false;

            rolesDb.forEach((item, index, all) => {
                if (el.id == item.member) {
                    output += `${index + 1}. Gebruiker ${getMemberFromId(guild, item.member).user.tag} (ID: ${item.member}) met rol ${getRole(guild, item.role).name} van ${formatDate(new Date(item.startTime))} tot ${formatDate(new Date(item.endTime))} gegeven door ${getMemberFromId(guild, item.punisher).user.tag} met reden '${item.reason}'\n\n`;
                    found = true;
                }
            });

            if (!found) {
                sendErrorMessage(msg.channel, `Kan data over ${el.user.tag} niet vinden!`);
            }
        }

        if(output === "") {
            output = "Niets gevonden.";
        }

        sendMessage(msg.channel, `\`\`\`Database inhoud:\n\n${output}\`\`\``);
    }


}

//*******************************//

//************CLEANUP************//

/**
 * 1. Member is not in the server.
 * 2. Member does not have the role.
 * 3. If member has international or makkers, remove this role
 */
function dbCleanup(msg) {
    let deletedEntries = 0;

    sendErrorMessage(msg.channel, `De grote schoonmaak is begonnen!`);

    rolesDb.forEach((item, index, all) => {
        const member = getMemberFromId(guild, item.member);

        // Removing entry if member is not in guild.
        if (!member) {
            all.splice(index, 1);
            schandpaalChannel.fetchMessage(item.announcement).then((message) => {
                message.delete().catch((err) => {
                    console.error(`Could not delete message with ID ${message.id}: `, err);
                });;
            }).catch((err) => {
                console.error("Error deleting announcement: ", err);
                sendMessage(logChannel, getErrorLog(msg.author, msg.content, `De announcement kon niet verwijderd worden.`));
            });
            deletedEntries++;
        }
        // Removing entry if member doesn't have the role.
        else if (!hasRole(member, item.role)) {
            all.splice(index, 1);
            schandpaalChannel.fetchMessage(item.announcement).then((message) => {
                message.delete().catch((err) => {
                    console.error(`Could not delete message with ID ${message.id}: `, err);
                });;
            }).catch((err) => {
                console.error("Error deleting announcement: ", err);
                sendMessage(logChannel, getErrorLog(msg.author, msg.content, `De announcement kon niet verwijderd worden.`));
            });
            deletedEntries++;
        }
    });

    const deletedStr = deletedEntries == 1 ? `is ${deletedEntries} item` : `zijn ${deletedEntries} items`;
    sendErrorMessage(msg.channel, `De grote schoonmaak is klaar. Er ${deletedStr} weggeveegd.`);
}

//*******************************//

// Login to discord with token.
client.login(authCode.token);
