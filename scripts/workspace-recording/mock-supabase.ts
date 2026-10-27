import { profile, tables } from './fixtures';
class Query {
 rows: any[]; one=false;
 constructor(table:string) { this.rows=[...(tables[table] || [])]; }
 select(..._args:any[]) {return this;} order(..._args:any[]) {return this;} abortSignal(..._args:any[]) {return this;}
 eq(key:string,value:any) {this.rows=this.rows.filter(row=>row[key]===value);return this;}
 in(key:string,values:any[]) {this.rows=this.rows.filter(row=>values.includes(row[key]));return this;}
 limit(count:number) {this.rows=this.rows.slice(0,count);return this;} single() {this.one=true;return this;} maybeSingle() {return this.single();}
 gte(key:string,value:any) {this.rows=this.rows.filter(row=>row[key]>=value);return this;} lte(key:string,value:any) {this.rows=this.rows.filter(row=>row[key]<=value);return this;} neq(key:string,value:any) {this.rows=this.rows.filter(row=>row[key]!==value);return this;}
 // All fictional partnerships are owned by this local account and have no partner.
 or(..._args:any[]) {return this;}
 update(..._args:any[]) {return this;} insert(..._args:any[]) {return this;} delete() {return this;}
 then(resolve:any,reject?:any) {return Promise.resolve({data:this.one?this.rows[0]||null:this.rows,error:null,count:this.rows.length}).then(resolve,reject);}
}
const channel:any={on(){return channel;},subscribe(){return channel;},unsubscribe(){}};
export const supabase:any={from:(table:string)=>new Query(table),rpc:async()=>({data:[],error:null}),channel:()=>channel,removeChannel:async()=>{},auth:{getUser:async()=>({data:{user:{id:profile.id,email:profile.email}},error:null}),getSession:async()=>({data:{session:{user:{id:profile.id,email:profile.email}}},error:null}),signOut:async()=>({error:null})}};
export const isSupabaseConfigured=()=>true;
