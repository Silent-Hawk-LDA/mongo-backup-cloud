import { createGzip, createGunzip, constants as zlibConstants } from "node:zlib";
import { createReadStream, createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";

export async function gzipFile(
  sourcePath: string,
  destinationPath: string,
  level = zlibConstants.Z_DEFAULT_COMPRESSION
): Promise<void> {
  await pipeline(
    createReadStream(sourcePath),
    createGzip({ level }),
    createWriteStream(destinationPath)
  );
}

export async function gunzipFile(sourcePath: string, destinationPath: string): Promise<void> {
  await pipeline(createReadStream(sourcePath), createGunzip(), createWriteStream(destinationPath));
}
