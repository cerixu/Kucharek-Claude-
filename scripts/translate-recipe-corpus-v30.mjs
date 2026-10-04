#!/usr/bin/env node
import fs from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const part = Number(process.env.PART_INDEX || 0);
const baseCommit = process.env.BASE_COMMIT || '4ebf8ac64d3f9e86c9077cd63c2b84127ee8db77';
if (!(part >= 1 && part <= 9)) throw new Error('PART_INDEX 1..9');
const fileName = 'part-' + String(part).padStart(2, '0') + '.js';
const source = execFileSync('git', ['show', baseCommit + ':recipe-library-data/' + fileName], { encoding: 'utf8' });
const a = source.indexOf('['), b = source.lastIndexOf(']');
if (a < 0 || b < a) throw new Error('Nie znaleziono tablicy');
const recipes = JSON.parse(source.slice(a, b + 1));
const LANG = {'kuchnia-polska':'en','cucina-italiana':'it','cocina-espanola':'es','cuisine-francaise':'fr','german-kitchen':'de','ceska-kuchyne':'cs','japanese-kitchen':'en','chinese-kitchen':'en','indian-kitchen':'en'};
const sleep = ms => new Promise(r => setTimeout(r, ms));
const esc = s => String(s).replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
const tokens = s => (String(s || '').toLowerCase().match(/[\p{L}]{4,}/gu) || []);
const ALLOW = new Set(['sushi','miso','tofu','ramen','sake','curry','tikka','masala','naan','chapati','kimchi','gulasz','pierogi','bigos','barszcz','tortilla','tacos','risotto','carbonara','pesto','pizza','focaccia','gelato','gnocchi','paella','ratatouille','quiche','parmesan','mozzarella','ricotta','pecorino','prosciutto','salami','chorizo','brandy','cognac','rum','porto','sherry','marsala','madeira','wasabi','nori','udon','soba','teriyaki','tempura','yakitori','wonton','tandoori','chai','lassi','paneer']);
function residueScore(original, translated){const o=new Set(tokens(original).filter(x=>!ALLOW.has(x)));const t=new Set(tokens(translated).filter(x=>!ALLOW.has(x)));let n=0;for(const x of o)if(t.has(x))n++;return n;}
function cleanName(value){let s=String(value==null?'':value).replaceAll('\\','').replaceAll('"','');s=s.replace(/[([{][^)\]}]*[)\]}]/g,' ');for(const ch of [':',';'])s=s.split(ch).join(' ');for(let i=0;i<5;i++)s=s.replaceAll('  ',' ');return s.trim();}
async function translate(text, lang='auto'){const url='https://translate.googleapis.com/translate_a/single?client=gtx&sl='+encodeURIComponent(lang)+'&tl=pl&dt=t&q='+encodeURIComponent(text);let last;for(let attempt=0;attempt<7;attempt++){try{const res=await fetch(url,{headers:{'User-Agent':'Mozilla/5.0 Kucharek/3.0','Accept':'application/json,text/plain,*/*'},signal:AbortSignal.timeout(30000)});if(!res.ok)throw new Error('HTTP '+res.status);const data=await res.json();const out=Array.isArray(data?.[0])?data[0].map(x=>x?.[0]||'').join(''):'';if(!out)throw new Error('Pusta odpowiedz');return out;}catch(e){last=e;await sleep(Math.min(15000,800*(attempt+1)));}}throw last||new Error('Tlumaczenie nieudane');}
function markerOf(x){const i=x.indexOf(']]');return i>=0?x.slice(0,i+2):'';}
function parseBatch(out,batch){const r={};for(let i=0;i<batch.length;i++){const m=markerOf(batch[i]);const p=out.indexOf(m);if(p<0)return null;const from=p+m.length;const n=i+1<batch.length?markerOf(batch[i+1]):'';const to=n?out.indexOf(n,from):out.length;if(to<0)return null;r[m]=out.slice(from,to).trim();}return r;}
async function translateFields(fields){const r={};for(let i=0;i<fields.length;){const batch=[];let size=0;while(i<fields.length&&(!batch.length||size+fields[i].length+1<=2300)){batch.push(fields[i++]);size+=batch.at(-1).length+1;}const out=await translate(batch.join('\n'),'auto');const p=parseBatch(out,batch);if(p)Object.assign(r,p);else for(const f of batch){const m=markerOf(f);r[m]=await translate(f.slice(m.length),'auto');}}return r;}
async function one(r){const lang=LANG[r.archiveCollection]||'en';const originalName=r.originalName||r.name||'';const name=cleanName(await translate(originalName,lang));const fields=[];for(let si=0;si<(r.sections||[]).length;si++)for(let ii=0;ii<(r.sections[si].ingredients||[]).length;ii++)fields.push('[[I:'+si+':'+ii+']]'+(r.sections[si].ingredients[ii].name||''));for(let si=0;si<(r.steps||[]).length;si++)fields.push('[[S:'+si+']]'+(r.steps[si].text||''));const parsed=await translateFields(fields);let finalName=name;if(residueScore(originalName,finalName)>1)finalName=cleanName(await translate(originalName,lang));return {...r,originalName:r.originalName||r.name||'',name:finalName,sections:(r.sections||[]).map((s,si)=>({...s,ingredients:(s.ingredients||[]).map((ing,ii)=>({...ing,name:String(parsed['[[I:'+si+':'+ii+']]']||ing.name||'').trim()}))})),steps:(r.steps||[]).map((st,si)=>({...st,text:String(parsed['[[S:'+si+']]']||st.text||'').trim()})),translationLanguage:'pl',translationVersion:30,translationSourceCommit:baseCommit};}
let cursor=0;const out=new Array(recipes.length);
async function worker(){while(true){const i=cursor++;if(i>=recipes.length)return;out[i]=await one(recipes[i]);console.log('part '+part+': '+(i+1)+'/'+recipes.length);await sleep(120);}}
await Promise.all([worker(),worker()]);
const dir=path.join(process.cwd(),'translated-output');await fs.mkdir(dir,{recursive:true});
await fs.writeFile(path.join(dir,fileName),'export const ARCHIVE_RECIPES_PART = '+JSON.stringify(out)+';\n','utf8');
console.log('DONE '+fileName+' '+out.length);