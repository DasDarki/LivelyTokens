import {MODULE_ID} from "./consts.ts";

export interface LivelyTokenImage {
  name: string;
  src: string;
  size?: {x?: number, y?: number};
}

export interface LivelyTokenData {
  randomize?: boolean;
  images?: LivelyTokenImage[];
}

export class Data {
  public static load(document: any): LivelyTokenData {
    return document.getFlag(MODULE_ID, "token_data") ?? {};
  }

  public static async save(document: any, data: LivelyTokenData): Promise<void> {
    await document.setFlag(MODULE_ID, "token_data", data);
  }
}