
exports.up = function(knex, Promise) {
    return knex.schema.createTable('towerTrades', (towerTrades) => {
        towerTrades.increments()
        towerTrades.date('timestamp')
        towerTrades.integer('price')
        towerTrades.string('direction')
        towerTrades.integer('profit')
        towerTrades.integer('rollingTotal')
    })
}

exports.down = function(knex, Promise) {
    return knex.schema.dropTableIfExists('towerTrades')
}
