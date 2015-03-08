var storage;

chrome.alarms.create({when:Date.now()+2000,periodInMinutes:2});
chrome.alarms.onAlarm.addListener(function() { 
	storage = JSON.parse(localStorage.twitchStalker);
	refresh(); 
});

/**
 * Save all the user data in localStorage in String.
 */
function saveStorage() {
    localStorage.clear();
    localStorage.setItem("twitchStalker", JSON.stringify(storage));
    console.log("[Twitch Stalker] Storage has been save.");
}

/**
 * Throw a new error in console.
 * @param {string} Error message
 */
function error(text) {
    throw new Error("[Twitch Stalker] ERROR - "+text);
}

/**
 * Set the icon's badge info and color.
 * @param {string} info - The information to show on the badge.
 * @oaram {array} color - The color of the badge's background. Must be [R,G,B,Alpha]. Default is [100,65,165,255].
 */
function setBadge(info, color) {
    if(typeof info == 'string') {
        if(color==null) color = [100,65,165,255];
        if(Array.isArray(color)) {
            chrome.browserAction.setBadgeBackgroundColor({color:color});
            chrome.browserAction.setBadgeText({text:info});
        } else error("The second argument of [setBadge] must be an array.");
    } else error("The first argument of [setBadge] must be a string.");
}

/**
 * Remove the channel from onlines/offlines list to reset information.
 * @param {string} channel - Name of the channel to reset.
 */
function resetChannel(channel) {
    delete storage.onlines[channel];
    restChannelIndex = storage.offlines.indexOf(channel);
    if(restChannelIndex != -1) storage.offlines.splice(restChannelIndex, 1);
}

/**
 * Refresh the list of stream, render the result and set the badge info.
 * @param {array} channels - List of channel to refresh. If not define, it will refresh all the channels in storage.
 */
function refresh(channels) {
    refreshCount = 0;
    var target = channels || storage.channels;
    storage.channels.forEach(function(element) {
        getStream(element, true);
        refreshCount++;
    });
}

/**
 * Get information of a channel from Twitch.
 * @param {string} channel - The name of the channel to fetch.
 */
function getStream(channel, refreshing) {
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
                else {
                    storage.offlines.push(channel);
                }    

                if(refreshing) {
                    refreshCount--;
                    if(refreshCount <= 0) {
                        saveStorage();
                        setBadge(String(Object.keys(storage.onlines).length));
                    }
                }
            }

            xhr.onerror = function(error) {
              error(error);
              refreshCount--;
            };
        }
    } catch(e) {
        error("Could not connect to Twitch.tv.");
    }
    
    xhr.open("GET", "https://api.twitch.tv/kraken/streams/"+channel, true);
    xhr.send(null);
}