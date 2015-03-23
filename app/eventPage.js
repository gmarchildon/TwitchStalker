var storage;

function init() {
    // If first time, create localStorage object
    if(!localStorage.twitchStalker) {
        wipeStorage();
        // Save the stream from legacy then wipe localStorage
        for (var data in localStorage) {
            if(data != 'twitchStalker') {
                addChannels([data]);
                delete(localStorage[data]);
            }
        }
        saveStorage();
    } else storage = JSON.parse(localStorage.twitchStalker);

    var refreshCount = 0;
    storage.channels.forEach(function(element) {
        refreshCount++;
        getStream(element, function(channel) {
            refreshCount--;
            if(refreshCount <= 0) {
                saveStorage();
                setBadge(String(Object.keys(storage.onlines).length));

                chrome.alarms.create({periodInMinutes:1});
                chrome.alarms.onAlarm.addListener(function() {
                    refresh();
                });
            }
        }, function() {refreshCount--;});
    });

    chrome.notifications.onClicked.addListener(function(notificationId){
        var channel = notificationId.split("_")[0];
        window.open("http://www.twitch.tv/"+channel, '_blank');
    });

    log("Background initialised");
}

/**
 * Save all the user data in localStorage in String.
 */
function saveStorage() {
    localStorage.clear();
    localStorage.setItem("twitchStalker", JSON.stringify(storage));
    log("Storage has been save.");
}

/**
 * Wipe the storage variable.
 */
function wipeStorage() {
    storage = {
        "accountLink":"",
        "channels":[],
        "onlines":{},
        "offlines":[]
    }
}

/**
 * Throw a new error in console with a prefix.
 * @param {string} text Error message to write in console
 */
function error(text) {
    throw new Error("[Twitch Stalker] ERROR - "+text);
}

/**
 * Write a message in console with a prefix.
 * @param {string} text Message to write in console
 */
function log(text) {
    console.log("[Twitch Stalker] "+text);
}

/**
 * Set the icon's badge info and color.
 * @param {string} info - The information to show on the badge.
 * @param {Array} [color=[100,65,165,255]] - The color of the badge's background. Must be [R,G,B,Alpha].
 */
function setBadge(info, color) {
    if(typeof info == 'string') {
        if(color==null) color = [100,65,165,255];
        if(Array.isArray(color)) {
            chrome.browserAction.setBadgeBackgroundColor({color:color});
            chrome.browserAction.setBadgeText({text:info});
            log("The icon has been changed");
        } else error("The second argument of [setBadge] must be an array.");
    } else error("The first argument of [setBadge] must be a string.");
}

/**
 * Remove the channel from onlines/offlines list to reset information.
 * @param {string} channel - Name of the channel to reset.
 */
function resetChannel(channel) {
    delete storage.onlines[channel];
    var restChannelIndex = storage.offlines.indexOf(channel);
    if(restChannelIndex != -1) storage.offlines.splice(restChannelIndex, 1);
}

/**
 * Refresh the list of stream and set the badge info.
 * @param {Array} [channels] - List of channel to refresh. If not define, it will refresh all the channels in storage.
 */
function refresh(channels) {
    channels = channels || storage.channels;
    var refreshCount = 0;
    var tempStorage = [];
    for(var channel in storage.onlines) tempStorage.push(channel);

    channels.forEach(function(element) {
        refreshCount++;
        getStream(element, function(channel) {
            refreshCount--;
            if(refreshCount <= 0) {
                saveStorage();
                setBadge(String(Object.keys(storage.onlines).length));
            }

            // Notification
            if(channel in storage.onlines && tempStorage.indexOf(channel) == -1) {
                chrome.notifications.create(channel+'_'+new Date().getTime(), {
                    "type":"basic",
                    "iconUrl":"icon128.png",
                    "title":"Twitch Stalker",
                    "message":channel+" is now online!"
                }, function(){});
            }
        }, function() {refreshCount--;});
    });
    log("List of channel refreshed");
}

/**
 * Get information of a channel from Twitch.
 * @param {string} channel - The name of the channel to fetch.
 * @param {function} [onSuccess] - Callback executed on success.
 * @param {function} [onError] - Callback executed on error.
 *
 * @callback onSuccess
 * @param {string} channel - The name of the channel to return
 *
 * @callback onError
 */
function getStream(channel, onSuccess, onError) {
    var xhr = new XMLHttpRequest();
    try {
        xhr.onreadystatechange = function() {
            // If the connection is not successful, abort
            if (xhr.readyState != 4) return;

            if(xhr.responseText) {
                var json = JSON.parse(xhr.responseText);

                // Remove the channel from the onlines or offlines list of storage
                resetChannel(channel);

                // If the channel is Online
                if (json.stream != null) {
                    if (json.stream.game == null) json.stream.game = "Game unknown";
                    if (json.stream.channel.logo == null) json.stream.channel.logo = "404_user_50x50.png";
                    storage.onlines[channel] = json.stream;
                }
                // Else, meaning the channel is offline
                else storage.offlines.push(channel);
                if(onSuccess) onSuccess(channel);
            }

            xhr.onerror = function(error) {
                error(error);
                refreshCount--;
            };
        }
    } catch(e) {
        error("Could not connect to Twitch.tv.");
        if(onError) onError();
    }

    xhr.open("GET", "https://api.twitch.tv/kraken/streams/"+channel, true);
    xhr.send(null);
}

// Initialise the app's background refresh
init();