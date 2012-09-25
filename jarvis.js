var _           = require('underscore');
var sys         = require('sys');
var optparse    = require('optparse');
var Bot         = require('ttapi');
var CleverBot   = require('./lib/cleverbot');

//TODO: find a way to get bot name from tt
var botname
var casino_on       = false;
var rolls_allowed   = false;
var no_rolls        = false;
var talked_to_last  = false;
var chat_timeout    = false;
var grind           = false;
var gamblers        = []
var djs_on_deck     = [];
var timers          = [];
var users           = [];
var winner          = undefined;
var laptops         = ['linux', 'mac', 'pc', 'chrome' ]
var autobop         = false;
var mods            = {'4fe4db76aaa5cd0a6b000040':'Jamas'}
var sudoers         = {'4fb188d7aaa5cd0950000107': 'DJJarvis', '4e99db8d4fe7d059f7079f56':'ECHRIS', '4f9b0715aaa5cd2af40001e4':'A Tree'}
var slave           = false;
var master          = false;
var slaves
var creds
var current_song
var current_dj
var last_dj


var switches        = [
    ['-c', '--creds FILE', 'Credentials you want the bot to connect with'],
    ['-r', '--room FILE', 'Room to go too'],
    ['-v', '--verbose', 'verbose mode'],
    ['-s', '--slave', 'this bot is a slave'],
    ['-m', '--master', 'this bot is a master']
]

var parser = new optparse.OptionParser(switches);

parser.on('room', function(name, value){
    room = require('./'+value)
})

parser.on('creds', function(name, value){
    creds = require('./'+value)
})

parser.on('master', function(name, value){
    master = true;
    slaves = require('./slaves.js')
})

parser.on('slave', function(name, value){
    slave = true;
})

parser.on('verbose', function(name, value){
    bot.debug = true;
})

parser.parse(process.argv)

// Options that depend on cmd line args
var botname         = creds.name
var AUTH            = creds.AUTH
var USERID          = creds.USERID
var ROOMID          = room.ROOMID
var cbot_rgx        = new RegExp('@?'+botname+' ?(.+)?\\??')
var i_won_rgx       = new RegExp(botname+' won')
var get_off_rgx     = new RegExp(botname+', you played your song,')

var CBot = new CleverBot;
var bot  = new Bot(AUTH, USERID, ROOMID)

//bot.debug = true

// ### BASIC Bot functionality ### //
bot.on('newsong', function(data){
    current_song = data.room.metadata.current_song
    last_dj      = current_dj
    current_dj   = data.room.metadata.current_dj;
    if (getUserById(USERID).name == 'DJJarvis' && casino_on ){
        bot.speak('Alright '+getUserById(last_dj).name+', you played your song, please step down, the song limit is currently 1.')
    }
    /*
    if ( _.any( djs_on_deck, function(dj){ return dj.userid == userid} ) ){
        djs_on_deck[current_dj] = djs_on_deck[current_dj]++
    } else {
        djs_on_deck[current_dj] = 1;
    }
    */
    if ( data.room.metadata.current_dj != USERID ){

        // song is someone elses
        if ( autobop == true ){
            safe_wait = Math.random()*60000
            console.log('bopping in '+(safe_wait/1000)+' seconds')
            setTimeout(function(){console.log('bopping now'); bot.bop();}, safe_wait);
        } else if ( grind == true ){
            // grind mode is on, randomly vote
            if ( Math.round( Math.random() ) ){
                bot.bop();
            }
        }

    } else {
        //song is my song, skip it
        if (!grind) { bot.skip(); }
    }

});

bot.on( 'roomChanged', function(data) {
    //create user list
    current_song = data.room.metadata.current_song
    current_dj = data.room.metadata.current_dj
    bot.modifyLaptop(laptops[Math.round(Math.random()*4)])
    users = data.users;
});

bot.on( 'add_dj', function(data) {
    var new_dj_id = data.user[0].userid;

    // Add them to the dj list
    djs_on_deck.push({'userid': new_dj_id, 'count':0})
    if ( casino_on && !no_rolls && new_dj_id != USERID ){
        console.log( 'casino is on eliminate snipers' )
        //casino is on, eliminate snipers
        if ( _.isUndefined( winner ) ) {
            console.log( 'winner is undefined still, you can"t be on deck' );
            console.log( data );
            console.log( new_dj_id );
            //rollers haven't finished yet
            bot.remDj( new_dj_id );
        } else if ( new_dj_id != winner.userId ){
            bot.remDj( new_dj_id );
        }
    }
})

bot.on( 'rem_dj', function(data) {
    var dj_that_got_off = data.user[0]
    djs_on_deck = _.filter(djs_on_deck, function(dj){
        return dj.userid != dj_that_got_off.userid;
    })

    if (casino_on){
        winner = undefined;
        rolls_allowed = true;
        gamblers = [];
        bot.speak('Spot is open, please type roll for a spot');
        setTimeout(function(){lottery_winner()}, 15000);
    }
})

bot.on( 'registered', function(data) {
    for ( i in data.user ) {
        users.push( data.user[i] );
    }
    console.log(users);
});

bot.on('deregistered', function(data){
    //TODO: Remove people from the user list
})

