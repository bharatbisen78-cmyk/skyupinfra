import 'server-only';
import webpush from 'web-push';
import { createAdminClient } from '@/lib/supabase/admin';
export async function sendNewOrderPush(orderNumber:string,orderId:string){
 const pub=process.env.VAPID_PUBLIC_KEY,priv=process.env.VAPID_PRIVATE_KEY;if(!pub||!priv||!process.env.VAPID_SUBJECT)return {sent:0,configured:false};
 try{webpush.setVapidDetails(process.env.VAPID_SUBJECT,pub,priv);const admin=createAdminClient();const {data:admins}=await admin.from('admin_roles').select('user_id');const ids=(admins||[]).map(x=>x.user_id);if(!ids.length)return {sent:0,configured:true};const {data:subscriptions}=await admin.from('push_subscriptions').select('endpoint,p256dh,auth_secret').in('user_id',ids);let sent=0;await Promise.all((subscriptions||[]).map(async s=>{try{await webpush.sendNotification({endpoint:s.endpoint,keys:{p256dh:s.p256dh,auth:s.auth_secret}},JSON.stringify({title:`New Skyupinfra order · ${orderNumber}`,body:'A new Cash on Delivery order is waiting for review.',url:`/admin?order=${encodeURIComponent(orderId)}`}),{TTL:60});sent++;}catch(error:any){if(error?.statusCode===404||error?.statusCode===410)await admin.from('push_subscriptions').delete().eq('endpoint',s.endpoint);}}));return {sent,configured:true};}catch(error){console.error('Push delivery issue',error);return {sent:0,configured:true};}
}
