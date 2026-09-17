export type ApiOptions = RequestInit & { token?: string };
const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";
export async function api<T>(path:string, options:ApiOptions={}):Promise<T>{
 const headers=new Headers(options.headers); if(options.body && !headers.has("Content-Type")) headers.set("Content-Type","application/json"); if(options.token) headers.set("Authorization","Bearer "+options.token);
 const response=await fetch(baseUrl+path,{...options,headers,cache:"no-store"});
 if(!response.ok){let detail="Erreur API"; try{const body=await response.json(); detail=body.detail??detail;}catch{} const error=new Error(detail) as Error & {status?:number}; error.status=response.status; throw error;}
 return response.json() as Promise<T>;
}
