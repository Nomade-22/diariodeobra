
import { LS, read } from './storage.js';
export let tools = read(LS.tools, []);
export let teams = read(LS.teams, ["Equipe 1","Equipe 2"]);
export let jobs  = read(LS.jobs,  ["JBS","BRF","Obra Interna"]);
export let outs  = read(LS.outs,  []);
export let rets  = read(LS.rets,  []);
export let user  = read(LS.user, null);
export function setState(part){ Object.assign(exports, part); }
