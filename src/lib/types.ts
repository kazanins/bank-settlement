export type Bank = "A" | "B";

export type MessageType = "pain.001" | "pain.002" | "pacs.008" | "pacs.002" | "camt.054";

export type TransferStatus = "pending" | "in-transit" | "confirmed" | "settled";

export type DemoState = "idle" | "initiating" | "processing" | "transferring" | "confirming" | "settled";

export interface ISOMessage {
  id: string;
  type: MessageType;
  variant?: "debit" | "credit";
  from: string;
  to: string;
  fromBank: Bank;
  toBank: Bank;
  amount: number;
  currency: string;
  reference: string;
  timestamp: number;
  status: TransferStatus;
  description: string;
}

export interface TempoTransfer {
  id: string;
  from: string;
  to: string;
  amount: number;
  token: string;
  txHash: string;
  blockNumber: number;
  timestamp: number;
  status: TransferStatus;
}

export type LedgerAction = "onramp" | "offramp" | "transfer";

export interface LedgerEvent {
  id: string;
  action: LedgerAction;
  bank: Bank;
  amount: number;
  fromToken: string;
  toToken: string;
  description: string;
  txHash?: string;
}

export interface Transaction {
  id: string;
  type: "iso" | "tempo" | "ledger";
  iso?: ISOMessage;
  tempo?: TempoTransfer;
  ledger?: LedgerEvent;
  timestamp: number;
}

export interface BankState {
  name: string;
  bank: Bank;
  customerName: string;
  omnibusAddress: string;
  balances: {
    bankUSD: number;
    USD: number;
  };
}
