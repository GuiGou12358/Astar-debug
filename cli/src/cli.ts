import yargs from 'yargs/yargs';
import {IncContract} from "./contract";
import {signAndSend} from "./txHelper";
import {ApiPromise, Keyring, WsProvider} from "@polkadot/api";
import {readFileSync} from "fs";


const argv = yargs(process.argv.slice(2)).options({
    index: {alias: 'botIndex', desc: 'Index used for the bot'},
    inc: {alias: 'increment', desc: 'Increment the value'},
    read: {alias: 'read', desc: 'read the value'},
}).version('0.1').parseSync();

async function run() : Promise<void>{

    if (!argv.inc && !argv.read) {
        return Promise.reject('At least one option is required. Use --help for more information');
    }

    if (argv.inc && !argv.botIndex) {
        return Promise.reject('Bot index is mandatory for increment');
    }

    const api = await ApiPromise.create({provider: new WsProvider('wss://rpc.shibuya.astar.network')});
    const [chain, nodeName, nodeVersion] = await Promise.all([
        api.rpc.system.chain(),
        api.rpc.system.name(),
        api.rpc.system.version()
    ]);
    console.log('You are connected to chain %s using %s v%s', chain, nodeName, nodeVersion);

    const contract = new IncContract(api, 'ZKRZ8dnUvFtY8a5XVqXGUt5gbL6hi7SPfkpHFSjM7PUUTgU');

    if (argv.read){

        let last_value = 0;

        while (true) {
            // display the value
            const value = (await contract.getValue()).valueOf();
            if (value > last_value) {
                console.log("new value %s ", value);
                last_value = value;
            } else if (value < last_value) {
                console.log("value in the past %s ", value);
                last_value = value;
                //return Promise.reject("Return in the past!");
            }
        }
    }

    if (argv.inc ) {
        const index = argv.botIndex;
        const seed = readFileSync('.seed').toString().trim();
        const pair = new Keyring({type: 'sr25519'}).addFromUri(seed);
        const bot = new Keyring({type: 'sr25519'}).addFromUri(seed + "//" + index);

        console.log('Main address: %s', pair.address);
        console.log('Bot Index: %s', index);
        console.log('Bot address: %s', bot.address);

        // transfer 2 SBY from the main address to the bot:
        const amount: number = 2 * 1e18;
        console.log('Transferred amount: %s', amount);
        await signAndSend(api.tx.balances.transferKeepAlive(bot.address, BigInt(amount)), pair);

        let nbErrors = 0;
        let i = 0;
        let max = 50;

        while (i < max) {
            if (nbErrors > 10) {
                return Promise.reject("Too many errors!");
            }
            try {
                // display the value
                const before = await contract.getValue();
                console.log("value before : %s ", before);
                // increment
                await contract.increment(bot);
                // display the value
                const after = await contract.getValue();
                console.log("value after : %s ", after);

                if (after <= before) {
                    return Promise.reject("Value after not greater than value before!");
                }
                nbErrors = 0;
                i++;
            } catch (e) {
                nbErrors += 1;
                // wait 10 seconds
                await new Promise(f => setTimeout(f, 10000));
            }
        }
    }
}


run().catch(console.error).finally(() => process.exit());


