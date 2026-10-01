import proofChain from "../../../content/prototype/proof-chain.json";
import proofLoop from "../../../content/prototype/proof-loop.json";
import { type ContentPack, loadContentPack } from "./loader.ts";

/** Validate and index the bundled proof pack. Throws ContentError if the JSON is invalid. */
export function loadProofPack(): ContentPack {
  return loadContentPack(proofChain, proofLoop);
}
