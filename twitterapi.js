(function () {
    "use strict";

    var API = require("node-twitter-api");
    var date_js = require("datejs");
    var mentions_regex = /^@[a-zA-Z0-9_]+$/;
    var hash_regex = /^#[^ ]+&/;


    var TwitterAPI = function (account, apiKey, apiSecret, accessToken, accessTokenSecret) {
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
    TwitterAPI.prototype.api = function (namespace, name, params, token, secret) {
        var self = this;
        return function (cb) {
            self._api[namespace](name, params, token, secret, function (error, data, response) {
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

        tweets.data.map(function (item) {
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


    TwitterAPI.prototype.parseMeetup = function (item) {
        var result = this.parseBasic(item);
        result.type = "MEETUP";
        return result;
    };


    TwitterAPI.prototype.parseCancelMeetup = function (item) {
        var result = this.parseBasic(item);
        result.type = "CANCEL_MEETUP";
        return result;
    };


    TwitterAPI.prototype.parseRsvpYes = function (item) {
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
    TwitterAPI.prototype.parseRsvpNo = function (item) {
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
    TwitterAPI.prototype.parseBeerMug = function (item) {
        var result = {};
        result.type = "BEER_MUG";
        result.user = this.parseUser(item);
        result.time = this.parseTime(item);
        return result;
    };


    /*
     * @beercombinator #widsom
     */
    TwitterAPI.prototype.parseWisdom = function (item) {
        var result = {};
        result.type = "WISDOM";
        result.user = this.parseUser(item);
        return result;
    };


    TwitterAPI.prototype.parseUser = function (item) {
        return { id: item.user.id, username: item.user.screen_name, name: item.user.name };
    }


    /*
     * Extract date-time in the following formats
     * {10AM, 10 AM} ['', ',', 'on'] {Friday, Tomorrow, 2nd May, May 2nd, May 2, 2 May}
     * {Friday, Tomorrow, 2nd May, May 2nd, May 2, 2 May} ['', ',', 'at'] {10AM, 10 AM}
     */
    TwitterAPI.prototype.parseTime = function (item) {
        //date_js does not work with other arbitary stuff, may be we can tokenize and then
        //try to parse parts of it

        //say: @beer guys tommorrow 6pm #fun

        //to optimize may be we can remove well known item, say @mentions #hashtags

        //lets tokenize
        var tokens = item.text.split(" "); //primitive, but for now lets tokenize by space

        var filtered_tokens = tokens.filter(function (token) {
            return token && token.length > 0 && !token.match(mentions_regex) && !token.match(hash_regex)
        });

        //filtered_tokens = [guys, tomorrow, 6pm]
        //we'll construct strings

        //0.0 guys tomorrow 6pm
        //0.1 guys tomorrow
        //0.2 guys

        //1.0 tomorrow 6pm <- should match here and we'll return
        //1.1 tomorrow

        //2.0 6pm

        //the first match we'll take it as datetime
        var idx = 0, max_len = filtered_tokens.length,
            idx_inner = 0;

        for (idx = 0; idx < max_len; idx++) {
            for (idx_inner = max_len; idx_inner > idx; idx_inner--) {

                var new_text = filtered_tokens.slice(idx, idx_inner);

                var parsed_date = date_js.parse(new_text);
                if (parsed_date)
                    return {
                        time: parsed_date.toString("hh:mm tt"),
                        date: parsed_date.toString("dd/MM/yyyy")
                    }
            }

        }

        return {
            time: "",
            date: ""
        }
    }


    TwitterAPI.prototype.parseMentions = function (item) {
        return item.text.split(" ").filter(function(token){
            return token && token.length > 0 && !token.match(mentions_regex);
        });
    }

    TwitterAPI.prototype.parseHashtags = function (item) {
        return item.text.split(" ").filter(function(token){
            return token && token.length > 0 && !token.match(hash_regex);
        });
    }


    /*
     * If the message was not sent to @beercombinator in the right format
     */
    TwitterAPI.prototype.parseError = function (message) {
        return {
            type: "ERROR",
            message: message
        }
    }


    module.exports = TwitterAPI;

})();
