import { useState, useMemo } from "react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer, Legend, CartesianGrid, Cell, ScatterChart, Scatter, ZAxis } from "recharts";

const RAW_CHAIN = [
  {strike:22000,call_oi:null,call_iv:null,call_ltp:null,put_ltp:0.15,put_iv:59.17,put_oi:29131},
  {strike:22500,call_oi:2,call_iv:null,call_ltp:null,put_ltp:0.15,put_iv:45.05,put_oi:43674},
  {strike:22750,call_oi:4,call_iv:null,call_ltp:1413.4,put_ltp:0.15,put_iv:40.23,put_oi:60970},
  {strike:22800,call_oi:30,call_iv:null,call_ltp:1426.5,put_ltp:0.1,put_iv:38.97,put_oi:43448},
  {strike:23000,call_oi:744,call_iv:52.39,call_ltp:1240.65,put_ltp:0.2,put_iv:33.93,put_oi:190640},
  {strike:23100,call_oi:169,call_iv:57.97,call_ltp:1182.1,put_ltp:0.2,put_iv:32.21,put_oi:56815},
  {strike:23200,call_oi:256,call_iv:44.43,call_ltp:1071.95,put_ltp:0.25,put_iv:30.77,put_oi:101288},
  {strike:23300,call_oi:614,call_iv:54.55,call_ltp:990,put_ltp:0.25,put_iv:28.53,put_oi:83375},
  {strike:23400,call_oi:796,call_iv:null,call_ltp:850.8,put_ltp:0.3,put_iv:25.81,put_oi:103072},
  {strike:23500,call_oi:3225,call_iv:null,call_ltp:750.4,put_ltp:0.4,put_iv:23.4,put_oi:212810},
  {strike:23600,call_oi:1695,call_iv:null,call_ltp:648.8,put_ltp:0.4,put_iv:21.13,put_oi:117826},
  {strike:23700,call_oi:5352,call_iv:null,call_ltp:548.95,put_ltp:0.5,put_iv:18.66,put_oi:149035},
  {strike:23800,call_oi:23422,call_iv:null,call_ltp:442.2,put_ltp:0.8,put_iv:16.15,put_oi:194852},
  {strike:23900,call_oi:13576,call_iv:null,call_ltp:344.4,put_ltp:1.05,put_iv:13.51,put_oi:146632},
  {strike:23950,call_oi:7395,call_iv:18.05,call_ltp:293.85,put_ltp:1.35,put_iv:12.17,put_oi:88951},
  {strike:24000,call_oi:33470,call_iv:null,call_ltp:245.1,put_ltp:1.85,put_iv:10.92,put_oi:330831},
  {strike:24050,call_oi:12164,call_iv:13.89,call_ltp:195.85,put_ltp:2.45,put_iv:9.7,put_oi:133288},
  {strike:24100,call_oi:60927,call_iv:null,call_ltp:147.05,put_ltp:4.2,put_iv:8.62,put_oi:334739},
  {strike:24150,call_oi:84295,call_iv:null,call_ltp:103.3,put_ltp:8.25,put_iv:7.87,put_oi:322937},
  {strike:24200,call_oi:190327,call_iv:5.36,call_ltp:63.8,put_ltp:18.85,put_iv:7.77,put_oi:481325},
  {strike:24250,call_oi:267009,call_iv:6.23,call_ltp:33.65,put_ltp:39.8,put_iv:7.93,put_oi:232107},
  {strike:24300,call_oi:449819,call_iv:6.94,call_ltp:16.45,put_ltp:72.6,put_iv:8.49,put_oi:146679},
  {strike:24350,call_oi:252134,call_iv:7.44,call_ltp:7.5,put_ltp:114.7,put_iv:9.52,put_oi:32033},
  {strike:24400,call_oi:297695,call_iv:8.09,call_ltp:3.85,put_ltp:159.95,put_iv:11.2,put_oi:31172},
  {strike:24450,call_oi:149108,call_iv:8.87,call_ltp:2.15,put_ltp:209.75,put_iv:12.93,put_oi:12640},
  {strike:24500,call_oi:314336,call_iv:9.9,call_ltp:1.4,put_ltp:256.8,put_iv:15.03,put_oi:21441},
  {strike:24600,call_oi:224106,call_iv:11.64,call_ltp:0.7,put_ltp:357.1,put_iv:18.73,put_oi:13244},
  {strike:24700,call_oi:170548,call_iv:13.75,call_ltp:0.45,put_ltp:452.3,put_iv:20.06,put_oi:5776},
  {strike:24800,call_oi:160813,call_iv:15.97,call_ltp:0.4,put_ltp:555.45,put_iv:26.67,put_oi:10144},
  {strike:25000,call_oi:216568,call_iv:20.32,call_ltp:0.25,put_ltp:752.85,put_iv:33.71,put_oi:12573},
  {strike:25100,call_oi:79226,call_iv:22.17,call_ltp:0.15,put_ltp:853.25,put_iv:null,put_oi:2375},
  {strike:25200,call_oi:77557,call_iv:24.53,call_ltp:0.1,put_ltp:953.55,put_iv:39.56,put_oi:4820},
  {strike:25500,call_oi:130035,call_iv:31.45,call_ltp:0.1,put_ltp:1249.05,put_iv:37.87,put_oi:12101},
  {strike:26000,call_oi:70652,call_iv:39.11,call_ltp:0.1,put_ltp:1755.2,put_iv:63,put_oi:3120},
  {strike:26500,call_oi:21081,call_iv:49.03,call_ltp:0.05,put_ltp:2211.05,put_iv:null,put_oi:613},
];

// ── Black-Scholes ─────────────────────────────────────────────────────────
function erf(x) {
  const t = 1/(1+0.3275911*Math.abs(x));
  const y = 1-(((((1.061405429*t-1.453152027)*t)+1.421413741)*t-0.284496736)*t+0.254829592)*t*Math.exp(-x*x);
  return x>=0?y:-y;
}
const normCDF = x => 0.5*(1+erf(x/Math.sqrt(2)));
const normPDF = x => Math.exp(-0.5*x*x)/Math.sqrt(2*Math.PI);

function bsPrice(S,K,T,r,sigma,type) {
  if(T<=0||sigma<=0) return Math.max(0,type==="C"?S-K:K-S);
  const d1=(Math.log(S/K)+(r+0.5*sigma*sigma)*T)/(sigma*Math.sqrt(T));
  const d2=d1-sigma*Math.sqrt(T);
  if(type==="C") return S*normCDF(d1)-K*Math.exp(-r*T)*normCDF(d2);
  return K*Math.exp(-r*T)*normCDF(-d2)-S*normCDF(-d1);
}
function bsGreeks(S,K,T,r,sigma,type) {
  if(T<=0||sigma<=0) return {delta:type==="C"?1:-1,gamma:0,theta:0,vega:0};
  const d1=(Math.log(S/K)+(r+0.5*sigma*sigma)*T)/(sigma*Math.sqrt(T));
  const d2=d1-sigma*Math.sqrt(T);
  const delta=type==="C"?normCDF(d1):normCDF(d1)-1;
  const gamma=normPDF(d1)/(S*sigma*Math.sqrt(T));
  const theta=type==="C"
    ?(-S*normPDF(d1)*sigma/(2*Math.sqrt(T))-r*K*Math.exp(-r*T)*normCDF(d2))/365
    :(-S*normPDF(d1)*sigma/(2*Math.sqrt(T))+r*K*Math.exp(-r*T)*normCDF(-d2))/365;
  const vega=S*normPDF(d1)*Math.sqrt(T)/100;
  return {delta,gamma,theta,vega};
}

const STRATEGIES = {
  "Long Call":      {legs:(a)=>[{type:"C",dir:1,strike:a}],              desc:"Bullish. Buy 1 ATM Call. Unlimited upside, loss limited to premium."},
  "Long Put":       {legs:(a)=>[{type:"P",dir:1,strike:a}],              desc:"Bearish. Buy 1 ATM Put. Profits when market falls."},
  "Bull Call Spread":{legs:(a,s)=>[{type:"C",dir:1,strike:a},{type:"C",dir:-1,strike:a+s*2}], desc:"Mildly bullish. Lower cost than plain call, but profit is capped."},
  "Bear Put Spread": {legs:(a,s)=>[{type:"P",dir:1,strike:a},{type:"P",dir:-1,strike:a-s*2}], desc:"Mildly bearish. Lower cost than plain put, profit capped."},
  "Long Straddle":  {legs:(a)=>[{type:"C",dir:1,strike:a},{type:"P",dir:1,strike:a}],         desc:"Neutral on direction. Profits from any big move either way."},
  "Short Straddle": {legs:(a)=>[{type:"C",dir:-1,strike:a},{type:"P",dir:-1,strike:a}],        desc:"Sell ATM Call + Put. Max profit if index stays flat. High risk."},
  "Long Strangle":  {legs:(a,s)=>[{type:"C",dir:1,strike:a+s},{type:"P",dir:1,strike:a-s}],   desc:"Buy OTM Call + Put. Cheaper than straddle, needs bigger move."},
  "Iron Condor":    {legs:(a,s)=>[{type:"P",dir:1,strike:a-s*3},{type:"P",dir:-1,strike:a-s},{type:"C",dir:-1,strike:a+s},{type:"C",dir:1,strike:a+s*3}], desc:"Sell inner strikes, buy outer wings. Profits if market stays in range."},
  "Covered Call":   {legs:(a,s)=>[{type:"C",dir:-1,strike:a+s}],         desc:"Sell OTM Call against long futures position. Income strategy."},
  "Protective Put": {legs:(a)=>[{type:"P",dir:1,strike:a}],              desc:"Buy ATM Put against long futures. Acts as insurance."},
};

