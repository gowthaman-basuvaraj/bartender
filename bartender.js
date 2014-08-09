(function () {
    "use strict";

    var Datastore = require('nedb'),
        fs = require("fs"),
        co = require("co"),
        sleep = require('co-sleep'),
        TwitterAPI = require('./twitterapi');

    var Bartender = function () {
        var config = require("./config.json");
        this.twitterAPI = new TwitterAPI(config.account, config.apiKey, config.apiSecret, config.accessToken, config.accessTokenSecret);

        this.db = {
            meetups: new Datastore('data/meetups.db'),
            beermugs: new Datastore('data/beermugs.db'),
            wisdom: new Datastore('data/wisdom.db')
        };


        co(function*() {
            while (true) {
                try {
                    yield this.read();
                    console.log(new Date())
                    yield sleep(6 * 1000);
                }
                catch (ex) {
                    yield this.log(ex);
                }
            }
        }).call(this);
    };


    /*
     * Read @beercombinator's timeline
     */
    Bartender.prototype.read = function*() {
        var messages = yield this.twitterAPI.read();
        for (var i = 0; i < messages.length; i++) {
            yield this.process(messages[i]);
        }
    };


    /*
     * Process messages
     */
    Bartender.prototype.process = function*(message) {
        var handler = {
            "MEETUP": this.meetup,
            "MEETUP_CANCEL": this.cancelMeetup,
            "RSVP_YES": this.rsvpYes,
            "RSVP_NO": this.rsvpNo,
            "BEER_MUG": this.beerMug,
            "WISDOM": this.wisdom
        }[message.type];

        if (handler) {
            yield handler.call(this, message);
        } else {
            this.log("Cannot understand this message: " + JSON.stringify(message));
        }
    };


    /*
     * Schedule a meetup.
     *
     * Organizer should tweet this:
     * @beercombinator 11AM Friday, Some Location #meetup
     *
     * Sender is assumed to be the meetup organizer.
     * @beercombinator will retweet to all followers.
     */
    Bartender.prototype.meetup = function*(message) {
        yield this.twitterAPI.broadcast("");
    };


    /*
     * Cancel a meetup
     *
     * Organizer should tweet this:
     * @beercombinator #cancel
     *
     * A previously scheduled meetup will be cancelled.
     * @beercombinator will retweet to followers.)
     */
    Bartender.prototype.cancelMeetup = function*(message) {
        yield this.twitterAPI.broadcast("");

        var going = yield Meetup.find();
        for (var i = 0; i < going.length; i++) {
            yield this.twitterAPI.message()
        }
    };


    /*
     * RSVP Yes
     *
     * Tweet this to say YES
     * @beercombinator @organizer #yes
     */
    Bartender.prototype.rsvpYes = function*(message) {
        var meetup = yield Meetup.find();
        yield this.twitterAPI.message()
    };


    /*
     * RSVP No
     *
     * Tweet this to cancel a previous YES
     * @beercombinator @organizer #no
     */
    Bartender.prototype.rsvpNo = function*(message) {
        var meetup = yield Meetup.find();
        yield this.twitterAPI.message()
    };


    /*
     * Offer a free mug of beer to 1 person
     *
     * Tweet this:
     * @beercombinator Some pub, 5PM Today #beermug
     */
    Bartender.prototype.beerMug = function*() {

    };


    /*
     * Get some wisdom from the bartender.
     *
     * Tweet this to get a reply back from @beercombinator
     * @beercombinator #wisdom
     */
    Bartender.prototype.wisdom = function*() {

    };


    Bartender.prototype.sendStats = function*() {

    };


    Bartender.prototype.log = function*(message) {
        console.log("log(" + Date().toString() + ") " + JSON.stringify(message));
    };

    module.exports = Bartender;
})();
