import { useState, useEffect, useCallback } from "react";

const LOCATIONS = [
  { id:"chivi",  name:"Chivi District", suburb:"Ward 3, Masvingo",    lat:-20.58, lon:30.40, color:"#27AE60", abbr:"CHI" },
  { id:"harare", name:"Southlea Park",  suburb:"Harare, Zimbabwe",    lat:-17.92, lon:31.07, color:"#4A90D9", abbr:"HRE" },
  { id:"darwin", name:"Mount Darwin",   suburb:"Mashonaland Central", lat:-16.78, lon:31.58, color:"#9B59B6", abbr:"MTD" },
];

const BASELINE = {
  chivi:  { temp:22, feelsLike:20, humidity:62, wind:13, pressure:1014, visibility:14, uv:5, rain:0.2, code:2 },
  harare: { temp:19, feelsLike:17, humidity:55, wind:10, pressure:1018, visibility:18, uv:4, rain:0.0, code:1 },
  darwin: { temp:25, feelsLike:24, humidity:70, wind:16, pressure:1010, visibility:11, uv:6, rain:0.8, code:3 },
};

const FORECAST_BASE = {
  chivi:  [
    {code:2,high:23,low:11,rain:0.1,wind:12},{code:1,high:25,low:10,rain:0.0,wind:9},
    {code:0,high:27,low:9, rain:0.0,wind:8}, {code:1,high:26,low:10,rain:0.0,wind:10},
    {code:2,high:24,low:11,rain:0.2,wind:11},{code:3,high:21,low:12,rain:1.5,wind:14},
    {code:61,high:19,low:13,rain:4.2,wind:17},
  ],
  harare: [
    {code:1,high:21,low:9, rain:0.0,wind:8}, {code:0,high:23,low:8, rain:0.0,wind:7},
    {code:0,high:24,low:7, rain:0.0,wind:6}, {code:1,high:22,low:8, rain:0.0,wind:8},
    {code:2,high:20,low:10,rain:0.1,wind:10},{code:2,high:19,low:11,rain:0.5,wind:12},
    {code:63,high:17,low:12,rain:3.8,wind:15},
  ],
  darwin: [
    {code:3,high:26,low:15,rain:0.5,wind:15},{code:2,high:28,low:14,rain:0.2,wind:12},
    {code:1,high:29,low:13,rain:0.0,wind:10},{code:2,high:27,low:14,rain:0.1,wind:11},
    {code:3,high:25,low:15,rain:0.8,wind:14},{code:80,high:23,low:16,rain:3.2,wind:18},
    {code:95,high:21,low:17,rain:8.5,wind:22},
  ],
};

const WMO = {
  0:"Clear Sky",1:"Mainly Clear",2:"Partly Cloudy",3:"Overcast",
  45:"Foggy",48:"Icy Fog",51:"Light Drizzle",53:"Drizzle",55:"Heavy Drizzle",
  61:"Light Rain",63:"Rain",65:"Heavy Rain",80:"Rain Showers",
  95:"Thunderstorm",96:"Thunderstorm+Hail",99:"Heavy Thunderstorm+Hail"
};
const WMO_ICON = {
  0:"☀️",1:"🌤️",2:"⛅",3:"☁️",45:"🌫️",
  51:"🌦️",53:"🌦️",55:"🌧️",61:"🌦️",63:"🌧️",65:"⛈️",
  80:"🌧️",95:"⛈️",96:"⛈️",99:"⛈️"
};

const NAV = [
  {id:"live",    icon:"◎", label:"Live"},
  {id:"compare", icon:"◈", label:"Compare"},
  {id:"forecast",icon:"◬", label:"Forecast"},
  {id:"alerts",  icon:"◉", label:"Alerts"},
  {id:"log",     icon:"◆", label:"Log"},
];

const STORAGE_KEY = "cs21_v5_log";
const MAX_LOG = 144;

const storage = {
  get: (key) => { try { const v = localStorage.getItem(key); return v ? { value: v } : null; } catch { return null; } },
  set: (key, val) => { try { localStorage.setItem(key, val); } catch {} },
  delete: (key) => { try { localStorage.removeItem(key); } catch {} },
};

