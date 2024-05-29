import { join } from "path";

Bun.write(
  join(__dirname, "/redis-files/dump.rdb"),
  new Uint8Array([
    82, 69, 68, 73, 83, 48, 48, 48, 51, 250, 9, 114, 101, 100, 105, 115, 45,
    118, 101, 114, 5, 55, 46, 50, 46, 48, 250, 10, 114, 101, 100, 105, 115, 45,
    98, 105, 116, 115, 192, 64, 254, 0, 251, 4, 4, 252, 0, 12, 40, 138, 199, 1,
    0, 0, 0, 5, 97, 112, 112, 108, 101, 9, 114, 97, 115, 112, 98, 101, 114, 114,
    121, 252, 0, 156, 239, 18, 126, 1, 0, 0, 0, 5, 103, 114, 97, 112, 101, 4,
    112, 101, 97, 114, 252, 0, 12, 40, 138, 199, 1, 0, 0, 0, 5, 109, 97, 110,
    103, 111, 5, 109, 97, 110, 103, 111, 252, 0, 12, 40, 138, 199, 1, 0, 0, 0,
    9, 114, 97, 115, 112, 98, 101, 114, 114, 121, 9, 112, 105, 110, 101, 97,
    112, 112, 108, 101, 255, 159, 8, 121, 135, 133, 36, 94, 107, 10,
  ])
);
