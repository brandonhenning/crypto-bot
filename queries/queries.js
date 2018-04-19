const database = require('./knex')

module.exports = {
    list(){
        return database('towerTrades').select()
    },
    create(trade){
        return database('towerTrades')
            .insert(trade)
            .returning('*')
            .then(record => record[0])
    },
    last(){
        return database('towerTrades')
            .returing('*')
            .then(record => record[0])
            .then(trade => {
                console.log(trade)
            })
    }
}
