import sdk from '@crypto-com/chain-jslib';
import { Big, HDKey, Secp256k1KeyPair, Units } from '../../utils/ChainJsLib';
import { FIXED_DEFAULT_FEE, WalletConfig } from '../../config/StaticConfig';
import {
  TransactionUnsigned,
  DelegateTransactionUnsigned,
  TransferTransactionUnsigned,
  WithdrawStakingRewardUnsigned,
  UndelegateTransactionUnsigned,
} from './TransactionSupported';

export interface ITransactionSigner {
  signTransfer(transaction: TransferTransactionUnsigned, phrase: string): Promise<string>;

  signDelegateTx(transaction: DelegateTransactionUnsigned, phrase: string): Promise<string>;

  signWithdrawStakingRewardTx(
    transaction: WithdrawStakingRewardUnsigned,
    phrase: string,
  ): Promise<string>;
}

export class TransactionSigner implements ITransactionSigner {
  public readonly config: WalletConfig;

  constructor(config: WalletConfig) {
    this.config = config;
  }

  public getTransactionInfo(phrase: string, transaction: TransactionUnsigned) {
    this.setCustomFee(transaction);
    const cro = sdk.CroSDK({ network: this.config.network });

    const importedHDKey = HDKey.fromMnemonic(phrase);
    const privateKey = importedHDKey.derivePrivKey(this.config.derivationPath);
    const keyPair = Secp256k1KeyPair.fromPrivKey(privateKey);

    const rawTx = new cro.RawTransaction();
    rawTx.setMemo(transaction.memo);

    if (transaction.fee) {
      const fee = new cro.Coin(transaction.fee, Units.BASE);
      rawTx.setFee(fee);
    }

    return { cro, keyPair, rawTx };
  }

  // eslint-disable-next-line class-methods-use-this
  public setCustomFee(transaction: TransactionUnsigned) {
    transaction.fee = `${FIXED_DEFAULT_FEE}`;
    return transaction;
  }

  public async signTransfer(
    transaction: TransferTransactionUnsigned,
    phrase: string,
  ): Promise<string> {
    const { cro, keyPair, rawTx } = this.getTransactionInfo(phrase, transaction);

    const msgSend = new cro.bank.MsgSend({
      fromAddress: transaction.fromAddress,
      toAddress: transaction.toAddress,
      amount: new cro.Coin(transaction.amount, Units.BASE),
    });

    const signableTx = rawTx
      .appendMessage(msgSend)
      .addSigner({
        publicKey: keyPair.getPubKey(),
        accountNumber: new Big(transaction.accountNumber),
        accountSequence: new Big(transaction.accountSequence),
      })
      .toSignable();

    return signableTx
      .setSignature(0, keyPair.sign(signableTx.toSignDoc(0)))
      .toSigned()
      .getHexEncoded();
  }

  public async signDelegateTx(
    transaction: DelegateTransactionUnsigned,
    phrase: string,
  ): Promise<string> {
    const { cro, keyPair, rawTx } = this.getTransactionInfo(phrase, transaction);

    const delegateAmount = new cro.Coin(transaction.amount, Units.BASE);
    const msgDelegate = new cro.staking.MsgDelegate({
      delegatorAddress: transaction.delegatorAddress,
      validatorAddress: transaction.validatorAddress,
      amount: delegateAmount,
    });

    const signableTx = rawTx
      .appendMessage(msgDelegate)
      .addSigner({
        publicKey: keyPair.getPubKey(),
        accountNumber: new Big(transaction.accountNumber),
        accountSequence: new Big(transaction.accountSequence),
      })
      .toSignable();

    return signableTx
      .setSignature(0, keyPair.sign(signableTx.toSignDoc(0)))
      .toSigned()
      .getHexEncoded();
  }

  public async signWithdrawStakingRewardTx(
    transaction: WithdrawStakingRewardUnsigned,
    phrase: string,
  ): Promise<string> {
    const { cro, keyPair, rawTx } = this.getTransactionInfo(phrase, transaction);

    const msgWithdrawDelegatorReward = new cro.distribution.MsgWithdrawDelegatorReward({
      delegatorAddress: transaction.delegatorAddress,
      validatorAddress: transaction.validatorAddress,
    });

    const signableTx = rawTx
      .appendMessage(msgWithdrawDelegatorReward)
      .addSigner({
        publicKey: keyPair.getPubKey(),
        accountNumber: new Big(transaction.accountNumber),
        accountSequence: new Big(transaction.accountSequence),
      })
      .toSignable();

    return signableTx
      .setSignature(0, keyPair.sign(signableTx.toSignDoc(0)))
      .toSigned()
      .getHexEncoded();
  }

  public async signUndelegateTx(
    transaction: UndelegateTransactionUnsigned,
    phrase: string,
  ): Promise<string> {
    const { cro, keyPair, rawTx } = this.getTransactionInfo(phrase, transaction);

    const msgUndelegate = new cro.staking.MsgUndelegate({
      delegatorAddress: transaction.delegatorAddress,
      validatorAddress: transaction.validatorAddress,
      amount: new cro.Coin(transaction.amount, Units.BASE),
    });

    const signableTx = rawTx
      .appendMessage(msgUndelegate)
      .addSigner({
        publicKey: keyPair.getPubKey(),
        accountNumber: new Big(transaction.accountNumber),
        accountSequence: new Big(transaction.accountSequence),
      })
      .toSignable();

    return signableTx
      .setSignature(0, keyPair.sign(signableTx.toSignDoc(0)))
      .toSigned()
      .getHexEncoded();
  }
}
