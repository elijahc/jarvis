var _           = require('underscore');
var sys         = require('sys');
var optparse    = require('optparse');
var Bot         = require('ttapi');
var slaves      = require('./slaves.js');
var CleverBot	= require('./lib/cleverbot');

//TODO: find a way to get bot name from tt
var botname         = 'DJJarvis';
var casino_on       = false;
var rolls_allowed   = false;
var no_rolls        = false;
var gamblers        = []
var timers          = [];
var users           = [];
var winner          = undefined;
var laptops         = ['linux', 'mac', 'pc', 'chrome' ]
var autobop         = false;
var mods            = {'4fb188d7aaa5cd0950000107': 'DJJarvis', '4fe4db76aaa5cd0a6b000040':'Jamas'}
var sudoers         = {'4e99db8d4fe7d059f7079f56':'ECHRIS', '4f9b0715aaa5cd2af40001e4':'A Tree'}
var creds

//create cleverbot function within
var CBot			= [new CleverBot]
  , name 			= botname
  , callback		= function callback(resp){
    console.log(name, ' : ', resp)
  };

var switches        = [
    ['-c', '--creds FILE', 'Credentials you want the bot to connect with'],
    ['-v', '--verbose', 'verbose mode']
]

var parser = new optparse.OptionParser(switches);

parser.on('creds', function(name, value){
    creds = require('./'+value)
})

parser.on('verbose', function(name, value){
    bot.debug = true;
})

parser.parse(process.argv)

var AUTH   = creds.AUTH
var USERID = creds.USERID
var ROOMID = creds.ROOMID

var bot = new Bot(AUTH, USERID, ROOMID)
//bot.debug = true

bot.on( 'roomChanged', function(data) {
    //create user list
    users = data.users;
});

bot.on( 'add_dj', function(data) {
    if ( casino_on && !no_rolls){
        console.log( 'casino is on eliminate snipers' )
        //casino is on, eliminate snipers
        var new_dj_id = data.user[0].userid
        if ( _.isUndefined( winner ) ) {
            console.log( 'winner is undefined still, you can"t be on deck' )
            console.log( data )
            console.log( new_dj_id )
            //rollers haven't finished yet
            bot.remDj( new_dj_id )
        } else if ( new_dj_id != winner.userId || new_dj_id != USERID ){
            bot.remDj( new_dj_id )
        }
    }
})

bot.on( 'rem_dj', function() {
    if (casino_on){
        winner = undefined;
        rolls_allowed = true;
        gamblers = [];
        bot.speak('Spot is open, please type roll for a spot')
        setTimeout(function(){lottery_winner()}, 10000);
    }
})

bot.on( 'registered', function(data) {
    for ( i in data.user ) {
        users.push( data.user[i] )
    }
    console.log(users)
});

bot.on('deregistered', function(data){
    //TODO: Remove people from the user list
})

bot.on('speak', function(data){
    username=data.name

    //We don't care what the bot says
    if (data.userid != USERID){
        //bot should always respond to greetings
        if (data.text.match(/(sup|hello|hi|hey|whatup|oh hai) jarvis/gi)) {
            bot.speak( 'Hey! How are you '+username+' ?' );
        }

        //bot should always respond to rolls if casino is in effect
        if (data.text.match(/^roll$/) && casino_on && rolls_allowed){
            command( data.text, data, false )
        }

        //respond to all casino? queries
        if (data.text.match(/^casino.$/)) {
            command( 'casino?', data, false );
        }

        //Check if the bot has been issued a command
        if (data.text.match(/^jj (.+)/)) {
            var order = data.text.match(/^jj (.+)/)[1]
            //dispatch command
            command( order, data, false )
        }

        if (data.text.match(/^jarvis (.+)/)) {
            var order = data.text.match(/^jarvis (.+)/)[1]
            //dispatch command
            command( order, data, false )
        }

		if (data.text.match(/^(.+) @DJJarvis (.+)/)) {
			bot.speak(CBots[0].write(data.text, callback))
		}
    }
})

bot.on('pmmed', function(data){
    console.log('pmmed by '+ getUserById(data.senderid).name)
    //Expect name to be left out
    if (data.text.match(/jarvis (.+)/)) {
        bot.pm('Whoa dude, no need to be so formal, just tell me what you want me to do', data.senderid);
    }else{
        command(data.text, data, true)
    }
})

