<script lang="ts">
 import { onMount } from 'svelte';
 import { ChevronLeft, ChevronRight, Target, TrendingUp } from 'lucide-svelte';
 import { addWeeks, addYears, startOfWeek, format, eachDayOfInterval, endOfWeek } from 'date-fns';
 import type { Chart as ChartType } from 'chart.js';
 type Progress = { progress_date:string; total_tasks:number; completed_tasks:number; completion_rate:number|null };
 let { history = [], today }: {history:Progress[];today:string} = $props();
 let mode = $state<'daily'|'monthly'>('daily');
 let offset = $state(0);
 let canvas: HTMLCanvasElement;
 let chart: ChartType | undefined;
 let loaded = false;
 let ChartJS: typeof import('chart.js').Chart;
 const asDate=(iso:string)=>new Date(`${iso}T12:00:00`);
 let reference = $derived(asDate(today));
 let records = $derived(new Map(history.map(row=>[row.progress_date,row])));
 let dates = $derived.by(()=>{
  if(mode==='daily'){
   const start=startOfWeek(addWeeks(reference,offset),{weekStartsOn:1});
   return eachDayOfInterval({start,end:endOfWeek(start,{weekStartsOn:1})});
  }
  const year=addYears(reference,offset).getFullYear();
  return Array.from({length:12},(_,i)=>new Date(year,i,1,12));
 });
 let points=$derived(dates.map(date=>{
  if(mode==='daily')return records.get(format(date,'yyyy-MM-dd'))?.completion_rate ?? null;
  const month=format(date,'yyyy-MM');
  const valid=history.filter(r=>r.progress_date.startsWith(month)&&r.completion_rate!==null);
  return valid.length ? Math.round(valid.reduce((sum,r)=>sum+Number(r.completion_rate),0)/valid.length*10)/10 : null;
 }));
 let labels=$derived(dates.map(d=>format(d,mode==='daily'?'EEE d':'MMM')));
 let validPoints=$derived(points.filter((x):x is number=>x!==null));
 let average=$derived(validPoints.length?Math.round(validPoints.reduce((a,b)=>a+b,0)/validPoints.length):null);
 let aboveTarget=$derived(validPoints.filter(v=>v>=60).length);
 let periodTitle=$derived(mode==='daily'?`${format(dates[0],'MMM d')} – ${format(dates[6],'MMM d, yyyy')}`:format(dates[0],'yyyy'));
 function draw(){
  if(!canvas||!ChartJS)return;
  chart?.destroy();
  chart=new ChartJS(canvas,{
   type:'line', data:{ labels, datasets:[
    {label:'Completion rate',data:points,borderColor:'#356be6',backgroundColor:'rgba(53,107,230,.09)',pointBackgroundColor:'#356be6',pointRadius:4,pointHoverRadius:6,borderWidth:3,tension:.32,fill:true,spanGaps:false},
    {label:'60% target',data:labels.map(()=>60),borderColor:'#16a34a',borderDash:[6,6],pointRadius:0,borderWidth:2,tension:0}
   ]}, options:{responsive:true,maintainAspectRatio:false,animation:{duration:220},interaction:{intersect:false,mode:'index'},scales:{y:{min:0,max:100,ticks:{stepSize:20,callback:(v)=>`${v}%`},grid:{color:'#edf1f7'},border:{display:false}},x:{grid:{display:false},border:{display:false}}},plugins:{legend:{display:false},tooltip:{callbacks:{label:(ctx)=>`${ctx.dataset.label}: ${ctx.parsed.y===null?'No data':ctx.parsed.y+'%'}`}}}}
  });
 }
 onMount(()=>{
  void import('chart.js').then((mod)=>{
   mod.Chart.register(...mod.registerables);
   ChartJS=mod.Chart; loaded=true;draw();
  });
  return ()=>chart?.destroy();
 });
 $effect(()=>{ mode;offset;history; if(loaded)draw(); });
</script>
<section class="card chart-card"><div class="chart-top"><div><div class="eyebrow"><TrendingUp size={15}/> YOUR MOMENTUM</div><h2>Productivity progress</h2><p class="subtle">Track your daily wins and monthly trends.</p></div><div class="segmented"><button class:active={mode==='daily'} onclick={()=>{mode='daily';offset=0}}>Daily</button><button class:active={mode==='monthly'} onclick={()=>{mode='monthly';offset=0}}>Monthly</button></div></div>
<div class="chart-controls"><div class="arrows"><button aria-label="Previous period" onclick={()=>offset--}><ChevronLeft size={17}/></button><span>{periodTitle}</span><button aria-label="Next period" onclick={()=>offset++} disabled={offset>=0}><ChevronRight size={17}/></button></div><div class="average"><span>Average</span><strong>{average===null?'—':`${average}%`}</strong></div></div>
<div class="chart-canvas"><canvas bind:this={canvas} aria-label="Productivity completion percentage graph"></canvas></div>
<div class="chart-bottom"><span class="chart-legend"><i class="dot blue"></i> Completion rate</span><span class="chart-legend"><i class="line-dotted"></i><Target size={14} color="#16a34a"/> 60% target</span><span class="goal-days">{aboveTarget}/{validPoints.length} periods reached target</span></div>
</section>
