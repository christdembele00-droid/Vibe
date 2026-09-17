import { api } from "./api";
export async function syncFirebaseUser(idToken:string){ return api<{user:unknown}>("/users/me/sync",{method:"POST",token:idToken,body:"{}"}); }
