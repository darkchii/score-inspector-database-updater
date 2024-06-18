const { UpdateClan } = require("../Helper");
const { InspectorClan } = require("../db");

const cacher = {
    func: UpdateClans,
    name: 'UpdateClans',
}

module.exports = cacher;

async function UpdateClans() {
    //get all clans
    try{
        const clans = await InspectorClan.findAll();
        console.log(`[CACHER] Updating ${clans.length} clans ...`);
    
        for await (const clan of clans) {
            try{
                await UpdateClan(clan.id);
            }catch(err){
                console.error(err);
            }
        }
    }catch(err){
        console.error(err);
    }
}
