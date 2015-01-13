/*
* Hi there! My name is Gabriel Marchildon and I'm the developer of this extension
* I'm a French Canadian web developer located in Quebec
*
* You can follow me on Twitter here : @jesuisunpixel
* Or you can visit my website here : www.jesuisunpixel.com
* */

// Get channels list from LocalStorage
var channels = Array();
var online_channels = Array();
var offline_channels = Array();
for (var i in localStorage) channels.push(localStorage[i]);
channels.sort;

// Var of the loading bar
var channel_count = 0;
var channel_nbr = channels.length;

// Misc var
var online_channel = 0;
var error = false;

function streamer(channel) {  
    // Download JSON file of the stream
    var xhr = new XMLHttpRequest();
    xhr.open("GET", "https://api.twitch.tv/kraken/streams/"+channel, true);

    xhr.onreadystatechange = function() {
        // If the download is finish, continue with the JSON file
        if (xhr.readyState == 4) {
            if (this.status == 404) {
                //alert("Error: "+this.status+" The channel "+channel+" have not been found.");
                console.log("Error "+this.status+": The channel "+channel+" have not been found.");
                delete localStorage[channel];
                channel_nbr--;
            } else if(this.status == 0) {
                if(!error) {
                    //alert("Error "+this.status+": It seem you don't have an internet connection.");
                    console.log("Error "+this.status+": It seem you don't have an internet connection.");
                    error = true;
                }
            } else if(this.status == 200) {
                var json = JSON.parse(xhr.responseText);

                // If the Stream is Online
                if (json.stream != null) {
                    online_channel++;
                    if (json.stream.game == null) json.stream.game = "Game unknown";
                    if (json.stream.channel.logo == null) json.stream.channel.logo = "404_user_50x50.png";

                    var div = document.createElement("div");
                    div.className = "online";
                    div.innerHTML = '<form name="remove_'+channel+'"><button type="submit">x</button></form>'+
                    '<a href="http://www.twitch.tv/'+channel+'" class="link_block" target="_blank" />'+
                    '<img src="'+json.stream.channel.logo+'" width="50" height="50" />'+
                    '<span class="name">'+channel+'</span><br/>'+
                    '<span class="info">'+json.stream.game+'</span><br/>'+
                    '<span class="info">'+json.stream.viewers+' viewers</span></a>';
                    document.getElementById("onlines").appendChild(div);

                    // Save object for reordering
                    online_channels[channel] = div;
                }
                // Else, meaning the stream is Offline
                else {
                    var div = document.createElement("div");
                    div.className = "offline";
                    div.innerHTML = '<form name="remove_'+channel+'">'+
                    '<button type="submit" id="delete_button">x</button></form>'+
                    '<a href="http://www.twitch.tv/'+channel+'" class="link_block" target="_blank" />'+
                    '<span class="name">'+channel+'</span></a>';
                    document.getElementById("offlines").appendChild(div);

                    // Save object for reordering
                    offline_channels[channel] = div;
                }

                // Add event on Delete buttons
                document.forms["remove_"+channel].addEventListener("submit", function(evt){
                    evt.preventDefault();
                    if(confirm("Are you sure you want to delete "+channel+" ?")) {
                        deleteChannel(channel);
                    }
                });

                // Refresh loading bar
                channel_count++;
                var new_width = channel_count*300/channel_nbr;
                document.getElementById("loading").style.width = new_width+"px";
                // If fully loaded ...
                if (channel_count==channel_nbr) {
                    // ... remove the loading bar
                    document.getElementById("loading").style.display = "none";
                    // ... update the icon badge for online channels
                    chrome.browserAction.setBadgeBackgroundColor({color:[100,65,165,255]});
                    chrome.browserAction.setBadgeText({text:online_channel.toString()});

                    channels.forEach(function(element){
                        if(online_channels[element]) 
                            document.getElementById('onlines').appendChild(online_channels[element]);
                        else document.getElementById('offlines').appendChild(offline_channels[element]);
                    });
                }
            }

            else {
                if(!error) {
                    //alert("Error "+this.status+": There was an unknown error.");
                    console.log("Error "+this.status+": There was an unknown error.");
                    error = true;
                }
            }
        }
    }
    xhr.send();
}

