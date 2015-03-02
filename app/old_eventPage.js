var channels = [];
for (var key in localStorage) channels.push(localStorage[key]);
var channel_nbr = channels.length;
var online_channel = [];
var error = false;
chrome.browserAction.setBadgeBackgroundColor({color:[100,65,165,255]});

chrome.alarms.create({when:Date.now()+2000,periodInMinutes:2});
chrome.alarms.onAlarm.addListener(function() {
	for (i=0;i<channel_nbr && error==false;i++) streamer(channels[i]);
});

function streamer(channel) {  
	var channel_count = 0;
	online_channel = [];
	// Download JSON file of the stream
	var xhr = new XMLHttpRequest();
	xhr.open("GET", "https://api.twitch.tv/kraken/streams/"+channel, true);
	xhr.onreadystatechange = function() {
		//If the download is finish, continue with the JSON file
		if (xhr.readyState == 4) {
			if (this.status>=400 && this.status<=499) return false;
			else if(this.status == 0) {
				error = true;
				chrome.browserAction.setBadgeBackgroundColor({color:[255,0,0,255]});
				chrome.browserAction.setBadgeText({text:"!"});
				return false;
			}

			var json = JSON.parse(xhr.responseText);

			// If the Stream is Online
			if (json.stream != null) online_channel.push(channel);

			channel_count++;

			if (channel_count==channel_nbr)
				chrome.browserAction.setBadgeBackgroundColor({color:[100,65,165,255]});
				chrome.browserAction.setBadgeText({text:online_channel.length.toString()});
		}
		return true;
	}
	xhr.send();
}

/*var opt = {
	type: "basic",
	title: "Primary Title",
	message: "Primary message to display",
	iconUrl: "icon.png"
}
chrome.notifications.create("not_", opt, function(){console.log(" is online !")});*/