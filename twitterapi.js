(function() {
	"use strict";

	var API = require("node-twitter-api");


	var TwitterAPI = function(account, apiKey, apiSecret, accessToken, accessTokenSecret) {
		this._api = new API({
			consumerKey: apiKey,
			consumerSecret: apiSecret,
			callback: ""
		});

		this.account = account;
		this.accessToken = accessToken;
		this.accessTokenSecret = accessTokenSecret;
	}


	/*
	 * Thunkify it for co+ES6 generators
	 */
	TwitterAPI.prototype.api = function(namespace, name, params, token, secret) {
		var self = this;
		return function(cb) {
			self._api[namespace](name, params, token, secret, function(error, data, response) {
				cb(error, { data: data, response: response });
			});
		};
	}
	

	/* 
	 * Read tweets from the main account.
	 * Called periodically to check for new tweets
	 */
	TwitterAPI.prototype.read = function*() {		
		var tweets = yield this.api("getTimeline", "mentions_timeline", {}, this.accessToken, this.accessTokenSecret);

		tweets.data.map(function(item) {
			if (item.text.indexOf('#meetup') > 0)
				return this.parseMeetup(item);
			else if (item.text.indexOf('#cancel') > 0)
				return this.parseCancelMeetup(item);
			else if (item.text.indexOf('#yes') > 0)
				return this.parseRsvpYes(item);
	   		else if (item.text.indexOf('#no') > 0)
				return this.parseRsvpNo(item);
			else if (item.text.indexOf('#beermug') > 0)
				return this.parseBeerMug(item);
 			else if (item.text.indexOf('#wisdom') > 0)
				return this.parseWisdom(item);
		}, this);
	}
	
	
	TwitterAPI.prototype.parseMeetup = function(item) {
		var result = this.parseBasic(item);
		result.type = "MEETUP";
		return result;
	};


	TwitterAPI.prototype.parseCancelMeetup = function(item) {
		var result = this.parseBasic(item);
		result.type = "CANCEL_MEETUP";
		return result;
	};


	TwitterAPI.prototype.parseRsvpYes = function(item) {
	    var result = {};
		result.type = "RSVP_YES";
	    result.user = this.parseUser(item);

	    var mentions = this.parseMentions(item);	    
        if (mentions.length) {
            
        } else {
            return this.parseError("You need to include the organizer. See these examples.");
        }

		return result;
	};


    /*
     * @beercombinator #no
     */
	TwitterAPI.prototype.parseRsvpNo = function(item) {
	    var result = {};
		result.type = "RSVP_NO";
	    result.user = this.parseUser(item);

	    var mentions = this.parseMentions(item);	    
        if (mentions.length) {
            
        } else {
            return this.parseError("You need to include the organizer. See these examples.");
        }

		return result;
	};


    /*
     * @beercombinator 4PM Today, Tavern Church Street #beermug
     */
	TwitterAPI.prototype.parseBeerMug = function(item) {
	    var result = {};
		result.type = "BEER_MUG";
	    result.user = this.parseUser(item);
	    result.time = this.parseTime(item);	
		return result;
	};



    /*
     * @beercombinator #widsom
     */
	TwitterAPI.prototype.parseWisdom = function(item) {
	    var result = {};
		result.type = "WISDOM";
	    result.user = this.parseUser(item);
		return result;
	};
	


	TwitterAPI.prototype.parseUser = function(item) {
	    return { id: item.user.id, username: item.user.screen_name, name: item.user.name };
	}


    /*
     * Extract date-time in the following formats
     * {10AM, 10 AM} ['', ',', 'on'] {Friday, Tomorrow, 2nd May, May 2nd, May 2, 2 May}
     * {Friday, Tomorrow, 2nd May, May 2nd, May 2, 2 May} ['', ',', 'at'] {10AM, 10 AM}
     */
	TwitterAPI.prototype.parseTime = function(item) {
		return {
		    time: "",
		    date: ""
		}
	}


	TwitterAPI.prototype.parseMentions = function(item) {
		return [];
	}


    /*
     * If the message was not sent to @beercombinator in the right format
     */
	TwitterAPI.prototype.parseError = function(message) {
		return {
		    type: "ERROR",
		    message: message
		}
	}


	module.exports = TwitterAPI;

})();
