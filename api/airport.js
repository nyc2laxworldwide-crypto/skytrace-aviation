module.exports = async function handler(req,res){
  const icao=String(req.query.icao||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,4);if(icao.length<3)return res.status(400).json({error:'ICAO required'});
  try{const r=await fetch(`https://aviationweather.gov/api/data/stationinfo?ids=${icao}&format=json`,{headers:{'User-Agent':'SkyTrace-Aviation/1.0'}});if(!r.ok)return res.status(404).json({error:'Airport not found'});const j=await r.json();const s=Array.isArray(j)?j[0]:j;if(!s)return res.status(404).json({error:'Airport not found'});return res.status(200).json({name:s.site||s.name||icao,city:s.state||'',lat:s.lat,lon:s.lon,elev:s.elev})}catch{return res.status(502).json({error:'Airport lookup failed'})}
}
