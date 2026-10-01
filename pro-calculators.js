import { allIngredients } from './recipes.js';
import { recipeCost } from './calculator.js';

export function scaleBatch(baseAmount, baseYield, targetYield){const b=Number(baseAmount),y=Number(baseYield),t=Number(targetYield);if(!(b>=0&&y>0&&t>=0))return 0;return b*t/y;}
export function productionYield(input, output){const i=Number(input),o=Number(output);return i>0&&o>=0?o/i*100:0;}
export function lossPercent(input, output){const i=Number(input),o=Number(output);return i>0&&o>=0?Math.max(0,(i-o)/i*100):0;}
export function batchPlan(recipe, targetYield){const base=Number(recipe?.yieldAmount);if(!(base>0))return null;const factor=Number(targetYield)/base;return {factor,ingredients:allIngredients(recipe).map(i=>({...i,amount:i.amount==null?i.amount:i.amount*factor}))};}
export function costBreakdown(recipe, factor=1, priceResolver){const out=recipeCost(recipe,factor,{priceResolver});return {total:out.total,perPortion:out.perPortion,foodCostPct:out.foodCostPct,missing:out.missing,lines:out.lines};}
export function inventoryCoverage(required,available){const r=Number(required),a=Number(available);if(!(r>0))return {ratio:1,missing:0,percent:100};return {ratio:a/r,missing:Math.max(0,r-a),percent:Math.min(100,a/r*100)};}
