import * as fs from "fs";
import path from "path";
import { KeyValueStore, ServerConfig } from "./types";
import { bytesToString } from "./utils";

export function loadRdb(conf: ServerConfig): KeyValueStore {
  if (conf.dbfilename === "") {
    return {};
  }
  const rp = new RDBParser(path.join(conf.dir, conf.dbfilename));
  rp.parse();
  return rp.getEntries();
}

class RDBParser {
  path: string;
  data: Uint8Array;
  index: number = 0;
  entries: KeyValueStore = {};

  constructor(path: string) {
    this.path = path;
    try {
      this.data = fs.readFileSync(this.path);
    } catch (e: any) {
      console.log(`skipped reading RDB file: ${this.path}`);
      console.log(e?.message);
      this.data = new Uint8Array();
      return;
    }
  }
  parse() {
    if (this.data?.length === 0) {
      return;
    }
    if (bytesToString(this.data.slice(0, 5)) !== "REDIS") {
      console.log(`not a RDB file: ${this.path}`);
      return;
    }
    console.log("Version:", bytesToString(this.data.slice(5, 9)));
    // skipping header and version
    this.index = 9;
    let eof = false;
    while (!eof && this.index < this.data.length) {
      const op = this.data[this.index++];
      switch (op) {
        case 0xfa: {
          const key = this.readEncodedString();
          switch (key) {
            case "redis-ver":
              console.log(key, this.readEncodedString());
              break;
            case "redis-bits":
              console.log(key, this.readEncodedInt());
              break;
            case "ctime":
              console.log(key, new Date(this.readEncodedInt() * 1000));
              break;
            case "used-mem":
              console.log(key, this.readEncodedInt());
              break;
            case "aof-preamble":
              console.log(key, this.readEncodedInt());
              break;
            default:
              throw Error("unknown auxiliary field");
          }
          break;
        }
        case 0xfb:
          console.log("keyspace", this.readEncodedInt());
          console.log("expires", this.readEncodedInt());
          this.readEntries();
          break;
        case 0xfe:
          console.log("db selector", this.readEncodedInt());
          break;
        case 0xff:
          eof = true;
          break;
        default:
          throw Error("op not implemented: " + op);
      }
      if (eof) {
        break;
      }
    }
  }

  readEntries() {
    const now = new Date();
    while (this.index < this.data.length) {
      let type = this.data[this.index++];
      let expiration: Date | undefined;
      if (type === 0xff) {
        this.index--;
        break;
      } else if (type === 0xfc) {
        // Expire time in milliseconds
        const milliseconds = this.readUint64();
        expiration = new Date(Number(milliseconds));
        type = this.data[this.index++];
      } else if (type === 0xfd) {
        // Expire time in seconds
        const seconds = this.readUint32();
        expiration = new Date(seconds * 1000);
        type = this.data[this.index++];
      }
      const key = this.readEncodedString();
      switch (type) {
        case 0: {
          // string encoding
          const value = this.readEncodedString();
          console.log(key, value, expiration);
          if ((expiration ?? now) >= now) {
            this.entries[key] = { value, expiration };
          }
          break;
        }
        default:
          throw Error("type not implemented: " + type);
      }
    }
  }

  readUint32(): number {
    return (
      this.data[this.index++] +
      (this.data[this.index++] << 8) +
      (this.data[this.index++] << 16) +
      (this.data[this.index++] << 24)
    );
  }
  readUint64(): bigint {
    let result = BigInt(0);
    let shift = BigInt(0);
    for (let i = 0; i < 8; i++) {
      result += BigInt(this.data[this.index++]) << shift;
      shift += BigInt(8);
    }
    return result;
  }
  readEncodedInt(): number {
    let length = 0;
    const type = this.data[this.index] >> 6;
    switch (type) {
      case 0:
        length = this.data[this.index++];
        break;
      case 1:
        length =
          (this.data[this.index++] & 0b00111111) |
          (this.data[this.index++] << 6);
        break;
      case 2:
        this.index++;
        length =
          (this.data[this.index++] << 24) |
          (this.data[this.index++] << 16) |
          (this.data[this.index++] << 8) |
          this.data[this.index++];
        break;
      case 3: {
        const bitType = this.data[this.index++] & 0b00111111;
        length = this.data[this.index++];
        if (bitType > 1) {
          length |= this.data[this.index++] << 8;
        }
        if (bitType == 2) {
          length |=
            (this.data[this.index++] << 16) | (this.data[this.index++] << 24);
        }
        if (bitType > 2) {
          throw Error("length not implemented");
        }
        break;
      }
    }
    return length;
  }

  readEncodedString(): string {
    const length = this.readEncodedInt();
    const str = bytesToString(this.data.slice(this.index, this.index + length));
    this.index += length;
    return str;
  }
  getEntries(): KeyValueStore {
    return this.entries;
  }
}
