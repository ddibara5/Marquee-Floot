import postgres from "postgres";
import {randomBytes,createHash,scryptSync,createCipheriv,createDecipheriv} from "node:crypto";
import {gzipSync,gunzipSync} from "node:zlib";
import {upload,getUrl} from "@floot/storage";
// Existing immutable backup format/AAD; used by legacy public and fixed runtime collectors.
export async function migrationSealBackupBundle(input:{APP:string;which:"native"|"legacy";id:string;bundle:any;native:ReturnType<typeof postgres>;stage:(s:string)=>Promise<void>}){
 const {APP,which,id,bundle,native,stage}=input;
 const historyRow=bundle.historyRow??undefined,historySection=bundle.historySection??undefined,historyOffset=bundle.historyOffset??undefined;
 const key=process.env.DATABASE_BACKUP_ENCRYPTION_KEY;if(!key||key.length<32)throw Error("BACKUP_KEY_MISSING");
 // Include project signing/encryption and connected provider configuration only inside ciphertext.
 await stage('encrypt');
 const env=process.env as Record<string,string|undefined>;
 const protectedConfig:Record<string,string>={};
 const names=APP==="gamedeck"?["JWT_SECRET","IGDB_CLIENT_ID","IGDB_CLIENT_SECRET","GAMEDECK_STEAM_API_KEY","GAMEDECK_FLARESOLVERR_HEADER","GAMEDECK_FLARESOLVERR_TOKEN"]:["JWT_SECRET","TRAKT_CLIENT_ID","TRAKT_CLIENT_SECRET","CRUNCHYROLL_ETP_RT","TMDB_API_TOKEN"];
 for(const name of names)if(env[name])protectedConfig[name]=env[name]!;
 bundle.protectedConfig=protectedConfig;
 const tableCount=Object.keys(bundle.data).length,rowCount=Object.values(bundle.data as Record<string,string[]>).reduce((n,r)=>n+r.length,0),authCount=Object.keys(bundle.auth).length;
 let plain=Buffer.from(JSON.stringify(bundle));const plainHash=createHash("sha256").update(plain).digest("hex"),salt=randomBytes(16),iv=randomBytes(12),derived=scryptSync(key,salt,32);
 const cipher=createCipheriv("aes-256-gcm",derived,iv);cipher.setAAD(Buffer.from(APP+":"+which+":"+id));
 const encrypted=Buffer.concat([cipher.update(gzipSync(plain)),cipher.final()]),tag=cipher.getAuthTag();
 const packed=Buffer.from(JSON.stringify({format:1,app:APP,which,id,salt:salt.toString("base64"),iv:iv.toString("base64"),tag:tag.toString("base64"),ciphertext:encrypted.toString("base64")}));
 plain.fill(0);plain=Buffer.alloc(0);bundle.data={};bundle.auth={};
 const filename="database-migration/"+APP+"/"+id+"-"+which+".backup";
 await stage("upload");
 const signed=await upload({visibility:"private",filename,contentType:"application/octet-stream",sizeBytes:packed.length,ifAbsent:true});if(!signed.ok)throw Error("BACKUP_UPLOAD_PREP_FAILED");
 const put=await fetch(signed.presignedUrl,{method:"PUT",headers:signed.headers,body:packed});if(!put.ok)throw Error("BACKUP_UPLOAD_FAILED");
 // Read uploaded ciphertext afresh, decrypt with authenticated AAD, and validate exact payload.
 const url=await getUrl({visibility:"private",filename});if(!url.ok)throw Error("BACKUP_READ_FAILED");
 const downloaded=await fetch(url.url);if(!downloaded.ok)throw Error("BACKUP_READ_FAILED");const stored=Buffer.from(await downloaded.arrayBuffer());
 const decoded=JSON.parse(stored.toString()),decipher=createDecipheriv("aes-256-gcm",scryptSync(key,Buffer.from(decoded.salt,"base64"),32),Buffer.from(decoded.iv,"base64"));decipher.setAAD(Buffer.from(APP+":"+which+":"+id));decipher.setAuthTag(Buffer.from(decoded.tag,"base64"));
 const restored=gunzipSync(Buffer.concat([decipher.update(Buffer.from(decoded.ciphertext,"base64")),decipher.final()]));
 if(createHash("sha256").update(restored).digest("hex")!==plainHash)throw Error("BACKUP_DECRYPT_HASH");
 const receipt={id,app:APP,source:which,filename,cipherHash:createHash("sha256").update(stored).digest("hex"),plainHash,tables:tableCount,rows:rowCount,authTables:authCount,bytes:stored.length,decryptVerified:true};
 await native`insert into migration_backups_20260930.receipts(id,app,source,filename,cipher_sha256,plain_sha256,tables,rows) values(${id},${APP},${which},${filename},${receipt.cipherHash},${plainHash},${receipt.tables},${receipt.rows})`;
 if(historyRow)await native`update migration_backups_20260930.receipts set archive_id=${historyRow},archive_section=${historySection??null},archive_offset=${historyOffset??null},archive_slice_rows=${historyOffset===undefined?null:100} where id=${id}`;
 await stage("verified");
 derived.fill(0);plain.fill(0);restored.fill(0);
 return receipt;
}