function command( order, data, pm ) {
    console.log( 'Command: '+order )

    if ( pm ) {
        userid = data.senderid
    } else {
        userid = data.userid
    }

    if ( order.match(/^roll$/) && casino_on ){
        //TODO: add boost multiplier based on your score
        no_rolls = false;
        var already_voted = false;
        roll_score = Math.floor( Math.random()*1000 )
        for ( x in gamblers ) {
            if ( gamblers[x].userId === userid ){
                already_voted = true;
            }
        }
        if ( !already_voted ){
            gamblers.push( { userId : userid, score: roll_score } )
            bot.speak( getUserById( userid ).name+' you rolled '+ roll_score )
        }
    }

    if ( order.match(/^casino.$/) ){
        console.log('casino status requested')
        var resp = 'Casino is closed right now';
        if ( casino_on ) {
            console.log('casino is on')
            resp = 'Casino is open for business';
        }

        if ( pm ){
            bot.pm( resp, userid )
        } else {
            bot.speak( resp )
        }
    }

    if ( _.has( sudoers, userid ) ){
        //Sudo users
        if (order.match(/^say (.+)/)) {
           words = order.match(/^say (.+)/)[1];
           bot.speak( words );
        }

        if (order.match(/^grind$/)) {
            bot.addDj()
            autobop = true;
        }

        if (order.match(/^botnet (\d+) (.+)/)){
            com = order.match(/^botnet (\d+) (.+)/)
            console.log(com)

            for ( var i=0; i<com[1]; i++  ){
                var slave = slaves.getRandomSlave()
                wait = Math.random()*30000
                console.log('Commanding '+slave.name+' '+com[2]+' in '+(wait/1000)+' sec')
                timers[i] = setTimeout(function(command, slave){
                    console.log('pmming '+slave.name+' now');
                    bot.pm(command, slave.userId)
                }, wait, com[2], slave)
            }
        }

        //Currently not working...
        if (order.match(/^run (.+)/)) {
        }

        if (order.match(/^casino (on|off)/)){
            com = order.match(/^casino (on|off)/).pop()
            switch (com){
                case 'on':
                    casino_on = true
                    bot.speak('Casino mode engaged')
                    break;
                case 'off':
                    casino_on = false
                    bot.speak('Casino mode disengaged')
                    break;

            }
        }
    }

    if ( _.has( mods, userid ) || _.has( sudoers, userid )) {
        //Mod and sudoers only commands
        if (order.match(/(^upboat|^awesome|^upvote|^kiss my ass|^dance)/)){
            if (!pm) {bot.speak('roger that'); }
            bot.bop();
        }

        if (order.match(/^downvote|^lame|^hate on this/)){
            if (!pm ) { bot.speak('this sucks'); }
            bot.vote('down');
        }

        if (order.match(/^wingman/)){
            bot.bop();
            if ( !pm ) { bot.speak('I got your back bro'); }
            bot.addDj();
            autobop = true;
        }

        if (order.match(/^autobop|^kiss my ass/)){
            autobop==true;
            bot.bop();
        }

        if (order.match(/^get off$/)){
            if ( !pm ){ bot.speak('ok.... :('); }
            autobop = false;
            bot.remDj();
        }
    }
}

bot.on('newsong', function(data){
    if ( autobop == true ){
        bot.modifyLaptop(laptops[Math.round(Math.random()*4)])
        if ( data.room.metadata.current_dj != USERID ){
            //song is someone elses
            safe_wait = Math.random()*45000
            console.log('bopping in '+(safe_wait/1000)+' seconds')
            setTimeout(function(){console.log('bopping now'); bot.bop();}, safe_wait);
        } else {
            //song is my song, skip it
            bot.skip();
        }
    }
})

function getUserById(userId){
    for (index in users){
        if (users[index].userid === userId) {
            return users[index];
        }
    }
}

function lottery_winner(){
    console.log(gamblers)
    //Find the winner with the higherst roll and report it.
    if ( gamblers.length == 0 ) {
        bot.speak( 'Lame, no one rolled, slot is open for all' )
        no_rolls = true;
    } else {
        winner = _.max(gamblers, function(roller){ return roller.score })
        bot.speak( getUserById(winner.userId).name + ' won with a '+winner.score + ', claim your spot on deck' )
    }
    gamblers = []
    rolls_allowed = false;
}
