slaves = [
    { userId: '4fb1665baaa5cd09500000d6', name: 'DJ Pogs'},
    { userId: '5058a6ceaaa5cd462c00015d', name: 'JailBot'}

]

function getRandomSlave(){
    var idx = Math.round(Math.random()*(slaves.length-1))
//    console.log('index: '+idx)
    return slaves[idx]
}

function getName(userId) {
    for (i in slaves){
        if ( slaves[i].userId === userId ){
            return slaves[i].name;
        }
    }
}

exports.getName        = getName
exports.getRandomSlave = getRandomSlave
