slaves = [
    { userId: 'xxxxxxxxxxxxxxxxxxxxx'},

]

function getRandomSlave(){
    return slaves[Math.round(Math.random()*slaves.length)]
}

exports.getRandomSlave() = getRandomSlave