function run_query(evt) {
    evt.preventDefault();

    var query = document.getElementById("add_channel").value;
    document.getElementById("add_channel").value = '';

    // Commands (/foobar)
    if(query.substring(0, 1) == '/') {
        query = query.substring(1);
        query = query.split(" ");

        switch(query[0]) {
            case 'clear':
                deleteChannel(localStorage);
            break;
            case 'delete':
                if(localStorage[query[1]] != null) deleteChannel(localStorage[query[1]]);
            break;
            case 'export':
                if(localStorage.length != 0) {
                    var export_list = Array();
                    for(var i in localStorage) export_list.push(localStorage[i]);
                    window.prompt("Copy to clipboard: Ctrl+C, Enter", export_list);
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
        // Download JSON file of the stream
        var xhr = new XMLHttpRequest();
        xhr.open("GET", "https://api.twitch.tv/kraken/users/"+query+"/follows/channels?on_site=1", true);

        xhr.onreadystatechange = function() {
            //If the download is finish, continue with the JSON file
            if (xhr.readyState == 4) {
                if (this.status==404) {
                    //alert("Error: "+this.status+" The channel "+query+" have not been found.");
                    console.log("Error "+this.status+": The channel "+query+" have not been found.");
                } else if(this.status == 0) {
                    alert("Error "+this.status+": It seem you don't have an internet connection.");
                    console.log("Error "+this.status+": It seem you don't have an internet connection.");
                } else if(this.status == 200) {
                    var json = JSON.parse(xhr.responseText);

                    if(json._total>0) {
                        var import_channels = Array();
                        json.follows.forEach(function(element, index) {
                            import_channels.push(element.channel.name);
                        });

                        addChannel(import_channels);
                    }
                } else {
                    alert("Error "+this.status+": There was an unknown error.");
                    console.log("Error "+this.status+": There was an unknown error.");
                }
            }
        }

        xhr.send();
    }
    // Import stream with complet url (http://www.twitch.tv/foobar)
    else if(query.substring(0, 21) == 'http://www.twitch.tv/') {
        query = query.substring(21);
        addChannel(Array(query));
    }
    // Import stream with username (foobar)
    else {
        query = query.toLowerCase().replace(/\s/g, '');
        var import_list = query.split(",");
        addChannel(import_list);
    }
}

function addChannel(new_channels) {
    channel_count = 0;
    channel_nbr = new_channels.length;
    document.getElementById("loading").style.display = "block";

    new_channels.forEach(function(element){
        if(!localStorage[element]) {
            localStorage[element] = element;
            channels.push(element);
            streamer(element);
        } else channel_nbr--;
    });
}

function deleteChannel(old_channels) {
    if(typeof old_channels == 'string' || old_channels instanceof String) {
        var deleted_channel = document.forms["remove_"+old_channels].parentNode;
        deleted_channel.parentNode.removeChild(deleted_channel);
        delete localStorage[old_channels];
    }
    else {
        for(var i in old_channels) {
            if(localStorage[i]) {
                var deleted_channel = document.forms["remove_"+localStorage[i]].parentNode;
                deleted_channel.parentNode.removeChild(deleted_channel);
                delete localStorage[i];
            }
        }
    }

    var count = document.getElementById('onlines').getElementsByTagName('div').length;
    chrome.browserAction.setBadgeBackgroundColor({color:[100,65,165,255]});
    chrome.browserAction.setBadgeText({text:count.toString()});
}

// Launch the app when the HTML is loaded
document.addEventListener('DOMContentLoaded', function () {
    if(channel_nbr == 0) {
        chrome.browserAction.setBadgeBackgroundColor({color:[100,65,165,255]});
        chrome.browserAction.setBadgeText({text:"0"});
    } else for (var value in channels) streamer(channels[value]);
    document.forms["new_channel"].addEventListener("submit", run_query);
    document.getElementById("add_channel").focus();
});