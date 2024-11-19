import {readFileSync} from "fs";
import {ContractPromise} from "@polkadot/api-contract";
import {ApiPromise, Keyring} from "@polkadot/api";
import {KeyringPair} from "@polkadot/keyring/types";
import {signAndSend} from "./txHelper";

export class IncContract {

    private contract: ContractPromise;

    public constructor(api: ApiPromise, address: string){
        const metadata = readFileSync('./metadata/Inc.json');
        this.contract = new ContractPromise(api, metadata.toString(), address);
    }

    public async getValue() : Promise<Number> {

        const alice = new Keyring({ type: 'sr25519' }).addFromUri("//Alice");

        // maximum gas to be consumed for the call. if limit is too small the call will fail.
        const gasLimit = this.contract.api.registry.createType('WeightV2',
          {refTime: 30000000000, proofSize: 1000000}
        );

        // a limit to how much Balance to be used to pay for the storage created by the contract call
        // if null is passed, unlimited balance can be used
        const storageDepositLimit = null;

        const {result, output}  = await this.contract.query.getValue(
          alice.address,
          {gasLimit, storageDepositLimit}
        );

        if (result.isOk){
            const value : string = output?.toString() ?? '';
            return JSON.parse(value).ok as Number;
        }
        return Promise.reject("ERROR when query " + result.asErr);

    }

    public async increment(signer : KeyringPair) : Promise<void> {

        // maximum gas to be consumed for the call. if limit is too small the call will fail.
        const gasLimit = this.contract.api.registry.createType('WeightV2',
          {refTime: 30000000000, proofSize: 1000000}
        );

        // a limit to how much Balance to be used to pay for the storage created by the contract call
        // if null is passed, unlimited balance can be used
        const storageDepositLimit = null;

        const {gasRequired, result, debugMessage } =
          await this.contract.query.inc(
            signer.address,
            { storageDepositLimit, gasLimit}
          ) ;

        if (result.isOk){
            const tx = this.contract.tx.inc(
              { storageDepositLimit, gasLimit : gasRequired }
            );
            await signAndSend(tx, signer);
        } else {
            console.log('Error when sending transaction - debugMessage : %s', debugMessage);
            return Promise.reject("Error when sending transaction " + result.asErr);
        }

    }

}