const fmt=(n,d=2)=>n==null?"—":n.toLocaleString("en-IN",{minimumFractionDigits:d,maximumFractionDigits:d});
const fmtK=n=>n>=1e6?(n/1e6).toFixed(1)+"M":n>=1e3?(n/1e3).toFixed(0)+"K":String(Math.round(n));

// WStep must be defined OUTSIDE App to avoid React re-mount on every render
function WStep({n,label,formula,result,explain,col="#e2e8f0"}) {
  return (
    <div style={{display:"flex",gap:14,padding:"12px 0",borderBottom:"1px solid #2d3d55"}}>
      <div style={{minWidth:26,height:26,borderRadius:"50%",background:"#1e2d4a",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:"#60b4ff",fontWeight:700,flexShrink:0,marginTop:2}}>{n}</div>
      <div style={{flex:1}}>
        <div style={{fontSize:11,color:"#cbd5e1",marginBottom:4}}>{label}</div>
        <div style={{background:"#111827",border:"1px solid #1e2d4a",borderRadius:5,padding:"6px 10px",fontSize:12,color:"#93e0ff",marginBottom:5,whiteSpace:"pre-wrap",lineHeight:1.6}}>{formula}</div>
        <div style={{fontSize:15,fontWeight:700,color:col,marginBottom:4}}>= {result}</div>
        <div style={{fontSize:12,color:"#cbd5e1",lineHeight:1.6}}>{explain}</div>
      </div>
    </div>
  );
}

