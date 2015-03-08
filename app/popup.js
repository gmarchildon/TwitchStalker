/*
* Hi there! My name is Gabriel Marchildon and I'm the developer of this extension
* I'm a French Canadian web developer located in Quebec
*
* You can follow me on Twitter here : @jesuisunpixel
* Or you can visit my website here : www.jesuisunpixel.com
* You can found the source code here : github.com/je-suis-un-pixel/TwitchForChrome
* */

var refreshCount;
var storage;

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

/**
 * Save all the user data in localStorage in String.
 */
function saveStorage() {
    localStorage.clear();
    localStorage.setItem("twitchStalker", JSON.stringify(storage));
    console.log("[Twitch Stalker] Storage has been save.");
}

/**
 * Add a list of new channels to the user's list.
 * @param {Array} newChannels - A list of channel's names.
 */
 function addChannels(newChannels) {
    if(Array.isArray(newChannels)) {
        newChannels.forEach(function(element) {
            if(storage.channels.indexOf(element) == -1) storage.channels.push(element);
        });
    } else error("The [addChannels] function require an array.");
 }


/**
 * Delete a list of channels from the user's list.
 * @param {Array} delChannels - A list of channel's names.
 */
 function deleteChannels(delChannels) {
    if(Array.isArray(delChannels)) {
        delChannels.forEach(function(element) {
            var channelIndex = storage.channels.indexOf(element);
            if(channelIndex != -1) {
                storage.channels.splice(channelIndex, 1);
                resetChannel(element);
            }
        });
    } else error("The [deleteChannels] function require an array.");
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

/*function sortData(data) {
    var sorted = [];
    Object.keys(data).sort(function(a,b){
        return data[a].name < data[b].name ? -1 : 1
    }).forEach(function(key){
        sorted.push(data[key]);
    });
    return sorted;
}*/

/**
 * Get information of a channel from Twitch.
 * @param {string} channel - The name of the channel to fetch.
 * @param {boolean} refreshing - The name of the channel to fetch.
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
                        render();
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

function getAccount(account) {
    var xhr = new XMLHttpRequest();
    try {
        xhr.onreadystatechange = function() {
            // If the connection is not successful, abort
            if (xhr.readyState != 4) return;
            
            if(xhr.responseText) {
                var json = JSON.parse(xhr.responseText);
                var total = json._total;
                var processed = 0;

                if(total>0) {
                    var xhrTemp = new XMLHttpRequest();
                    try {
                        xhrTemp.onreadystatechange = function() {
                            if (xhrTemp.readyState != 4) return;

                            if(xhrTemp.responseText) {
                                var json = JSON.parse(xhrTemp.responseText);

                                var importChannels = [];
                                json.follows.forEach(function(element) {
                                    if(storage.channels.indexOf(element.channel.name) == -1) {
                                        importChannels.push(element.channel.name);
                                    }
                                    processed++;
                                });
                                addChannels(importChannels);

                                if(processed >= total) {
                                    saveStorage();
                                    if(importChannels.length > 0) refresh(importChannels);
                                }
                            }

                            xhrTemp.onerror = function(error) {
                              error(error);
                              processed++;
                            };
                        }
                    } catch(e) {
                        error("Could not connect to Twitch.tv.");
                    }

                    xhrTemp.open(
                        "GET", 
                        "https://api.twitch.tv/kraken/users/"+account+"/follows/channels?limit="+total,
                        true
                    );
                    xhrTemp.send(null);
                }
            }

            xhr.onerror = function(error) {
              error(error);
            };
        }
    } catch(e) {
        error("Could not connect to Twitch.tv.");
    }
    xhr.open(
        "GET", 
        "https://api.twitch.tv/kraken/users/"+account+"/follows/channels?offset=9999&limit=1",
        true
    );
    xhr.send(null);
}

/**
 * Throw a new error in console.
 * @param {string} text Error message
 */
function error(text) {
    throw new Error("[Twitch Stalker] ERROR - "+text);
}

/**
 * Append all the online and offline channels.
 */
function render() {
    // Render online streams
    for (var channel in storage.onlines) {
        var div = document.createElement("div");
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
                resetChannel(channel);
                deleteRender(channel);
                deleteChannels([channel]);
                saveStorage();
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
                resetChannel(element);
                deleteRender(element);
                deleteChannels([element]);
                saveStorage();
            }
        });
    });
}

/**
 * Delete the render of a channel if specified. If not, wipe all rendered channels.
 * @param {string} [channel] - Channel to remove.
 */
function deleteRender(channel) {
    if(channel == null) {
        while(onlines.firstChild) onlines.removeChild(onlines.firstChild);
        while(offlines.firstChild) offlines.removeChild(offlines.firstChild);
    } else if(typeof channel == 'string' && document.forms["remove_"+channel]) {
        var channelRender = document.forms["remove_"+channel].parentNode;
        channelRender.parentNode.removeChild(channelRender);
    }
}

/**
 * Set the icon's badge info and color.
 * @param {string} info - The information to show on the badge.
 * @param {Array} [color] - The color of the badge's background. Must be [R,G,B,Alpha]. Default is [100,65,165,255].
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
 * Refresh the list of stream, render the result and set the badge info.
 * @param {Array} [channels] - List of channel to refresh. If not define, it will refresh all the channels in storage.
 */
function refresh(channels) {
    refreshCount = 0;
    var target = channels || storage.channels;
    storage.channels.forEach(function(element) {
        deleteRender(element);
        getStream(element, true);
        refreshCount++;
    });
}

function runQuery(evt) {
    evt.preventDefault();

    var query = document.getElementById("add_channel").value;
    document.getElementById("add_channel").value = '';

    // Commands (/foobar)
    if(query.substring(0, 1) == '/') {
        query = query.substring(1);
        query = query.split(" ");

        switch(query[0]) {
            case 'clear':
                wipeStorage();
                saveStorage();
                deleteRender();
                render();
            break;
            case 'delete':
                if(storage.channels.indexOf(query[1]) != -1) {
                    deleteChannels([query[1]]);
                    saveStorage();
                }
            break;
            case 'export':
                if(storage.channels.length != 0) {
                    var exportList = [];
                    for(var i in storage.channels) exportList.push(storage[i]);
                    window.prompt("Copy to clipboard: Ctrl+C, Enter", exportList);
                }
            break;
            case 'help':
                alert (
                    "/clear -> Delete all the streams. \r\r"+
                    "/delete username -> Delete a single channel. Replace 'channel' by its name. \r\r"+
                    "/export -> Export the list of the saved channels. \r\r"+
                    "@username -> Import a list of channels form a Twitch account. \r\r"+
                    "To import a channel, just type its name."+
                    "To import multiple channels, just paste all the names separated by commas."
                );
            break;
        }
    }
    // Account import (@foobar)
    else if(query.substring(0, 1) == '@') {
        query = query.substring(1);
        getAccount(query);
    }
    // Import stream with complet url (http://www.twitch.tv/foobar)
    else if(query.substring(0, 21) == 'http://www.twitch.tv/') {
        query = query.substring(21);
        addChannels([query]);
    }
    // Import stream with username (foobar)
    else {
        query = query.toLowerCase().replace(/\s/g, '');
        var importList = query.split(",");
        addChannels(importList);
    }
}

// Launch the app when the HTML is loaded
document.addEventListener('DOMContentLoaded', function () {
    render();
    setBadge(String(Object.keys(storage.onlines).length));
    document.getElementById("refreshBtn").addEventListener("click", function() { refresh(); });
    document.forms["new_channel"].addEventListener("submit", runQuery);
    document.getElementById("add_channel").focus();
});