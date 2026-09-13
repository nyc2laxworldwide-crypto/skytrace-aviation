const $=id=>document.getElementById(id);
const airports={
  KBWI:{name:'Baltimore/Washington International Thurgood Marshall',lat:39.1754,lon:-76.6684,elev:143},
  KDCA:{name:'Ronald Reagan Washington National',lat:38.8512,lon:-77.0402,elev:15},
  KIAD:{name:'Washington Dulles International',lat:38.9531,lon:-77.4565,elev:313},
  KJFK:{name:'John F. Kennedy International',lat:40.6413,lon:-73.7781,elev:13},
  KLAX:{name:'Los Angeles International',lat:33.9416,lon:-118.4085,elev:128},
  KLAS:{name:'Harry Reid International',lat:36.0840,lon:-115.1537,elev:2181},
  KRDU:{name:'Raleigh-Durham International',lat:35.8801,lon:-78.7880,elev:435},
  KCLT:{name:'Charlotte Douglas International',lat:35.2140,lon:-80.9431,elev:748},
  KATL:{name:'Hartsfield-Jackson Atlanta International',lat:33.6407,lon:-84.4277,elev:1026},
  KORD:{name:"Chicago O'Hare International",lat:41.9742,lon:-87.9073,elev:680}
};
let current='KBWI',range=35,markers=new Map(),selected=null,trails=new Map();
const map=L.map('map',{zoomControl:true,preferCanvas:true}).setView([39.1754,-76.6684],14);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap contributors'}).addTo(map);
const airportMarker=L.circleMarker([39.1754,-76.6684],{radius:5,color:'#ffc857',fillOpacity:1}).addTo(map);