export default function App() {
  const [spot, setSpot]           = useState(24220);
  const [spotInput, setSpotInput] = useState("24220");
  const [r, setR]                 = useState(6.5);
  const [dte, setDte]             = useState(7);
  const [strategy, setStrategy]   = useState("Long Straddle");
  const [tab, setTab]             = useState("chain");
  const [ivShift, setIvShift]     = useState(0);
  const [manualIV, setManualIV]   = useState("");
  const [useManual, setUseManual] = useState(false);

  const T = dte/365;
  const rv = r/100;
  const overrideIV = useManual && manualIV !== "" ? parseFloat(manualIV) : null;

  const atmStrike = useMemo(()=>{
    return RAW_CHAIN.reduce((b,r)=>Math.abs(r.strike-spot)<Math.abs(b.strike-spot)?r:b).strike;
  },[spot]);

  const enriched = useMemo(()=>{
    return RAW_CHAIN.map(row=>{
      const civ = overrideIV!=null ? overrideIV : Math.max(0.1,(row.call_iv||row.put_iv||15)+ivShift);
      const piv = overrideIV!=null ? overrideIV : Math.max(0.1,(row.put_iv||row.call_iv||15)+ivShift);
      const cs=civ/100, ps=piv/100;
      const callBS=bsPrice(spot,row.strike,T,rv,cs,"C");
      const putBS=bsPrice(spot,row.strike,T,rv,ps,"P");
      const callG=bsGreeks(spot,row.strike,T,rv,cs,"C");
      const putG=bsGreeks(spot,row.strike,T,rv,ps,"P");
      return {...row,callBS,putBS,callG,putG,callIVpct:civ,putIVpct:piv,isATM:row.strike===atmStrike};
    });
  },[spot,T,rv,atmStrike,ivShift,overrideIV]);

  const step=50;
  const stratLegs = useMemo(()=>{
    const defn=STRATEGIES[strategy];
    return defn.legs(atmStrike,step).map(leg=>{
      const row=enriched.find(r=>r.strike===leg.strike)||enriched.reduce((a,b)=>Math.abs(a.strike-leg.strike)<Math.abs(b.strike-leg.strike)?a:b);
      const iv=(leg.type==="C"?row.callIVpct:row.putIVpct)/100;
      return {...leg,premium:bsPrice(spot,leg.strike,T,rv,Math.max(0.01,iv),leg.type),greeks:bsGreeks(spot,leg.strike,T,rv,Math.max(0.01,iv),leg.type),actualStrike:row.strike};
    });
  },[strategy,atmStrike,enriched,spot,T,rv]);

  const netPrem  = stratLegs.reduce((s,l)=>s+l.dir*l.premium,0);
  const netDelta = stratLegs.reduce((s,l)=>s+l.dir*l.greeks.delta,0);
  const netTheta = stratLegs.reduce((s,l)=>s+l.dir*l.greeks.theta,0);
  const netVega  = stratLegs.reduce((s,l)=>s+l.dir*l.greeks.vega,0);

  const payoffData = useMemo(()=>{
    const pts=[];
    for(let s=spot*0.93;s<=spot*1.07;s+=spot*0.002){
      const pnl=stratLegs.reduce((sum,leg)=>{
        const intr=leg.type==="C"?Math.max(0,s-leg.actualStrike):Math.max(0,leg.actualStrike-s);
        return sum+leg.dir*(intr-leg.premium);
      },0);
      pts.push({spot:Math.round(s),pnl:Math.round(pnl*100)/100});
    }
    return pts;
  },[stratLegs,spot]);

  const oiData = useMemo(()=>
    enriched.filter(r=>r.strike>=spot-1000&&r.strike<=spot+1000).map(r=>({
      strike:r.strike,callOI:(r.call_oi||0)/1000,putOI:(r.put_oi||0)/1000
    }))
  ,[enriched,spot]);

  const mono = "'IBM Plex Mono','Courier New',monospace";
  const bg="#111827", card="#1a2540", border="#2d4a7a";

  // ── BS Walkthrough calc ───────────────────────────────────────────────
  const atmRow   = enriched.find(r=>r.isATM)||enriched[0];
  const S=spot, K=atmRow.strike;
  const sigC=Math.max(0.01,atmRow.callIVpct/100);
  const sigP=Math.max(0.01,atmRow.putIVpct/100);
  const lnSK=Math.log(S/K);
  const sqrtT=Math.sqrt(T);
  const d1c=(lnSK+(rv+0.5*sigC*sigC)*T)/(sigC*sqrtT);
  const d2c=d1c-sigC*sqrtT;
  const Nd1c=normCDF(d1c), Nd2c=normCDF(d2c);
  const disc=Math.exp(-rv*T);
  const callBSw=S*Nd1c-K*disc*Nd2c;
  const d1p=(lnSK+(rv+0.5*sigP*sigP)*T)/(sigP*sqrtT);
  const d2p=d1p-sigP*sqrtT;
  const Nnd1p=normCDF(-d1p), Nnd2p=normCDF(-d2p);
  const putBSw=K*disc*Nnd2p-S*Nnd1p;
  const pcpLeft=callBSw-putBSw;
  const pcpRight=S-K*disc;
  const pcpDiff=Math.abs(pcpLeft-pcpRight);



  return (
    <div style={{fontFamily:mono,background:bg,minHeight:"100vh",color:"#e2e8f0"}}>

      {/* ── HEADER ── */}
      <div style={{background:"linear-gradient(135deg,#1a2e50,#243560)",borderBottom:`1px solid #1e3a5f`,padding:"14px 22px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
        <div>
          <div style={{fontSize:12,color:"#60b4ff",letterSpacing:4,textTransform:"uppercase"}}>NIFTY OPTIONS LAB</div>
          <div style={{fontSize:19,fontWeight:700,color:"#fff"}}>Black-Scholes Pricer & Strategy Builder</div>
          <div style={{fontSize:12,color:"#cbd5e1",marginTop:2}}>Data: 10-Mar-2026 EOD · Weekly Expiry · NIFTY 50</div>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{fontSize:11,color:"#cbd5e1",marginBottom:3}}>SPOT PRICE (edit to reprice)</div>
          <input value={spotInput} onChange={e=>{setSpotInput(e.target.value);const n=parseFloat(e.target.value.replace(/,/g,""));if(!isNaN(n)&&n>18000&&n<35000)setSpot(n);}}
            style={{background:"#1a2540",border:"1px solid #4a9eff",color:"#60b4ff",fontSize:22,fontWeight:700,width:136,textAlign:"right",padding:"4px 8px",borderRadius:4,fontFamily:mono,outline:"none"}}/>
          <div style={{fontSize:12,color:"#60b4ff",marginTop:2}}>ATM Strike: {atmStrike.toLocaleString("en-IN")}</div>
        </div>
      </div>

      {/* ── CONTROLS ── */}
      <div style={{background:card,borderBottom:`1px solid ${border}`,padding:"10px 22px",display:"flex",gap:20,flexWrap:"wrap",alignItems:"flex-end"}}>
        {/* DTE */}
        <div>
          <div style={{fontSize:11,color:"#cbd5e1",marginBottom:3}}>DAYS TO EXPIRY</div>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <input type="range" min={1} max={30} value={dte} onChange={e=>setDte(+e.target.value)} style={{width:90,accentColor:"#4a9eff"}}/>
            <span style={{color:"#e2e8f0",fontSize:13,minWidth:28}}>{dte}d</span>
          </div>
        </div>
        {/* Rate */}
        <div>
          <div style={{fontSize:11,color:"#cbd5e1",marginBottom:3}}>RISK-FREE RATE</div>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <input type="range" min={4} max={10} step={0.25} value={r} onChange={e=>setR(+e.target.value)} style={{width:90,accentColor:"#4a9eff"}}/>
            <span style={{color:"#e2e8f0",fontSize:13,minWidth:34}}>{r}%</span>
          </div>
        </div>
        {/* IV Shift */}
        <div>
          <div style={{fontSize:11,color:"#cbd5e1",marginBottom:3}}>IV SHIFT (±pp)</div>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <input type="range" min={-20} max={20} value={ivShift} onChange={e=>setIvShift(+e.target.value)} style={{width:90,accentColor:"#f59e0b"}}/>
            <span style={{color:ivShift===0?"#64748b":ivShift>0?"#f59e0b":"#f87171",fontSize:13,minWidth:40}}>{ivShift>0?"+":""}{ivShift}pp</span>
          </div>
        </div>

        {/* ── MANUAL IV OVERRIDE ── */}
        <div style={{borderLeft:`1px solid ${border}`,paddingLeft:18}}>
          <div style={{fontSize:9,marginBottom:3,display:"flex",alignItems:"center",gap:6}}>
            <span style={{color:useManual?"#f59e0b":"#64748b",letterSpacing:1}}>OVERRIDE ALL IV%</span>
            <span onClick={()=>setUseManual(v=>!v)}
              style={{cursor:"pointer",color:useManual?"#f59e0b":"#475569",border:`1px solid ${useManual?"#f59e0b":"#475569"}`,borderRadius:3,padding:"1px 5px",fontSize:9,userSelect:"none"}}>
              {useManual?"ON":"OFF"}
            </span>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <input type="number" min={1} max={200} step={0.5} value={manualIV}
              placeholder="e.g. 12"
              onChange={e=>{setManualIV(e.target.value);if(e.target.value!=="")setUseManual(true);}}
              style={{background:useManual?"#1a1600":"#060a14",border:`1px solid ${useManual?"#f59e0b":border}`,color:useManual?"#f59e0b":"#64748b",width:68,padding:"5px 8px",borderRadius:4,fontFamily:mono,fontSize:14,fontWeight:700,outline:"none"}}/>
            <span style={{fontSize:11,color:"#cbd5e1"}}>%</span>
            {useManual&&manualIV&&(
              <span onClick={()=>{setUseManual(false);setManualIV("");}}
                style={{fontSize:11,color:"#f87171",border:"1px solid #f87171",borderRadius:3,padding:"2px 5px",cursor:"pointer",userSelect:"none"}}>✕</span>
            )}
          </div>
          <div style={{fontSize:11,color:"#cbd5e1",marginTop:3}}>
            {useManual&&manualIV?`All strikes at ${manualIV}% IV`:"Per-strike market IV"}
          </div>
        </div>

        {/* Strategy */}
        <div style={{marginLeft:"auto"}}>
          <div style={{fontSize:11,color:"#cbd5e1",marginBottom:3}}>STRATEGY</div>
          <select value={strategy} onChange={e=>setStrategy(e.target.value)}
            style={{background:"#1e2d4a",border:`1px solid #2d4a7a`,color:"#e2e8f0",padding:"6px 10px",borderRadius:4,fontSize:12,fontFamily:mono,cursor:"pointer"}}>
            {Object.keys(STRATEGIES).map(s=><option key={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* ── TABS ── */}
      <div style={{display:"flex",background:bg,borderBottom:`1px solid ${border}`,padding:"0 22px"}}>
        {[["chain","Option Chain"],["strategy","Strategy Builder"],["oi","OI Analysis"],["smile","📈 IV Smile"],["gap","⚡ BS vs Mkt Gap"],["walkthrough","🔬 BS Walkthrough"]].map(([t,label])=>(
          <button key={t} onClick={()=>setTab(t)}
            style={{background:"none",border:"none",borderBottom:tab===t?"2px solid #4a9eff":"2px solid transparent",color:tab===t?"#60b4ff":"#94a3b8",padding:"10px 14px",cursor:"pointer",fontSize:11,fontFamily:mono,letterSpacing:1.5,textTransform:"uppercase",transition:"color 0.15s"}}>
            {label}
          </button>
        ))}
      </div>

      {/* ── CONTENT ── */}
      <div style={{padding:"18px 22px"}}>

        {/* ════ OPTION CHAIN ════ */}
        {tab==="chain"&&(
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
              <thead>
                <tr>
                  <td colSpan={7} style={{background:"#172b17",textAlign:"center",padding:"4px",color:"#4ade80",fontSize:11,letterSpacing:2}}>── CALLS ──</td>
                  <td style={{background:"#1e2d4a",textAlign:"center",padding:"4px",color:"#cbd5e1",fontWeight:700}}>STRIKE</td>
                  <td colSpan={7} style={{background:"#2b1717",textAlign:"center",padding:"4px",color:"#f87171",fontSize:11,letterSpacing:2}}>── PUTS ──</td>
                </tr>
                <tr style={{color:"#cbd5e1",fontSize:11,letterSpacing:0.5,borderBottom:`1px solid ${border}`}}>
                  <th style={{padding:"5px 7px",textAlign:"right",background:"#162812"}}>OI</th>
                  <th style={{padding:"5px 7px",textAlign:"right",background:"#162812"}}>IV%</th>
                  <th style={{padding:"5px 7px",textAlign:"right",background:"#162812"}}>MKT LTP</th>
                  <th style={{padding:"5px 7px",textAlign:"right",background:"#1f3d1f"}}>BS PRICE</th>
                  <th style={{padding:"5px 7px",textAlign:"right",background:"#1f3d1f"}}>Δ DELTA</th>
                  <th style={{padding:"5px 7px",textAlign:"right",background:"#1f3d1f"}}>Θ THETA</th>
                  <th style={{padding:"5px 7px",textAlign:"right",background:"#1f3d1f"}}>Γ ×1000</th>
                  <th style={{padding:"5px 7px",textAlign:"right",background:"#1f3d1f"}}>ν VEGA</th>
                  <th style={{padding:"5px 7px",textAlign:"center",background:"#1e2d4a"}}>STRIKE</th>
                  <th style={{padding:"5px 7px",textAlign:"left",background:"#3a1a1a"}}>Γ ×1000</th>
                  <th style={{padding:"5px 7px",textAlign:"left",background:"#3a1a1a"}}>ν VEGA</th>
                  <th style={{padding:"5px 7px",textAlign:"left",background:"#3a1a1a"}}>Θ THETA</th>
                  <th style={{padding:"5px 7px",textAlign:"left",background:"#3a1a1a"}}>Δ DELTA</th>
                  <th style={{padding:"5px 7px",textAlign:"left",background:"#3a1a1a"}}>BS PRICE</th>
                  <th style={{padding:"5px 7px",textAlign:"left",background:"#2a1414"}}>MKT LTP</th>
                  <th style={{padding:"5px 7px",textAlign:"left",background:"#2a1414"}}>IV%</th>
                  <th style={{padding:"5px 7px",textAlign:"left",background:"#2a1414"}}>OI</th>
                </tr>
              </thead>
              <tbody>
                {enriched.map(row=>{
                  const atm=row.isATM;
                  const cdiff=row.call_ltp?((row.callBS-row.call_ltp)/row.call_ltp*100).toFixed(1):null;
                  const pdiff=row.put_ltp?((row.putBS-row.put_ltp)/row.put_ltp*100).toFixed(1):null;
                  return (
                    <tr key={row.strike} style={{borderBottom:`1px solid #0c1422`}}>
                      <td style={{padding:"4px 7px",textAlign:"right",color:"#4ade80",background:atm?"#1f3d1f":"#162810"}}>{row.call_oi?fmtK(row.call_oi):"—"}</td>
                      <td style={{padding:"4px 7px",textAlign:"right",color:"#a3f5bf",background:atm?"#1f3d1f":"#162810"}}>{row.callIVpct?.toFixed(1)||"—"}</td>
                      <td style={{padding:"4px 7px",textAlign:"right",color:"#e8fff2",background:atm?"#1f3d1f":"#162810"}}>{row.call_ltp?fmt(row.call_ltp):"—"}</td>
                      <td style={{padding:"4px 7px",textAlign:"right",fontWeight:atm?700:400,background:atm?"#243d24":"#1f3a1f"}}>
                        <span style={{color:"#60b4ff"}}>{fmt(row.callBS)}</span>
                        {cdiff&&<span style={{fontSize:8,color:Math.abs(+cdiff)>10?"#f59e0b":"#475569",marginLeft:3}}>{cdiff>0?"+":""}{cdiff}%</span>}
                      </td>
                      <td style={{padding:"4px 7px",textAlign:"right",color:"#93e0ff",background:atm?"#243d24":"#1f3a1f"}}>{fmt(row.callG.delta,3)}</td>
                      <td style={{padding:"4px 7px",textAlign:"right",color:"#fcc2c2",background:atm?"#243d24":"#1f3a1f"}}>{fmt(row.callG.theta,2)}</td>
                      <td style={{padding:"4px 7px",textAlign:"right",color:"#ddd6fe",background:atm?"#243d24":"#1f3a1f"}}>{(row.callG.gamma*1000).toFixed(3)}</td>
                      <td style={{padding:"4px 7px",textAlign:"right",color:"#ddd6fe",background:atm?"#243d24":"#1f3a1f"}}>{fmt(row.callG.vega,2)}</td>
                      <td style={{padding:"4px 7px",textAlign:"center",fontWeight:700,background:atm?"#3a5070":"#253560",color:atm?"#fff":"#94a3b8",borderLeft:`1px solid #2d4a7a`,borderRight:`1px solid #2d4a7a`,fontSize:atm?13:11}}>
                        {row.strike.toLocaleString("en-IN")}
                        {atm&&<span style={{display:"block",fontSize:8,color:"#60b4ff",letterSpacing:1}}>ATM</span>}
                      </td>
                      <td style={{padding:"4px 7px",textAlign:"left",color:"#ddd6fe",background:atm?"#3d2040":"#251830"}}>{(row.putG.gamma*1000).toFixed(3)}</td>
                      <td style={{padding:"4px 7px",textAlign:"left",color:"#ddd6fe",background:atm?"#3d2040":"#251830"}}>{fmt(row.putG.vega,2)}</td>
                      <td style={{padding:"4px 7px",textAlign:"left",color:"#fcc2c2",background:atm?"#3d2040":"#251830"}}>{fmt(row.putG.theta,2)}</td>
                      <td style={{padding:"4px 7px",textAlign:"left",color:"#93e0ff",background:atm?"#3d2040":"#251830"}}>{fmt(row.putG.delta,3)}</td>
                      <td style={{padding:"4px 7px",textAlign:"left",background:atm?"#3d2040":"#251830"}}>
                        <span style={{color:"#60b4ff",fontWeight:atm?700:400}}>{fmt(row.putBS)}</span>
                        {pdiff&&<span style={{fontSize:8,color:Math.abs(+pdiff)>10?"#f59e0b":"#475569",marginLeft:3}}>{pdiff>0?"+":""}{pdiff}%</span>}
                      </td>
                      <td style={{padding:"4px 7px",textAlign:"left",color:"#fed8d8",background:atm?"#3d2216":"#2a1414"}}>{row.put_ltp?fmt(row.put_ltp):"—"}</td>
                      <td style={{padding:"4px 7px",textAlign:"left",color:"#fcc2c2",background:atm?"#3d2216":"#2a1414"}}>{row.putIVpct?.toFixed(1)||"—"}</td>
                      <td style={{padding:"4px 7px",textAlign:"left",color:"#f87171",background:atm?"#3d2216":"#2a1414"}}>{row.put_oi?fmtK(row.put_oi):"—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div style={{marginTop:8,fontSize:11,color:"#8899aa"}}>% diff = (BS − MKT) / MKT. Amber = divergence &gt;10%. BS uses market IV per strike; override with the OVERRIDE IV% control above.</div>
          </div>
        )}

        {/* ════ STRATEGY ════ */}
        {tab==="strategy"&&(
          <div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
              <div style={{background:card,border:`1px solid ${border}`,borderRadius:8,padding:16}}>
                <div style={{fontSize:12,color:"#60b4ff",letterSpacing:2,marginBottom:6}}>{strategy.toUpperCase()}</div>
                <div style={{fontSize:11,color:"#cbd5e1",marginBottom:14}}>{STRATEGIES[strategy].desc}</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
                  {[
                    {label:"Net Premium",val:fmt(Math.abs(netPrem)),color:netPrem<0?"#4ade80":"#f87171",sub:netPrem<0?"CREDIT":"DEBIT"},
                    {label:"Net Delta",val:fmt(netDelta,3),color:netDelta>0.05?"#4ade80":netDelta<-0.05?"#f87171":"#94a3b8"},
                    {label:"Theta /day",val:fmt(netTheta,2),color:netTheta>0?"#4ade80":"#f87171"},
                    {label:"Vega /1% IV",val:fmt(netVega,2),color:"#ddd6fe"},
                  ].map(({label,val,color,sub})=>(
                    <div key={label} style={{background:"#1e2e4a",borderRadius:6,padding:"10px 12px"}}>
                      <div style={{fontSize:11,color:"#cbd5e1",marginBottom:3}}>{label}</div>
                      <div style={{fontSize:17,fontWeight:700,color}}>{val}</div>
                      {sub&&<div style={{fontSize:11,color,marginTop:2}}>{sub}</div>}
                    </div>
                  ))}
                </div>
                <div style={{fontSize:11,color:"#cbd5e1",marginBottom:6}}>LEGS</div>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                  <thead><tr style={{color:"#cbd5e1",fontSize:12}}>
                    <th style={{textAlign:"left",padding:"3px 0"}}>Type</th>
                    <th style={{textAlign:"right",padding:"3px 0"}}>Strike</th>
                    <th style={{textAlign:"right",padding:"3px 0"}}>Action</th>
                    <th style={{textAlign:"right",padding:"3px 0"}}>BS Premium</th>
                    <th style={{textAlign:"right",padding:"3px 0"}}>Delta</th>
                  </tr></thead>
                  <tbody>
                    {stratLegs.map((l,i)=>(
                      <tr key={i} style={{borderTop:`1px solid ${border}`}}>
                        <td style={{padding:"5px 0",color:l.type==="C"?"#4ade80":"#f87171"}}>{l.type==="C"?"CALL":"PUT"}</td>
                        <td style={{padding:"5px 0",textAlign:"right",color:"#e2e8f0"}}>{l.actualStrike.toLocaleString("en-IN")}</td>
                        <td style={{padding:"5px 0",textAlign:"right",color:l.dir===1?"#4ade80":"#f87171"}}>{l.dir===1?"BUY":"SELL"}</td>
                        <td style={{padding:"5px 0",textAlign:"right",color:"#60b4ff"}}>₹{fmt(l.premium)}</td>
                        <td style={{padding:"5px 0",textAlign:"right",color:"#93e0ff"}}>{fmt(l.dir*l.greeks.delta,3)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{background:card,border:`1px solid ${border}`,borderRadius:8,padding:16}}>
                <div style={{fontSize:12,color:"#60b4ff",letterSpacing:2,marginBottom:10}}>PAYOFF AT EXPIRY</div>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={payoffData} margin={{top:5,right:10,bottom:5,left:10}}>
                    <XAxis dataKey="spot" tickFormatter={v=>(v/1000).toFixed(1)+"k"} tick={{fill:"#a0aec0",fontSize:12}}/>
                    <YAxis tickFormatter={v=>v>=1000?(v/1000).toFixed(0)+"k":v} tick={{fill:"#a0aec0",fontSize:12}}/>
                    <Tooltip contentStyle={{background:"#0d1526",border:`1px solid ${border}`,borderRadius:5,fontSize:10}} formatter={v=>[`₹${fmt(v)}`,"P&L"]} labelFormatter={v=>`Spot: ₹${v.toLocaleString("en-IN")}`}/>
                    <ReferenceLine y={0} stroke="#2d4a7a" strokeDasharray="4 2"/>
                    <ReferenceLine x={spot} stroke="#4a9eff" strokeDasharray="3 3" label={{value:"NOW",position:"top",fill:"#60b4ff",fontSize:8}}/>
                    <Line type="monotone" dataKey="pnl" stroke={netPrem<0?"#4ade80":"#f59e0b"} dot={false} strokeWidth={2}/>
                  </LineChart>
                </ResponsiveContainer>
                <div style={{fontSize:11,color:"#cbd5e1",marginTop:6}}>
                  Break-evens: {payoffData.filter((d,i,a)=>i>0&&Math.sign(a[i-1].pnl)!==Math.sign(d.pnl)).map(d=>d.spot.toLocaleString("en-IN")).join(" | ")||"—"}
                  &nbsp;·&nbsp;Max gain: ₹{fmt(Math.max(...payoffData.map(d=>d.pnl)))}
                  &nbsp;·&nbsp;Max loss: ₹{fmt(Math.min(...payoffData.map(d=>d.pnl)))}
                </div>
              </div>
            </div>
            <div style={{background:card,border:`1px solid ${border}`,borderRadius:8,padding:14}}>
              <div style={{fontSize:11,color:"#cbd5e1",letterSpacing:2,marginBottom:10}}>ALL STRATEGIES QUICK SCAN</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:8}}>
                {Object.entries(STRATEGIES).map(([name,defn])=>{
                  const legs=defn.legs(atmStrike,step).map(leg=>{
                    const row=enriched.find(r=>r.strike===leg.strike)||enriched.reduce((a,b)=>Math.abs(a.strike-leg.strike)<Math.abs(b.strike-leg.strike)?a:b);
                    const iv=(leg.type==="C"?row.callIVpct:row.putIVpct)/100;
                    return{...leg,premium:bsPrice(spot,leg.strike,T,rv,Math.max(0.01,iv),leg.type),greeks:bsGreeks(spot,leg.strike,T,rv,Math.max(0.01,iv),leg.type)};
                  });
                  const net=legs.reduce((s,l)=>s+l.dir*l.premium,0);
                  const d=legs.reduce((s,l)=>s+l.dir*l.greeks.delta,0);
                  const th=legs.reduce((s,l)=>s+l.dir*l.greeks.theta,0);
                  const sel=name===strategy;
                  return(
                    <div key={name} onClick={()=>setStrategy(name)} style={{background:sel?"#1a2d4a":"#111e33",border:`1px solid ${sel?"#4a9eff":border}`,borderRadius:6,padding:"10px 12px",cursor:"pointer"}}>
                      <div style={{fontSize:11,color:sel?"#4a9eff":"#94a3b8",fontWeight:600,marginBottom:5}}>{name}</div>
                      <div style={{display:"flex",justifyContent:"space-between",fontSize:10}}>
                        <span style={{color:net<0?"#4ade80":"#f87171"}}>{net<0?"CR":"DR"} ₹{fmt(Math.abs(net))}</span>
                        <span style={{color:"#93e0ff"}}>Δ {fmt(d,2)}</span>
                        <span style={{color:th>0?"#4ade80":"#f87171"}}>Θ {fmt(th,2)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ════ OI ANALYSIS ════ */}
        {tab==="oi"&&(
          <div>
            <div style={{background:card,border:`1px solid ${border}`,borderRadius:8,padding:16,marginBottom:14}}>
              <div style={{fontSize:11,color:"#cbd5e1",letterSpacing:2,marginBottom:10}}>OPEN INTEREST DISTRIBUTION (±1000 pts)</div>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={oiData} margin={{top:5,right:20,bottom:5,left:20}}>
                  <XAxis dataKey="strike" tickFormatter={v=>v.toLocaleString("en-IN")} tick={{fill:"#a0aec0",fontSize:12}}/>
                  <YAxis tickFormatter={v=>v+"K"} tick={{fill:"#a0aec0",fontSize:12}}/>
                  <Tooltip contentStyle={{background:card,border:`1px solid ${border}`,borderRadius:5,fontSize:10}} formatter={(v,n)=>[v.toFixed(0)+"K lots",n==="callOI"?"Call OI":"Put OI"]} labelFormatter={v=>`Strike: ₹${v.toLocaleString("en-IN")}`}/>
                  <Legend wrapperStyle={{fontSize:12,color:"#cbd5e1"}}/>
                  <ReferenceLine x={spot} stroke="#4a9eff" strokeDasharray="4 2" label={{value:`Spot`,position:"top",fill:"#60b4ff",fontSize:8}}/>
                  <Line type="monotone" dataKey="callOI" name="Call OI (K)" stroke="#4ade80" dot={false} strokeWidth={2}/>
                  <Line type="monotone" dataKey="putOI" name="Put OI (K)" stroke="#f87171" dot={false} strokeWidth={2}/>
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
              {(()=>{
                const tc=enriched.reduce((s,r)=>s+(r.call_oi||0),0);
                const tp=enriched.reduce((s,r)=>s+(r.put_oi||0),0);
                const pcr=tp/tc;
                const mp=enriched.reduce((best,row)=>{
                  const pain=enriched.reduce((s,r)=>{
                    return s+(r.call_oi||0)*Math.max(0,r.strike-row.strike)+(r.put_oi||0)*Math.max(0,row.strike-r.strike);
                  },0);
                  return pain<best.pain?{strike:row.strike,pain}:best;
                },{strike:enriched[0].strike,pain:Infinity}).strike;
                const mxC=enriched.reduce((b,r)=>(r.call_oi||0)>(b.call_oi||0)?r:b);
                const mxP=enriched.reduce((b,r)=>(r.put_oi||0)>(b.put_oi||0)?r:b);
                return [
                  {label:"Put/Call OI Ratio",val:pcr.toFixed(2),sub:pcr>1.2?"BEARISH SKEW":pcr<0.8?"BULLISH SKEW":"NEUTRAL",col:pcr>1.2?"#f87171":pcr<0.8?"#4ade80":"#94a3b8"},
                  {label:"Max Pain Strike",val:mp.toLocaleString("en-IN"),sub:`${Math.abs(mp-spot).toFixed(0)} pts from spot`,col:"#f59e0b"},
                  {label:"Highest Call OI",val:mxC.strike.toLocaleString("en-IN"),sub:fmtK(mxC.call_oi||0)+" contracts — resistance",col:"#4ade80"},
                  {label:"Highest Put OI",val:mxP.strike.toLocaleString("en-IN"),sub:fmtK(mxP.put_oi||0)+" contracts — support",col:"#f87171"},
                  {label:"Total Call OI",val:fmtK(tc),sub:"Active call exposure",col:"#4ade80"},
                  {label:"Total Put OI",val:fmtK(tp),sub:"Active put exposure",col:"#f87171"},
                ].map(({label,val,sub,col})=>(
                  <div key={label} style={{background:card,border:`1px solid ${border}`,borderRadius:8,padding:14}}>
                    <div style={{fontSize:11,color:"#cbd5e1",marginBottom:5}}>{label}</div>
                    <div style={{fontSize:20,fontWeight:700,color:col,marginBottom:3}}>{val}</div>
                    <div style={{fontSize:12,color:"#cbd5e1"}}>{sub}</div>
                  </div>
                ));
              })()}
            </div>
          </div>
        )}

        {/* ════ IV SMILE ════ */}
        {tab==="smile"&&(()=>{
          const smileData = enriched.filter(r=>r.strike>=spot-1500&&r.strike<=spot+1500&&(r.call_iv||r.put_iv)).map(r=>({
            strike: r.strike,
            callIV: r.call_iv||null,
            putIV: r.put_iv||null,
            skew: (r.put_iv&&r.call_iv) ? +(r.put_iv-r.call_iv).toFixed(2) : null,
            isATM: r.isATM,
          }));
          const atmIV = smileData.find(r=>r.isATM);
          const avgCallIV = +(smileData.filter(r=>r.callIV).reduce((s,r)=>s+r.callIV,0)/smileData.filter(r=>r.callIV).length).toFixed(1);
          const avgPutIV  = +(smileData.filter(r=>r.putIV ).reduce((s,r)=>s+r.putIV ,0)/smileData.filter(r=>r.putIV ).length).toFixed(1);
          const maxSkew   = smileData.reduce((b,r)=>r.skew!=null&&r.skew>b.skew?r:b,{skew:-Infinity});
          return (
            <div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:16}}>
                {[
                  {label:"ATM Call IV",val:`${atmIV?.callIV?.toFixed(1)||"—"}%`,col:"#4ade80",sub:"At-the-money implied vol"},
                  {label:"ATM Put IV", val:`${atmIV?.putIV?.toFixed(1)||"—"}%`, col:"#f87171",sub:"At-the-money implied vol"},
                  {label:"Avg Call IV", val:`${avgCallIV}%`, col:"#7dd3fc",sub:"Mean across chain"},
                  {label:"Max Put-Call Skew",val:`${maxSkew.skew?.toFixed(1)||"—"}pp @ ${maxSkew.strike?.toLocaleString("en-IN")||"—"}`,col:"#f59e0b",sub:"Largest IV premium on puts"},
                ].map(({label,val,col,sub})=>(
                  <div key={label} style={{background:card,border:`1px solid ${border}`,borderRadius:8,padding:14}}>
                    <div style={{fontSize:11,color:"#cbd5e1",marginBottom:5}}>{label}</div>
                    <div style={{fontSize:18,fontWeight:700,color:col,marginBottom:3}}>{val}</div>
                    <div style={{fontSize:11,color:"#8899aa"}}>{sub}</div>
                  </div>
                ))}
              </div>

              {/* Smile chart */}
              <div style={{background:card,border:`1px solid ${border}`,borderRadius:8,padding:18,marginBottom:16}}>
                <div style={{fontSize:12,color:"#60b4ff",letterSpacing:2,marginBottom:4}}>VOLATILITY SMILE — CALL vs PUT IV BY STRIKE</div>
                <div style={{fontSize:12,color:"#cbd5e1",marginBottom:14}}>
                  A flat line = BS world. Any curve/skew = real market fear, demand, and tail-risk pricing. <span style={{color:"#fbbf24"}}>Puts trading at higher IV than calls = bearish skew / crash insurance premium.</span>
                </div>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={smileData} margin={{top:5,right:30,bottom:5,left:20}}>
                    <CartesianGrid strokeDasharray="2 4" stroke="#111e33"/>
                    <XAxis dataKey="strike" tickFormatter={v=>v.toLocaleString("en-IN")} tick={{fill:"#a0aec0",fontSize:12}} label={{value:"Strike",position:"insideBottom",offset:-2,fill:"#8899aa",fontSize:12}}/>
                    <YAxis tickFormatter={v=>v+"%"} tick={{fill:"#a0aec0",fontSize:12}} domain={["auto","auto"]}/>
                    <Tooltip contentStyle={{background:"#0d1526",border:`1px solid #1e2d4a`,borderRadius:5,fontSize:10}}
                      formatter={(v,n)=>[v?.toFixed(1)+"%", n==="callIV"?"Call IV":"Put IV"]}
                      labelFormatter={v=>`Strike ₹${v.toLocaleString("en-IN")}`}/>
                    <Legend wrapperStyle={{fontSize:12,color:"#cbd5e1"}}/>
                    <ReferenceLine x={spot} stroke="#4a9eff" strokeDasharray="4 2" label={{value:"SPOT",position:"top",fill:"#60b4ff",fontSize:8}}/>
                    <Line type="monotone" dataKey="callIV" name="Call IV %" stroke="#4ade80" dot={{r:3,fill:"#4ade80"}} strokeWidth={2} connectNulls/>
                    <Line type="monotone" dataKey="putIV"  name="Put IV %"  stroke="#f87171" dot={{r:3,fill:"#f87171"}} strokeWidth={2} connectNulls/>
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Skew chart */}
              <div style={{background:card,border:`1px solid ${border}`,borderRadius:8,padding:18}}>
                <div style={{fontSize:12,color:"#fbbf24",letterSpacing:2,marginBottom:4}}>PUT − CALL IV SKEW (per strike)</div>
                <div style={{fontSize:12,color:"#cbd5e1",marginBottom:14}}>
                  <span style={{color:"#f87171"}}>Positive = put IV &gt; call IV</span> → market pricing more downside risk. This is why ATM BS price ≠ market price — market IV differs from flat vol BS assumes.
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={smileData.filter(r=>r.skew!=null)} margin={{top:5,right:20,bottom:5,left:20}}>
                    <CartesianGrid strokeDasharray="2 4" stroke="#111e33"/>
                    <XAxis dataKey="strike" tickFormatter={v=>v.toLocaleString("en-IN")} tick={{fill:"#a0aec0",fontSize:12}}/>
                    <YAxis tickFormatter={v=>v+"pp"} tick={{fill:"#a0aec0",fontSize:12}}/>
                    <Tooltip contentStyle={{background:"#0d1526",border:`1px solid #1e2d4a`,borderRadius:5,fontSize:10}}
                      formatter={(v)=>[v?.toFixed(2)+"pp","Put−Call Skew"]}
                      labelFormatter={v=>`Strike ₹${v.toLocaleString("en-IN")}`}/>
                    <ReferenceLine y={0} stroke="#2d4a7a"/>
                    <ReferenceLine x={spot} stroke="#4a9eff" strokeDasharray="4 2"/>
                    <Bar dataKey="skew" name="Put−Call Skew (pp)" radius={[3,3,0,0]}>
                      {smileData.filter(r=>r.skew!=null).map((entry,i)=>(
                        <Cell key={i} fill={entry.skew>0?"#f87171":"#4ade80"} fillOpacity={entry.isATM?1:0.7}/>
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div style={{fontSize:11,color:"#8899aa",marginTop:8}}>
                  This skew is the primary reason ATM BS price ≠ market LTP. BS assumes one flat σ; market trades each strike at its own IV. The curve shape reflects institutional hedging, crash risk, and supply-demand imbalances.
                </div>
              </div>
            </div>
          );
        })()}

        {/* ════ BS vs MKT GAP ════ */}
        {tab==="gap"&&(()=>{
          const gapData = enriched
            .filter(r=>(r.call_ltp&&r.callBS)||(r.put_ltp&&r.putBS))
            .map(r=>({
              strike: r.strike,
              callGap: r.call_ltp ? +(r.callBS-r.call_ltp).toFixed(2) : null,
              callGapPct: r.call_ltp ? +((r.callBS-r.call_ltp)/r.call_ltp*100).toFixed(1) : null,
              putGap: r.put_ltp ? +(r.putBS-r.put_ltp).toFixed(2) : null,
              putGapPct: r.put_ltp ? +((r.putBS-r.put_ltp)/r.put_ltp*100).toFixed(1) : null,
              isATM: r.isATM,
              callLTP: r.call_ltp,
              callBS: r.callBS,
              putLTP: r.put_ltp,
              putBS: r.putBS,
            }));

          const bigCallGap = gapData.filter(r=>r.callGapPct!=null).reduce((b,r)=>Math.abs(r.callGapPct)>Math.abs(b.callGapPct)?r:b,{callGapPct:0});
          const bigPutGap  = gapData.filter(r=>r.putGapPct!=null ).reduce((b,r)=>Math.abs(r.putGapPct)>Math.abs(b.putGapPct)?r:b,{putGapPct:0});
          const atmGap     = gapData.find(r=>r.isATM)||{};

          // Reasons panel data
          const reasons = [
            {icon:"📐",title:"Vol Smile / Skew",color:"#fbbf24",desc:"BS uses flat vol. Market prices each strike at its own IV. Switch to IV Smile tab to visualise."},
            {icon:"💰",title:"Volatility Risk Premium",color:"#ddd6fe",desc:"Option sellers demand extra return for being short gamma. This premium is highest ATM where gamma peaks."},
            {icon:"⚡",title:"Jump / Gap Risk",color:"#f87171",desc:"BS assumes continuous log-normal returns. Markets price in event gaps: RBI policy, earnings, global shocks."},
            {icon:"🏦",title:"Supply-Demand Imbalance",color:"#93e0ff",desc:"Institutional put buying for hedging + retail call selling creates persistent structural demand at certain strikes."},
            {icon:"📅",title:"Rates & Dividend Timing",color:"#4ade80",desc:"BS is sensitive to r and discrete dividends. Using a flat rate vs OIS/MIBOR curve creates systematic mispricing."},
            {icon:"🔬",title:"Model Risk Premium",color:"#cbd5e1",desc:"Market makers use Heston/SABR/jump-diffusion internally. They charge extra because they know BS is wrong."},
          ];

          return (
            <div>
              {/* Summary stats */}
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:16}}>
                {[
                  {label:"ATM Call Gap",val:atmGap.callGap!=null?`₹${atmGap.callGap?.toFixed(2)}`:"—",pct:atmGap.callGapPct,col:atmGap.callGap>0?"#f59e0b":"#4ade80"},
                  {label:"ATM Put Gap",val:atmGap.putGap!=null?`₹${atmGap.putGap?.toFixed(2)}`:"—",pct:atmGap.putGapPct,col:atmGap.putGap>0?"#f59e0b":"#4ade80"},
                  {label:"Biggest Call Divergence",val:`${bigCallGap.callGapPct?.toFixed(1)}%`,pct:null,col:Math.abs(bigCallGap.callGapPct)>15?"#f87171":"#f59e0b",sub:`@ ${bigCallGap.strike?.toLocaleString("en-IN")}`},
                  {label:"Biggest Put Divergence",val:`${bigPutGap.putGapPct?.toFixed(1)}%`,pct:null,col:Math.abs(bigPutGap.putGapPct)>15?"#f87171":"#f59e0b",sub:`@ ${bigPutGap.strike?.toLocaleString("en-IN")}`},
                ].map(({label,val,pct,col,sub})=>(
                  <div key={label} style={{background:card,border:`1px solid ${border}`,borderRadius:8,padding:14}}>
                    <div style={{fontSize:11,color:"#cbd5e1",marginBottom:5}}>{label}</div>
                    <div style={{fontSize:18,fontWeight:700,color:col}}>{val}</div>
                    {pct!=null&&<div style={{fontSize:11,color:col,marginTop:2}}>{pct>0?"+":""}{pct}%</div>}
                    {sub&&<div style={{fontSize:11,color:"#cbd5e1",marginTop:3}}>{sub}</div>}
                    <div style={{fontSize:11,color:"#8899aa",marginTop:3}}>BS − Market LTP</div>
                  </div>
                ))}
              </div>

              {/* Gap chart */}
              <div style={{background:card,border:`1px solid ${border}`,borderRadius:8,padding:18,marginBottom:16}}>
                <div style={{fontSize:12,color:"#60b4ff",letterSpacing:2,marginBottom:4}}>BS PRICE vs MARKET LTP — ABSOLUTE GAP (₹)</div>
                <div style={{fontSize:12,color:"#cbd5e1",marginBottom:14}}>
                  Bars above zero → BS overestimates market price. Below zero → market prices in more than BS can explain. <span style={{color:"#fbbf24"}}>Amber zones = &gt;10% divergence.</span>
                </div>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={gapData} margin={{top:5,right:20,bottom:5,left:20}}>
                    <CartesianGrid strokeDasharray="2 4" stroke="#111e33"/>
                    <XAxis dataKey="strike" tickFormatter={v=>(v/1000).toFixed(1)+"k"} tick={{fill:"#a0aec0",fontSize:12}}/>
                    <YAxis tickFormatter={v=>`₹${v}`} tick={{fill:"#a0aec0",fontSize:12}}/>
                    <Tooltip contentStyle={{background:"#0d1526",border:`1px solid #1e2d4a`,borderRadius:5,fontSize:10}}
                      formatter={(v,n)=>[v!=null?`₹${v?.toFixed(2)}`:"—", n==="callGap"?"Call Gap":"Put Gap"]}
                      labelFormatter={v=>`Strike ₹${v?.toLocaleString("en-IN")}`}/>
                    <Legend wrapperStyle={{fontSize:12,color:"#cbd5e1"}}/>
                    <ReferenceLine y={0} stroke="#2d4a7a" strokeWidth={1.5}/>
                    <ReferenceLine x={spot} stroke="#4a9eff" strokeDasharray="4 2" label={{value:"SPOT",position:"top",fill:"#60b4ff",fontSize:8}}/>
                    <Bar dataKey="callGap" name="Call Gap (BS−MKT)" radius={[2,2,0,0]}>
                      {gapData.map((e,i)=><Cell key={i} fill={e.callGap>0?"#f59e0b":"#4ade80"} fillOpacity={e.isATM?1:0.65}/>)}
                    </Bar>
                    <Bar dataKey="putGap" name="Put Gap (BS−MKT)" radius={[2,2,0,0]}>
                      {gapData.map((e,i)=><Cell key={i} fill={e.putGap>0?"#a78bfa":"#f87171"} fillOpacity={e.isATM?1:0.65}/>)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* % gap heatmap table */}
              <div style={{background:card,border:`1px solid ${border}`,borderRadius:8,padding:18,marginBottom:16}}>
                <div style={{fontSize:12,color:"#60b4ff",letterSpacing:2,marginBottom:12}}>DIVERGENCE TABLE — % GAP HEATMAP</div>
                <div style={{overflowX:"auto"}}>
                  <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                    <thead>
                      <tr style={{color:"#cbd5e1",fontSize:9,borderBottom:`1px solid ${border}`}}>
                        <th style={{padding:"5px 10px",textAlign:"center"}}>Strike</th>
                        <th style={{padding:"5px 10px",textAlign:"right"}}>Call BS</th>
                        <th style={{padding:"5px 10px",textAlign:"right"}}>Call LTP</th>
                        <th style={{padding:"5px 10px",textAlign:"right"}}>Call Gap %</th>
                        <th style={{padding:"5px 10px",textAlign:"right"}}>Put BS</th>
                        <th style={{padding:"5px 10px",textAlign:"right"}}>Put LTP</th>
                        <th style={{padding:"5px 10px",textAlign:"right"}}>Put Gap %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {gapData.filter(r=>r.strike>=spot-1000&&r.strike<=spot+500).map(row=>{
                        const cAbs=row.callGapPct==null?null:Math.abs(row.callGapPct);
                        const pAbs=row.putGapPct==null?null:Math.abs(row.putGapPct);
                        const heatC=cAbs==null?"transparent":cAbs>30?"#3a2200":cAbs>15?"#2a1c00":cAbs>5?"#1a1400":"transparent";
                        const heatP=pAbs==null?"transparent":pAbs>30?"#3a0022":pAbs>15?"#2a0018":pAbs>5?"#1a0010":"transparent";
                        return (
                          <tr key={row.strike} style={{borderBottom:"1px solid #1e2d44",background:row.isATM?"#0f1e33":"transparent"}}>
                            <td style={{padding:"5px 10px",textAlign:"center",fontWeight:row.isATM?700:400,color:row.isATM?"#fff":"#94a3b8"}}>
                              {row.strike.toLocaleString("en-IN")}{row.isATM&&<span style={{marginLeft:4,fontSize:8,color:"#60b4ff"}}>ATM</span>}
                            </td>
                            <td style={{padding:"5px 10px",textAlign:"right",color:"#60b4ff"}}>{row.callBS!=null?`₹${row.callBS.toFixed(2)}`:"—"}</td>
                            <td style={{padding:"5px 10px",textAlign:"right",color:"#e8fff2"}}>{row.callLTP!=null?`₹${row.callLTP.toFixed(2)}`:"—"}</td>
                            <td style={{padding:"5px 10px",textAlign:"right",background:heatC,color:cAbs==null?"#8899aa":cAbs>15?"#fbbf24":cAbs>5?"#fde68a":"#4ade80",fontWeight:cAbs>10?700:400}}>
                              {row.callGapPct!=null?`${row.callGapPct>0?"+":""}${row.callGapPct}%`:"—"}
                            </td>
                            <td style={{padding:"5px 10px",textAlign:"right",color:"#ddd6fe"}}>{row.putBS!=null?`₹${row.putBS.toFixed(2)}`:"—"}</td>
                            <td style={{padding:"5px 10px",textAlign:"right",color:"#fed8d8"}}>{row.putLTP!=null?`₹${row.putLTP.toFixed(2)}`:"—"}</td>
                            <td style={{padding:"5px 10px",textAlign:"right",background:heatP,color:pAbs==null?"#8899aa":pAbs>15?"#f87171":pAbs>5?"#fcc2c2":"#4ade80",fontWeight:pAbs>10?700:400}}>
                              {row.putGapPct!=null?`${row.putGapPct>0?"+":""}${row.putGapPct}%`:"—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div style={{fontSize:11,color:"#8899aa",marginTop:8}}>Gap = (BS − LTP) / LTP. Amber/red = divergence &gt;5%/15%. Highlighted strikes worth investigating for arb or model recalibration.</div>
              </div>

              {/* Why panel */}
              <div style={{background:card,border:`1px solid ${border}`,borderRadius:8,padding:18}}>
                <div style={{fontSize:12,color:"#fbbf24",letterSpacing:2,marginBottom:12}}>WHY DOES THE GAP EXIST? — 6 ROOT CAUSES</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
                  {reasons.map(({icon,title,color,desc})=>(
                    <div key={title} style={{background:"#1e2e4a",borderRadius:6,padding:"12px 14px",borderLeft:`3px solid ${color}`}}>
                      <div style={{fontSize:16,marginBottom:5}}>{icon}</div>
                      <div style={{fontSize:11,fontWeight:700,color,marginBottom:6}}>{title}</div>
                      <div style={{fontSize:12,color:"#cbd5e1",lineHeight:1.6}}>{desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}

        {/* ════ BS WALKTHROUGH ════ */}
        {tab==="walkthrough"&&(
          <div>
            {/* Input cards */}
            <div style={{background:card,border:`1px solid ${border}`,borderRadius:8,padding:16,marginBottom:16}}>
              <div style={{fontSize:12,color:"#60b4ff",letterSpacing:2,marginBottom:10}}>INPUTS FOR ATM STRIKE — {K.toLocaleString("en-IN")}</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10}}>
                {[
                  {label:"S — Spot Price",val:`₹${S.toLocaleString("en-IN")}`,sub:"Current NIFTY. You set this in the top bar. This is what the market is trading at right now.",col:"#4a9eff"},
                  {label:"K — Strike Price",val:`₹${K.toLocaleString("en-IN")}`,sub:"The fixed price locked in the contract. ATM = closest to current spot.",col:"#e2e8f0"},
                  {label:"T — Time (years)",val:T.toFixed(4),sub:`${dte} days ÷ 365 = ${T.toFixed(4)}. Options are worthless at expiry — time is precious.`,col:"#a78bfa"},
                  {label:"r — Risk-Free Rate",val:`${(rv*100).toFixed(2)}%`,sub:`RBI repo rate proxy. The cost of money over ${dte} days.`,col:"#f59e0b"},
                  {label:"σ — Implied Vol",val:`${(sigC*100).toFixed(2)}%`,sub:overrideIV?"User override active.":"From market IV at this strike. Measures expected price swings.",col:"#4ade80"},
                ].map(({label,val,sub,col})=>(
                  <div key={label} style={{background:"#1e2e4a",borderRadius:6,padding:"12px 13px"}}>
                    <div style={{fontSize:11,color:"#cbd5e1",marginBottom:5}}>{label}</div>
                    <div style={{fontSize:17,fontWeight:700,color:col,marginBottom:4}}>{val}</div>
                    <div style={{fontSize:11,color:"#8899aa",lineHeight:1.5}}>{sub}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
              {/* CALL steps */}
              <div style={{background:card,border:"1px solid #1a3a1a",borderRadius:8,padding:18}}>
                <div style={{fontSize:12,color:"#4ade80",letterSpacing:2,marginBottom:3}}>CALL OPTION — STEP BY STEP</div>
                <div style={{fontSize:12,color:"#cbd5e1",marginBottom:14}}>Formula: C = S·N(d₁) − K·e^(−rT)·N(d₂)</div>

                <WStep n="1" label="Compute ln(S/K) — the log ratio of spot to strike"
                  formula={`ln(S/K) = ln(${S} / ${K}) = ln(${(S/K).toFixed(6)})`}
                  result={lnSK.toFixed(6)}
                  explain={`If spot = strike exactly, ln(S/K) = 0. Here spot (${S}) is ${S>K?"above":"below"} strike (${K}), so it's ${lnSK>=0?"positive (call has intrinsic advantage)":"negative (call is out of the money)"}. This term anchors the entire formula.`}
                  col="#86efac"
                />
                <WStep n="2" label="Compute d₁ — the 'moneyness score' adjusted for time and vol"
                  formula={`d₁ = [ ln(S/K) + (r + σ²/2)·T ] / (σ·√T)\n   = [ ${lnSK.toFixed(4)} + (${rv.toFixed(4)} + ${(sigC*sigC/2).toFixed(4)}) × ${T.toFixed(4)} ] / (${sigC.toFixed(4)} × ${sqrtT.toFixed(4)})\n   = ${((lnSK+(rv+0.5*sigC*sigC)*T)).toFixed(4)} / ${(sigC*sqrtT).toFixed(4)}`}
                  result={d1c.toFixed(6)}
                  explain={`Think of d₁ as "how many standard deviations in the money is this option?" Higher = deeper ITM. For ATM options d₁ is near 0. Here d₁=${d1c.toFixed(3)}, which means the call is ${d1c>0?"slightly in-the-money territory":"slightly out-of-the-money territory"}.`}
                  col="#4ade80"
                />
                <WStep n="3" label="Compute d₂ = d₁ − σ·√T"
                  formula={`d₂ = d₁ − σ·√T = ${d1c.toFixed(4)} − ${sigC.toFixed(4)} × ${sqrtT.toFixed(4)}\n   = ${d1c.toFixed(4)} − ${(sigC*sqrtT).toFixed(4)}`}
                  result={d2c.toFixed(6)}
                  explain={`d₂ is always less than d₁. The gap (σ·√T = ${(sigC*sqrtT).toFixed(4)}) grows with higher vol or more time. d₁ gives the "spot side" probability; d₂ gives the "strike side" probability of exercise.`}
                  col="#4ade80"
                />
                <WStep n="4" label="N(d₁) and N(d₂) — cumulative normal probabilities"
                  formula={`N(${d1c.toFixed(4)}) = ${Nd1c.toFixed(6)}  →  ${(Nd1c*100).toFixed(2)}%\nN(${d2c.toFixed(4)}) = ${Nd2c.toFixed(6)}  →  ${(Nd2c*100).toFixed(2)}%`}
                  result={`${(Nd1c*100).toFixed(2)}% and ${(Nd2c*100).toFixed(2)}%`}
                  explain={`N(d₁) = ${(Nd1c*100).toFixed(1)}% is the option's Delta — how much the premium moves per ₹1 move in NIFTY. It also represents the probability-weighted share of spot you "own". N(d₂) = ${(Nd2c*100).toFixed(1)}% is the probability this call expires in the money, used to price the cost of paying the strike.`}
                  col="#7dd3fc"
                />
                <WStep n="5" label="e^(−rT) — present value discount factor"
                  formula={`e^(−r×T) = e^(−${rv.toFixed(4)} × ${T.toFixed(4)}) = e^(${(-rv*T).toFixed(6)})`}
                  result={disc.toFixed(6)}
                  explain={`₹1 received at expiry (${dte} days from now) is worth only ₹${disc.toFixed(4)} today at ${(rv*100).toFixed(2)}% interest rate. We discount the strike payment because you pay K only at expiry, not today.`}
                  col="#f59e0b"
                />
                <WStep n="6" label="Final Call Price: C = S·N(d₁) − K·e^(−rT)·N(d₂)"
                  formula={`C = ${S} × ${Nd1c.toFixed(4)}  −  ${K} × ${disc.toFixed(4)} × ${Nd2c.toFixed(4)}\n  = ${(S*Nd1c).toFixed(2)}  −  ${(K*disc*Nd2c).toFixed(2)}`}
                  result={`₹${callBSw.toFixed(2)}`}
                  explain={`First term (₹${(S*Nd1c).toFixed(2)}): value of receiving NIFTY at spot, probability-weighted. Second term (₹${(K*disc*Nd2c).toFixed(2)}): present value of paying the strike. Difference = call premium. Market LTP was ₹${atmRow.call_ltp||"—"}.`}
                  col="#4ade80"
                />
              </div>

              {/* PUT steps */}
              <div style={{background:card,border:"1px solid #3a1a1a",borderRadius:8,padding:18}}>
                <div style={{fontSize:12,color:"#f87171",letterSpacing:2,marginBottom:3}}>PUT OPTION — STEP BY STEP</div>
                <div style={{fontSize:12,color:"#cbd5e1",marginBottom:14}}>Formula: P = K·e^(−rT)·N(−d₂) − S·N(−d₁)</div>

                <WStep n="1" label="Same ln(S/K) — identical starting point"
                  formula={`ln(S/K) = ln(${S} / ${K}) = ${lnSK.toFixed(6)}`}
                  result={lnSK.toFixed(6)}
                  explain={`Same value as the call. For a put, being above the strike is bad — you want NIFTY to fall below K. A positive ln(S/K) means the put is currently out-of-the-money (spot is above strike).`}
                  col="#fca5a5"
                />
                <WStep n="2" label="d₁ for put — uses put IV (may differ from call IV)"
                  formula={`d₁ = [ ${lnSK.toFixed(4)} + (${rv.toFixed(4)} + ${(sigP*sigP/2).toFixed(4)}) × ${T.toFixed(4)} ] / (${sigP.toFixed(4)} × ${sqrtT.toFixed(4)})`}
                  result={d1p.toFixed(6)}
                  explain={`Put IV = ${(sigP*100).toFixed(2)}% vs Call IV = ${(sigC*100).toFixed(2)}%. This difference is the volatility skew — puts often carry higher IV because traders buy them as crash insurance, bidding up their price.`}
                  col="#f87171"
                />
                <WStep n="3" label="d₂ for put = d₁ − σ·√T"
                  formula={`d₂ = ${d1p.toFixed(4)} − ${sigP.toFixed(4)} × ${sqrtT.toFixed(4)} = ${d1p.toFixed(4)} − ${(sigP*sqrtT).toFixed(4)}`}
                  result={d2p.toFixed(6)}
                  explain="Same mechanics as the call. d₂ is always smaller than d₁ by exactly σ·√T."
                  col="#f87171"
                />
                <WStep n="4" label="N(−d₁) and N(−d₂) — mirror of call probabilities"
                  formula={`N(−d₁) = N(${(-d1p).toFixed(4)}) = ${Nnd1p.toFixed(6)}  →  ${(Nnd1p*100).toFixed(2)}%\nN(−d₂) = N(${(-d2p).toFixed(4)}) = ${Nnd2p.toFixed(6)}  →  ${(Nnd2p*100).toFixed(2)}%`}
                  result={`${(Nnd1p*100).toFixed(2)}% and ${(Nnd2p*100).toFixed(2)}%`}
                  explain={`N(−d₁) = ${(Nnd1p*100).toFixed(1)}% is the put's delta in absolute terms. Note: Call delta + |Put delta| ≈ 1 (here ${(Nd1c*100).toFixed(1)}% + ${(Nnd1p*100).toFixed(1)}% = ${((Nd1c+Nnd1p)*100).toFixed(1)}%). N(−d₂) = ${(Nnd2p*100).toFixed(1)}% is the probability the put expires in the money.`}
                  col="#fca5a5"
                />
                <WStep n="5" label="e^(−rT) — same discount factor"
                  formula={`e^(−${rv.toFixed(4)} × ${T.toFixed(4)}) = ${disc.toFixed(6)}`}
                  result={disc.toFixed(6)}
                  explain="For a put, you receive K (the strike) when you exercise. That future receipt is discounted to present value. Same factor as the call."
                  col="#f59e0b"
                />
                <WStep n="6" label="Final Put Price: P = K·e^(−rT)·N(−d₂) − S·N(−d₁)"
                  formula={`P = ${K} × ${disc.toFixed(4)} × ${Nnd2p.toFixed(4)}  −  ${S} × ${Nnd1p.toFixed(4)}\n  = ${(K*disc*Nnd2p).toFixed(2)}  −  ${(S*Nnd1p).toFixed(2)}`}
                  result={`₹${putBSw.toFixed(2)}`}
                  explain={`First term (₹${(K*disc*Nnd2p).toFixed(2)}): present value of receiving the strike. Second term (₹${(S*Nnd1p).toFixed(2)}): cost of giving up the spot. Difference = put premium. Market LTP was ₹${atmRow.put_ltp||"—"}.`}
                  col="#f87171"
                />
              </div>
            </div>

            {/* Put-Call Parity */}
            <div style={{background:card,border:"1px solid #1a3a1a",borderRadius:8,padding:16}}>
              <div style={{fontSize:12,color:"#4ade80",letterSpacing:2,marginBottom:8}}>✓ PUT-CALL PARITY VERIFICATION</div>
              <div style={{fontSize:11,color:"#cbd5e1",marginBottom:12}}>
                A fundamental law of options: <span style={{color:"#93e0ff"}}>C − P = S − K·e^(−rT)</span>. Both sides must be equal for the same strike. If they diverge in real markets, it creates an arbitrage opportunity.
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
                {[
                  {label:"Call Price (C)",val:`₹${callBSw.toFixed(2)}`,col:"#4ade80"},
                  {label:"Put Price (P)",val:`₹${putBSw.toFixed(2)}`,col:"#f87171"},
                  {label:"C − P (left side)",val:`₹${pcpLeft.toFixed(4)}`,col:"#7dd3fc"},
                  {label:"S − K·e^(−rT) (right side)",val:`₹${pcpRight.toFixed(4)}`,col:"#7dd3fc"},
                ].map(({label,val,col})=>(
                  <div key={label} style={{background:"#1e2e4a",borderRadius:6,padding:"10px 13px"}}>
                    <div style={{fontSize:11,color:"#cbd5e1",marginBottom:4}}>{label}</div>
                    <div style={{fontSize:17,fontWeight:700,color:col}}>{val}</div>
                  </div>
                ))}
              </div>
              <div style={{marginTop:10,padding:"10px 13px",background:"#1e2e4a",borderRadius:6,display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:13,color:pcpDiff<0.5?"#4ade80":"#f59e0b"}}>{pcpDiff<0.5?"✓":"⚠"}</span>
                <span style={{fontSize:11,color:pcpDiff<0.5?"#4ade80":"#f59e0b"}}>
                  Difference = ₹{pcpDiff.toFixed(4)} — {pcpDiff<0.5?"Parity holds. The maths is self-consistent.":"Small divergence due to rounding in intermediate steps."}
                </span>
              </div>
              <div style={{fontSize:12,color:"#8899aa",marginTop:8}}>
                In live markets, C − P often differs slightly from S − K·e^(−rT) because calls and puts trade at different implied volatilities (the skew). Arbitrageurs exploit large deviations immediately.
              </div>
            </div>
          </div>
        )}

      </div>

      <div style={{textAlign:"center",padding:"10px",fontSize:11,color:"#334155",borderTop:`1px solid ${border}`}}>
        FOR EDUCATIONAL USE ONLY · NOT INVESTMENT ADVICE · Black-Scholes assumes constant IV and log-normal returns
      </div>
    </div>
  );
}
