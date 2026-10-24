import { fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { todayInBangkok } from '$lib/server/date';
import type { Actions, PageServerLoad } from './$types';

const taskSchema=z.object({ title:z.string().trim().min(1).max(180), description:z.string().max(1000).default(''), priority:z.enum(['low','medium','high']).default('medium'), task_date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/) });
export const load: PageServerLoad=async ({ locals })=>{
 const user=locals.user!;
 const today=todayInBangkok();
 const [{data:tasks,error:taskError},{data:history,error:historyError}]=await Promise.all([
  locals.supabase.from('tasks').select('id,title,description,status,priority,task_date,created_at').eq('user_id',user.id).order('created_at',{ascending:false}).limit(500),
  locals.supabase.from('daily_progress').select('progress_date,total_tasks,completed_tasks,completion_rate').eq('user_id',user.id).order('progress_date',{ascending:true}).limit(2500)
 ]);
 return { userEmail:user.email, today, tasks:tasks ?? [], history:history ?? [], dbError:taskError?.message||historyError?.message||null };
};
export const actions: Actions={
 add:async ({request,locals})=>{
  const form=await request.formData();
  const parsed=taskSchema.safeParse({title:form.get('title'),description:form.get('description')||'',priority:form.get('priority')||'medium',task_date:form.get('task_date')||todayInBangkok()});
  if(!parsed.success) return fail(400,{message:'Please enter a valid task title and date.'});
  const {error}=await locals.supabase.from('tasks').insert({...parsed.data,user_id:locals.user!.id,status:'todo'});
  if(error) return fail(500,{message:error.message});
  return {success:true};
 },
 toggle:async ({request,locals})=>{
  const form=await request.formData(); const id=String(form.get('id')||''); const status=String(form.get('status'))==='done'?'done':'todo';
  if(!z.string().uuid().safeParse(id).success) return fail(400,{message:'Invalid task'});
  const {error}=await locals.supabase.from('tasks').update({status,completed_at:status==='done'?new Date().toISOString():null,updated_at:new Date().toISOString()}).eq('id',id).eq('user_id',locals.user!.id);
  if(error) return fail(500,{message:error.message}); return {success:true};
 },
 edit:async ({request,locals})=>{
  const form=await request.formData(); const id=String(form.get('id')||''); if(!z.string().uuid().safeParse(id).success) return fail(400,{message:'Invalid task'});
  const parsed=taskSchema.safeParse({title:form.get('title'),description:form.get('description')||'',priority:form.get('priority')||'medium',task_date:form.get('task_date')});
  if(!parsed.success) return fail(400,{message:'Invalid task details'});
  const {error}=await locals.supabase.from('tasks').update({...parsed.data,updated_at:new Date().toISOString()}).eq('id',id).eq('user_id',locals.user!.id);
  if(error)return fail(500,{message:error.message}); return {success:true};
 },
 delete:async ({request,locals})=>{
  const form=await request.formData(); const id=String(form.get('id')||''); if(!z.string().uuid().safeParse(id).success)return fail(400,{message:'Invalid task'});
  const {error}=await locals.supabase.from('tasks').delete().eq('id',id).eq('user_id',locals.user!.id);
  if(error)return fail(500,{message:error.message}); return {success:true};
 },
 logout:async ({locals})=>{await locals.supabase.auth.signOut();throw redirect(303,'/login');}
};