bot.on('speak', function(data){
    username=data.name;

    //We don't care what the bot says
    if (data.userid != USERID ) {

        if (data.text.match(/please type roll for a spot/g) ){
            setTimeout(function(order, data, pm){
                command(order, data, pm)
            }, Math.random()*10000, 'say roll', data, false )
        }

        if (data.text.match(get_off_rgx) ){
            setTimeout(function(){
                bot.remDj()
            }, Math.random()*3000 )
        }

        //bot should always respond to rolls if casino is in effect
        if (data.text.match(/^roll$/) && casino_on && rolls_allowed){
            command( data.text, data, false )
        }

        if (data.text.match(i_won_rgx)) {
            bot.addDj();
        }

        if (!slave) {
            //bot should always respond to greetings
            if (data.text.match(/(sup|hello|hi|hey|whatup|oh hai) jarvis/gi)) {
                bot.speak( 'Hey! How are you '+username+' ?' );
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
        }

        if ( data.userid != getUserByName('DJJarvis').userid ) {
            // If the bot doesn't get a command check if someone asked it a direct question
            if ( data.text.match(cbot_rgx) || talked_to_last === data.userid ) {
                var question;
                if (talked_to_last == data.userid) {
                    question = data.text;
                } else {
                    question = data.text.match(cbot_rgx)[1];
                    console.log('now talking to '+getUserById(data.userid).name)
                    talked_to_last = data.userid;
                }
                CBot.write(question, function callback(resp){
                    console.log(question, ' : ', resp['message'])
                    bot.speak(resp['message'])
                });
                if ( chat_timeout ) {
                    clearTimeout(chat_timeout);
                }
                chat_timeout = setTimeout(function(){console.log('talking timeout'); talked_to_last = false}, 45000)
            }
        }
    }
})

bot.on('pmmed', function(data){
    console.log(botname+' pmmed by '+ getUserById(data.senderid).name)
    //Expect name to be left out
    command(data.text, data, true)
});


// ### COMMANDS ### //
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
        if ( !already_voted && !_.any( djs_on_deck, function(dj){ return dj.userid == userid} )){
            gamblers.push( { userId : userid, score: roll_score } )
            bot.speak( getUserById( userid ).name+' you rolled '+ roll_score )
        }
    }

    if ( order.match(/^djs$/) ){
        console.log(djs_on_deck)
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

    // SUDO level commands
    if ( _.has( sudoers, userid ) ){
        if (order.match(/^say (.+)/)) {
           words = order.match(/^say (.+)/)[1];
           bot.speak( words );
        }

        if (order.match(/^grind (on|off)$/)) {
            toggle = order.match(/grind (on|off)$/)[1]
            switch (toggle) {
                case 'on':
                    bot.addDj()
                    grind   = true;
                    break;
                case 'off':
                    bot.remDj();
                    grind   = false;
                    break;
            }
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

        if (order.match(/^botnet (\d+|all) ([a-zA-Z ]+)(!)?/)){
            com = order.match(/^botnet (\d+|all) ([a-zA-Z ]+)(!)?/)
            console.log(com)
            var num_bots = com[1];
            if (num_bots === 'all'){
                num_bots = slaves.length;
            }

            // Make sure we have Enough slaves to handle request
            if ( num_bots<=slaves.length ) {

                var pmmed_already = {};
                for ( var i=1; i<num_bots; i++ ){
                    // Give us a random slave
                    var slave = slaves.getRandomSlave();

                    // If we've already pmmed this bot, get a new one
                    while ( _.has(pmmed_already, slave.userId) ) {
                        slave = slaves.getRandomSlave();
                    }

                    // Alright, fresh slave, give him an order
                    if (com[3] == '!' ){
                        wait = Math.random()*3000
                    } else {
                        wait = Math.random()*90000
                    }
                    console.log('Commanding '+slave.name+' '+com[2]+' in '+(wait/1000)+' sec')
                    timers[i] = setTimeout(function(command, slave){
                        console.log('pmming '+slave.name+' now');
                        bot.pm(command, slave.userId)
                    }, wait, com[2], slave)

                    // Finally, add that slave to list of ones we've already used.
                    pmmed_already[slave.userId] = slave.name
                }

            } else {
                // Not enough slaves to handle that request
                console.log('Not enough slaves to handle that request, we only have '+slaves.length+' slave(s)')
            }
        }
    }

    //  MOD level commands
    if ( _.has( mods, userid ) || _.has( sudoers, userid )) {
        if (order.match(/(^upboat|^awesome|^upvote|^kiss my ass|^dance)/)){
            if (!pm) {bot.speak('roger that'); }
            bot.bop();
        }

        if (order.match(/^downvote|^lame|^hate on this/)){
            if (!pm ) { bot.speak('this sucks'); }
            bot.vote('down');
        }

        if (order.match(/^pm (.+)/)) {
            com = order.match(/^pm (.+) "(.+)"/)
            bot.pm(com[2], getUserByName(com[1]).userid)
        }

        if (order.match(/^heart$/)) {
            bot.snag()
            bot.playlistAdd( current_song._id )
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
            grind   = false;
            bot.remDj();
        }
    }
}

function getUserByName(name){
    for (index in users){
        if (users[index].name === name) {
            return users[index];
        }
    }
}

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
