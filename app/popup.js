/*
* Hi there! My name is Gabriel Marchildon and I'm the developer of this extension
* I'm a French Canadian web developer located in Quebec
*
* You can follow me on Twitter here : @jesuisunpixel
* Or you can visit my website here : www.jesuisunpixel.com
* You can found the source code here : github.com/je-suis-un-pixel/TwitchForChrome
* */

// Set a variable for make sure everything is ready for render
var toFetch = 0;
var fetched = 0;

// If first time, create localStorage object
if(!localStorage.twitchForChrome) {
    wipeStorage();
    // Save the stream from legacy then wipe localStorage
    for (var i in localStorage) {
        if('i' != 'twitchForChrome') {
            addChannels([i]);
            delete(localStorage[i]);
        }
    }
    saveStorage();
} else var storage = JSON.parse(localStorage.twitchForChrome);

/**
 * Save all the user data in localStorage in String.
 */
function saveStorage() {
    localStorage.twitchForChrome = JSON.stringify(storage);
    console.log("TwitchForChrome: Storage has been save.");
}

/**
 * Add a list of new channels to the user's list.
 * @param {array} newChannels - A list of channel's names.
 */
 function addChannels(newChannels) {
    if(Array.isArray(newChannels)) {
        newChannels.forEach(function(element) {
            if(storage.channels.indexOf(element) == -1) storage.channels.push(element);
        });
    } else console.log("TwitchForChrome: ERROR - The [addChannels] function require an array.");
 }


/**
 * Delete a list of channels from the user's list.
 * @param {array} delChannels - A list of channel's names.
 */
 function deleteChannels(delChannels) {
    if(Array.isArray(delChannels)) {
        delChannels.forEach(function(element) {
            channelIndex = storage.channels.indexOf(element);
            if(channelIndex != -1) {
                storage.channels.splice(channelIndex, 1);
                resetChannel(element);
            }
        });
    } else console.log("TwitchForChrome: ERROR - The [deleteChannels] function require an array.");
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

function wipeStorage() {
    storage = {
        "accountLink":"",
        "channels":[],
        "onlines":{},
        "offlines":[]
    };
}

/**
 * Get information of a channel from Twitch.
 * @param {string} channel - The name of the channel to fetch.
 */
function getStream(channel, refreshing) {
    // Remove the channel from the onlines or offlines list of storage
    resetChannel(channel);

    // Download JSON file of the stream
    var xhr = new XMLHttpRequest();
    xhr.open("GET", "https://api.twitch.tv/kraken/streams/"+channel, true);

    xhr.onreadystatechange = function() {
        // If the download is finish, continue with the JSON file
        if (xhr.readyState == 4) {
            if (this.status == 404) {
                console.log("TwitchForChrome: ERROR "+this.status+" - The channel "+channel+" have not been found.");
                deleteChannels([channel]);
            } else if(this.status == 0) {
                console.log("TwitchForChrome: ERROR "+this.status+" - It seem you don't have an internet connection.");
            } else if(this.status == 200) {
                var json = JSON.parse(xhr.responseText);

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
                    fetched++;
                    if(toFetch == fetched) {
                        render();
                        setBadge(String(Object.keys(storage.onlines).length));
                    }
                }     
            }

            else console.log("TwitchForChrome: ERROR "+this.status+" - There was an unknown error.");

            saveStorage();
        }
    }
    xhr.send();
}

/**
 * Append all the online and offline channels.
 */
function render() {
    // Render online streams
    for (var channel in storage.onlines) {
        div = document.createElement("div");
        div.className = "online";
        div.innerHTML = '<form name="remove_'+channel+'"><button type="submit">x</button></form>'+
        '<a href="http://www.twitch.tv/'+channel+'" class="link_block" target="_blank" />'+
        '<img src="'+storage.onlines[channel].channel.logo+'" width="50" height="50" />'+
        '<span class="name">'+channel+'</span><br/>'+
        '<span class="info">'+storage.onlines[channel].game+'</span><br/>'+
        '<span class="info">'+storage.onlines[channel].viewers+' viewers</span></a>';
        document.getElementById("onlines").appendChild(div);

        // Add event on Delete buttons
        document.forms["remove_"+channel].addEventListener("submit", function(evt){
            evt.preventDefault();
            if(confirm("Are you sure you want to delete "+channel+" ?")) {
                deleteChannels([channel]);
                resetChannel(channel);
            }
        });
    }

    // Render offline streams
    storage.offlines.forEach(function(element) {
        div = document.createElement("div");
        div.className = "offline";
        div.innerHTML = '<form name="remove_'+element+'">'+
        '<button type="submit" id="delete_button">x</button></form>'+
        '<a href="http://www.twitch.tv/'+element+'" class="link_block" target="_blank" />'+
        '<span class="name">'+element+'</span></a>';
        document.getElementById("offlines").appendChild(div);

        // Add event on Delete buttons
        document.forms["remove_"+element].addEventListener("submit", function(evt){
            evt.preventDefault();
            if(confirm("Are you sure you want to delete "+element+" ?")) {
                deleteChannels([element]);
                resetChannel(element);
            }
        });
    });

}

function deleteRender(channel) {
    if(channel == null) {
        while(onlines.firstChild) onlines.removeChild(onlines.firstChild);
        while(offlines.firstChild) offlines.removeChild(offlines.firstChild);
    }
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
        } else console.log("TwitchForChrome: ERROR - The second argument of [setBadge] must be an array.");
    } else console.log("TwitchForChrome: ERROR - The first argument of [setBadge] must be a string.");
}

/**
 * Refresh the list of stream, render the result and set the badge info.
 */
function refresh() {
    toFetch = 0;
    fetched = 0;
    deleteRender();
    storage.channels.forEach(function(element) {
        getStream(element, true);
        toFetch++;
    });
}

// Launch the app when the HTML is loaded
document.addEventListener('DOMContentLoaded', function () {
    render();
    setBadge(String(Object.keys(storage.onlines).length));
    document.getElementById("refreshBtn").addEventListener("click", function() { refresh(); });
});