function esc(v=''){return String(v).replace(/[&<>"]/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[s]))}
function setLive(ok,msg){$('liveDot').classList.toggle('ok',ok);$('liveText').textContent=msg}
function fmtAlt(a){return a==='ground'?'GROUND':Number.isFinite(+a)?`${Math.round(+a).toLocaleString()} FT`:'--'}
function catFromMetar(m){return m?.fltCat||'--'}
function updateClock(){ $('clock').textContent=new Date().toISOString().slice(11,19)+'Z' } setInterval(updateClock,1000);updateClock();

async function resolveAirport(code){
  code=code.toUpperCase().trim();
  if(airports[code]) return airports[code];
  const r=await fetch(`/api/airport?icao=${encodeURIComponent(code)}`); if(!r.ok) throw new Error('Airport not found');
  return r.json();
}
async function openAirport(code){
  try{
    const a=await resolveAirport(code); current=code.toUpperCase(); airports[current]=a;
    $('airportCode').textContent=current; $('airportName').textContent=a.name||current; $('airportMeta').textContent=`${a.city||'Airport'} · Elev ${a.elev??'--'} ft · ${(+a.lat).toFixed(4)}, ${(+a.lon).toFixed(4)}`;
    airportMarker.setLatLng([a.lat,a.lon]); map.setView([a.lat,a.lon],14); $('airportInput').value=current;
    $('atcBtn').onclick=()=>window.open(`https://www.liveatc.net/search/?icao=${encodeURIComponent(current)}`,'_blank','noopener');
    await Promise.all([loadWeather(),loadAircraft()]);
  }catch(e){$('airportName').textContent='Airport lookup failed';$('airportMeta').textContent=e.message}
}
async function loadWeather(){
  try{
    const r=await fetch(`/api/weather?icao=${encodeURIComponent(current)}`); if(!r.ok) throw 0; const w=await r.json(); const m=w.metar||{};
    $('flightCategory').textContent=catFromMetar(m); $('wind').textContent=m.wdir!=null?`${String(m.wdir).padStart(3,'0')}° ${m.wspd??0}${m.wgst?`G${m.wgst}`:''} KT`:'--';
    $('visibility').textContent=m.visib!=null?`${m.visib} SM`:'--'; $('altimeter').textContent=m.altim!=null?`${(+m.altim).toFixed(2)} inHg`:'--'; $('temp').textContent=m.temp!=null?`${m.temp}° / ${m.dewp??'--'}°C`:'--';
    $('metarRaw').textContent=m.rawOb||'No current METAR'; $('tafRaw').textContent=w.taf?.rawTAF||'No current TAF'; $('weatherAge').textContent='NOAA AWC';
  }catch{$('metarRaw').textContent='Weather temporarily unavailable';$('tafRaw').textContent='Try refresh';}
}
function planeIcon(ac){const hdg=Number(ac.track)||0; const onGround=ac.alt_baro==='ground'; return L.divIcon({className:'',html:`<div style="transform:rotate(${hdg}deg);color:${onGround?'#48e09b':'#55d6ff'};font-size:18px;text-shadow:0 0 6px #000">✈</div>${$('labelsToggle').checked?`<div class="plane-label" style="transform:rotate(${-hdg}deg);transform-origin:top left">${esc((ac.flight||ac.r||ac.hex||'').trim())} · ${esc(fmtAlt(ac.alt_baro))}</div>`:''}`,iconSize:[28,28],iconAnchor:[14,14]})}
function showAircraft(ac){selected=ac; $('detailCard').classList.remove('hidden'); $('dCallsign').textContent=(ac.flight||ac.r||'UNKNOWN').trim(); $('dReg').textContent=ac.r||'--'; $('dType').textContent=ac.t||ac.desc||'--'; $('dAlt').textContent=fmtAlt(ac.alt_baro); $('dSpeed').textContent=ac.gs!=null?`${Math.round(ac.gs)} KT`:'--'; $('dTrack').textContent=ac.track!=null?`${Math.round(ac.track)}°`:'--'; $('dRate').textContent=ac.baro_rate!=null?`${Math.round(ac.baro_rate)} FPM`:'--'; $('dSquawk').textContent=ac.squawk||'--'; $('dHex').textContent=(ac.hex||'--').toUpperCase();}
function renderAircraft(arr){
  const valid=arr.filter(a=>Number.isFinite(+a.lat)&&Number.isFinite(+a.lon)); $('aircraftCount').textContent=valid.length; const keep=new Set();
  valid.forEach(ac=>{const id=ac.hex||`${ac.lat}:${ac.lon}`;keep.add(id); let m=markers.get(id); if(!m){m=L.marker([ac.lat,ac.lon],{icon:planeIcon(ac),riseOnHover:true}).addTo(map);m.on('click',()=>showAircraft(ac));markers.set(id,m)}else{m.setLatLng([ac.lat,ac.lon]);m.setIcon(planeIcon(ac));m.off('click');m.on('click',()=>showAircraft(ac))}
    const hist=trails.get(id)||[]; hist.push([ac.lat,ac.lon]); if(hist.length>20)hist.shift();trails.set(id,hist);
  });
  for(const [id,m] of markers){if(!keep.has(id)){map.removeLayer(m);markers.delete(id)}}
  $('aircraftList').innerHTML=valid.slice(0,45).map((a,i)=>`<div class="aircraft-item" data-i="${i}"><div><b>${esc((a.flight||a.r||a.hex||'UNKNOWN').trim())}</b><small>${esc(a.r||a.t||'ADS-B')}</small></div><div class="alt">${esc(fmtAlt(a.alt_baro))}</div><small>${a.gs!=null?Math.round(a.gs)+' KT':'--'}</small><small style="text-align:right">${a.track!=null?Math.round(a.track)+'°':'--'}</small></div>`).join('')||'<div class="empty">No positioned aircraft in this range.</div>';
  [...document.querySelectorAll('.aircraft-item')].forEach(el=>el.onclick=()=>showAircraft(valid[+el.dataset.i]));
}
async function loadAircraft(){
  const a=airports[current]; if(!a)return; try{setLive(false,'UPDATING'); const r=await fetch(`/api/aircraft?lat=${a.lat}&lon=${a.lon}&dist=${range}`); if(!r.ok)throw 0;const d=await r.json();renderAircraft(d.ac||[]);setLive(true,'LIVE ADS-B')}catch{setLive(false,'ADS-B OFFLINE');$('aircraftList').innerHTML='<div class="empty">Live ADS-B feed is temporarily unavailable. Airport map and weather remain usable.</div>'}
}
$('searchBtn').onclick=()=>openAirport($('airportInput').value);$('airportInput').addEventListener('keydown',e=>{if(e.key==='Enter')openAirport(e.target.value)});$('refreshBtn').onclick=()=>Promise.all([loadAircraft(),loadWeather()]);$('rangeSlider').oninput=e=>{range=+e.target.value;$('rangeLabel').textContent=range+' NM'};$('rangeSlider').onchange=loadAircraft;$('closeDetail').onclick=()=>$('detailCard').classList.add('hidden');$('followBtn').onclick=()=>{if(selected?.lat)map.setView([selected.lat,selected.lon],12)};$('surfaceBtn').onclick=()=>{const a=airports[current];map.setView([a.lat,a.lon],16);$('surfaceBtn').classList.add('active');$('areaBtn').classList.remove('active')};$('areaBtn').onclick=()=>{const a=airports[current];map.setView([a.lat,a.lon],9);$('areaBtn').classList.add('active');$('surfaceBtn').classList.remove('active')};$('labelsToggle').onchange=loadAircraft;
openAirport('KBWI');setInterval(loadAircraft,15000);setInterval(loadWeather,300000);