function vary(base) {
  const v = n => Math.round((n + (Math.random()-0.5)*2)*10)/10;
  return {
    ...base,
    temp:      Math.round(v(base.temp)),
    feelsLike: Math.round(v(base.feelsLike)),
    humidity:  Math.min(100, Math.max(10, Math.round(v(base.humidity)))),
    wind:      Math.max(0, Math.round(v(base.wind))),
    pressure:  Math.round(v(base.pressure)),
    uv:        Math.max(0, Math.round(v(base.uv)*10)/10),
    rain:      Math.max(0, Math.round(v(base.rain)*10)/10),
  };
}

async function fetchLocation(loc) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,surface_pressure,visibility,uv_index,precipitation&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_sum,wind_speed_10m_max,uv_index_max&timezone=Africa%2FHarare&forecast_days=7`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error("API error");
    const d = await res.json();
    const c = d.current;
    return {
      id:loc.id, live:true, ts:new Date().toISOString(),
      temp:Math.round(c.temperature_2m), feelsLike:Math.round(c.apparent_temperature),
      humidity:c.relative_humidity_2m, wind:Math.round(c.wind_speed_10m),
      pressure:Math.round(c.surface_pressure),
      visibility:c.visibility!=null?Math.round(c.visibility/1000):14,
      uv:c.uv_index??4, rain:c.precipitation??0, code:c.weather_code, daily:d.daily,
    };
  } catch {
    clearTimeout(timer);
    const base = vary(BASELINE[loc.id]);
    const fc   = FORECAST_BASE[loc.id];
    const today = new Date();
    return {
      id:loc.id, live:false, ts:new Date().toISOString(), ...base,
      daily:{
        time:              fc.map((_,i)=>new Date(today.getTime()+i*86400000).toISOString().slice(0,10)),
        weather_code:      fc.map(f=>f.code),
        temperature_2m_max:fc.map(f=>f.high),
        temperature_2m_min:fc.map(f=>f.low),
        precipitation_sum: fc.map(f=>f.rain),
        wind_speed_10m_max:fc.map(f=>f.wind),
        uv_index_max:      fc.map(f=>f.code<3?7:4),
      },
    };
  }
}

function exportCSV(log) {
  if (!log.length) return;
  const headers = ["Timestamp","DataMode","Chivi_Temp_C","Chivi_Humidity_%","Chivi_Wind_kmh","Chivi_Rain_mm","Chivi_UV","Chivi_Condition","Southlea_Temp_C","Southlea_Humidity_%","Southlea_Wind_kmh","Southlea_Rain_mm","Southlea_UV","Southlea_Condition","MtDarwin_Temp_C","MtDarwin_Humidity_%","MtDarwin_Wind_kmh","MtDarwin_Rain_mm","MtDarwin_UV","MtDarwin_Condition"];
  const rows = log.map(r => {
    const row = [new Date(r.ts).toLocaleString("en-ZW"), r.chivi?.live?"LIVE":"SIMULATED"];
    ["chivi","harare","darwin"].forEach(id => {
      const d = r[id];
      row.push(d?.temp??"",d?.humidity??"",d?.wind??"",d?.rain??"",d?.uv??"",WMO[d?.code]||"");
    });
    return row.join(",");
  });
  const csv  = [headers.join(","),...rows].join("\n");
  const blob = new Blob([csv],{type:"text/csv"});
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href=url; a.download=`ClimateSense21_PGCN_${new Date().toISOString().slice(0,10)}.csv`;
  a.click(); URL.revokeObjectURL(url);
}

function getDerived(d) {
  if (!d) return [{type:"NO DATA",level:"advisory",desc:"Awaiting data."}];
  const a = [];
  if (d.rain>10) a.push({type:"FLOOD WATCH",   level:"warning", desc:`${d.rain}mm rain. Monitor low-lying areas.`});
  if (d.uv>7)   a.push({type:"UV ADVISORY",   level:"advisory",desc:`UV Index ${d.uv}. Limit midday exposure.`});
  if (d.wind>40) a.push({type:"WIND ADVISORY", level:"advisory",desc:`${d.wind}km/h winds. Secure structures.`});
  if (d.temp>33) a.push({type:"HEATWAVE ALERT",level:"warning", desc:`${d.temp}°C. Heat stress risk.`});
  if (d.temp<5)  a.push({type:"COLD ADVISORY", level:"advisory",desc:`${d.temp}°C. Frost risk for crops.`});
  if (!a.length) a.push({type:"ALL CLEAR",level:"clear",desc:"No active weather risk triggers at this time."});
  return a;
}

function SH({title,color}){
  return(
    <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:9,marginTop:6}}>
      <div style={{width:3,height:13,background:color,borderRadius:2}}/>
      <span style={{fontSize:8,letterSpacing:2,color,fontWeight:"bold"}}>{title}</span>
    </div>
  );
}

function Stat({label,value,color,icon}){
  return(
    <div style={{background:"rgba(255,255,255,0.025)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:10,padding:"9px 5px",textAlign:"center"}}>
      <div style={{fontSize:11,color,marginBottom:3}}>{icon}</div>
      <div style={{fontSize:12,fontWeight:"bold"}}>{value}</div>
      <div style={{fontSize:7,color:"rgba(255,255,255,0.32)",letterSpacing:1,marginTop:2}}>{label.toUpperCase()}</div>
    </div>
  );
}

export default function App(){
  const [tab,setTab]             = useState("live");
  const [locIdx,setLocIdx]       = useState(0);
  const [wx,setWx]               = useState({});
  const [loading,setLoading]     = useState(true);
  const [log,setLog]             = useState([]);
  const [time,setTime]           = useState(new Date());
  const [anim,setAnim]           = useState(true);
  const [lastFetch,setLastFetch] = useState(null);
  const [exporting,setExporting] = useState(false);
  const [liveMode,setLiveMode]   = useState(null);

  useEffect(()=>{
    const t=setInterval(()=>setTime(new Date()),1000);
    return ()=>clearInterval(t);
  },[]);

  useEffect(()=>{
    const saved=storage.get(STORAGE_KEY);
    if(saved){try{setLog(JSON.parse(saved.value));}catch{}}
  },[]);

  const fetchAll=useCallback(async()=>{
    setLoading(true);
    const results=await Promise.all(LOCATIONS.map(loc=>fetchLocation(loc)));
    const newWx={};
    results.forEach(r=>{newWx[r.id]=r;});
    setWx(newWx);
    setLastFetch(new Date());
    setLiveMode(results[0].live);
    const snap={ts:new Date().toISOString()};
    results.forEach(r=>{snap[r.id]=r;});
    setLog(prev=>{
      const updated=[snap,...prev].slice(0,MAX_LOG);
      storage.set(STORAGE_KEY,JSON.stringify(updated));
      return updated;
    });
    setLoading(false);
  },[]);

  useEffect(()=>{fetchAll();},[fetchAll]);
  useEffect(()=>{
    const t=setInterval(fetchAll,600000);
    return ()=>clearInterval(t);
  },[fetchAll]);

  const switchTab=id=>{
    setAnim(false);
    setTimeout(()=>{setTab(id);setAnim(true);},150);
  };

  const loc  = LOCATIONS[locIdx];
  const curr = wx[loc.id];
  const dayLabel = d=>new Date(d).toLocaleDateString("en-ZW",{weekday:"short"}).toUpperCase();

  const handleExport=()=>{
    setExporting(true);
    setTimeout(()=>{exportCSV(log);setExporting(false);},300);
  };

  const modeBadge = liveMode===true
    ? {text:"◎ LIVE · OPEN-METEO",color:"#27AE60"}
    : liveMode===false
    ? {text:"◈ SIMULATED · ZIMBABWE BASELINE",color:"#F5A623"}
    : {text:"◎ CONNECTING...",color:"#4A90D9"};

  return(
    <div style={{fontFamily:"'Courier New',monospace",background:"linear-gradient(160deg,#050C1D,#0A1829 50%,#060E18)",minHeight:"100vh",color:"#E8F4FD",display:"flex",flexDirection:"column",maxWidth:430,margin:"0 auto",position:"relative",overflow:"hidden"}}>
      <style>{`*{box-sizing:border-box}::-webkit-scrollbar{width:0}@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.35}}`}</style>
      <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:0,backgroundImage:"linear-gradient(rgba(74,144,217,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(74,144,217,0.03) 1px,transparent 1px)",backgroundSize:"28px 28px"}}/>

      <header style={{padding:"10px 14px 9px",borderBottom:"1px solid rgba(74,144,217,0.18)",background:"rgba(5,12,29,0.95)",backdropFilter:"blur(16px)",position:"relative",zIndex:20}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:9}}>
          <div>
            <div style={{fontSize:7,color:"#27AE60",letterSpacing:2.5,marginBottom:1}}>PEACE, GENDER AND CLIMATE NETWORK</div>
            <div style={{fontSize:15,fontWeight:"bold",letterSpacing:1}}>
              ClimateSense <span style={{color:"#27AE60"}}>21</span>
              <span style={{fontSize:8,color:"#4A90D9",marginLeft:6}}>v5</span>
            </div>
            <div style={{fontSize:7,color:modeBadge.color,letterSpacing:1,marginTop:2}}>{modeBadge.text}</div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:18,fontWeight:"bold",color:"#4A90D9",letterSpacing:2}}>{time.toLocaleTimeString("en-ZW",{hour:"2-digit",minute:"2-digit"})}</div>
            <div style={{fontSize:7,color:"rgba(255,255,255,0.32)",letterSpacing:1}}>{time.toLocaleDateString("en-ZW",{weekday:"short",day:"numeric",month:"short"}).toUpperCase()}</div>
            {lastFetch&&<div style={{fontSize:6,color:"rgba(255,255,255,0.3)",marginTop:1}}>UPDATED {lastFetch.toLocaleTimeString("en-ZW",{hour:"2-digit",minute:"2-digit"})}</div>}
          </div>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6}}>
          {LOCATIONS.map((l,i)=>{
            const d=wx[l.id]; const active=locIdx===i;
            return(
              <button key={l.id} onClick={()=>setLocIdx(i)} style={{padding:"6px 7px",borderRadius:8,cursor:"pointer",textAlign:"left",background:active?`${l.color}22`:"rgba(255,255,255,0.03)",border:`1px solid ${active?l.color:"rgba(255,255,255,0.08)"}`,transition:"all 0.2s"}}>
                <div style={{fontSize:7,color:active?l.color:"rgba(255,255,255,0.5)",letterSpacing:1.5,fontWeight:"bold"}}>{l.abbr}</div>
                <div style={{fontSize:7,color:active?l.color:"rgba(255,255,255,0.35)",marginTop:2,lineHeight:1.2}}>{l.name}</div>
                {d
                  ?<div style={{fontSize:13,fontWeight:"bold",color:active?l.color:"rgba(255,255,255,0.5)",marginTop:3}}>{WMO_ICON[d.code]} {d.temp}°C</div>
                  :<div style={{fontSize:10,color:"rgba(255,255,255,0.2)",marginTop:3,animation:"pulse 1.5s infinite"}}>···</div>
                }
              </button>
            );
          })}
        </div>
      </header>

      <main style={{flex:1,overflowY:"auto",padding:"13px 13px 80px",position:"relative",zIndex:5,opacity:anim?1:0,transform:anim?"translateY(0)":"translateY(5px)",transition:"opacity 0.15s ease,transform 0.15s ease"}}>

        {loading&&!curr&&(
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:280,gap:14}}>
            <div style={{width:32,height:32,border:"2px solid rgba(39,174,96,0.2)",borderTop:"2px solid #27AE60",borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
            <div style={{fontSize:9,color:"#27AE60",letterSpacing:2}}>LOADING 3 LOCATIONS</div>
            <div style={{fontSize:8,color:"rgba(255,255,255,0.3)"}}>Chivi · Southlea Park · Mount Darwin</div>
          </div>
        )}

        {tab==="live"&&curr&&(
          <div>
            {liveMode===false&&(
              <div style={{background:"rgba(245,166,35,0.08)",border:"1px solid rgba(245,166,35,0.28)",borderLeft:"3px solid #F5A623",borderRadius:9,padding:"9px 12px",marginBottom:12}}>
                <div style={{fontSize:8,color:"#F5A623",letterSpacing:1.5,marginBottom:3}}>◈ SIMULATED MODE</div>
                <div style={{fontSize:8,color:"rgba(255,255,255,0.52)",lineHeight:1.5}}>Live API not reachable. Displaying Zimbabwe May baseline data. Live feed activates automatically on production deployment.</div>
              </div>
            )}
            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:12}}>
              <span style={{color:loc.color,fontSize:10}}>◎</span>
              <span style={{fontSize:9,color:"rgba(255,255,255,0.45)",letterSpacing:1}}>{loc.name.toUpperCase()} · {loc.suburb.toUpperCase()}</span>
            </div>
            <div style={{background:`linear-gradient(135deg,${loc.color}22,${loc.color}08)`,border:`1px solid ${loc.color}44`,borderRadius:17,padding:"20px 18px",marginBottom:13,position:"relative",overflow:"hidden"}}>
              <div style={{position:"absolute",right:-35,top:-35,width:170,height:170,borderRadius:"50%",border:`1px solid ${loc.color}18`,boxShadow:`0 0 0 28px ${loc.color}06`}}/>
              <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between"}}>
                <div>
                  <div style={{fontSize:64,fontWeight:"bold",lineHeight:1,letterSpacing:-3}}>{curr.temp}<span style={{fontSize:24,color:loc.color,letterSpacing:0}}>°C</span></div>
                  <div style={{fontSize:12,color:"rgba(255,255,255,0.5)",marginTop:5}}>{WMO[curr.code]||"Unknown"}</div>
                  <div style={{fontSize:9,color:"rgba(255,255,255,0.28)",marginTop:2,letterSpacing:1}}>FEELS LIKE {curr.feelsLike}°C</div>
                  <div style={{fontSize:7,color:loc.color,marginTop:6,letterSpacing:1}}>{loc.lat}°S · {loc.lon}°E</div>
                </div>
                <span style={{fontSize:50,marginTop:4}}>{WMO_ICON[curr.code]||"🌡️"}</span>
              </div>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:13}}>
              <Stat label="Humidity"   value={`${curr.humidity}%`}    color="#4A90D9" icon="◎"/>
              <Stat label="Wind"       value={`${curr.wind}km/h`}     color="#27AE60" icon="◈"/>
              <Stat label="UV Index"   value={curr.uv}                 color="#F5A623" icon="◉"/>
              <Stat label="Pressure"   value={`${curr.pressure}hPa`}  color="#9B59B6" icon="◆"/>
              <Stat label="Visibility" value={`${curr.visibility}km`} color="#4A90D9" icon="◎"/>
              <Stat label="Rainfall"   value={`${curr.rain}mm`}       color="#27AE60" icon="◬"/>
            </div>
            <button onClick={fetchAll} disabled={loading} style={{width:"100%",padding:"10px",background:`${loc.color}20`,border:`1px solid ${loc.color}55`,borderRadius:10,color:loc.color,fontSize:9,letterSpacing:2,cursor:"pointer",opacity:loading?0.5:1}}>
              {loading?"◈ LOADING...":"◈ REFRESH ALL 3 LOCATIONS"}
            </button>
          </div>
        )}

        {tab==="compare"&&(
          <div>
            <SH title="LIVE 3-LOCATION COMPARISON" color="#F5A623"/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:14}}>
              {LOCATIONS.map(l=>{
                const d=wx[l.id];
                if(!d) return <div key={l.id} style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:12,padding:"12px",display:"flex",alignItems:"center",justifyContent:"center",minHeight:120}}><div style={{fontSize:8,color:"rgba(255,255,255,0.2)",animation:"pulse 1.5s infinite"}}>···</div></div>;
                return(
                  <div key={l.id} style={{background:`${l.color}12`,border:`1px solid ${l.color}35`,borderRadius:12,padding:"11px 9px"}}>
                    <div style={{fontSize:7,color:l.color,letterSpacing:1.5,fontWeight:"bold",marginBottom:2}}>{l.abbr}</div>
                    <div style={{fontSize:7,color:"rgba(255,255,255,0.4)",marginBottom:7,lineHeight:1.3}}>{l.name}</div>
                    <div style={{fontSize:28,fontWeight:"bold",color:l.color,lineHeight:1}}>{d.temp}°</div>
                    <div style={{fontSize:8,color:"rgba(255,255,255,0.45)",marginTop:4}}>{WMO_ICON[d.code]} {(WMO[d.code]||"").slice(0,11)}</div>
                    <div style={{marginTop:8,display:"flex",flexDirection:"column",gap:4}}>
                      {[{k:"Hum",v:`${d.humidity}%`},{k:"Wind",v:`${d.wind}km/h`},{k:"Rain",v:`${d.rain}mm`},{k:"UV",v:`${d.uv}`}].map(r=>(
                        <div key={r.k} style={{display:"flex",justifyContent:"space-between"}}>
                          <span style={{fontSize:7,color:"rgba(255,255,255,0.3)"}}>{r.k}</span>
                          <span style={{fontSize:7,color:"rgba(255,255,255,0.75)",fontWeight:"bold"}}>{r.v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            <SH title="VARIANCE ANALYSIS · ALL 3 SITES" color="#9B59B6"/>
            <div style={{background:"rgba(155,89,182,0.06)",border:"1px solid rgba(155,89,182,0.2)",borderRadius:12,padding:"13px",marginBottom:13}}>
              {[{metric:"Temperature (°C)",key:"temp"},{metric:"Humidity (%)",key:"humidity"},{metric:"Wind (km/h)",key:"wind"},{metric:"Rainfall (mm)",key:"rain"},{metric:"UV Index",key:"uv"}].map((v,i,arr)=>{
                const vals=LOCATIONS.map(l=>({loc:l,val:wx[l.id]?(Number(wx[l.id][v.key])||0):0}));
                const max=Math.max(...vals.map(x=>x.val))||1;
                return(
                  <div key={v.metric} style={{padding:"8px 0",borderBottom:i<arr.length-1?"1px solid rgba(255,255,255,0.05)":"none"}}>
                    <div style={{fontSize:8,color:"rgba(255,255,255,0.42)",marginBottom:6}}>{v.metric.toUpperCase()}</div>
                    {vals.map(({loc:l,val})=>(
                      <div key={l.id} style={{display:"flex",gap:5,alignItems:"center",marginBottom:4}}>
                        <span style={{fontSize:7,color:l.color,width:28,fontWeight:"bold"}}>{l.abbr}</span>
                        <div style={{flex:1,height:5,background:"rgba(255,255,255,0.06)",borderRadius:3,overflow:"hidden"}}>
                          <div style={{width:`${(val/max)*100}%`,height:"100%",background:l.color,borderRadius:3,transition:"width 0.8s ease"}}/>
                        </div>
                        <span style={{fontSize:8,color:l.color,width:30,textAlign:"right",fontWeight:"bold"}}>{val}</span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
            <SH title="LATITUDINAL GRADIENT NOTE · PGCN" color="#4A90D9"/>
            <div style={{background:"rgba(74,144,217,0.06)",border:"1px solid rgba(74,144,217,0.18)",borderRadius:11,padding:"12px"}}>
              <div style={{fontSize:9,color:"rgba(255,255,255,0.65)",lineHeight:1.65}}>
                Three sites span a <span style={{color:"#4A90D9"}}>4.0° latitudinal range</span> across Zimbabwe's climate zones. Mount Darwin (lowveld, northern) · Southlea Park (highveld urban) · Chivi Ward 3 (lowveld rural south, PGCN anchor site).
              </div>
            </div>
          </div>
        )}

        {tab==="forecast"&&curr&&curr.daily&&(
          <div>
            <SH title={`7-DAY FORECAST · ${loc.name.toUpperCase()}`} color={loc.color}/>
            {curr.daily.time.map((t,i)=>(
              <div key={t} style={{display:"flex",alignItems:"center",padding:"10px 12px",marginBottom:7,background:i===0?`${loc.color}18`:"rgba(255,255,255,0.02)",border:`1px solid ${i===0?loc.color:"rgba(255,255,255,0.07)"}`,borderRadius:11}}>
                <div style={{width:36,fontSize:8,color:i===0?loc.color:"rgba(255,255,255,0.4)",letterSpacing:1}}>{dayLabel(t)}</div>
                <span style={{fontSize:18,width:28}}>{WMO_ICON[curr.daily.weather_code[i]]||"🌡️"}</span>
                <div style={{flex:1,paddingLeft:8}}>
                  <div style={{fontSize:8,color:"rgba(255,255,255,0.38)"}}>{(WMO[curr.daily.weather_code[i]]||"Unknown").slice(0,16).toUpperCase()}</div>
                  <div style={{display:"flex",alignItems:"center",gap:5,marginTop:2}}>
                    <div style={{width:44,height:3,background:"rgba(255,255,255,0.08)",borderRadius:2,overflow:"hidden"}}>
                      <div style={{width:`${Math.min((curr.daily.precipitation_sum[i]||0)*8,100)}%`,height:"100%",background:(curr.daily.precipitation_sum[i]||0)>10?"#e74c3c":(curr.daily.precipitation_sum[i]||0)>2?"#F5A623":"#4A90D9"}}/>
                    </div>
                    <span style={{fontSize:7,color:"rgba(255,255,255,0.38)"}}>{curr.daily.precipitation_sum[i]}mm</span>
                  </div>
                </div>
                <div style={{textAlign:"right"}}>
                  <span style={{fontSize:13,fontWeight:"bold"}}>{Math.round(curr.daily.temperature_2m_max[i])}°</span>
                  <span style={{fontSize:10,color:"rgba(255,255,255,0.28)",marginLeft:4}}>{Math.round(curr.daily.temperature_2m_min[i])}°</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab==="alerts"&&(
          <div>
            {LOCATIONS.map(l=>{
              const alerts=getDerived(wx[l.id]);
              return(
                <div key={l.id}>
                  <SH title={`${l.name.toUpperCase()} · ${l.suburb.toUpperCase()}`} color={l.color}/>
                  {alerts.map((a,i)=>(
                    <div key={i} style={{background:a.level==="warning"?"rgba(231,76,60,0.09)":a.level==="clear"?"rgba(39,174,96,0.06)":"rgba(245,166,35,0.07)",border:`1px solid ${a.level==="warning"?"rgba(231,76,60,0.38)":a.level==="clear"?"rgba(39,174,96,0.3)":"rgba(245,166,35,0.3)"}`,borderLeft:`3px solid ${a.level==="warning"?"#e74c3c":a.level==="clear"?"#27AE60":"#F5A623"}`,borderRadius:10,padding:"10px 12px",marginBottom:8}}>
                      <div style={{fontSize:8,letterSpacing:2,color:a.level==="warning"?"#e74c3c":a.level==="clear"?"#27AE60":"#F5A623",fontWeight:"bold",marginBottom:3}}>◬ {a.type}</div>
                      <div style={{fontSize:9,color:"rgba(255,255,255,0.62)",lineHeight:1.5}}>{a.desc}</div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}

        {tab==="log"&&(
          <div>
            <SH title={`DATA LOG · ${log.length} SNAPSHOTS`} color="#4A90D9"/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:13}}>
              <button onClick={handleExport} disabled={!log.length||exporting} style={{padding:"11px 8px",background:"rgba(39,174,96,0.12)",border:"1px solid rgba(39,174,96,0.4)",borderRadius:10,color:"#27AE60",fontSize:8,letterSpacing:1.5,cursor:"pointer",opacity:!log.length||exporting?0.5:1,textAlign:"center"}}>
                {exporting?"◈ EXPORTING...":"⬇ EXPORT CSV"}
                <div style={{fontSize:7,color:"rgba(39,174,96,0.6)",marginTop:3}}>{log.length} rows · CHI + HRE + MTD</div>
              </button>
              <div style={{padding:"11px 8px",background:"rgba(74,144,217,0.06)",border:"1px solid rgba(74,144,217,0.2)",borderRadius:10}}>
                <div style={{fontSize:8,color:"#4A90D9",letterSpacing:1,marginBottom:3}}>CSV FIELDS</div>
                <div style={{fontSize:7,color:"rgba(255,255,255,0.35)",lineHeight:1.6}}>Timestamp · Mode · Temp · Hum · Wind · Rain · UV · Condition</div>
              </div>
            </div>
            {log.length===0
              ?<div style={{textAlign:"center",padding:"30px",color:"rgba(255,255,255,0.3)",fontSize:9}}>No readings stored yet.</div>
              :log.slice(0,24).map((r,i)=>(
                <div key={i} style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:10,padding:"10px 12px",marginBottom:7}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:7}}>
                    <span style={{fontSize:7,color:"rgba(255,255,255,0.32)",letterSpacing:0.5}}>{new Date(r.ts).toLocaleString("en-ZW",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"})}</span>
                    <span style={{fontSize:6,color:r.chivi?.live?"#27AE60":"#F5A623",letterSpacing:1}}>{r.chivi?.live?"LIVE":"SIM"}</span>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6}}>
                    {LOCATIONS.map(l=>{
                      const d=r[l.id];
                      if(!d) return <div key={l.id} style={{fontSize:7,color:"rgba(255,255,255,0.2)"}}>—</div>;
                      return(
                        <div key={l.id} style={{borderLeft:`2px solid ${l.color}`,paddingLeft:7}}>
                          <div style={{fontSize:7,color:l.color,letterSpacing:1,fontWeight:"bold"}}>{l.abbr}</div>
                          <div style={{fontSize:14,fontWeight:"bold",color:l.color}}>{d.temp}°C</div>
                          <div style={{fontSize:7,color:"rgba(255,255,255,0.35)"}}>{WMO_ICON[d.code]}</div>
                          <div style={{fontSize:6,color:"rgba(255,255,255,0.25)",marginTop:1}}>H:{d.humidity}% R:{d.rain}mm</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            }
            {log.length>24&&<div style={{textAlign:"center",fontSize:8,color:"rgba(255,255,255,0.3)",padding:"8px"}}>Showing 24 of {log.length} · Export CSV for full dataset</div>}
            <button onClick={()=>{storage.delete(STORAGE_KEY);setLog([]);}} style={{width:"100%",padding:"8px",background:"rgba(231,76,60,0.1)",border:"1px solid rgba(231,76,60,0.25)",borderRadius:8,color:"#e74c3c",fontSize:8,letterSpacing:2,cursor:"pointer",marginTop:6}}>◬ CLEAR ALL STORED DATA</button>
          </div>
        )}
      </main>

      <nav style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:430,background:"rgba(5,12,29,0.97)",backdropFilter:"blur(20px)",borderTop:"1px solid rgba(74,144,217,0.2)",display:"flex",justifyContent:"space-around",padding:"7px 0 13px",zIndex:100}}>
        {NAV.map(n=>(
          <button key={n.id} onClick={()=>switchTab(n.id)} style={{background:"none",border:"none",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:3,padding:"3px 9px",color:tab===n.id?"#27AE60":"rgba(255,255,255,0.28)",transition:"color 0.2s"}}>
            <span style={{fontSize:16,lineHeight:1}}>{n.icon}</span>
            <span style={{fontSize:7,letterSpacing:1.5,textTransform:"uppercase"}}>{n.label}</span>
            {tab===n.id&&<div style={{width:16,height:2,background:"#27AE60",borderRadius:1}}/>}
          </button>
        ))}
      </nav>
    </div>
  );
}
